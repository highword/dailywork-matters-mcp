import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import simpleGit from 'simple-git';
import { GitAdapter } from './git.adapter.js';
import { createDateRange } from '../../../shared/paths.js';

const TEST_DIR = path.join(os.tmpdir(), 'git-adapter-test-' + Date.now());
const REPO_DIR = path.join(TEST_DIR, 'test-repo');

async function setupTestRepo() {
	fs.mkdirSync(REPO_DIR, { recursive: true });
	const git = simpleGit(REPO_DIR);
	await git.init();
	await git.addConfig('user.email', 'dev@example.com');
	await git.addConfig('user.name', 'Test Developer');

	// Create a commit with a known date (set both author and committer date)
	const testFile = path.join(REPO_DIR, 'test.ts');
	fs.writeFileSync(testFile, 'console.log("hello");');
	await git.add('test.ts');
	await git.env('GIT_COMMITTER_DATE', '2026-05-19T10:00:00');
	await git.commit('feat: add test file', { '--date': '2026-05-19T10:00:00' });
}

describe('GitAdapter', () => {
	beforeEach(async () => {
		await setupTestRepo();
	});

	afterEach(() => {
		fs.rmSync(TEST_DIR, { recursive: true, force: true });
	});

	it('isAvailable returns true when repos are configured', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [REPO_DIR],
			gitIdentities: [],
		});
		expect(await adapter.isAvailable()).toBe(true);
	});

	it('isAvailable returns false with no repos', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [],
			gitIdentities: [],
		});
		expect(await adapter.isAvailable()).toBe(false);
	});

	it('getEvents yields commits for matching date', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [REPO_DIR],
			gitIdentities: [],
		});
		const range = createDateRange('2026-05-19');
		const events: any[] = [];
		for await (const event of adapter.getEvents(range)) {
			events.push(event);
		}
		expect(events.length).toBeGreaterThan(0);
		expect(events[0].type).toBe('git_commit');
		expect(events[0].source).toBe('git');
		expect(events[0].content).toContain('add test file');
	});

	it('filters by identity when configured', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [REPO_DIR],
			gitIdentities: ['other@example.com'],
		});
		const range = createDateRange('2026-05-19');
		const events: any[] = [];
		for await (const event of adapter.getEvents(range)) {
			events.push(event);
		}
		expect(events).toHaveLength(0); // dev@example.com doesn't match other@example.com
	});

	it('includes commits matching identity', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [REPO_DIR],
			gitIdentities: ['dev@example.com'],
		});
		const range = createDateRange('2026-05-19');
		const events: any[] = [];
		for await (const event of adapter.getEvents(range)) {
			events.push(event);
		}
		expect(events.length).toBeGreaterThan(0);
	});

	it('discovers repos from scan directories', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [TEST_DIR],
			gitRepoManual: [],
			gitIdentities: [],
		});
		expect(await adapter.isAvailable()).toBe(true);
	});

	it('includes file paths from commit diffs', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [REPO_DIR],
			gitIdentities: [],
		});
		const range = createDateRange('2026-05-19');
		const events: any[] = [];
		for await (const event of adapter.getEvents(range)) {
			events.push(event);
		}
		const commit = events.find((e: any) => e.type === 'git_commit');
		expect(commit).toBeDefined();
		expect(commit.files).toContain('test.ts');
	});

	it('infers tags from commit messages', async () => {
		const adapter = new GitAdapter({
			gitRepoScanDirs: [],
			gitRepoManual: [REPO_DIR],
			gitIdentities: [],
		});
		const range = createDateRange('2026-05-19');
		const events: any[] = [];
		for await (const event of adapter.getEvents(range)) {
			events.push(event);
		}
		expect(events[0].tags).toContain('feature');
	});
});
