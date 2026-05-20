import type { NormalizedEvent } from '../../shared/types.js';
import type { IntermediateEvent } from './types.js';
import { compressEvents } from './compression.js';

const TARGET_WINDOW_TOKENS = 30_000;
const CHARS_PER_TOKEN = 3.25;
const TARGET_WINDOW_CHARS = TARGET_WINDOW_TOKENS * CHARS_PER_TOKEN;

export function groupByProject(
	events: NormalizedEvent[],
): Map<string, NormalizedEvent[]> {
	const groups = new Map<string, NormalizedEvent[]>();

	for (const event of events) {
		const project = event.project || '__unknown__';
		const group = groups.get(project);
		if (group) {
			group.push(event);
		} else {
			groups.set(project, [event]);
		}
	}

	for (const [, group] of groups) {
		group.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	}

	return groups;
}

export function buildWindows(events: NormalizedEvent[]): IntermediateEvent[][] {
	const compressed = compressEvents(events);
	const windows: IntermediateEvent[][] = [];
	let currentWindow: IntermediateEvent[] = [];
	let currentSize = 0;

	for (const event of compressed) {
		const eventSize = event.content.length;

		if (currentSize + eventSize > TARGET_WINDOW_CHARS && currentWindow.length > 0) {
			windows.push(currentWindow);
			currentWindow = [];
			currentSize = 0;
		}

		currentWindow.push(event);
		currentSize += eventSize;
	}

	if (currentWindow.length > 0) {
		windows.push(currentWindow);
	}

	return windows;
}

export function needsMultiWindow(events: IntermediateEvent[]): boolean {
	const SINGLE_CALL_THRESHOLD_CHARS = 50_000 * CHARS_PER_TOKEN;
	const totalChars = events.reduce((sum, e) => sum + e.content.length, 0);
	return totalChars > SINGLE_CALL_THRESHOLD_CHARS;
}
