import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createDateRange } from '../../../shared/paths.js';
import type { Config, NormalizedEvent } from '../../../shared/types.js';
import type { AdapterRegistry } from '../../adapters/registry.js';
import { getDatabase } from '../../database.js';
import { generateSummary } from '../../intelligence/index.js';
import { logger } from '../../logger.js';
import { saveSummaryFile } from '../../persistence.js';

/**
 * Registers the generate_daily_summary tool.
 * Generates a daily work summary for a specified date (default: today).
 * In API mode: saves file and stores in DB, returns summary + file path.
 * In zero-config mode: returns compressed event data for host AI synthesis.
 */
export function registerGenerateDailySummary(
	server: McpServer,
	config: Config,
	registry: AdapterRegistry,
): void {
	server.registerTool(
		'generate_daily_summary',
		{
			description:
				'Generate a daily work summary for a specific date. Returns structured summary in API mode, or compressed events in zero-config mode.',
			inputSchema: {
				date: z
					.string()
					.optional()
					.describe('Date in YYYY-MM-DD format (default: today)'),
			},
		},
		async (args) => {
			try {
				const dateStr = args.date ?? formatToday();
				if (!isValidDate(dateStr)) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `Error: Invalid date format "${dateStr}". Expected YYYY-MM-DD.`,
							},
						],
						isError: true,
					};
				}

				const range = createDateRange(dateStr);

				// Gather events from all adapters
				const events: NormalizedEvent[] = [];
				for await (const event of registry.gatherEvents(range)) {
					events.push(event);
				}

				if (events.length === 0) {
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									date: dateStr,
									message: 'No sessions or git activity found for this date.',
									events: 0,
								}),
							},
						],
					};
				}

				const result = await generateSummary(dateStr, events, config);

				if (result.mode === 'zero-config') {
					// Zero-config: return compressed events for host AI synthesis
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify(result.zeroConfigData),
							},
						],
					};
				}

				// API mode: save file and store in DB
				const filePath = saveSummaryFile(
					dateStr,
					result.markdown!,
					config.outputDir,
				);

				// Store in DB
				const db = getDatabase();
				const currentVersion =
					(
						db
							.prepare(
								'SELECT MAX(version) as maxVer FROM summaries WHERE date = ?',
							)
							.get(dateStr) as { maxVer: number | null } | undefined
					)?.maxVer ?? 0;

				db.prepare(
					`INSERT INTO summaries (date, version, markdown, structured_json, metadata, mode, models_used)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				).run(
					dateStr,
					currentVersion + 1,
					result.markdown,
					JSON.stringify(result.summary),
					JSON.stringify(result.summary?.metadata ?? {}),
					'api',
					JSON.stringify(config.ai),
				);

				logger.info(
					{ date: dateStr, file: filePath, version: currentVersion + 1 },
					'Summary generated and saved',
				);

				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify({
								summary: result.summary,
								file: filePath,
								version: currentVersion + 1,
							}),
						},
					],
				};
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err }, 'generate_daily_summary failed');
				return {
					content: [{ type: 'text' as const, text: `Error: ${message}` }],
					isError: true,
				};
			}
		},
	);
}

function formatToday(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

function isValidDate(dateStr: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}
