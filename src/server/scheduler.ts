import type { Config, NormalizedEvent } from '../shared/types.js';
import { createDateRange } from '../shared/paths.js';
import type { AdapterRegistry } from './adapters/registry.js';
import { getDatabase } from './database.js';
import { generateSummary } from './intelligence/index.js';
import { logger } from './logger.js';
import { saveSummaryFile } from './persistence.js';

export interface SchedulerHandle {
  stop: () => void;
}

/**
 * Starts a self-rescheduling setTimeout loop that fires generateForDate at scheduleTime daily.
 * Returns null if scheduleTime is not configured.
 * Timer is unref'd so it doesn't prevent graceful shutdown.
 */
export function startScheduler(
  config: Config,
  registry: AdapterRegistry,
): SchedulerHandle | null {
  if (!config.scheduleTime) {
    logger.info('No scheduleTime configured — scheduler disabled');
    return null;
  }

  // Validate scheduleTime format (T-05-03 mitigation)
  if (!isValidTimeFormat(config.scheduleTime)) {
    logger.error({ scheduleTime: config.scheduleTime }, 'Invalid scheduleTime format (expected HH:mm) — scheduler disabled');
    return null;
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function scheduleNext() {
    if (stopped) return;
    const ms = getMsUntilNext(config.scheduleTime!);
    logger.info({ scheduleTime: config.scheduleTime, msUntilNext: ms }, 'Scheduler: next tick scheduled');
    timer = setTimeout(async () => {
      const today = formatDate(new Date());
      try {
        await processOneDate(today, config, registry);
        logger.info({ date: today }, 'Scheduler: summary generated');
      } catch (err) {
        logger.error({ err, date: today }, 'Scheduler: generation failed');
      }
      scheduleNext();
    }, ms);
    timer.unref();
  }

  scheduleNext();
  return { stop: () => { stopped = true; if (timer) clearTimeout(timer); } };
}

/**
 * On startup, detects missing summary dates between last successful summary and today.
 * Generates them sequentially (oldest first). Caps at 30 days if no prior history.
 * Requires both scheduleTime and apiKey to be configured.
 */
export async function runCatchUp(config: Config, registry: AdapterRegistry): Promise<void> {
  if (!config.scheduleTime || !config.ai.apiKey) {
    logger.info('Catch-up skipped: requires both scheduleTime and apiKey');
    return;
  }

  const db = getDatabase();
  const lastSummary = db.prepare(
    'SELECT date FROM summaries ORDER BY date DESC LIMIT 1'
  ).get() as { date: string } | undefined;

  const today = formatDate(new Date());
  let startDate: string;

  if (lastSummary) {
    // Start from day after last successful summary
    startDate = nextDay(lastSummary.date);
  } else {
    // No history: cap at 30 days back (T-05-04 mitigation)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startDate = formatDate(thirtyDaysAgo);
  }

  if (startDate > today) {
    logger.info('Catch-up: all caught up');
    return;
  }

  const missingDates = generateDateRange(startDate, today);
  logger.info({ count: missingDates.length, startDate, endDate: today }, 'Catch-up: generating missing summaries');

  for (const date of missingDates) {
    try {
      await processOneDate(date, config, registry);
      logger.info({ date }, 'Catch-up: summary generated');
    } catch (err) {
      logger.error({ err, date }, 'Catch-up: generation failed for date');
    }
  }
}

/**
 * Process a single date: gather events, generate summary, save to DB + file.
 * Skips dates with no events. Skips zero-config mode (needs API key).
 */
async function processOneDate(
  date: string,
  config: Config,
  registry: AdapterRegistry,
): Promise<void> {
  const range = createDateRange(date);
  const events: NormalizedEvent[] = [];
  for await (const event of registry.gatherEvents(range)) {
    events.push(event);
  }

  if (events.length === 0) {
    logger.debug({ date }, 'Scheduler: no events for date, skipping');
    return;
  }

  const result = await generateSummary(date, events, config);

  if (result.mode === 'zero-config') {
    logger.debug({ date }, 'Scheduler: zero-config mode, skipping file save');
    return;
  }

  const filePath = saveSummaryFile(date, result.markdown!, config.outputDir);

  const db = getDatabase();
  const currentVersion = (
    db.prepare('SELECT MAX(version) as maxVer FROM summaries WHERE date = ?').get(date) as { maxVer: number | null } | undefined
  )?.maxVer ?? 0;

  db.prepare(
    `INSERT INTO summaries (date, version, markdown, structured_json, metadata, mode, models_used)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    date,
    currentVersion + 1,
    result.markdown,
    JSON.stringify(result.summary),
    JSON.stringify(result.summary?.metadata ?? {}),
    'api',
    JSON.stringify(config.ai),
  );

  logger.info({ date, file: filePath, version: currentVersion + 1 }, 'Scheduler: saved summary');
}

/**
 * Validates HH:mm time format (T-05-03 mitigation).
 */
function isValidTimeFormat(timeStr: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/** Exported for testing */
export function getMsUntilNext(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

/** Exported for testing */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Exported for testing */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}
