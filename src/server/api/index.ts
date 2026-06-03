import { Hono } from 'hono';
import type { Config } from '../../shared/types.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import { summariesRoutes } from './summaries.js';
import { createGenerateRoutes } from './generate.js';
import { statsRoutes } from './stats.js';
import { configRoutes } from './config.js';
import { modelsRoutes } from './models.js';

/**
 * Creates the full API sub-app with all routes assembled.
 * Uses factory pattern because generate endpoint needs config + registry.
 *
 * Mount as: app.route('/api', createApiApp(config, registry))
 */
export function createApiApp(config: Config, registry: AdapterRegistry): Hono {
	const apiApp = new Hono();
	const generateRoutes = createGenerateRoutes(config, registry);

	apiApp.route('/summaries', summariesRoutes);
	apiApp.route('/summaries', generateRoutes);
	apiApp.route('/stats', statsRoutes);
	apiApp.route('/config', configRoutes);
	apiApp.route('/models', modelsRoutes);

	return apiApp;
}

export { summariesRoutes } from './summaries.js';
export { createGenerateRoutes } from './generate.js';
export { statsRoutes } from './stats.js';
export { configRoutes } from './config.js';
