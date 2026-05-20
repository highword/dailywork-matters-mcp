import type { NormalizedEvent } from '../../shared/types.js';
import { logger } from '../logger.js';
import type { AIClient } from './ai-client.js';
import { buildWindows, needsMultiWindow } from './aggregation.js';
import { compressEvents } from './compression.js';
import { buildWindowPrompt, formatWindowContent } from './prompts.js';
import type { IntermediateEvent, Task, WindowResult } from './types.js';

interface WindowProcessorOptions {
	model: string;
	maxTokens: number;
}

const DEFAULT_OPTIONS: WindowProcessorOptions = {
	model: 'claude-haiku-4-5-20251001',
	maxTokens: 4096,
};

export async function processProjectEvents(
	client: AIClient,
	events: NormalizedEvent[],
	options: Partial<WindowProcessorOptions> = {},
): Promise<{ tasks: Task[]; tokensUsed: { input: number; output: number }; gaps: string[] }> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const compressed = compressEvents(events);
	const gaps: string[] = [];
	let totalInput = 0;
	let totalOutput = 0;

	if (!needsMultiWindow(compressed)) {
		return processSingleCall(client, compressed, opts);
	}

	const windows = buildWindows(events);
	let accumulatedTasks: Task[] | null = null;

	logger.info(
		{ windowCount: windows.length, model: opts.model },
		'Starting multi-window processing',
	);

	for (let i = 0; i < windows.length; i++) {
		try {
			const result = await processOneWindow(
				client,
				windows[i],
				accumulatedTasks,
				i,
				opts,
			);
			accumulatedTasks = result.tasks;
			totalInput += result.tokens_used.input;
			totalOutput += result.tokens_used.output;
		} catch (error) {
			const gapMsg = `Window ${i + 1}/${windows.length} failed: ${(error as Error).message}`;
			logger.warn(
				{ window: i, total: windows.length, error },
				'Window processing failed, skipping',
			);
			gaps.push(gapMsg);
		}
	}

	return {
		tasks: accumulatedTasks ?? [],
		tokensUsed: { input: totalInput, output: totalOutput },
		gaps,
	};
}

async function processSingleCall(
	client: AIClient,
	events: IntermediateEvent[],
	opts: WindowProcessorOptions,
): Promise<{ tasks: Task[]; tokensUsed: { input: number; output: number }; gaps: string[] }> {
	const content = formatWindowContent(events);
	const systemPrompt = buildWindowPrompt(null);

	const result = await client.call({
		model: opts.model,
		systemPrompt,
		userContent: content,
		maxTokens: opts.maxTokens,
	});

	const parsed = client.parseJSON<{ tasks: Task[] }>(result.text);
	if (!parsed || !Array.isArray(parsed.tasks)) {
		logger.warn('First parse failed, retrying window call');
		const retry = await client.call({
			model: opts.model,
			systemPrompt,
			userContent: content,
			maxTokens: opts.maxTokens,
		});
		const retryParsed = client.parseJSON<{ tasks: Task[] }>(retry.text);
		if (!retryParsed || !Array.isArray(retryParsed.tasks)) {
			return {
				tasks: [],
				tokensUsed: { input: result.usage.input_tokens, output: result.usage.output_tokens },
				gaps: ['Single call JSON parse failed after retry'],
			};
		}
		return {
			tasks: validateTasks(retryParsed.tasks),
			tokensUsed: {
				input: result.usage.input_tokens + retry.usage.input_tokens,
				output: result.usage.output_tokens + retry.usage.output_tokens,
			},
			gaps: [],
		};
	}

	return {
		tasks: validateTasks(parsed.tasks),
		tokensUsed: { input: result.usage.input_tokens, output: result.usage.output_tokens },
		gaps: [],
	};
}

async function processOneWindow(
	client: AIClient,
	window: IntermediateEvent[],
	previousTasks: Task[] | null,
	windowIndex: number,
	opts: WindowProcessorOptions,
): Promise<WindowResult> {
	const content = formatWindowContent(window);
	const systemPrompt = buildWindowPrompt(previousTasks);

	const result = await client.call({
		model: opts.model,
		systemPrompt,
		userContent: content,
		maxTokens: opts.maxTokens,
	});

	const parsed = client.parseJSON<{ tasks: Task[] }>(result.text);
	if (!parsed || !Array.isArray(parsed.tasks)) {
		const retry = await client.call({
			model: opts.model,
			systemPrompt,
			userContent: content,
			maxTokens: opts.maxTokens,
		});
		const retryParsed = client.parseJSON<{ tasks: Task[] }>(retry.text);
		if (!retryParsed || !Array.isArray(retryParsed.tasks)) {
			throw new Error(`Window ${windowIndex} JSON parse failed after retry`);
		}
		return {
			tasks: validateTasks(retryParsed.tasks),
			window_index: windowIndex,
			tokens_used: {
				input: retry.usage.input_tokens,
				output: retry.usage.output_tokens,
			},
		};
	}

	return {
		tasks: validateTasks(parsed.tasks),
		window_index: windowIndex,
		tokens_used: { input: result.usage.input_tokens, output: result.usage.output_tokens },
	};
}

function validateTasks(tasks: unknown[]): Task[] {
	return tasks
		.filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
		.map((t) => ({
			name: typeof t.name === 'string' ? t.name : 'Unnamed task',
			category: typeof t.category === 'string' ? t.category : 'feature',
			outcome: typeof t.outcome === 'string' ? t.outcome : '',
			files: Array.isArray(t.files)
				? t.files.filter((f): f is string => typeof f === 'string')
				: [],
			time_proportion:
				typeof t.time_proportion === 'number' ? t.time_proportion : 0,
		}))
		.filter((t) => t.name !== 'Unnamed task' || t.outcome !== '');
}
