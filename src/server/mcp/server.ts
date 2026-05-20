import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Creates and returns an MCP server instance with tools, resources, and prompts capabilities.
 * Tool/resource/prompt registration happens in Phase 3 plans 02/03.
 */
export function createMcpServer(): McpServer {
	return new McpServer(
		{ name: 'dailywork-matters', version: '1.0.0' },
		{ capabilities: { tools: {}, resources: {}, prompts: {} } },
	);
}
