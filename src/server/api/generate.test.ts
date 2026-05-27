import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock dependencies
vi.mock('../logger.js', () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../database.js', () => ({
	getDatabase: vi.fn(),
}));

vi.mock('../persistence.js', () => ({
	saveSummaryFile: vi.fn(),
}));

vi.mock('../config.js', () => ({
	loadConfig: vi.fn(),
	resolveConfigPaths: vi.fn(),
}));

vi.mock('../intelligence/index.js', () => ({
	generateSummary: vi.fn(),
}));

vi.mock('../adapters/registry.js', () => ({
	AdapterRegistry: vi.fn(),
}));

import { createGenerateRoutes } from './generate.js';
import { getDatabase } from '../database.js';
import { saveSummaryFile } from '../persistence.js';
import { generateSummary } from '../intelligence/index.js';
import type { Config } from '../../shared/types.js';

function createTestApp(overrides?: { registry?: any; config?: Partial<Config> }) {
	const mockConfig = {
		outputDir: '/tmp/summaries',
		ai: { apiKey: 'sk-test', windowModel: 'claude-haiku-4-5-20251001', mergeModel: 'claude-sonnet-4-6-20250514' },
		...overrides?.config,
	} as Config;

	const mockRegistry = overrides?.registry ?? {
		gatherEvents: async function* () {
			yield {
				timestamp: '2026-05-20T10:00:00Z',
				type: 'prompt',
				source: 'claude',
				project: '/test',
				sessionId: 'sess-1',
				parentId: null,
				content: 'test event',
				outcome: null,
				files: [],
				duration: null,
				tokens: null,
				tags: [],
				confidence: null,
				metadata: {},
			};
		},
	};

	const generateRoutes = createGenerateRoutes(mockConfig, mockRegistry);
	return new Hono().route('/api/summaries', generateRoutes);
}

describe('generate API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST /api/summaries/generate', () => {
		it('streams SSE events with progress and complete stages', async () => {
			const mockSummary = {
				date: '2026-05-20',
				summary: 'Test summary',
				tasks: [{ name: 'Task 1', category: 'dev', outcome: 'Done', files: [], time_proportion: 1 }],
				metadata: { total_sessions: 1, total_events: 1, projects: ['test'], generated_at: '2026-05-20', models_used: { window: 'h', merge: 'm' }, mode: 'api' as const },
			};

			vi.mocked(generateSummary).mockResolvedValue({
				mode: 'api',
				summary: mockSummary,
				zeroConfigData: null,
				markdown: '# Test',
			});

			vi.mocked(saveSummaryFile).mockReturnValue('/tmp/summaries/2026-05-20.md');

			const mockGet = vi.fn().mockReturnValue({ maxVer: 0 });
			const mockRun = vi.fn();
			const mockPrepare = vi.fn().mockImplementation((sql: string) => {
				if (sql.includes('SELECT MAX')) return { get: mockGet };
				return { run: mockRun };
			});
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const app = createTestApp();
			const res = await app.request('/api/summaries/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: '2026-05-20' }),
			});

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/event-stream');

			const text = await res.text();
			expect(text).toContain('event: progress');
			expect(text).toContain('"stage":"gathering"');
			expect(text).toContain('"stage":"processing"');
			expect(text).toContain('event: complete');
		});

		it('returns error SSE event for invalid date', async () => {
			const app = createTestApp();
			const res = await app.request('/api/summaries/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: 'not-a-date' }),
			});

			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/event-stream');

			const text = await res.text();
			expect(text).toContain('event: error');
			expect(text).toContain('INVALID_PARAMS');
		});

		it('uses today as default date when no date provided', async () => {
			vi.mocked(generateSummary).mockResolvedValue({
				mode: 'zero-config',
				summary: null,
				zeroConfigData: null,
				markdown: null,
			});

			const emptyRegistry = {
				gatherEvents: async function* () {
					// No events
				},
			};

			const app = createTestApp({ registry: emptyRegistry });
			const res = await app.request('/api/summaries/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(200);
			const text = await res.text();
			// Should start gathering, then complete with no events message
			expect(text).toContain('event: progress');
			expect(text).toContain('event: complete');
		});

		it('streams complete event when no events found for date', async () => {
			const emptyRegistry = {
				gatherEvents: async function* () {
					// No events
				},
			};

			const app = createTestApp({ registry: emptyRegistry });
			const res = await app.request('/api/summaries/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: '2026-05-20' }),
			});

			const text = await res.text();
			expect(text).toContain('event: complete');
			expect(text).toContain('No sessions or git activity');
		});
	});
});
