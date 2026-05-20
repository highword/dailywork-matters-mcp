import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Registers MCP prompts providing guided entry points for summary generation.
 * Prompt: generate-summary - guides the host AI to call the generate tool.
 */
export function registerPrompts(server: McpServer): void {
	server.registerPrompt(
		'generate-summary',
		{
			description:
				'Generate a daily work summary. Optionally specify a date.',
			argsSchema: {
				date: z
					.string()
					.optional()
					.describe('Date in YYYY-MM-DD format (default: today)'),
			},
		},
		async (args) => {
			const date =
				args.date || new Date().toISOString().split('T')[0];
			return {
				messages: [
					{
						role: 'user' as const,
						content: {
							type: 'text' as const,
							text: `Please generate my daily work summary for ${date}. Use the generate_daily_summary tool to gather the data, then present the results in a readable format.`,
						},
					},
				],
			};
		},
	);
}
