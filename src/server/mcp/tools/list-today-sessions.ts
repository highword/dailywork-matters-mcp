import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../../../shared/types.js';
import { createDateRange } from '../../../shared/paths.js';
import type { AdapterRegistry } from '../../adapters/registry.js';
import { logger } from '../../logger.js';

/**
 * Registers the list_today_sessions tool.
 * Returns a list of today's Claude sessions and git repos with event counts.
 */
export function registerListTodaySessions(
	server: McpServer,
	config: Config,
	registry: AdapterRegistry,
): void {
	server.registerTool(
		'list_today_sessions',
		{
			description:
				"List active Claude Code sessions and git repositories for today. Shows session IDs, projects, and event counts.",
		},
		async () => {
			try {
				const today = formatToday();
				const range = createDateRange(today);

				// Gather all events for today to build session/project info
				const sessionMap = new Map<
					string,
					{ project: string; source: string; eventCount: number }
				>();

				for await (const event of registry.gatherEvents(range)) {
					const key = `${event.source}:${event.sessionId}`;
					const existing = sessionMap.get(key);
					if (existing) {
						existing.eventCount++;
					} else {
						sessionMap.set(key, {
							project: event.project,
							source: event.source,
							eventCount: 1,
						});
					}
				}

				const sessions = [...sessionMap.entries()].map(
					([key, info]) => ({
						id: key.split(':').slice(1).join(':'),
						source: info.source,
						project: info.project,
						eventCount: info.eventCount,
					}),
				);

				const claudeSessions = sessions.filter((s) => s.source === 'claude');
				const gitRepos = sessions.filter((s) => s.source === 'git');

				return {
					content: [
						{
							type: 'text' as const,
							text: JSON.stringify({
								date: today,
								claude_sessions: claudeSessions.length,
								git_repos: gitRepos.length,
								total_events: sessions.reduce(
									(sum, s) => sum + s.eventCount,
									0,
								),
								sessions: claudeSessions.map((s) => ({
									sessionId: s.id,
									project: s.project,
									events: s.eventCount,
								})),
								repos: gitRepos.map((r) => ({
									path: r.id,
									project: r.project,
									commits: r.eventCount,
								})),
							}),
						},
					],
				};
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Unknown error occurred';
				logger.error({ err }, 'list_today_sessions failed');
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
