import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Config } from '../../../shared/types.js';
import { getDatabase } from '../../database.js';
import { logger } from '../../logger.js';
import { loadSummaryFromDisk } from '../../persistence.js';

/**
 * Registers the get_summary_by_date tool.
 * Retrieves a stored summary for a specific date.
 * Checks DB first (latest version), falls back to disk file.
 */
export function registerGetSummaryByDate(
	server: McpServer,
	config: Config,
): void {
	server.registerTool(
		'get_summary_by_date',
		{
			description:
				'Retrieve a stored daily work summary for a specific date. Checks database first (latest version), then falls back to disk file.',
			inputSchema: {
				date: z.string().describe('Date in YYYY-MM-DD format'),
			},
		},
		async (args) => {
			try {
				const { date } = args;

				if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `Error: Invalid date format "${date}". Expected YYYY-MM-DD.`,
							},
						],
						isError: true,
					};
				}

				// Try DB first (latest version)
				const db = getDatabase();
				const row = db
					.prepare(
						`SELECT date, version, markdown, structured_json, metadata, mode, created_at
						 FROM summaries WHERE date = ? ORDER BY created_at DESC LIMIT 1`,
					)
					.get(date) as
					| {
							date: string;
							version: number;
							markdown: string;
							structured_json: string;
							metadata: string;
							mode: string;
							created_at: string;
					  }
					| undefined;

				if (row) {
					let structured: unknown = null;
					try {
						const parsed = JSON.parse(row.structured_json);
						if (
							parsed &&
							typeof parsed === 'object' &&
							Object.keys(parsed).length > 0
						) {
							structured = parsed;
						}
					} catch {
						// Invalid JSON in DB, ignore
					}

					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									source: 'database',
									date: row.date,
									version: row.version,
									mode: row.mode,
									created_at: row.created_at,
									structured: structured,
									markdown: row.markdown,
								}),
							},
						],
					};
				}

				// Fall back to disk file
				const markdown = loadSummaryFromDisk(date, config.outputDir);
				if (markdown) {
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									source: 'disk',
									date,
									version: 1,
									markdown,
								}),
							},
						],
					};
				}

				// Not found anywhere
				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify({
								date,
								found: false,
								message: `No summary found for ${date}.`,
							}),
						},
					],
				};
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err }, 'get_summary_by_date failed');
				return {
					content: [{ type: 'text' as const, text: `Error: ${message}` }],
					isError: true,
				};
			}
		},
	);
}
