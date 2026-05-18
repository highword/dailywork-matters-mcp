/**
 * Core type definitions for dailywork-matters-mcp.
 * NormalizedEvent schema is LOCKED (15 fields, fine-grained events).
 */

export interface NormalizedEvent {
	timestamp: string; // ISO 8601
	type: string; // prompt|response|tool_call|file_edit|bash_cmd|git_commit|git_diff|search|navigation|...
	source: string; // claude|git|shell|browser|gemini|cursor|...
	project: string; // project path
	sessionId: string; // session UUID
	parentId: string | null; // links to parent event (subagent->main session tool_call)
	content: string; // text content
	outcome: string | null; // result description (nullable, populated by AI later)
	files: string[]; // file paths involved
	duration: number | null; // milliseconds
	tokens: {
		input: number;
		output: number;
		cache: number;
	} | null;
	tags: string[]; // categorization tags
	confidence: number | null; // 0-1 confidence score
	metadata: Record<string, unknown>; // extensible metadata
}

export interface DateRange {
	start: Date; // start of target day (00:00:00.000)
	end: Date; // end of target day (23:59:59.999)
}

export interface DataSourceAdapter {
	readonly name: string;
	isAvailable(): Promise<boolean>;
	getEvents(range: DateRange): AsyncGenerator<NormalizedEvent>;
}

export interface Config {
	// Output
	outputDir: string;
	language: string;

	// Claude sessions
	claudeSessionsDir: string;

	// Git
	gitRepoScanDirs: string[];
	gitRepoManual: string[];
	gitIdentities: string[];

	// AI
	apiKey: string | null;
	model: string;

	// Service
	httpPort: number;
	scheduleTime: string | null;

	// Storage
	dbPath: string;

	// Display
	maxTasksPerSummary: number;
	showFileList: boolean;
	showTokenStats: boolean;
}

export const DEFAULT_CONFIG: Config = {
	outputDir: '~/dailywork-matters/summaries',
	language: 'en',
	claudeSessionsDir: '~/.claude/projects',
	gitRepoScanDirs: [],
	gitRepoManual: [],
	gitIdentities: [],
	apiKey: null,
	model: 'claude-sonnet-4-6',
	httpPort: 37888,
	scheduleTime: null,
	dbPath: '~/.dailywork-matters/db.sqlite',
	maxTasksPerSummary: 20,
	showFileList: true,
	showTokenStats: true,
};
