import fs from 'node:fs';
import path from 'node:path';
import { resolveHome } from '../shared/paths.js';
import { logger } from './logger.js';

/**
 * Save a summary Markdown file with version append logic (D-04).
 * If YYYY-MM-DD.md already exists, rename it to .v{N}.md first.
 * Returns the path of the newly written file (always YYYY-MM-DD.md).
 */
export function saveSummaryFile(date: string, markdown: string, outputDir: string): string {
	const resolved = resolveHome(outputDir);
	fs.mkdirSync(resolved, { recursive: true });

	const filePath = path.join(resolved, `${date}.md`);

	if (fs.existsSync(filePath)) {
		let version = 1;
		while (fs.existsSync(path.join(resolved, `${date}.v${version}.md`))) {
			version++;
		}
		const versionedPath = path.join(resolved, `${date}.v${version}.md`);
		fs.renameSync(filePath, versionedPath);
		logger.info({ date, version, versionedPath }, 'Versioned existing summary');
	}

	fs.writeFileSync(filePath, markdown, 'utf-8');
	logger.info({ date, path: filePath }, 'Summary file saved');
	return filePath;
}

/**
 * Get the expected path for a summary file (latest version).
 */
export function getSummaryPath(date: string, outputDir: string): string {
	return path.join(resolveHome(outputDir), `${date}.md`);
}

/**
 * Load a summary from disk. Returns null if not found.
 */
export function loadSummaryFromDisk(date: string, outputDir: string): string | null {
	const filePath = getSummaryPath(date, outputDir);
	if (!fs.existsSync(filePath)) return null;
	return fs.readFileSync(filePath, 'utf-8');
}

/**
 * List all summary dates available in the output directory.
 * Returns only YYYY-MM-DD.md files (not versioned ones), sorted newest first.
 */
export function listSummaryDates(outputDir: string): string[] {
	const resolved = resolveHome(outputDir);
	if (!fs.existsSync(resolved)) return [];

	return fs
		.readdirSync(resolved)
		.filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
		.map((f) => f.replace('.md', ''))
		.sort()
		.reverse();
}
