import { describe, expect, it, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Config, NormalizedEvent } from '../../../shared/types.js';
import { DEFAULT_CONFIG } from '../../../shared/types.js';
import { AdapterRegistry } from '../../adapters/registry.js';
import { registerGenerateDailySummary } from './generate-daily-summary.js';

interface ToolResult {
	content: Array<{ type: string; text: string }>;
	isError?: boolean;
}

// Mock the database module (not available in tests without native module)
vi.mock('../../database.js', () => ({
	getDatabase: () => ({
		prepare: () => ({
			get: () => null,
			run: () => ({}),
		}),
	}),
}));

// Mock persistence module
vi.mock('../../persistence.js', () => ({
	saveSummaryFile: (date: string, _md: string, _dir: string) =>
		`/mocked/summaries/${date}.md`,
}));

function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
	return {
		timestamp: '2026-05-20T10:00:00Z',
		type: 'response',
		source: 'claude',
		project: '/test/project',
		sessionId: 'session-1',
		parentId: null,
		content: 'Implemented user authentication',
		outcome: null,
		files: ['src/auth.ts'],
		duration: null,
		tokens: null,
		tags: [],
		confidence: null,
		metadata: {},
		...overrides,
	};
}

/**
 * Creates a mock AdapterRegistry that yields the given events.
 */
function createMockRegistry(events: NormalizedEvent[]): AdapterRegistry {
	const registry = new AdapterRegistry();
	// Register a mock adapter that yields the provided events
	registry.register({
		name: 'test-adapter',
		async isAvailable() {
			return true;
		},
		async *getEvents() {
			for (const event of events) {
				yield event;
			}
		},
	});
	return registry;
}

/**
 * Creates a connected MCP client+server pair with the generate_daily_summary tool.
 */
async function createTestClient(
	config: Config,
	registry: AdapterRegistry,
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
	const server = new McpServer(
		{ name: 'test-server', version: '1.0.0' },
		{ capabilities: { tools: {} } },
	);
	registerGenerateDailySummary(server, config, registry);

	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();

	await server.connect(serverTransport);
	const client = new Client(
		{ name: 'test-client', version: '1.0.0' },
		{ capabilities: {} },
	);
	await client.connect(clientTransport);

	return {
		client,
		cleanup: async () => {
			await client.close();
			await server.close();
		},
	};
}

describe('generate_daily_summary tool (integration)', () => {
	let cleanup: (() => Promise<void>) | null = null;

	afterEach(async () => {
		if (cleanup) {
			await cleanup();
			cleanup = null;
		}
	});

	it('returns zero-config response when no API key configured', async () => {
		const events = [
			makeEvent({ content: 'Added login endpoint' }),
			makeEvent({
				content: 'Fixed session handling',
				sessionId: 'session-2',
			}),
		];
		const config: Config = { ...DEFAULT_CONFIG };
		const registry = createMockRegistry(events);

		const { client, cleanup: cl } = await createTestClient(config, registry);
		cleanup = cl;

		const result = (await client.callTool({
			name: 'generate_daily_summary',
			arguments: { date: '2026-05-20' },
		})) as ToolResult;

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(1);

		const content = result.content[0];
		expect(content.type).toBe('text');
		const data = JSON.parse(content.text);

		// Zero-config returns compressed event data
		expect(data).toHaveProperty('date', '2026-05-20');
		expect(data).toHaveProperty('session_count');
		expect(data).toHaveProperty('event_count', 2);
		expect(data).toHaveProperty('projects');
		expect(data.projects).toBeInstanceOf(Array);
	});

	it('returns error for invalid date format', async () => {
		const registry = createMockRegistry([]);
		const config: Config = { ...DEFAULT_CONFIG };

		const { client, cleanup: cl } = await createTestClient(config, registry);
		cleanup = cl;

		const result = (await client.callTool({
			name: 'generate_daily_summary',
			arguments: { date: 'not-a-date' },
		})) as ToolResult;

		expect(result.isError).toBe(true);
		const content = result.content[0];
		expect(content.text).toContain('Invalid date format');
	});

	it('returns error for date with valid format but invalid calendar date', async () => {
		const registry = createMockRegistry([]);
		const config: Config = { ...DEFAULT_CONFIG };

		const { client, cleanup: cl } = await createTestClient(config, registry);
		cleanup = cl;

		const result = (await client.callTool({
			name: 'generate_daily_summary',
			arguments: { date: '2026-13-45' },
		})) as ToolResult;

		expect(result.isError).toBe(true);
		const content = result.content[0];
		expect(content.text).toContain('Invalid date format');
	});

	it('returns no-data message when no events found', async () => {
		const registry = createMockRegistry([]);
		const config: Config = { ...DEFAULT_CONFIG };

		const { client, cleanup: cl } = await createTestClient(config, registry);
		cleanup = cl;

		const result = (await client.callTool({
			name: 'generate_daily_summary',
			arguments: { date: '2026-05-20' },
		})) as ToolResult;

		expect(result.isError).toBeFalsy();
		const content = result.content[0];
		const data = JSON.parse(content.text);

		expect(data).toHaveProperty('date', '2026-05-20');
		expect(data).toHaveProperty('events', 0);
		expect(data.message).toContain('No sessions or git activity found');
	});

	it('uses today as default date when none provided', async () => {
		const registry = createMockRegistry([]);
		const config: Config = { ...DEFAULT_CONFIG };

		const { client, cleanup: cl } = await createTestClient(config, registry);
		cleanup = cl;

		const result = (await client.callTool({
			name: 'generate_daily_summary',
			arguments: {},
		})) as ToolResult;

		// Should not error - just no data for today
		expect(result.isError).toBeFalsy();
		const content = result.content[0];
		const data = JSON.parse(content.text);

		// Should contain today's date
		const today = new Date().toISOString().split('T')[0];
		expect(data.date).toBe(today);
	});

	it('is discoverable via listTools', async () => {
		const registry = createMockRegistry([]);
		const config: Config = { ...DEFAULT_CONFIG };

		const { client, cleanup: cl } = await createTestClient(config, registry);
		cleanup = cl;

		const toolsResult = await client.listTools();
		const tool = toolsResult.tools.find(
			(t) => t.name === 'generate_daily_summary',
		);

		expect(tool).toBeDefined();
		expect(tool!.description).toContain('daily work summary');
		expect(tool!.inputSchema).toBeDefined();
	});
});
