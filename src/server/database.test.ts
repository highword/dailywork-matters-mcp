import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TEST_DIR = path.join(os.tmpdir(), 'dailywork-db-test-' + Date.now());
const TEST_DB_PATH = path.join(TEST_DIR, 'test.sqlite');

// Mock logger to suppress output during tests
vi.mock('./logger.js', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { initDatabase, closeDatabase, getDatabase } from './database.js';

describe('database', () => {
	beforeEach(() => {
		fs.mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		closeDatabase();
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	});

	it('creates database file at specified path', () => {
		initDatabase(TEST_DB_PATH);
		expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
	});

	it('enables WAL journal mode', () => {
		const db = initDatabase(TEST_DB_PATH);
		const mode = db.pragma('journal_mode', { simple: true });
		expect(mode).toBe('wal');
	});

	it('creates all 8 required tables plus migrations table', () => {
		const db = initDatabase(TEST_DB_PATH);
		const tables = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name",
			)
			.all() as Array<{ name: string }>;
		const tableNames = tables.map((t) => t.name).sort();
		expect(tableNames).toEqual([
			'analytics',
			'config',
			'events',
			'migrations',
			'sessions',
			'sources',
			'summaries',
			'tags',
			'tasks',
		]);
	});

	it('tracks applied migrations', () => {
		const db = initDatabase(TEST_DB_PATH);
		const migrations = db.prepare('SELECT id, name FROM migrations').all() as Array<{
			id: number;
			name: string;
		}>;
		expect(migrations).toHaveLength(3);
		expect(migrations[0].name).toBe('initial-schema');
		expect(migrations[1].name).toBe('intelligence-metadata');
		expect(migrations[2].name).toBe('version-tracking');
	});

	it('does not re-run already applied migrations', () => {
		initDatabase(TEST_DB_PATH);
		closeDatabase();
		// Re-init should not throw or duplicate
		const db = initDatabase(TEST_DB_PATH);
		const migrations = db.prepare('SELECT id, name FROM migrations').all();
		expect(migrations).toHaveLength(3);
	});

	it('getDatabase throws when not initialized', () => {
		expect(() => getDatabase()).toThrow('Database not initialized');
	});

	it('getDatabase returns instance after init', () => {
		initDatabase(TEST_DB_PATH);
		const db = getDatabase();
		expect(db).toBeDefined();
		expect(db.open).toBe(true);
	});
});
