import type { Config, NormalizedEvent } from '../../shared/types.js';
import { logger } from '../logger.js';
import { AIClient } from './ai-client.js';
import { groupByProject } from './aggregation.js';
import { mergeProjectResults } from './merge-processor.js';
import { renderMarkdown } from './renderer.js';
import type { DailySummary, MergeResult, Task, ZeroConfigResponse } from './types.js';
import { processProjectEvents } from './window-processor.js';
import { buildZeroConfigResponse } from './zero-config.js';

export type { DailySummary, ZeroConfigResponse } from './types.js';
export { renderMarkdown } from './renderer.js';

export interface GenerateSummaryResult {
	mode: 'zero-config' | 'api';
	summary: DailySummary | null;
	zeroConfigData: ZeroConfigResponse | null;
	markdown: string | null;
}

export async function generateSummary(
	date: string,
	events: NormalizedEvent[],
	config: Config,
): Promise<GenerateSummaryResult> {
	const hasApiKey =
		config.ai.apiKey !== null && config.ai.apiKey.trim() !== '';

	if (!hasApiKey) {
		logger.info(
			{ date, eventCount: events.length },
			'Generating zero-config response',
		);
		const zeroConfigData = buildZeroConfigResponse(date, events);
		return {
			mode: 'zero-config',
			summary: null,
			zeroConfigData,
			markdown: null,
		};
	}

	logger.info(
		{
			date,
			eventCount: events.length,
			windowModel: config.ai.windowModel,
			mergeModel: config.ai.mergeModel,
		},
		'Generating AI summary',
	);

	const client = new AIClient(config.ai.apiKey!);
	const projectGroups = groupByProject(events);

	const projectResults: Array<{
		project: string;
		tasks: Task[];
		tokensUsed: { input: number; output: number };
		gaps: string[];
	}> = [];

	for (const [project, projectEvents] of projectGroups) {
		logger.info({ project, eventCount: projectEvents.length }, 'Processing project');
		const result = await processProjectEvents(client, projectEvents, {
			model: config.ai.windowModel,
		});
		projectResults.push({ project, ...result });
	}

	const allGaps = projectResults.flatMap((r) => r.gaps);
	const totalSessions = new Set(events.map((e) => e.sessionId)).size;
	const projects = [...projectGroups.keys()];

	const mergeResult: MergeResult = await mergeProjectResults(
		client,
		projectResults,
		{
			total_sessions: totalSessions,
			total_events: events.length,
			projects,
			models_used: {
				window: config.ai.windowModel,
				merge: config.ai.mergeModel,
			},
			mode: 'api',
			gaps: allGaps.length > 0 ? allGaps : undefined,
		},
	);

	const dailySummary: DailySummary = {
		date,
		summary: mergeResult.summary,
		tasks: mergeResult.tasks,
		metadata: mergeResult.metadata,
	};

	const markdown = renderMarkdown(dailySummary);

	return {
		mode: 'api',
		summary: dailySummary,
		zeroConfigData: null,
		markdown,
	};
}
