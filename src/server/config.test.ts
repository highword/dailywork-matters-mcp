import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DEFAULT_CONFIG } from '../shared/types.js';

// Use a temp dir to avoid touching real user config
const TEST_DIR = path.join(os.tmpdir(), 'dailywork-matters-test-' + Date.now());
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'config.json');

// Mock the paths module to use temp dir
vi.mock('../shared/paths.js', async () => {
	const actual = await vi.importActual('../shared/paths.js');
	return {
		...actual,
		getConfigDir: () => TEST_DIR,
		getConfigPath: () => TEST_CONFIG_PATH,
	};
});

// Mock logger to suppress output during tests
vi.mock('./logger.js', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { loadConfig, saveConfig, ensureConfigDir, resolveConfigPaths } from './config.js';

describe('config', () => {
	beforeEach(() => {
		fs.mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe('ensureConfigDir', () => {
		it('creates directory if not exists', () => {
			fs.rmSync(TEST_DIR, { recursive: true, force: true });
			ensureConfigDir();
			expect(fs.existsSync(TEST_DIR)).toBe(true);
		});
	});

	describe('loadConfig', () => {
		it('creates config.json with defaults on first run', () => {
			const config = loadConfig();
			expect(config).toEqual(DEFAULT_CONFIG);
			expect(fs.existsSync(TEST_CONFIG_PATH)).toBe(true);
		});

		it('merges user overrides with defaults', () => {
			fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify({ language: 'zh', httpPort: 9999 }));
			const config = loadConfig();
			expect(config.language).toBe('zh');
			expect(config.httpPort).toBe(9999);
			expect(config.outputDir).toBe(DEFAULT_CONFIG.outputDir); // default preserved
		});

		it('returns defaults on corrupted JSON', () => {
			fs.writeFileSync(TEST_CONFIG_PATH, 'not valid json!!!');
			const config = loadConfig();
			expect(config).toEqual(DEFAULT_CONFIG);
		});
	});

	describe('saveConfig', () => {
		it('merges partial updates with existing config', () => {
			loadConfig(); // create initial
			const result = saveConfig({ language: 'ja', apiKey: 'sk-test' });
			expect(result.language).toBe('ja');
			expect(result.apiKey).toBe('sk-test');
			expect(result.httpPort).toBe(37888); // unchanged

			// Verify persisted
			const raw = JSON.parse(fs.readFileSync(TEST_CONFIG_PATH, 'utf-8'));
			expect(raw.language).toBe('ja');
			expect(raw.apiKey).toBe('sk-test');
		});
	});

	describe('resolveConfigPaths', () => {
		it('resolves tilde paths to absolute', () => {
			const resolved = resolveConfigPaths(DEFAULT_CONFIG);
			expect(resolved.outputDir).not.toContain('~');
			expect(resolved.outputDir).toContain(os.homedir());
			expect(resolved.claudeSessionsDir).toContain(os.homedir());
			expect(resolved.dbPath).toContain(os.homedir());
		});
	});
});
