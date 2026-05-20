import type { DailySummary } from './types.js';

export function renderMarkdown(summary: DailySummary): string {
	const lines: string[] = [];

	lines.push(`# Daily Summary: ${summary.date}`);
	lines.push('');
	lines.push(summary.summary);
	lines.push('');
	lines.push('## Tasks');
	lines.push('');
	lines.push('| Task | Category | Time |');
	lines.push('|------|----------|------|');
	for (const task of summary.tasks) {
		lines.push(
			`| ${task.name} | ${task.category} | ${task.time_proportion}% |`,
		);
	}
	lines.push('');

	for (const task of summary.tasks) {
		lines.push(`### ${task.name}`);
		lines.push('');
		lines.push(
			`**Category:** ${task.category} | **Time:** ${task.time_proportion}%`,
		);
		lines.push('');
		lines.push(task.outcome);
		if (task.files.length > 0) {
			lines.push('');
			lines.push('**Files:**');
			for (const file of task.files) {
				lines.push(`- \`${file}\``);
			}
		}
		lines.push('');
	}

	lines.push('---');
	lines.push(
		`*Generated: ${summary.metadata.generated_at} | Sessions: ${summary.metadata.total_sessions} | Events: ${summary.metadata.total_events} | Projects: ${summary.metadata.projects.join(', ')}*`,
	);

	return lines.join('\n');
}
