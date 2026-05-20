import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../../shared/types.js';
import type { AdapterRegistry } from '../adapters/registry.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { registerAllTools } from './tools/index.js';

export { createMcpServer } from './server.js';

/**
 * Registers all MCP capabilities (tools, resources, prompts) with the server.
 * Single entry point for main.ts to wire everything.
 */
export function registerAll(
	server: McpServer,
	config: Config,
	registry: AdapterRegistry,
): void {
	registerAllTools(server, config, registry);
	registerResources(server, config);
	registerPrompts(server);
}
