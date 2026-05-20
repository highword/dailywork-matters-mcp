import { logger } from '../logger.js';
import type { AIClient } from './ai-client.js';
import { MERGE_SYSTEM_PROMPT } from './prompts.js';
import type { MergeResult, SummaryMetadata, Task } from './types.js';

interface ProjectResult {
	project: string;
	tasks: Task[];
	tokensUsed: { input: number; output: number };
	gaps: string[];
}

export async function mergeProjectResults(
	client: AIClient,
	projectResults: ProjectResult[],
	metadata: Omit<SummaryMetadata, 'generated_at'>,
): Promise<MergeResult> {
	if (projectResults.length === 1 && projectResults[0].tasks.length > 0) {
		return buildSingleProjectResult(projectResults[0], metadata);
	}

	const allTasks = projectResults.flatMap((r) => r.tasks);
	if (allTasks.length === 0) {
		return {
			summary: 'No meaningful work detected for this day.',
			tasks: [],
			metadata: { ...metadata, generated_at: new Date().toISOString() },
		};
	}

	const mergeInput = projectResults.map((r) => ({
		project: r.project,
		tasks: r.tasks,
	}));

	const result = await client.call({
		model: metadata.models_used.merge,
		systemPrompt: MERGE_SYSTEM_PROMPT,
		userContent: JSON.stringify(mergeInput, null, 2),
		maxTokens: 8192,
	});

	const parsed = client.parseJSON<{ summary: string; tasks: Task[] }>(result.text);
	if (!parsed || !parsed.summary || !Array.isArray(parsed.tasks)) {
		logger.warn('Merge pass parse failed, retrying');
		const retry = await client.call({
			model: metadata.models_used.merge,
			systemPrompt: MERGE_SYSTEM_PROMPT,
			userContent: JSON.stringify(mergeInput, null, 2),
			maxTokens: 8192,
		});
		const retryParsed = client.parseJSON<{ summary: string; tasks: Task[] }>(
			retry.text,
		);
		if (!retryParsed || !retryParsed.summary || !Array.isArray(retryParsed.tasks)) {
			return buildFallbackResult(projectResults, metadata);
		}
		return {
			summary: retryParsed.summary,
			tasks: validateMergeTasks(retryParsed.tasks),
			metadata: { ...metadata, generated_at: new Date().toISOString() },
		};
	}

	return {
		summary: parsed.summary,
		tasks: validateMergeTasks(parsed.tasks),
		metadata: { ...metadata, generated_at: new Date().toISOString() },
	};
}

function buildSingleProjectResult(
	result: ProjectResult,
	metadata: Omit<SummaryMetadata, 'generated_at'>,
): MergeResult {
	const sorted = [...result.tasks].sort(
		(a, b) => b.time_proportion - a.time_proportion,
	);
	const topTask = sorted[0];
	const summary = topTask
		? `Focused on ${topTask.name.toLowerCase()} (${topTask.time_proportion}% of day). ${sorted.length} task${sorted.length > 1 ? 's' : ''} completed.`
		: 'Work completed across the day.';

	return {
		summary,
		tasks: sorted,
		metadata: { ...metadata, generated_at: new Date().toISOString() },
	};
}

function buildFallbackResult(
	projectResults: ProjectResult[],
	metadata: Omit<SummaryMetadata, 'generated_at'>,
): MergeResult {
	const allTasks = projectResults.flatMap((r) => r.tasks);
	const total = allTasks.reduce((sum, t) => sum + t.time_proportion, 0);
	const normalized =
		total > 0
			? allTasks.map((t) => ({
					...t,
					time_proportion: Math.round((t.time_proportion / total) * 100),
				}))
			: allTasks;

	return {
		summary: `Work across ${projectResults.length} project${projectResults.length > 1 ? 's' : ''} today.`,
		tasks: normalized.sort((a, b) => b.time_proportion - a.time_proportion),
		metadata: {
			...metadata,
			generated_at: new Date().toISOString(),
			gaps: [
				'Merge AI failed, tasks concatenated without cross-project deduplication',
			],
		},
	};
}

function validateMergeTasks(tasks: unknown[]): Task[] {
	return tasks
		.filter(
			(t): t is Record<string, unknown> => typeof t === 'object' && t !== null,
		)
		.map((t) => ({
			name: typeof t.name === 'string' ? t.name : 'Unnamed task',
			category: typeof t.category === 'string' ? t.category : 'feature',
			outcome: typeof t.outcome === 'string' ? t.outcome : '',
			files: Array.isArray(t.files)
				? t.files.filter((f): f is string => typeof f === 'string')
				: [],
			time_proportion:
				typeof t.time_proportion === 'number' ? t.time_proportion : 0,
		}));
}
