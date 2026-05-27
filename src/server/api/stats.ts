import { Hono } from 'hono';
import { getDatabase } from '../database.js';
import { logger } from '../logger.js';
import { isValidDate } from './summaries.js';

export const statsRoutes = new Hono();

/**
 * Validates from/to query params. Returns parsed params or null.
 * T-04-02: Validates date params with same strict regex; uses parameterized SQL.
 */
function validateDateRange(c: { req: { query: (key: string) => string | undefined } }): {
	from: string;
	to: string;
} | null {
	const from = c.req.query('from');
	const to = c.req.query('to');

	if (!from || !to) return null;
	if (!isValidDate(from) || !isValidDate(to)) return null;

	return { from, to };
}

/**
 * GET /categories - Category distribution for a date range.
 * Returns aggregated category data for donut/bar charts.
 */
statsRoutes.get('/categories', (c) => {
	const range = validateDateRange(c);
	if (!range) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Missing or invalid from/to query params. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const rows = db.prepare(
			`SELECT t.category, SUM(t.time_proportion) as total_proportion, COUNT(*) as task_count
			 FROM tasks t JOIN summaries s ON t.summary_id = s.id
			 WHERE s.date BETWEEN ? AND ?
			 GROUP BY t.category
			 ORDER BY total_proportion DESC`,
		).all(range.from, range.to) as Array<{
			category: string;
			total_proportion: number;
			task_count: number;
		}>;

		return c.json({ data: rows });
	} catch (err) {
		logger.error({ err }, 'Failed to fetch category stats');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch category stats' } },
			500,
		);
	}
});

/**
 * GET /trends - Daily task count over time.
 * Returns date-keyed task counts for line/area charts.
 */
statsRoutes.get('/trends', (c) => {
	const range = validateDateRange(c);
	if (!range) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Missing or invalid from/to query params. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const rows = db.prepare(
			`SELECT s.date, COUNT(t.id) as task_count
			 FROM summaries s JOIN tasks t ON t.summary_id = s.id
			 WHERE s.date BETWEEN ? AND ?
			 GROUP BY s.date
			 ORDER BY s.date`,
		).all(range.from, range.to) as Array<{
			date: string;
			task_count: number;
		}>;

		return c.json({ data: rows });
	} catch (err) {
		logger.error({ err }, 'Failed to fetch trend stats');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch trend stats' } },
			500,
		);
	}
});

/**
 * GET /files - Top 20 most active files in a date range.
 * Parses JSON file arrays from tasks and aggregates by occurrence count.
 */
statsRoutes.get('/files', (c) => {
	const range = validateDateRange(c);
	if (!range) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Missing or invalid from/to query params. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const rows = db.prepare(
			`SELECT t.files FROM tasks t JOIN summaries s ON t.summary_id = s.id
			 WHERE s.date BETWEEN ? AND ?`,
		).all(range.from, range.to) as Array<{ files: string }>;

		// Aggregate file occurrences
		const fileCounts = new Map<string, number>();
		for (const row of rows) {
			try {
				const files = JSON.parse(row.files) as string[];
				for (const file of files) {
					fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
				}
			} catch {
				// Skip invalid JSON
			}
		}

		// Sort by count, take top 20
		const data = [...fileCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 20)
			.map(([file, count]) => ({ file, count }));

		return c.json({ data });
	} catch (err) {
		logger.error({ err }, 'Failed to fetch file stats');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch file stats' } },
			500,
		);
	}
});

/**
 * GET /hours - Work hours distribution (24h grouped by hour).
 * Extracts created_at times from summaries and groups by hour.
 */
statsRoutes.get('/hours', (c) => {
	const range = validateDateRange(c);
	if (!range) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Missing or invalid from/to query params. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const rows = db.prepare(
			`SELECT s.date, s.created_at FROM summaries s
			 WHERE s.date BETWEEN ? AND ?`,
		).all(range.from, range.to) as Array<{
			date: string;
			created_at: string;
		}>;

		// Group by hour (0-23)
		const hourCounts = new Array(24).fill(0) as number[];
		for (const row of rows) {
			try {
				const d = new Date(row.created_at);
				if (!Number.isNaN(d.getTime())) {
					hourCounts[d.getHours()]++;
				}
			} catch {
				// Skip invalid dates
			}
		}

		const data = hourCounts.map((count, hour) => ({ hour, count }));
		return c.json({ data });
	} catch (err) {
		logger.error({ err }, 'Failed to fetch hour stats');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch hour stats' } },
			500,
		);
	}
});

/**
 * GET /heatmap - GitHub-style contribution heatmap data.
 * Returns date -> task_count for calendar rendering.
 */
statsRoutes.get('/heatmap', (c) => {
	const range = validateDateRange(c);
	if (!range) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Missing or invalid from/to query params. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const rows = db.prepare(
			`SELECT s.date, COUNT(t.id) as task_count
			 FROM summaries s LEFT JOIN tasks t ON t.summary_id = s.id
			 WHERE s.date BETWEEN ? AND ?
			 GROUP BY s.date`,
		).all(range.from, range.to) as Array<{
			date: string;
			task_count: number;
		}>;

		return c.json({ data: rows });
	} catch (err) {
		logger.error({ err }, 'Failed to fetch heatmap stats');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch heatmap stats' } },
			500,
		);
	}
});

/**
 * GET /projects - Project time allocation from summary metadata.
 * Aggregates projects from summary metadata JSON.
 */
statsRoutes.get('/projects', (c) => {
	const range = validateDateRange(c);
	if (!range) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Missing or invalid from/to query params. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const rows = db.prepare(
			`SELECT s.date, s.metadata FROM summaries s
			 WHERE s.date BETWEEN ? AND ?`,
		).all(range.from, range.to) as Array<{
			date: string;
			metadata: string;
		}>;

		// Aggregate project occurrences from metadata.projects arrays
		const projectCounts = new Map<string, number>();
		for (const row of rows) {
			try {
				const metadata = JSON.parse(row.metadata) as { projects?: string[] };
				if (metadata.projects && Array.isArray(metadata.projects)) {
					for (const project of metadata.projects) {
						projectCounts.set(project, (projectCounts.get(project) ?? 0) + 1);
					}
				}
			} catch {
				// Skip invalid JSON
			}
		}

		const data = [...projectCounts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([project, count]) => ({ project, count }));

		return c.json({ data });
	} catch (err) {
		logger.error({ err }, 'Failed to fetch project stats');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch project stats' } },
			500,
		);
	}
});
