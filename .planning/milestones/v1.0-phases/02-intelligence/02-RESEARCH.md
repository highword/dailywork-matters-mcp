# Phase 2: Intelligence — Research

**Researched:** 2026-05-20
**Status:** Complete

## 1. Anthropic SDK (TypeScript)

### Installation & Initialization

Already in `devDependencies` as `@anthropic-ai/sdk ^0.39.0` (bundled by tsup at build time).

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: config.ai.apiKey });
```

If `apiKey` is omitted, the SDK reads `ANTHROPIC_API_KEY` from environment. For our zero-config mode, we never instantiate the client.

### Message Creation

```typescript
const response = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  system: 'You are a work summarization engine. Output valid JSON only.',
  messages: [{ role: 'user', content: windowContent }],
});

// Response structure
const text = response.content[0].type === 'text' ? response.content[0].text : '';
const usage = response.usage; // { input_tokens, output_tokens }
```

### Current Model IDs (May 2026)

| Model | ID | Max Output | Use Case |
|-------|-----|-----------|----------|
| Haiku 4.5 | `claude-haiku-4-5-20251001` | 8,192 | Window processing (fast, cheap) |
| Sonnet 4.6 | `claude-sonnet-4-6-20250514` | 16,384 | Merge pass (quality/cost balance) |
| Opus 4.6 | `claude-opus-4-6-20250514` | 32,000 | User override only |

**Important:** For our task output (structured JSON with ~5-20 tasks), 4096 max_tokens is sufficient for window processing. Merge pass may need 8192 for large multi-project days.

### Structured Output Options

Two approaches for getting JSON from Claude:

**Approach A: Prompt-based (simpler, recommended for us)**
- System prompt instructs JSON-only output
- Parse response text with `JSON.parse()`
- Validate with runtime check
- Pro: No beta features needed, works with all models including Haiku

**Approach B: Structured Outputs Beta**
- Requires `betas: ["structured-outputs-2025-11-13"]` header
- Uses `output_format: { type: "json_schema", schema: ... }`
- Pro: Schema-guaranteed valid JSON
- Con: Beta status, may not support Haiku yet, adds complexity

**Recommendation:** Use Approach A (prompt-based). Our schemas are simple (task list), and we can validate + retry on parse failure. Avoids beta dependency.

### Streaming vs Non-Streaming

For our use case (batch processing daily summaries, not real-time), non-streaming `messages.create()` is correct. Simpler error handling, complete usage stats in response.

## 2. Token Estimation

### Heuristic (No Server-Side Tokenizer)

Anthropic's official guidance: **1 token ≈ 3.5 English characters** (conservative). For code-heavy content: **1 token ≈ 3 characters** (code has more short tokens like `()`, `{}`, operators).

For our mixed content (code + natural language):
```typescript
function estimateTokens(text: string): number {
  // Conservative: 1 token per 3.25 chars for mixed code/text
  return Math.ceil(text.length / 3.25);
}
```

### The 50K Threshold Decision

From CONTEXT.md D-05: adaptive strategy at 50K effective tokens.

```typescript
const SINGLE_CALL_THRESHOLD = 50_000; // tokens
const CHARS_PER_TOKEN = 3.25;
const SINGLE_CALL_CHAR_THRESHOLD = SINGLE_CALL_THRESHOLD * CHARS_PER_TOKEN; // ~162,500 chars

function needsMultiWindow(content: string): boolean {
  return content.length > SINGLE_CALL_CHAR_THRESHOLD;
}
```

### Post-Call Token Tracking

```typescript
// After each API call, track actual usage:
const { input_tokens, output_tokens } = response.usage;
// Store in metadata for cost reporting (future v2 feature)
```

### Model Context Windows

| Model | Input Context | Safe Input Budget |
|-------|--------------|-------------------|
| Haiku 4.5 | 200K tokens | ~150K (leave room for output + system) |
| Sonnet 4.6 | 200K tokens | ~150K |

Window size should stay well under model context. Target: **30K tokens per window** (allows generous output + system prompt overhead).

## 3. Sliding Window Pattern

### Architecture

```
Events (grouped by project, sorted by time)
    │
    ├── Window 1: [events 0..N] → AI → TaskList_1
    ├── Window 2: [events N+1..M] + TaskList_1 as context → AI → TaskList_2
    ├── Window 3: [events M+1..P] + TaskList_2 as context → AI → TaskList_3
    └── ...
    
Final: All project TaskLists → Merge AI → DailyReport
```

### Window Size Determination

```typescript
const TARGET_WINDOW_TOKENS = 30_000;
const TARGET_WINDOW_CHARS = TARGET_WINDOW_TOKENS * 3.25; // ~97,500 chars

function buildWindows(events: IntermediateEvent[]): IntermediateEvent[][] {
  const windows: IntermediateEvent[][] = [];
  let currentWindow: IntermediateEvent[] = [];
  let currentSize = 0;

  for (const event of events) {
    const eventSize = event.content.length;
    if (currentSize + eventSize > TARGET_WINDOW_CHARS && currentWindow.length > 0) {
      windows.push(currentWindow);
      currentWindow = [];
      currentSize = 0;
    }
    currentWindow.push(event);
    currentSize += eventSize;
  }
  if (currentWindow.length > 0) windows.push(currentWindow);
  return windows;
}
```

### Context Carry-Over

Each window's prompt includes the previous window's task list output (compressed). This enables natural topic merging without explicit rules:

```typescript
const systemPrompt = `You are analyzing developer work events. 
Output a JSON task list. Merge related events into unified tasks.
${previousTasks ? `\nPrevious tasks from earlier in this session:\n${JSON.stringify(previousTasks)}` : ''}
Merge any new events into existing tasks where they continue the same work.`;
```

### Key Insight: Natural Merging

The sliding window doesn't need explicit merge rules because:
1. Previous task list provides context about ongoing work
2. AI naturally recognizes "this event continues task X"
3. Final output is always the accumulated task list

## 4. Prompt Engineering for JSON Output

### Window Processing Prompt (Haiku)

```typescript
const WINDOW_SYSTEM_PROMPT = `You are a developer work analyzer. You receive timestamped work events and output a structured JSON task list.

Rules:
1. Output ONLY valid JSON - no markdown, no explanation, no code fences
2. Each task must have exactly these fields:
   - name: string (concise, outcome-oriented title)
   - category: "feature" | "bugfix" | "refactor" | "research" | "config" | "docs" | string
   - outcome: string (what was ACCOMPLISHED, not what was done)
   - files: string[] (key files involved)
   - time_proportion: number (0-100, your best estimate)
3. time_proportion values MUST sum to exactly 100
4. Describe OUTCOMES ("implemented user auth") not PROCESS ("edited auth.ts")
5. Merge events about the same topic into a single task

${previousTasks ? `
Previous accumulated tasks (merge new events into these where applicable):
${JSON.stringify(previousTasks)}
` : ''}

Output schema:
{ "tasks": [{ "name", "category", "outcome", "files", "time_proportion" }] }`;
```

### Merge Pass Prompt (Sonnet)

```typescript
const MERGE_SYSTEM_PROMPT = `You are creating a daily work summary from per-project task lists.

Rules:
1. Output ONLY valid JSON
2. Merge tasks that span projects (same logical work in different repos)
3. Recalculate time_proportion so all tasks sum to exactly 100
4. Add a "summary" field: 1-2 sentence daily overview (outcome-oriented)
5. Sort by time_proportion descending (most time first)

Output schema:
{
  "summary": "string",
  "tasks": [{ "name", "category", "outcome", "files", "time_proportion" }],
  "metadata": { "total_sessions": number, "total_events": number, "projects": string[] }
}`;
```

### JSON Validation Pattern

```typescript
function parseAIResponse<T>(text: string, validator: (obj: unknown) => obj is T): T | null {
  // Strip potential code fences (Haiku sometimes adds them despite instructions)
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (validator(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}
```

## 5. Content Compression

### Two-Layer Strategy (D-12)

**Layer 1: Adapter-level (deterministic, already in Phase 1 scope)**
- Remove system prompts / CLAUDE.md injections
- Remove permission confirmations
- Remove duplicate tool results

**Layer 2: Intelligence-level (context-dependent, Phase 2 scope)**

```typescript
interface CompressionRules {
  codeBlocks: { maxLines: 3, strategy: 'firstN' };
  thinkingBlocks: { strategy: 'conclusionOnly' };
  toolOutputs: { maxChars: 500, strategy: 'truncateWithEllipsis' };
  repetitiveContent: { strategy: 'deduplicate' };
}

function compressEvent(event: NormalizedEvent): IntermediateEvent {
  let content = event.content;
  
  // Code blocks: keep first 3 lines
  content = content.replace(/```[\s\S]*?```/g, (block) => {
    const lines = block.split('\n');
    if (lines.length > 5) {
      return lines.slice(0, 4).join('\n') + '\n... (truncated)\n```';
    }
    return block;
  });
  
  // Thinking blocks: extract conclusion
  content = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, (block) => {
    const lines = block.split('\n');
    const lastParagraph = lines.slice(-3).join('\n');
    return `[Thinking conclusion: ${lastParagraph}]`;
  });
  
  // Large outputs: truncate
  if (content.length > 2000) {
    content = content.slice(0, 1500) + '\n... [truncated, ' + content.length + ' chars total]';
  }
  
  return {
    type: event.type,
    timestamp: event.timestamp,
    content,
  };
}
```

### Intermediate Format (D-13)

```typescript
interface IntermediateEvent {
  type: string;       // from NormalizedEvent.type
  timestamp: string;  // ISO 8601
  content: string;    // compressed human-readable text
}
```

### Compression Ratio Targets

- Typical Claude session JSONL: 50-500KB raw → 5-50KB compressed (10:1)
- Target per-window payload: ~30K tokens (~100KB text)
- A busy dev day might have 2-5 windows per project

## 6. Markdown Rendering

### Programmatic Generation (D-10)

JSON is the source of truth. Markdown is derived programmatically:

```typescript
interface DailySummary {
  date: string;
  summary: string;
  tasks: Task[];
  metadata: {
    total_sessions: number;
    total_events: number;
    projects: string[];
    generated_at: string;
    models_used: { window: string; merge: string };
  };
}

function renderMarkdown(summary: DailySummary): string {
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
    lines.push(`| ${task.name} | ${task.category} | ${task.time_proportion}% |`);
  }
  lines.push('');
  for (const task of summary.tasks) {
    lines.push(`### ${task.name}`);
    lines.push('');
    lines.push(`**Category:** ${task.category} | **Time:** ${task.time_proportion}%`);
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
  lines.push(`*Generated: ${summary.metadata.generated_at} | Sessions: ${summary.metadata.total_sessions} | Events: ${summary.metadata.total_events}*`);
  return lines.join('\n');
}
```

## 7. Error Handling & Resilience

### Error Types from Anthropic API

| HTTP Status | Type | Meaning | Action |
|-------------|------|---------|--------|
| 400 | `invalid_request_error` | Bad request (invalid model, params) | Don't retry, fix request |
| 401 | `authentication_error` | Invalid API key | Don't retry, report to user |
| 429 | `rate_limit_error` | User rate limit exceeded | Retry with exponential backoff |
| 500 | `api_error` | Server error | Retry once after pause |
| 529 | `overloaded_error` | Anthropic capacity saturated | Retry with longer backoff |

### Retry Strategy

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === maxRetries) throw error;
      
      const status = (error as { status?: number }).status;
      
      // Don't retry client errors (except rate limits)
      if (status === 400 || status === 401) throw error;
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable');
}
```

### Partial Failure Handling (Mid-Window)

If a window fails after retries:
1. Log the failure with context (which window, which project)
2. Skip that window's events (they become "unprocessed")
3. Continue with next window using last successful task list
4. Report gap in final metadata: `{ "gaps": ["project-X window 3/5 failed"] }`

### API Key Validation

```typescript
async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey });
    // Minimal call to verify key works
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'test' }],
    });
    return true;
  } catch (error: unknown) {
    return (error as { status?: number }).status !== 401;
  }
}
```

### Graceful Degradation

When API is unavailable (all retries exhausted):
- Fall back to zero-config mode behavior (return raw structured data)
- Log warning explaining the degradation
- Store partial results if any windows completed

## 8. Implementation Recommendations

### Module Architecture

```
src/server/intelligence/
├── index.ts              — Public API: generateSummary(date, config)
├── types.ts              — IntermediateEvent, Task, DailySummary, WindowResult
├── compression.ts        — Event compression (Layer 2)
├── aggregation.ts        — Project grouping + window building
├── ai-client.ts          — Anthropic client wrapper with retry
├── prompts.ts            — System prompts for window + merge
├── window-processor.ts   — Single window processing logic
├── merge-processor.ts    — Final merge pass across projects
├── renderer.ts           — JSON → Markdown rendering
└── zero-config.ts        — Host AI mode (returns pre-processed JSON)
```

### Processing Pipeline

```
1. Collect events → AdapterRegistry.gatherEvents(dateRange)
2. Group by project → Map<project, NormalizedEvent[]>
3. Compress events → Map<project, IntermediateEvent[]>
4. Check mode:
   a. Zero-config (no API key) → Package as structured JSON response → DONE
   b. API key mode → Continue to step 5
5. Estimate total tokens → Single call or multi-window?
6. Process per-project:
   a. Single call: All events in one prompt
   b. Multi-window: Build windows, process sequentially with carry-over
7. Merge all project results → Final merge pass (Sonnet)
8. Store in DB (summaries + tasks tables)
9. Render to Markdown file
10. Return structured result
```

### Config Extension (D-07)

The existing `Config` interface needs expansion:

```typescript
// Extend Config interface
interface Config {
  // ... existing fields ...
  
  // AI (replace single model field)
  ai: {
    apiKey: string | null;
    windowModel: string;   // default: claude-haiku-4-5-20251001
    mergeModel: string;    // default: claude-sonnet-4-6-20250514
  };
  
  // Output format (D-11)
  outputFormats: ('markdown' | 'html')[]; // default: ['markdown']
}
```

**Migration concern:** The existing `apiKey` and `model` fields in Config must be migrated to the nested `ai` structure. Need a DB migration + config migration.

### Database Storage

The existing `summaries` and `tasks` tables are already designed for this:
- `summaries.structured_json` stores the full DailySummary JSON
- `summaries.markdown` stores rendered Markdown
- `tasks` table stores denormalized individual tasks for analytics

No new tables needed. May need migration 002 for:
- Adding `mode` column to summaries (zero-config vs api)
- Adding `models_used` to summaries metadata

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Haiku outputs invalid JSON | Medium | Low | Strip code fences + retry (1 extra call) |
| Token estimation inaccurate | Low | Low | Conservative estimate (3.25 chars/token), slight over-windowing is fine |
| Single busy day exceeds all windows | Low | Medium | Cap at 10 windows per project, summarize overflow |
| API key mode costs surprise users | Medium | Medium | Log estimated cost before processing, add cost cap config |
| Sonnet merge pass quality varies | Low | Low | Merge prompt is simple (combine lists), quality is consistent |
| Config migration breaks existing users | Medium | Medium | Backward compat: read old `model`/`apiKey` fields if `ai` block missing |
| Rate limits on large batch jobs | Medium | Medium | Built-in retry with backoff handles this automatically |
| Zero-config response too large for MCP | Low | High | Implement compression + pagination in zero-config mode |

### Critical Path

The most complex piece is the **window processor** — it orchestrates:
1. Token estimation
2. Window boundary decisions  
3. Sequential processing with carry-over
4. Partial failure recovery

This should be the first thing implemented and most thoroughly tested.

---

*Phase: 02-intelligence*
*Research completed: 2026-05-20*
