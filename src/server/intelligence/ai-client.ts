import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../logger.js';

export interface AICallOptions {
	model: string;
	systemPrompt: string;
	userContent: string;
	maxTokens: number;
}

export interface AICallResult {
	text: string;
	usage: { input_tokens: number; output_tokens: number };
}

export class AIClient {
	private client: Anthropic | null = null;
	private apiKey: string;
	private baseUrl: string | null;

	constructor(apiKey: string, baseUrl?: string | null) {
		this.apiKey = apiKey;
		this.baseUrl = baseUrl ?? null;
	}

	private getClient(): Anthropic {
		if (!this.client) {
			this.client = new Anthropic({
				apiKey: this.apiKey,
				...(this.baseUrl && { baseURL: this.baseUrl }),
			});
		}
		return this.client;
	}

	async call(options: AICallOptions, maxRetries = 3): Promise<AICallResult> {
		const { model, systemPrompt, userContent, maxTokens } = options;
		let lastError: unknown;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const response = await this.getClient().messages.create({
					model,
					max_tokens: maxTokens,
					system: systemPrompt,
					messages: [{ role: 'user', content: userContent }],
				});

				const text =
					response.content[0]?.type === 'text' ? response.content[0].text : '';

				return {
					text,
					usage: {
						input_tokens: response.usage.input_tokens,
						output_tokens: response.usage.output_tokens,
					},
				};
			} catch (error: unknown) {
				lastError = error;
				const status = (error as { status?: number }).status;

				if (status === 400 || status === 401) {
					throw error;
				}

				if (attempt < maxRetries) {
					const delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
					logger.warn(
						{ attempt: attempt + 1, maxRetries, status, delay: Math.round(delay) },
						'AI call failed, retrying',
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError;
	}

	parseJSON<T>(text: string): T | null {
		const cleaned = text
			.replace(/^```(?:json)?\s*\n?/m, '')
			.replace(/\n?\s*```\s*$/m, '')
			.trim();
		try {
			return JSON.parse(cleaned) as T;
		} catch {
			logger.warn(
				{ textLength: text.length, first100: text.slice(0, 100) },
				'Failed to parse AI JSON response',
			);
			return null;
		}
	}
}
