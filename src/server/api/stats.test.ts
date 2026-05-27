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
}));

vi.mock('../config.js', () => ({
	loadConfig: vi.fn(),
	resolveConfigPaths: vi.fn(),
}));

import { statsRoutes } from './stats.js';
import { getDatabase } from '../database.js';

const app = new Hono().route('/api/stats', statsRoutes);

describe('stats API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/stats/categories', () => {
		it('returns aggregated category data for valid date range', async () => {
			const mockRows = [
				{ category: 'development', total_proportion: 0.6, task_count: 5 },
				{ category: 'review', total_proportion: 0.3, task_count: 3 },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/categories?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual({ data: mockRows });
			expect(mockAll).toHaveBeenCalledWith('2026-05-01', '2026-05-31');
		});

		it('returns 400 when from/to params are missing', async () => {
			const res = await app.request('/api/stats/categories');
			expect(res.status).toBe(400);

			const body = await res.json();
			expect(body.error.code).toBe('INVALID_PARAMS');
			expect(body.error.message).toContain('Missing or invalid');
		});

		it('returns 400 when from param has invalid format', async () => {
			const res = await app.request('/api/stats/categories?from=not-a-date&to=2026-05-31');
			expect(res.status).toBe(400);

			const body = await res.json();
			expect(body.error.code).toBe('INVALID_PARAMS');
		});

		it('returns 400 when to param has invalid format', async () => {
			const res = await app.request('/api/stats/categories?from=2026-05-01&to=invalid');
			expect(res.status).toBe(400);
		});
	});

	describe('GET /api/stats/trends', () => {
		it('returns daily task counts for valid range', async () => {
			const mockRows = [
				{ date: '2026-05-19', task_count: 3 },
				{ date: '2026-05-20', task_count: 5 },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/trends?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual({ data: mockRows });
		});

		it('returns 400 when missing query params', async () => {
			const res = await app.request('/api/stats/trends?from=2026-05-01');
			expect(res.status).toBe(400);
		});
	});

	describe('GET /api/stats/files', () => {
		it('returns top 20 files by occurrence count', async () => {
			const mockRows = [
				{ files: JSON.stringify(['src/app.ts', 'src/main.ts']) },
				{ files: JSON.stringify(['src/app.ts', 'src/config.ts']) },
				{ files: JSON.stringify(['src/app.ts']) },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/files?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.data[0]).toEqual({ file: 'src/app.ts', count: 3 });
			expect(body.data[1]).toEqual({ file: 'src/main.ts', count: 1 });
		});

		it('handles invalid JSON in files column gracefully', async () => {
			const mockRows = [
				{ files: 'not-valid-json' },
				{ files: JSON.stringify(['src/app.ts']) },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/files?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.data).toEqual([{ file: 'src/app.ts', count: 1 }]);
		});
	});

	describe('GET /api/stats/hours', () => {
		it('returns 24-hour distribution', async () => {
			const mockRows = [
				{ date: '2026-05-20', created_at: '2026-05-20T09:30:00' },
				{ date: '2026-05-20', created_at: '2026-05-20T14:15:00' },
				{ date: '2026-05-21', created_at: '2026-05-21T09:00:00' },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/hours?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.data).toHaveLength(24);
			// Hour 9 should have 2 entries
			expect(body.data[9].count).toBe(2);
			expect(body.data[14].count).toBe(1);
			expect(body.data[0].count).toBe(0);
		});
	});

	describe('GET /api/stats/heatmap', () => {
		it('returns date-task_count pairs for calendar rendering', async () => {
			const mockRows = [
				{ date: '2026-05-19', task_count: 3 },
				{ date: '2026-05-20', task_count: 5 },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/heatmap?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual({ data: mockRows });
		});

		it('returns 400 for missing date range', async () => {
			const res = await app.request('/api/stats/heatmap');
			expect(res.status).toBe(400);
		});
	});

	describe('GET /api/stats/projects', () => {
		it('returns aggregated project occurrences from metadata', async () => {
			const mockRows = [
				{ date: '2026-05-19', metadata: JSON.stringify({ projects: ['project-a', 'project-b'] }) },
				{ date: '2026-05-20', metadata: JSON.stringify({ projects: ['project-a'] }) },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/projects?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.data[0]).toEqual({ project: 'project-a', count: 2 });
			expect(body.data[1]).toEqual({ project: 'project-b', count: 1 });
		});

		it('handles metadata without projects field', async () => {
			const mockRows = [
				{ date: '2026-05-19', metadata: JSON.stringify({}) },
				{ date: '2026-05-20', metadata: JSON.stringify({ projects: ['project-a'] }) },
			];

			const mockAll = vi.fn().mockReturnValue(mockRows);
			const mockPrepare = vi.fn().mockReturnValue({ all: mockAll });
			vi.mocked(getDatabase).mockReturnValue({ prepare: mockPrepare } as any);

			const res = await app.request('/api/stats/projects?from=2026-05-01&to=2026-05-31');
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.data).toEqual([{ project: 'project-a', count: 1 }]);
		});
	});
});
