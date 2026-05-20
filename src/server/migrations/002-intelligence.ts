export const migration002 = {
	id: 2,
	name: 'intelligence-metadata',
	sql: `
    ALTER TABLE summaries ADD COLUMN mode TEXT NOT NULL DEFAULT 'api';
    ALTER TABLE summaries ADD COLUMN models_used TEXT NOT NULL DEFAULT '{}';
  `,
};
