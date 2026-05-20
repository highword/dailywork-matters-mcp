import Database from 'better-sqlite3';
import fs from 'node:fs';
import { getConfigDir } from '../shared/paths.js';
import { logger } from './logger.js';
import { migration001 } from './migrations/001-initial.js';
import { migration002 } from './migrations/002-intelligence.js';
import { migration003 } from './migrations/003-version-tracking.js';

export interface Migration {
	id: number;
	name: string;
	sql: string;
}

const MIGRATIONS: Migration[] = [migration001, migration002, migration003];

let dbInstance: Database.Database | null = null;

/**
 * Initializes the SQLite database with WAL mode and runs pending migrations.
 * Database file location: ~/.dailywork-matters/db.sqlite
 */
export function initDatabase(dbPath?: string): Database.Database {
	const configDir = getConfigDir();
	fs.mkdirSync(configDir, { recursive: true });

	const resolvedPath = dbPath ?? `${configDir}/db.sqlite`;
	const db = new Database(resolvedPath);

	// Performance pragmas — WAL mode for concurrent read/write
	db.pragma('journal_mode = WAL');
	db.pragma('synchronous = NORMAL');
	db.pragma('foreign_keys = ON');
	db.pragma('cache_size = -64000'); // 64MB cache

	// Run migrations
	runMigrations(db);

	dbInstance = db;
	logger.info({ path: resolvedPath }, 'Database initialized');
	return db;
}

/**
 * Returns the existing database instance. Throws if not initialized.
 */
export function getDatabase(): Database.Database {
	if (!dbInstance) {
		throw new Error('Database not initialized. Call initDatabase() first.');
	}
	return dbInstance;
}

/**
 * Closes the database connection and performs WAL checkpoint.
 */
export function closeDatabase(): void {
	if (dbInstance) {
		dbInstance.pragma('wal_checkpoint(TRUNCATE)');
		dbInstance.close();
		dbInstance = null;
	}
}

function runMigrations(db: Database.Database): void {
	// Create migrations tracking table
	db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

	const applied = new Set(
		(db.prepare('SELECT id FROM migrations').all() as Array<{ id: number }>).map((r) => r.id),
	);

	for (const migration of MIGRATIONS) {
		if (!applied.has(migration.id)) {
			db.transaction(() => {
				db.exec(migration.sql);
				db.prepare('INSERT INTO migrations (id, name) VALUES (?, ?)').run(
					migration.id,
					migration.name,
				);
			})();
			logger.info({ id: migration.id, name: migration.name }, 'Migration applied');
		}
	}
}
