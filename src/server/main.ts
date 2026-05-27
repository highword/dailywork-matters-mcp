import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import fs from 'node:fs';
import path from 'node:path';
import { ClaudeAdapter } from './adapters/claude/claude.adapter.js';
import { GitAdapter } from './adapters/git/git.adapter.js';
import { AdapterRegistry } from './adapters/registry.js';
import { createApiApp } from './api/index.js';
import { loadConfig, resolveConfigPaths } from './config.js';
import { closeDatabase, initDatabase } from './database.js';
import { logger } from './logger.js';
import { createMcpServer, registerAll } from './mcp/index.js';

async function main() {
	const config = resolveConfigPaths(loadConfig());

	// Initialize database
	initDatabase(config.dbPath);

	// Create adapter registry and register data sources
	const registry = new AdapterRegistry();
	registry.register(new ClaudeAdapter(config.claudeSessionsDir));
	registry.register(new GitAdapter(config));

	// Create MCP server and register all capabilities (tools, resources, prompts)
	const mcpServer = createMcpServer();
	registerAll(mcpServer, config, registry);

	// Connect stdio transport
	const transport = new StdioServerTransport();
	await mcpServer.connect(transport);
	logger.info('MCP server connected via stdio');

	// Start HTTP server with API routes + static serving
	const app = new Hono();
	app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

	// Mount REST API routes FIRST (before static serving) — per D-15, Pitfall 2
	const apiApp = createApiApp(config, registry);
	app.route('/api', apiApp);

	// Serve static UI assets (production mode only — when dist/ui exists)
	const uiDistPath = path.resolve(process.cwd(), 'dist/ui');
	const uiDistExists = fs.existsSync(path.join(uiDistPath, 'index.html'));

	if (uiDistExists) {
		app.use('/*', serveStatic({ root: './dist/ui' }));

		// SPA fallback: non-API routes that didn't match a static file -> index.html
		app.get('*', (c) => {
			const indexPath = path.join(uiDistPath, 'index.html');
			const html = fs.readFileSync(indexPath, 'utf-8');
			return c.html(html);
		});

		logger.info({ path: uiDistPath }, 'Serving static UI assets');
	} else {
		logger.info('UI dist not found — frontend served by Vite dev server in development');
	}

	const httpServer = serve({ fetch: app.fetch, port: config.httpPort });
	logger.info({ port: config.httpPort }, 'HTTP server started');

	// Graceful shutdown
	const shutdown = async () => {
		logger.info('Shutting down...');
		await mcpServer.close();
		httpServer.close();
		closeDatabase();
		process.exit(0);
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}

main().catch((err) => {
	logger.fatal({ err }, 'Failed to start server');
	process.exit(1);
});
