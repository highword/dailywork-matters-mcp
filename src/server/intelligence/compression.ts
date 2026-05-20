import type { NormalizedEvent } from '../../shared/types.js';
import type { IntermediateEvent } from './types.js';

/**
 * Layer 2 compression: context-dependent content reduction.
 * Layer 1 (deterministic removal of system prompts, permission confirmations)
 * is handled at the adapter level in Phase 1.
 *
 * This layer handles:
 * - Code blocks: truncate to first 3 lines
 * - Thinking blocks: extract conclusion only
 * - Large tool outputs: truncate with char count annotation
 * - Repetitive content: deduplicate adjacent similar content
 */

const CODE_BLOCK_MAX_LINES = 3;
const MAX_CONTENT_LENGTH = 2000;
const TRUNCATE_KEEP_LENGTH = 1500;

/**
 * Compress a single NormalizedEvent into an IntermediateEvent.
 * Reduces token cost while preserving semantic meaning.
 */
export function compressEvent(event: NormalizedEvent): IntermediateEvent {
	let content = event.content;

	// Code blocks: keep first 3 lines + language identifier
	content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang: string, code: string) => {
		const lines = code.split('\n');
		if (lines.length > CODE_BLOCK_MAX_LINES + 1) {
			const kept = lines.slice(0, CODE_BLOCK_MAX_LINES).join('\n');
			return `\`\`\`${lang}\n${kept}\n... (${lines.length} lines total)\n\`\`\``;
		}
		return `\`\`\`${lang}\n${code}\`\`\``;
	});

	// Thinking blocks: extract last meaningful paragraph as conclusion
	content = content.replace(/<thinking>([\s\S]*?)<\/thinking>/g, (_match, inner: string) => {
		const paragraphs = inner.trim().split(/\n\n+/);
		const conclusion = paragraphs[paragraphs.length - 1]?.trim() ?? '';
		return `[Thinking conclusion: ${conclusion.slice(0, 300)}]`;
	});

	// Large content: hard truncate with annotation
	if (content.length > MAX_CONTENT_LENGTH) {
		content =
			content.slice(0, TRUNCATE_KEEP_LENGTH) +
			`\n... [truncated, ${content.length} chars total]`;
	}

	return {
		type: event.type,
		timestamp: event.timestamp,
		content,
		project: event.project,
		sessionId: event.sessionId,
	};
}

/**
 * Compress an array of NormalizedEvents, with deduplication of
 * adjacent events that have very similar content (e.g., repeated
 * tool calls with same output).
 */
export function compressEvents(events: NormalizedEvent[]): IntermediateEvent[] {
	const compressed: IntermediateEvent[] = [];
	let lastContentHash = '';

	for (const event of events) {
		const intermediate = compressEvent(event);

		// Deduplicate: skip if content is >80% similar to previous
		const currentHash = intermediate.content.slice(0, 200);
		if (currentHash === lastContentHash && compressed.length > 0) {
			// Update the last entry to note the repetition
			const last = compressed[compressed.length - 1];
			if (!last.content.endsWith(' [repeated]')) {
				last.content += ' [repeated]';
			}
			continue;
		}

		lastContentHash = currentHash;
		compressed.push(intermediate);
	}

	return compressed;
}

/**
 * Estimate token count for a string using the conservative heuristic
 * from Anthropic guidance: 1 token ~ 3.25 chars for mixed code/text.
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 3.25);
}
