import { Hono } from 'hono';
import { loadConfig } from '../config.js';
import { logger } from '../logger.js';

export const modelsRoutes = new Hono();

interface ModelEntry {
	id: string;
	display_name: string;
	type: string;
}

/**
 * GET / - Fetches available models from the configured AI endpoint.
 * Returns an empty list (not an error) when apiKey is missing or endpoint is unreachable.
 */
modelsRoutes.get('/', async (c) => {
	const config = loadConfig();
	const { apiKey, baseUrl } = config.ai;

	if (!apiKey) {
		return c.json({ models: [] });
	}

	const endpoint = `${baseUrl || 'https://api.anthropic.com'}/v1/models`;

	try {
		const res = await fetch(endpoint, {
			headers: { 'x-api-key': apiKey },
		});

		if (!res.ok) {
			logger.warn({ status: res.status, endpoint }, 'Models endpoint returned non-OK');
			return c.json({ models: [], error: 'fetch_failed' });
		}

		const body = (await res.json()) as { data?: ModelEntry[] };
		const models = (body.data ?? []).map((m) => ({
			id: m.id,
			displayName: m.display_name || m.id,
		}));

		return c.json({ models });
	} catch (err) {
		logger.warn({ err, endpoint }, 'Failed to fetch models');
		return c.json({ models: [], error: 'fetch_failed' });
	}
});
