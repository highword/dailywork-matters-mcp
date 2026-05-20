import type { NormalizedEvent } from '../../shared/types.js';
import { compressEvents } from './compression.js';
import { groupByProject } from './aggregation.js';
import type { ProjectEvents, ZeroConfigResponse } from './types.js';

export function buildZeroConfigResponse(
	date: string,
	events: NormalizedEvent[],
): ZeroConfigResponse {
	const projectGroups = groupByProject(events);
	const projects: ProjectEvents[] = [];

	for (const [project, projectEvents] of projectGroups) {
		const compressed = compressEvents(projectEvents);
		const sessionIds = [...new Set(projectEvents.map((e) => e.sessionId))];
		projects.push({
			project,
			events: compressed,
			session_ids: sessionIds,
		});
	}

	return {
		date,
		projects,
		session_count: new Set(events.map((e) => e.sessionId)).size,
		event_count: events.length,
	};
}
