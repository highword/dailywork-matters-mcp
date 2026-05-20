import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Config } from '../../../shared/types.js';
import { getDatabase } from '../../database.js';
import { logger } from '../../logger.js';
import { saveSummaryFile } from '../../persistence.js';

/**
 * Registers the save_summary tool.
 * Enables zero-config two-step pattern (D-02): host AI generates markdown,
 * then calls save_summary to persist the result.
 */
export function registerSaveSummary(server: McpServer, config: Config): void {
	server.registerTool(
		'save_summary',
		{
			description:
				'Save an externally-generated summary. Used in zero-config mode after host AI synthesizes the summary from compressed events.',
			inputSchema: {
				date: z.string().describe('Date in YYYY-MM-DD format'),
				markdown: z.string().describe('The Markdown summary content to save'),
			},
		},
		async (args) => {
			try {
				const { date, markdown } = args;

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

				if (!markdown.trim()) {
					return {
						content: [
							{
								type: 'text' as const,
								text: 'Error: Markdown content cannot be empty.',
							},
						],
						isError: true,
					};
				}

				// Save to file system (version append)
				const filePath = saveSummaryFile(date, markdown, config.outputDir);

				// Store in DB with mode='zero-config'
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
					markdown,
					'{}',
					JSON.stringify({ saved_externally: true }),
					'zero-config',
					'{}',
				);

				logger.info(
					{ date, file: filePath, version: currentVersion + 1 },
					'External summary saved',
				);

				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify({
								saved: true,
								date,
								file: filePath,
								version: currentVersion + 1,
							}),
						},
					],
				};
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err }, 'save_summary failed');
				return {
					content: [{ type: 'text' as const, text: `Error: ${message}` }],
					isError: true,
				};
			}
		},
	);
}
