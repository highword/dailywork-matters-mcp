import fs from 'node:fs';
import { getConfigDir, getConfigPath, resolveHome } from '../shared/paths.js';
import { type Config, DEFAULT_CONFIG } from '../shared/types.js';
import { logger } from './logger.js';

/**
 * Ensures the config directory exists (~/.dailywork-matters/).
 * Creates it recursively if missing.
 */
export function ensureConfigDir(): string {
	const dir = getConfigDir();
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Loads configuration from ~/.dailywork-matters/config.json.
 * On first run: creates the file with DEFAULT_CONFIG values.
 * On subsequent runs: merges user overrides with defaults (forward-compat).
 */
export function loadConfig(): Config {
	ensureConfigDir();
	const configPath = getConfigPath();

	if (!fs.existsSync(configPath)) {
		// First run — write defaults
		logger.info({ path: configPath }, 'Creating default configuration');
		fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
		return { ...DEFAULT_CONFIG };
	}

	try {
		const raw = fs.readFileSync(configPath, 'utf-8');
		const userConfig = JSON.parse(raw) as Partial<Config>;

		// Backward compat: migrate old flat fields to nested ai block
		if (!('ai' in userConfig) && ('apiKey' in userConfig || 'model' in userConfig)) {
			const rawObj = userConfig as Record<string, unknown>;
			(userConfig as Record<string, unknown>).ai = {
				apiKey: (rawObj.apiKey as string | null) ?? null,
				windowModel: 'claude-haiku-4-5-20251001',
				mergeModel: (rawObj.model as string) ?? 'claude-sonnet-4-6-20250514',
			};
			delete rawObj.apiKey;
			delete rawObj.model;
		}

		// Merge: user overrides take precedence, defaults fill missing fields
		return { ...DEFAULT_CONFIG, ...userConfig };
	} catch (err) {
		logger.warn({ err, path: configPath }, 'Failed to parse config, using defaults');
		return { ...DEFAULT_CONFIG };
	}
}

/**
 * Saves a partial config update. Merges with existing config to preserve
 * fields not included in the update.
 */
export function saveConfig(updates: Partial<Config>): Config {
	const current = loadConfig();
	const merged = { ...current, ...updates };
	const configPath = getConfigPath();
	fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
	return merged;
}

/**
 * Resolves all tilde-prefixed paths in a Config object to absolute paths.
 * Used internally when paths need to be used for filesystem operations.
 */
export function resolveConfigPaths(config: Config): Config {
	return {
		...config,
		outputDir: resolveHome(config.outputDir),
		claudeSessionsDir: resolveHome(config.claudeSessionsDir),
		dbPath: resolveHome(config.dbPath),
	};
}
