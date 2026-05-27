import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Config, NormalizedEvent } from '../../shared/types.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import { getDatabase } from '../database.js';
import { generateSummary } from '../intelligence/index.js';
import { logger } from '../logger.js';
import { saveSummaryFile } from '../persistence.js';
import { createDateRange } from '../../shared/paths.js';
import { isValidDate, formatToday } from './summaries.js';

/**
 * Creates generate routes with injected dependencies.
 * The generate endpoint needs config and registry (created during server startup).
 */
export function createGenerateRoutes(config: Config, registry: AdapterRegistry): Hono {
	const generateRoutes = new Hono();

	/**
	 * POST /generate - Trigger summary generation with SSE progress streaming.
	 * D-16: Returns SSE stream with progress events.
	 * T-04-05: No rate limiting (single-user local tool, accepted risk).
	 */
	generateRoutes.post('/generate', async (c) => {
		let date: string;

		try {
			const body = await c.req.json<{ date?: string }>();
			date = body.date ?? formatToday();
		} catch {
			date = formatToday();
		}

		if (!isValidDate(date)) {
			return streamSSE(c, async (stream) => {
				await stream.writeSSE({
					id: '0',
					event: 'error',
					data: JSON.stringify({
						code: 'INVALID_PARAMS',
						message: 'Invalid date format. Expected YYYY-MM-DD.',
					}),
				});
			});
		}

		return streamSSE(c, async (stream) => {
			let eventId = 0;

			try {
				// Stage 1: Gathering events
				await stream.writeSSE({
					id: String(eventId++),
					event: 'progress',
					data: JSON.stringify({ stage: 'gathering', message: 'Gathering events...' }),
				});

				const range = createDateRange(date);
				const events: NormalizedEvent[] = [];
				for await (const event of registry.gatherEvents(range)) {
					events.push(event);
				}

				if (events.length === 0) {
					await stream.writeSSE({
						id: String(eventId++),
						event: 'complete',
						data: JSON.stringify({
							date,
							summary: null,
							message: 'No sessions or git activity found for this date.',
						}),
					});
					return;
				}

				// Stage 2: Processing
				await stream.writeSSE({
					id: String(eventId++),
					event: 'progress',
					data: JSON.stringify({
						stage: 'processing',
						message: `Processing ${events.length} events...`,
					}),
				});

				const result = await generateSummary(date, events, config);

				if (result.mode === 'api' && result.markdown && result.summary) {
					// Stage 3: Saving
					await stream.writeSSE({
						id: String(eventId++),
						event: 'progress',
						data: JSON.stringify({ stage: 'saving', message: 'Saving summary...' }),
					});

					// Save file
					const filePath = saveSummaryFile(date, result.markdown, config.outputDir);

					// Store in DB (same pattern as MCP tool)
					const db = getDatabase();
					const currentVersion =
						(
							db.prepare(
								'SELECT MAX(version) as maxVer FROM summaries WHERE date = ?',
							).get(date) as { maxVer: number | null } | undefined
						)?.maxVer ?? 0;

					db.prepare(
						`INSERT INTO summaries (date, version, markdown, structured_json, metadata, mode, models_used)
						 VALUES (?, ?, ?, ?, ?, ?, ?)`,
					).run(
						date,
						currentVersion + 1,
						result.markdown,
						JSON.stringify(result.summary),
						JSON.stringify(result.summary.metadata ?? {}),
						'api',
						JSON.stringify(config.ai),
					);

					logger.info(
						{ date, file: filePath, version: currentVersion + 1 },
						'Summary generated via API',
					);
				}

				// Complete
				await stream.writeSSE({
					id: String(eventId++),
					event: 'complete',
					data: JSON.stringify({
						date,
						summary: result.summary,
						mode: result.mode,
					}),
				});
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err, date }, 'Summary generation failed');
				await stream.writeSSE({
					id: String(eventId++),
					event: 'error',
					data: JSON.stringify({
						code: 'GENERATION_FAILED',
						message,
					}),
				});
			}
		});
	});

	return generateRoutes;
}
