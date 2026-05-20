import { describe, expect, it } from 'vitest';
import type { Config, NormalizedEvent } from '../../shared/types.js';
import { DEFAULT_CONFIG } from '../../shared/types.js';
import { generateSummary } from './index.js';
import { buildZeroConfigResponse } from './zero-config.js';
import { renderMarkdown } from './renderer.js';
import type { DailySummary } from './types.js';

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
	return {
		timestamp: '2026-05-20T10:00:00Z',
		type: 'response',
		source: 'claude',
		project: '/test/project',
		sessionId: 'session-1',
		parentId: null,
		content: 'Implemented user authentication with JWT tokens',
		outcome: null,
		files: ['src/auth.ts'],
		duration: null,
		tokens: null,
		tags: [],
		confidence: null,
		metadata: {},
		...overrides,
	};
}

describe('generateSummary', () => {
	it('returns zero-config mode when no API key configured', async () => {
		const events = [
			makeEvent({ content: 'Added login endpoint' }),
			makeEvent({
				content: 'Fixed password hashing',
				project: '/other/project',
				sessionId: 'session-2',
			}),
		];
		const config: Config = { ...DEFAULT_CONFIG };

		const result = await generateSummary('2026-05-20', events, config);

		expect(result.mode).toBe('zero-config');
		expect(result.zeroConfigData).not.toBeNull();
		expect(result.zeroConfigData!.date).toBe('2026-05-20');
		expect(result.zeroConfigData!.event_count).toBe(2);
		expect(result.zeroConfigData!.session_count).toBe(2);
		expect(result.zeroConfigData!.projects).toHaveLength(2);
		expect(result.summary).toBeNull();
		expect(result.markdown).toBeNull();
	});

	it('returns zero-config mode when API key is empty string', async () => {
		const events = [makeEvent()];
		const config: Config = {
			...DEFAULT_CONFIG,
			ai: { ...DEFAULT_CONFIG.ai, apiKey: '  ' },
		};

		const result = await generateSummary('2026-05-20', events, config);
		expect(result.mode).toBe('zero-config');
	});
});

describe('buildZeroConfigResponse', () => {
	it('groups events by project with compressed content', () => {
		const events = [
			makeEvent({ project: '/projectA', content: 'Event A1' }),
			makeEvent({ project: '/projectA', content: 'Event A2' }),
			makeEvent({
				project: '/projectB',
				content: 'Event B1',
				sessionId: 'session-2',
			}),
		];

		const result = buildZeroConfigResponse('2026-05-20', events);

		expect(result.date).toBe('2026-05-20');
		expect(result.projects).toHaveLength(2);
		expect(result.session_count).toBe(2);
		expect(result.event_count).toBe(3);

		const projectA = result.projects.find((p) => p.project === '/projectA');
		expect(projectA).toBeDefined();
		expect(projectA!.events).toHaveLength(2);
		expect(projectA!.session_ids).toContain('session-1');
	});

	it('handles empty events array', () => {
		const result = buildZeroConfigResponse('2026-05-20', []);
		expect(result.projects).toHaveLength(0);
		expect(result.session_count).toBe(0);
		expect(result.event_count).toBe(0);
	});
});

describe('renderMarkdown', () => {
	it('produces valid markdown with all sections', () => {
		const summary: DailySummary = {
			date: '2026-05-20',
			summary: 'Built authentication system with JWT.',
			tasks: [
				{
					name: 'Implement JWT auth',
					category: 'feature',
					outcome: 'Added login/logout with token-based authentication',
					files: ['src/auth.ts', 'src/middleware.ts'],
					time_proportion: 70,
				},
				{
					name: 'Fix database migration',
					category: 'bugfix',
					outcome: 'Resolved WAL mode conflict on Windows',
					files: ['src/db.ts'],
					time_proportion: 30,
				},
			],
			metadata: {
				total_sessions: 3,
				total_events: 45,
				projects: ['/project-a'],
				generated_at: '2026-05-20T18:00:00Z',
				models_used: {
					window: 'claude-haiku-4-5-20251001',
					merge: 'claude-sonnet-4-6-20250514',
				},
				mode: 'api',
			},
		};

		const md = renderMarkdown(summary);

		expect(md).toContain('# Daily Summary: 2026-05-20');
		expect(md).toContain('Built authentication system with JWT.');
		expect(md).toContain('| Task | Category | Time |');
		expect(md).toContain('| Implement JWT auth | feature | 70% |');
		expect(md).toContain('### Implement JWT auth');
		expect(md).toContain('Added login/logout with token-based authentication');
		expect(md).toContain('- `src/auth.ts`');
		expect(md).toContain('Sessions: 3');
		expect(md).toContain('Events: 45');
	});

	it('handles tasks with no files', () => {
		const summary: DailySummary = {
			date: '2026-05-20',
			summary: 'Research day.',
			tasks: [
				{
					name: 'Research auth patterns',
					category: 'research',
					outcome: 'Evaluated OAuth2 vs JWT approaches',
					files: [],
					time_proportion: 100,
				},
			],
			metadata: {
				total_sessions: 1,
				total_events: 10,
				projects: ['/proj'],
				generated_at: '2026-05-20T18:00:00Z',
				models_used: {
					window: 'claude-haiku-4-5-20251001',
					merge: 'claude-sonnet-4-6-20250514',
				},
				mode: 'api',
			},
		};

		const md = renderMarkdown(summary);
		expect(md).not.toContain('**Files:**');
		expect(md).toContain('### Research auth patterns');
	});
});
