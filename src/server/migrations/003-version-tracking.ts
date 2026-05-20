export const migration003 = {
	id: 3,
	name: 'version-tracking',
	sql: `
    CREATE TABLE summaries_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      markdown TEXT NOT NULL,
      structured_json TEXT NOT NULL DEFAULT '{}',
      metadata TEXT NOT NULL DEFAULT '{}',
      mode TEXT NOT NULL DEFAULT 'api',
      models_used TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO summaries_new SELECT id, date, 1, markdown, structured_json, metadata, mode, models_used, created_at, updated_at FROM summaries;
    DROP TABLE summaries;
    ALTER TABLE summaries_new RENAME TO summaries;
    CREATE INDEX idx_summaries_date ON summaries(date);
    CREATE INDEX idx_summaries_date_version ON summaries(date, version);
  `,
};
