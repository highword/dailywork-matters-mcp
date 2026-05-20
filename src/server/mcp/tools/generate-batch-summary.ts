import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createDateRange } from '../../../shared/paths.js';
import type { Config, NormalizedEvent } from '../../../shared/types.js';
import type { AdapterRegistry } from '../../adapters/registry.js';
import { getDatabase } from '../../database.js';
import { generateSummary } from '../../intelligence/index.js';
import { logger } from '../../logger.js';
import { saveSummaryFile } from '../../persistence.js';

const MAX_CONCURRENCY = 3;

interface BatchResult {
	date: string;
	status: 'success' | 'skipped' | 'failed';
	version?: number;
	file?: string;
	error?: string;
}

/**
 * Registers the generate_batch_summary tool.
 * Generates summaries for a date range with limited concurrency (max 3).
 * Skips dates with no data. Regenerates dates that already have summaries (D-12).
 */
export function registerGenerateBatchSummary(
	server: McpServer,
	config: Config,
	registry: AdapterRegistry,
): void {
	server.registerTool(
		'generate_batch_summary',
		{
			description:
				'Generate daily work summaries for a date range. Processes up to 3 dates concurrently. Skips dates with no data. Regenerates existing summaries (version append).',
			inputSchema: {
				startDate: z.string().describe('Start date in YYYY-MM-DD format (inclusive)'),
				endDate: z.string().describe('End date in YYYY-MM-DD format (inclusive)'),
			},
		},
		async (args) => {
			try {
				const { startDate, endDate } = args;

				// Validate dates
				if (
					!/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
					Number.isNaN(Date.parse(startDate))
				) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `Error: Invalid startDate format "${startDate}". Expected YYYY-MM-DD.`,
							},
						],
						isError: true,
					};
				}
				if (
					!/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
					Number.isNaN(Date.parse(endDate))
				) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `Error: Invalid endDate format "${endDate}". Expected YYYY-MM-DD.`,
							},
						],
						isError: true,
					};
				}

				if (startDate > endDate) {
					return {
						content: [
							{
								type: 'text' as const,
								text: 'Error: startDate must be before or equal to endDate.',
							},
						],
						isError: true,
					};
				}

				// Generate all dates in range
				const dates = generateDateRange(startDate, endDate);

				logger.info(
					{ startDate, endDate, totalDates: dates.length },
					'Starting batch summary generation',
				);

				// Process with concurrency control
				const results = await batchWithConcurrency(
					dates,
					MAX_CONCURRENCY,
					(date) => processOneDate(date, config, registry),
				);

				const processed = results.filter((r) => r.status === 'success').length;
				const skipped = results.filter((r) => r.status === 'skipped').length;
				const failed = results.filter((r) => r.status === 'failed').length;

				logger.info(
					{ processed, skipped, failed },
					'Batch summary generation complete',
				);

				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify({
								processed,
								skipped,
								failed,
								total: dates.length,
								results,
							}),
						},
					],
				};
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err }, 'generate_batch_summary failed');
				return {
					content: [{ type: 'text' as const, text: `Error: ${message}` }],
					isError: true,
				};
			}
		},
	);
}

/**
 * Process a single date: gather events, generate summary, save.
 */
async function processOneDate(
	date: string,
	config: Config,
	registry: AdapterRegistry,
): Promise<BatchResult> {
	try {
		const range = createDateRange(date);

		// Gather events
		const events: NormalizedEvent[] = [];
		for await (const event of registry.gatherEvents(range)) {
			events.push(event);
		}

		// Skip dates with no data (D-12)
		if (events.length === 0) {
			return { date, status: 'skipped' };
		}

		const result = await generateSummary(date, events, config);

		if (result.mode === 'zero-config') {
			// In zero-config mode within batch, we skip file saving
			// since the host AI hasn't synthesized the summary yet
			return {
				date,
				status: 'skipped',
				error: 'Zero-config mode: batch requires API key for automatic generation',
			};
		}

		// API mode: save file and store in DB
		const filePath = saveSummaryFile(date, result.markdown!, config.outputDir);

		const db = getDatabase();
		const currentVersion =
			(
				db
					.prepare(
						'SELECT MAX(version) as maxVer FROM summaries WHERE date = ?',
					)
					.get(date) as { maxVer: number | null } | undefined
			)?.maxVer ?? 0;

		db.prepare(
			`INSERT INTO summaries (date, version, markdown, structured_json, metadata, mode, models_used)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		).run(
			date,
			currentVersion + 1,
			result.markdown,
			JSON.stringify(result.summary),
			JSON.stringify(result.summary?.metadata ?? {}),
			'api',
			JSON.stringify(config.ai),
		);

		return {
			date,
			status: 'success',
			version: currentVersion + 1,
			file: filePath,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		logger.warn({ date, err }, 'Batch processing failed for date');
		return { date, status: 'failed', error: message };
	}
}

/**
 * Inline Promise-pool pattern for concurrency control.
 * Processes items with at most `maxConcurrency` running in parallel.
 */
async function batchWithConcurrency<T, R>(
	items: T[],
	maxConcurrency: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = [];
	const executing = new Set<Promise<void>>();

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const p = fn(item).then((result) => {
			results[i] = result;
			executing.delete(p);
		});
		executing.add(p);

		if (executing.size >= maxConcurrency) {
			await Promise.race(executing);
		}
	}

	await Promise.all(executing);
	return results;
}

/**
 * Generates an array of YYYY-MM-DD date strings for the inclusive range.
 */
function generateDateRange(startDate: string, endDate: string): string[] {
	const dates: string[] = [];
	const current = new Date(startDate);
	const end = new Date(endDate);

	while (current <= end) {
		const y = current.getFullYear();
		const m = String(current.getMonth() + 1).padStart(2, '0');
		const d = String(current.getDate()).padStart(2, '0');
		dates.push(`${y}-${m}-${d}`);
		current.setDate(current.getDate() + 1);
	}

	return dates;
}
