import { describe, it, expect } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { resolveHome, getClaudeProjectsDir, getConfigDir, createDateRange } from './paths.js';

describe('resolveHome', () => {
	it('resolves ~/path to homedir/path', () => {
		const result = resolveHome('~/test/dir');
		expect(result).toBe(path.join(os.homedir(), 'test', 'dir'));
	});

	it('resolves bare ~ to homedir', () => {
		const result = resolveHome('~');
		expect(result).toBe(os.homedir());
	});

	it('resolves ~\\ on Windows-style paths', () => {
		const result = resolveHome('~\\test\\dir');
		expect(result).toBe(path.join(os.homedir(), 'test', 'dir'));
	});

	it('passes through absolute paths unchanged', () => {
		const abs = path.resolve('/some/absolute/path');
		expect(resolveHome(abs)).toBe(abs);
	});
});

describe('getClaudeProjectsDir', () => {
	it('returns path under homedir/.claude/projects', () => {
		const result = getClaudeProjectsDir();
		expect(result).toBe(path.join(os.homedir(), '.claude', 'projects'));
	});
});

describe('getConfigDir', () => {
	it('returns path under homedir/.dailywork-matters', () => {
		const result = getConfigDir();
		expect(result).toBe(path.join(os.homedir(), '.dailywork-matters'));
	});
});

describe('createDateRange', () => {
	it('creates start at 00:00:00.000 and end at 23:59:59.999', () => {
		const range = createDateRange('2026-05-19');
		expect(range.start.getFullYear()).toBe(2026);
		expect(range.start.getMonth()).toBe(4); // 0-indexed
		expect(range.start.getDate()).toBe(19);
		expect(range.start.getHours()).toBe(0);
		expect(range.start.getMinutes()).toBe(0);
		expect(range.end.getHours()).toBe(23);
		expect(range.end.getMinutes()).toBe(59);
		expect(range.end.getSeconds()).toBe(59);
		expect(range.end.getMilliseconds()).toBe(999);
	});
});
