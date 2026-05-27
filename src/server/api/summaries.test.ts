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
	listSummaryDates: vi.fn(),
	loadSummaryFromDisk: vi.fn(),
}));

vi.mock('../config.js', () => ({
	loadConfig: vi.fn(),
	resolveConfigPaths: vi.fn(),
	saveConfig: vi.fn(),
}));

import { summariesRoutes } from './summaries.js';
import { getDatabase } from '../database.js';
import { listSummaryDates } from '../persistence.js';
import { loadConfig, resolveConfigPaths } from '../config.js';

const app = new Hono().route('/api/summaries', summariesRoutes);

describe('summaries API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/summaries', () => {
		it('returns list of dates sorted newest first', async () => {
			const mockConfig = { outputDir: '/tmp/summaries' };
			vi.mocked(loadConfig).mockReturnValue(mockConfig as any);
			vi.mocked(resolveConfigPaths).mockReturnValue(mockConfig as any);
			vi.mocked(listSummaryDates).mockReturnValue(['2026-05-20', '2026-05-19']);

			const res = await app.request('/api/summaries');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual({ dates: ['2026-05-20', '2026-05-19'] });
			expect(listSummaryDates).toHaveBeenCalledWith('/tmp/summaries');
		});

		it('returns empty array when no summaries exist', async () => {
			const mockConfig = { outputDir: '/tmp/summaries' };
			vi.mocked(loadConfig).mockReturnValue(mockConfig as any);
			vi.mocked(resolveConfigPaths).mockReturnValue(mockConfig as any);
			vi.mocked(listSummaryDates).mockReturnValue([]);

			const res = await app.request('/api/summaries');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual({ dates: [] });
		});
	});

	describe('GET /api/summaries/:date', () => {
		it('returns summary when DB row exists', async () => {
			const mockRow = {
				date: '2026-05-20',
				version: 1,
				markdown: '# Test Summary',
				structured_json: JSON.stringify({ tasks: [], summary: 'Test' }),
				metadata: JSON.stringify({ projects: ['test-project'] }),
			};

			const mockGet = vi.fn().mockReturnValue(mockRow);
			const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/summaries/2026-05-20');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual({
				date: '2026-05-20',
				version: 1,
				summary: { tasks: [], summary: 'Test' },
				markdown: '# Test Summary',
				metadata: { projects: ['test-project'] },
			});
			expect(mockPrepare).toHaveBeenCalledWith(
				'SELECT * FROM summaries WHERE date = ? ORDER BY version DESC LIMIT 1',
			);
			expect(mockGet).toHaveBeenCalledWith('2026-05-20');
		});

		it('returns 404 when no summary exists for date', async () => {
			const mockGet = vi.fn().mockReturnValue(undefined);
			const mockPrepare = vi.fn().mockReturnValue({ get: mockGet });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/summaries/2026-05-20');
			expect(res.status).toBe(404);

			const body = await res.json();
			expect(body).toEqual({
				error: { code: 'NOT_FOUND', message: 'No summary for 2026-05-20' },
			});
		});

		it('returns 400 for invalid date format', async () => {
			const res = await app.request('/api/summaries/invalid-date');
			expect(res.status).toBe(400);

			const body = await res.json();
			expect(body).toEqual({
				error: { code: 'INVALID_PARAMS', message: 'Invalid date format. Expected YYYY-MM-DD.' },
			});
		});

		it('returns 400 for date with correct format but invalid values', async () => {
			const res = await app.request('/api/summaries/2026-13-45');
			expect(res.status).toBe(400);

			const body = await res.json();
			expect(body.error.code).toBe('INVALID_PARAMS');
		});

		it('rejects path traversal attempt (Hono normalizes path)', async () => {
			const res = await app.request('/api/summaries/../etc/passwd');
			// Hono normalizes the path so it doesn't reach :date handler as expected.
			// Either 404 (route not matched) or 400 (date validation) is acceptable.
			expect([400, 404]).toContain(res.status);
		});
	});
});
