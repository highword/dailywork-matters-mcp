import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Config } from '../../../shared/types.js';
import { loadConfig, saveConfig } from '../../config.js';
import { logger } from '../../logger.js';

// Keys that are safe to update via configure_settings
const ALLOWED_KEYS: ReadonlySet<string> = new Set([
	'language',
	'outputDir',
	'claudeSessionsDir',
	'httpPort',
	'scheduleTime',
	'maxTasksPerSummary',
	'showFileList',
	'showTokenStats',
]);

/**
 * Registers the configure_settings tool.
 * Allows viewing and updating configuration.
 * API key is masked in 'get' output for security.
 */
export function registerConfigureSettings(
	server: McpServer,
	_config: Config,
): void {
	server.registerTool(
		'configure_settings',
		{
			description:
				"View or update dailywork-matters configuration. Use action 'get' to view current settings, 'set' to update a specific key.",
			inputSchema: {
				action: z.enum(['get', 'set']).describe("Action: 'get' or 'set'"),
				key: z
					.string()
					.optional()
					.describe("Configuration key to set (required for 'set' action)"),
				value: z
					.string()
					.optional()
					.describe("Value to set (required for 'set' action)"),
			},
		},
		async (args) => {
			try {
				if (args.action === 'get') {
					const current = loadConfig();
					// Mask API key for security
					const sanitized = {
						...current,
						ai: {
							...current.ai,
							apiKey: current.ai.apiKey
								? `${current.ai.apiKey.slice(0, 8)}...${current.ai.apiKey.slice(-4)}`
								: null,
						},
					};
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify(sanitized, null, 2),
							},
						],
					};
				}

				// action === 'set'
				if (!args.key) {
					return {
						content: [
							{
								type: 'text' as const,
								text: "Error: 'key' is required for 'set' action.",
							},
						],
						isError: true,
					};
				}

				if (!args.value) {
					return {
						content: [
							{
								type: 'text' as const,
								text: "Error: 'value' is required for 'set' action.",
							},
						],
						isError: true,
					};
				}

				// Handle nested ai.* keys
				if (args.key.startsWith('ai.')) {
					const aiKey = args.key.slice(3);
					if (!['apiKey', 'baseUrl', 'windowModel', 'mergeModel'].includes(aiKey)) {
						return {
							content: [
								{
									type: 'text' as const,
									text: `Error: Unknown AI configuration key "${args.key}". Valid keys: ai.apiKey, ai.baseUrl, ai.windowModel, ai.mergeModel`,
								},
							],
							isError: true,
						};
					}
					const current = loadConfig();
					const updated = saveConfig({
						ai: { ...current.ai, [aiKey]: args.value },
					});
					logger.info({ key: args.key }, 'Configuration updated');
					return {
						content: [
							{
								type: 'text' as const,
								text: JSON.stringify({
									updated: true,
									key: args.key,
									message: `Configuration key "${args.key}" updated successfully.`,
								}),
							},
						],
					};
				}

				if (!ALLOWED_KEYS.has(args.key)) {
					return {
						content: [
							{
								type: 'text' as const,
								text: `Error: Unknown or read-only configuration key "${args.key}". Valid keys: ${[...ALLOWED_KEYS].join(', ')}, ai.apiKey, ai.baseUrl, ai.windowModel, ai.mergeModel`,
							},
						],
						isError: true,
					};
				}

				// Parse value based on expected type
				const parsedValue = parseConfigValue(args.key, args.value);
				saveConfig({ [args.key]: parsedValue } as Partial<Config>);
				logger.info({ key: args.key }, 'Configuration updated');

				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify({
								updated: true,
								key: args.key,
								value: parsedValue,
								message: `Configuration key "${args.key}" updated successfully.`,
							}),
						},
					],
				};
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err }, 'configure_settings failed');
				return {
					content: [{ type: 'text' as const, text: `Error: ${message}` }],
					isError: true,
				};
			}
		},
	);
}

function parseConfigValue(
	key: string,
	value: string,
): string | number | boolean | null {
	switch (key) {
		case 'httpPort':
		case 'maxTasksPerSummary': {
			const num = Number.parseInt(value, 10);
			if (Number.isNaN(num)) {
				throw new Error(`Value for "${key}" must be a number.`);
			}
			return num;
		}
		case 'showFileList':
		case 'showTokenStats':
			return value === 'true';
		case 'scheduleTime':
			return value === 'null' ? null : value;
		default:
			return value;
	}
}
