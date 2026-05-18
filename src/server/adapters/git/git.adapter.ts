import simpleGit, { type SimpleGit, type LogResult } from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';
import type { DataSourceAdapter, DateRange, NormalizedEvent, Config } from '../../../shared/types.js';
import { resolveHome } from '../../../shared/paths.js';
import { logger } from '../../logger.js';

export class GitAdapter implements DataSourceAdapter {
	readonly name = 'git';
	private config: Pick<Config, 'gitRepoScanDirs' | 'gitRepoManual' | 'gitIdentities'>;

	constructor(config: Pick<Config, 'gitRepoScanDirs' | 'gitRepoManual' | 'gitIdentities'>) {
		this.config = config;
	}

	async isAvailable(): Promise<boolean> {
		const repos = this.getConfiguredRepos();
		return repos.length > 0;
	}

	async *getEvents(range: DateRange): AsyncGenerator<NormalizedEvent> {
		const repos = this.getConfiguredRepos();

		for (const repoPath of repos) {
			try {
				const git: SimpleGit = simpleGit(repoPath);

				// Verify it's a valid git repo
				const isRepo = await git.checkIsRepo();
				if (!isRepo) {
					logger.warn({ path: repoPath }, 'Not a git repository, skipping');
					continue;
				}

				// Query commits for the date range
				const log: LogResult = await git.log({
					'--after': range.start.toISOString(),
					'--before': range.end.toISOString(),
					'--max-count': '200',
				});

				for (const commit of log.all) {
					// Filter by configured identities
					if (!this.matchesIdentity(commit.author_email, commit.author_name)) {
						continue;
					}

					// Get file changes for this commit
					let files: string[] = [];
					try {
						const diff = await git.diffSummary([`${commit.hash}^`, commit.hash]);
						files = diff.files.map((f) => f.file);
					} catch {
						// First commit in repo has no parent — skip diff
					}

					yield {
						timestamp: new Date(commit.date).toISOString(),
						type: 'git_commit',
						source: 'git',
						project: path.basename(repoPath),
						sessionId: repoPath,
						parentId: null,
						content: commit.message,
						outcome: null,
						files,
						duration: null,
						tokens: null,
						tags: inferTags(commit.message),
						confidence: null,
						metadata: {
							hash: commit.hash,
							author: commit.author_name,
							email: commit.author_email,
							refs: commit.refs,
						},
					};
				}
			} catch (err) {
				logger.warn({ repo: repoPath, err }, 'Failed to read git history');
			}
		}
	}

	private getConfiguredRepos(): string[] {
		const repos: string[] = [];

		// Manual repos
		for (const manual of this.config.gitRepoManual) {
			const resolved = resolveHome(manual);
			if (fs.existsSync(resolved)) {
				repos.push(resolved);
			}
		}

		// Auto-scan directories for repos
		for (const scanDir of this.config.gitRepoScanDirs) {
			const resolved = resolveHome(scanDir);
			if (!fs.existsSync(resolved)) continue;
			try {
				const entries = fs.readdirSync(resolved, { withFileTypes: true });
				for (const entry of entries) {
					if (!entry.isDirectory()) continue;
					const repoPath = path.join(resolved, entry.name);
					const gitDir = path.join(repoPath, '.git');
					if (fs.existsSync(gitDir)) {
						repos.push(repoPath);
					}
				}
			} catch (err) {
				logger.warn({ dir: scanDir, err }, 'Failed to scan directory for repos');
			}
		}

		return [...new Set(repos)]; // deduplicate
	}

	private matchesIdentity(email: string, name: string): boolean {
		if (this.config.gitIdentities.length === 0) {
			// No identities configured — include all commits (user hasn't set up filtering)
			return true;
		}
		const lowerEmail = email.toLowerCase();
		const lowerName = name.toLowerCase();
		return this.config.gitIdentities.some((identity) => {
			const lower = identity.toLowerCase();
			return lowerEmail === lower || lowerEmail.includes(lower) || lowerName === lower || lowerName.includes(lower);
		});
	}
}

function inferTags(message: string): string[] {
	const tags: string[] = [];
	const lower = message.toLowerCase();
	if (lower.startsWith('fix') || lower.includes('bug')) tags.push('bugfix');
	if (lower.startsWith('feat') || lower.includes('add')) tags.push('feature');
	if (lower.startsWith('refactor')) tags.push('refactor');
	if (lower.startsWith('docs') || lower.includes('readme')) tags.push('docs');
	if (lower.startsWith('test')) tags.push('test');
	if (lower.startsWith('chore') || lower.includes('config')) tags.push('config');
	return tags;
}
