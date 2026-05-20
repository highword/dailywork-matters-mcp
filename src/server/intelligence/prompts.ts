import type { Task } from './types.js';

export function buildWindowPrompt(previousTasks: Task[] | null): string {
	const carryOver = previousTasks
		? `\nPrevious accumulated tasks (merge new events into these where they continue the same work):\n${JSON.stringify(previousTasks, null, 0)}\n`
		: '';

	return `You are a developer work analyzer. You receive timestamped work events and output a structured JSON task list.

Rules:
1. Output ONLY valid JSON - no markdown, no explanation, no code fences
2. Each task must have exactly these fields:
   - name: string (concise, outcome-oriented title)
   - category: "feature" | "bugfix" | "refactor" | "research" | "config" | "docs" | string
   - outcome: string (what was ACCOMPLISHED, not what was done)
   - files: string[] (key files involved, max 10 per task)
   - time_proportion: number (0-100, your best estimate based on time span + event density + complexity)
3. time_proportion values MUST sum to exactly 100
4. Describe OUTCOMES ("implemented user auth with JWT tokens") not PROCESS ("edited auth.ts, ran tests")
5. Merge events about the same logical task into a single entry
6. If events span multiple sessions but work on the same topic, merge them into one task
${carryOver}
Output schema: { "tasks": [{ "name", "category", "outcome", "files", "time_proportion" }] }`;
}

export const MERGE_SYSTEM_PROMPT = `You are creating a daily developer work summary from per-project task lists.

Rules:
1. Output ONLY valid JSON - no markdown, no explanation, no code fences
2. Merge tasks that span projects if they represent the same logical work
3. Recalculate time_proportion so all tasks sum to exactly 100
4. Add a "summary" field: 1-2 sentence daily overview describing what was accomplished (outcomes, not process)
5. Sort tasks by time_proportion descending (most time first)
6. Each task keeps exactly: name, category, outcome, files, time_proportion

Output schema:
{
  "summary": "string (1-2 sentences, outcome-oriented)",
  "tasks": [{ "name": "string", "category": "string", "outcome": "string", "files": ["string"], "time_proportion": number }]
}`;

export function formatWindowContent(
	events: Array<{ type: string; timestamp: string; content: string }>,
): string {
	return events
		.map((e) => `[${e.timestamp}] (${e.type}) ${e.content}`)
		.join('\n\n---\n\n');
}
