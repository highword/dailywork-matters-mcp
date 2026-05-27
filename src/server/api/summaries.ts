import { Hono } from 'hono';
import { getDatabase } from '../database.js';
import { listSummaryDates } from '../persistence.js';
import { loadConfig, resolveConfigPaths } from '../config.js';
import { logger } from '../logger.js';

export const summariesRoutes = new Hono();

/**
 * Validates a date string is in YYYY-MM-DD format and represents a real date.
 * Mitigates T-04-01: strict validation before any filesystem/DB access.
 */
export function isValidDate(dateStr: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}

/**
 * Returns today's date as YYYY-MM-DD.
 */
export function formatToday(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * GET / - List all available summary dates.
 * Returns { dates: string[] } sorted newest first.
 */
summariesRoutes.get('/', (c) => {
	try {
		const config = resolveConfigPaths(loadConfig());
		const dates = listSummaryDates(config.outputDir);
		return c.json({ dates });
	} catch (err) {
		logger.error({ err }, 'Failed to list summary dates');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to list summaries' } },
			500,
		);
	}
});

/**
 * GET /:date - Get full summary for a specific date.
 * Returns summary data from DB (structured_json, markdown, metadata).
 * T-04-01: Date validated with strict regex before DB access.
 */
summariesRoutes.get('/:date', (c) => {
	const date = c.req.param('date');

	if (!isValidDate(date)) {
		return c.json(
			{ error: { code: 'INVALID_PARAMS', message: 'Invalid date format. Expected YYYY-MM-DD.' } },
			400,
		);
	}

	try {
		const db = getDatabase();
		const row = db.prepare(
			'SELECT * FROM summaries WHERE date = ? ORDER BY version DESC LIMIT 1',
		).get(date) as {
			date: string;
			version: number;
			markdown: string;
			structured_json: string;
			metadata: string;
		} | undefined;

		if (!row) {
			return c.json(
				{ error: { code: 'NOT_FOUND', message: `No summary for ${date}` } },
				404,
			);
		}

		return c.json({
			date: row.date,
			version: row.version,
			summary: JSON.parse(row.structured_json),
			markdown: row.markdown,
			metadata: JSON.parse(row.metadata),
		});
	} catch (err) {
		logger.error({ err, date }, 'Failed to fetch summary');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch summary' } },
			500,
		);
	}
});
