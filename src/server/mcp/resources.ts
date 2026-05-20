import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../../shared/types.js';
import { listSummaryDates, loadSummaryFromDisk } from '../persistence.js';

/**
 * Registers MCP resources exposing stored summaries via URI template.
 * Resource: summary://{date} - access any stored daily summary by date.
 * The list callback enumerates all dates with available summaries.
 */
export function registerResources(server: McpServer, config: Config): void {
	server.registerResource(
		'daily-summary',
		new ResourceTemplate('summary://{date}', {
			list: async () => {
				const dates = listSummaryDates(config.outputDir);
				return {
					resources: dates.map((date) => ({
						uri: `summary://${date}`,
						name: `Daily Summary: ${date}`,
						mimeType: 'text/markdown' as const,
					})),
				};
			},
		}),
		{
			description: 'Daily work summaries. Access by date (YYYY-MM-DD).',
			mimeType: 'text/markdown',
		},
		async (uri, { date }) => {
			const markdown = loadSummaryFromDisk(date as string, config.outputDir);
			if (!markdown) {
				return {
					contents: [
						{
							uri: uri.href,
							text: `No summary found for ${date}`,
							mimeType: 'text/plain',
						},
					],
				};
			}
			return {
				contents: [
					{
						uri: uri.href,
						text: markdown,
						mimeType: 'text/markdown',
					},
				],
			};
		},
	);
}
