import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { ClaudeAdapter } from './adapters/claude/claude.adapter.js';
import { GitAdapter } from './adapters/git/git.adapter.js';
import { AdapterRegistry } from './adapters/registry.js';
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

	// Start HTTP server (Phase 4 adds frontend routes)
	const app = new Hono();
	app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));
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
