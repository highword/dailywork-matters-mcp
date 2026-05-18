import os from 'node:os';
import path from 'node:path';
import type { Config, DateRange } from './types.js';

/**
 * Resolves ~ to os.homedir() for cross-platform compatibility.
 * Windows: C:\Users\Username, macOS/Linux: /home/username or /Users/username
 */
export function resolveHome(inputPath: string): string {
	if (inputPath.startsWith('~/') || inputPath === '~') {
		return path.join(os.homedir(), inputPath.slice(1));
	}
	if (inputPath.startsWith('~\\')) {
		return path.join(os.homedir(), inputPath.slice(2));
	}
	return inputPath;
}

export function getClaudeProjectsDir(): string {
	return path.join(os.homedir(), '.claude', 'projects');
}

export function getConfigDir(): string {
	return path.join(os.homedir(), '.dailywork-matters');
}

export function getConfigPath(): string {
	return path.join(getConfigDir(), 'config.json');
}

export function getDbPath(): string {
	return path.join(getConfigDir(), 'db.sqlite');
}

export function getSummariesDir(config: Config): string {
	return resolveHome(config.outputDir);
}

/**
 * Creates a DateRange for a given date string (YYYY-MM-DD).
 * Start: beginning of day (00:00:00.000) in local timezone.
 * End: end of day (23:59:59.999) in local timezone.
 */
export function createDateRange(dateStr: string): DateRange {
	const [year, month, day] = dateStr.split('-').map(Number);
	const start = new Date(year, month - 1, day, 0, 0, 0, 0);
	const end = new Date(year, month - 1, day, 23, 59, 59, 999);
	return { start, end };
}
