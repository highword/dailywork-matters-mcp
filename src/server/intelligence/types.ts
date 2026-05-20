/**
 * Intelligence layer type definitions.
 * Defines the contracts for content compression, AI processing,
 * and structured output generation.
 */

// IntermediateEvent — compressed event for AI window input (D-13)
export interface IntermediateEvent {
	type: string; // from NormalizedEvent.type
	timestamp: string; // ISO 8601
	content: string; // compressed human-readable text
	project: string; // project path for grouping
	sessionId: string; // for cross-session tracking
}

// Task — exactly 5 fields per AI-04
export interface Task {
	name: string; // concise, outcome-oriented title
	category: string; // base 6: feature|bugfix|refactor|research|config|docs + open extension (D-08)
	outcome: string; // what was ACCOMPLISHED (AI-05)
	files: string[]; // key files involved
	time_proportion: number; // 0-100, AI-estimated, all tasks sum to 100 (D-09)
}

// WindowResult — output from a single window processing call
export interface WindowResult {
	tasks: Task[];
	window_index: number;
	tokens_used: { input: number; output: number };
}

// MergeResult — output from the final merge pass
export interface MergeResult {
	summary: string; // 1-2 sentence daily overview
	tasks: Task[]; // merged, sorted by time_proportion desc
	metadata: SummaryMetadata;
}

// DailySummary — stored in DB and used for rendering
export interface DailySummary {
	date: string; // YYYY-MM-DD
	summary: string; // 1-2 sentence overview
	tasks: Task[];
	metadata: SummaryMetadata;
}

export interface SummaryMetadata {
	total_sessions: number;
	total_events: number;
	projects: string[];
	generated_at: string; // ISO 8601
	models_used: { window: string; merge: string };
	mode: 'zero-config' | 'api';
	gaps?: string[]; // partial failure info
}

// Zero-config mode response structure
export interface ZeroConfigResponse {
	date: string;
	projects: ProjectEvents[];
	session_count: number;
	event_count: number;
}

export interface ProjectEvents {
	project: string;
	events: IntermediateEvent[];
	session_ids: string[];
}

// Processing options
export interface ProcessingOptions {
	date: string; // YYYY-MM-DD
	mode: 'zero-config' | 'api';
	windowModel: string;
	mergeModel: string;
	apiKey: string | null;
}
