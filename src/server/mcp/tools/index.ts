import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from '../../../shared/types.js';
import type { AdapterRegistry } from '../../adapters/registry.js';
import { registerConfigureSettings } from './configure-settings.js';
import { registerGenerateBatchSummary } from './generate-batch-summary.js';
import { registerGenerateDailySummary } from './generate-daily-summary.js';
import { registerGetSummaryByDate } from './get-summary-by-date.js';
import { registerListTodaySessions } from './list-today-sessions.js';
import { registerSaveSummary } from './save-summary.js';

/**
 * Registers all 6 MCP tools with the server.
 *
 * Tools:
 * 1. generate_daily_summary - Generate summary for a date (default: today)
 * 2. list_today_sessions - List active sessions/repos for today
 * 3. configure_settings - View/update configuration
 * 4. get_summary_by_date - Retrieve stored summary for a date
 * 5. generate_batch_summary - Generate summaries for a date range
 * 6. save_summary - Save externally-generated summary (zero-config mode)
 */
export function registerAllTools(
	server: McpServer,
	config: Config,
	registry: AdapterRegistry,
): void {
	registerGenerateDailySummary(server, config, registry);
	registerListTodaySessions(server, config, registry);
	registerConfigureSettings(server, config);
	registerGetSummaryByDate(server, config);
	registerGenerateBatchSummary(server, config, registry);
	registerSaveSummary(server, config);
}
