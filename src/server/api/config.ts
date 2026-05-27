import { Hono } from 'hono';
import { loadConfig, saveConfig } from '../config.js';
import { logger } from '../logger.js';
import type { Config } from '../../shared/types.js';

export const configRoutes = new Hono();

/**
 * GET / - Returns the current configuration.
 * T-04-04: API key visible to local user (accepted risk - localhost only).
 */
configRoutes.get('/', (c) => {
	try {
		const config = loadConfig();
		return c.json({ config });
	} catch (err) {
		logger.error({ err }, 'Failed to load config');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to load configuration' } },
			500,
		);
	}
});

/**
 * PUT / - Merge partial config updates and persist to disk.
 * T-04-03: Only known Config fields accepted via saveConfig merge.
 */
configRoutes.put('/', async (c) => {
	let body: Partial<Config>;

	try {
		body = await c.req.json<Partial<Config>>();
	} catch {
		return c.json(
			{ error: { code: 'INVALID_BODY', message: 'Request body must be valid JSON' } },
			400,
		);
	}

	try {
		const merged = saveConfig(body);
		logger.info('Config updated via API');
		return c.json({ config: merged });
	} catch (err) {
		logger.error({ err }, 'Failed to save config');
		return c.json(
			{ error: { code: 'INTERNAL_ERROR', message: 'Failed to save configuration' } },
			500,
		);
	}
});
