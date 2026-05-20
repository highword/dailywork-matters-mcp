import { describe, expect, it } from 'vitest';
import type { NormalizedEvent } from '../../shared/types.js';
import { compressEvent, compressEvents, estimateTokens } from './compression.js';

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
	return {
		timestamp: '2026-05-20T10:00:00Z',
		type: 'response',
		source: 'claude',
		project: '/test/project',
		sessionId: 'session-1',
		parentId: null,
		content: 'Hello world',
		outcome: null,
		files: [],
		duration: null,
		tokens: null,
		tags: [],
		confidence: null,
		metadata: {},
		...overrides,
	};
}

describe('compressEvent', () => {
	it('truncates code blocks to 3 lines', () => {
		const event = makeEvent({
			content: '```typescript\nline1\nline2\nline3\nline4\nline5\nline6\n```',
		});
		const result = compressEvent(event);
		expect(result.content).toContain('line1');
		expect(result.content).toContain('line2');
		expect(result.content).toContain('line3');
		expect(result.content).not.toContain('line4');
		expect(result.content).toContain('lines total');
	});

	it('preserves short code blocks unchanged', () => {
		const event = makeEvent({
			content: '```js\nconst x = 1;\n```',
		});
		const result = compressEvent(event);
		expect(result.content).toContain('const x = 1;');
	});

	it('extracts thinking block conclusion', () => {
		const event = makeEvent({
			content:
				'<thinking>First I need to...\n\nThen I should...\n\nConclusion: use pattern X</thinking>',
		});
		const result = compressEvent(event);
		expect(result.content).toContain('[Thinking conclusion:');
		expect(result.content).toContain('Conclusion: use pattern X');
		expect(result.content).not.toContain('First I need to');
	});

	it('truncates content over 2000 chars', () => {
		const event = makeEvent({
			content: 'x'.repeat(3000),
		});
		const result = compressEvent(event);
		expect(result.content.length).toBeLessThan(2000);
		expect(result.content).toContain('[truncated, 3000 chars total]');
	});

	it('preserves project and sessionId in output', () => {
		const event = makeEvent({ project: '/my/project', sessionId: 'abc-123' });
		const result = compressEvent(event);
		expect(result.project).toBe('/my/project');
		expect(result.sessionId).toBe('abc-123');
	});
});

describe('compressEvents', () => {
	it('deduplicates adjacent identical events', () => {
		const events = [
			makeEvent({ content: 'same content here' }),
			makeEvent({ content: 'same content here' }),
			makeEvent({ content: 'different content' }),
		];
		const result = compressEvents(events);
		expect(result).toHaveLength(2);
		expect(result[0].content).toContain('[repeated]');
	});

	it('does not deduplicate non-adjacent similar events', () => {
		const events = [
			makeEvent({ content: 'content A' }),
			makeEvent({ content: 'content B' }),
			makeEvent({ content: 'content A' }),
		];
		const result = compressEvents(events);
		expect(result).toHaveLength(3);
	});
});

describe('estimateTokens', () => {
	it('estimates tokens at ~3.25 chars per token', () => {
		const text = 'a'.repeat(325);
		expect(estimateTokens(text)).toBe(100);
	});

	it('rounds up', () => {
		expect(estimateTokens('hello')).toBe(2); // 5 / 3.25 = 1.54 → 2
	});
});
