---
phase: 01-foundation
plan: 04
subsystem: data-pipeline
tags: [git, adapter, identity-filtering, simple-git]
dependency_graph:
  requires: [01-02]
  provides: [GitAdapter, git-history-extraction]
  affects: [adapter-registry, data-pipeline]
tech_stack:
  added: [simple-git]
  patterns: [DataSourceAdapter, AsyncGenerator, identity-filtering]
key_files:
  created:
    - src/server/adapters/git/git.adapter.ts
    - src/server/adapters/git/git.adapter.test.ts
  modified: []
decisions:
  - "Used diff-tree --root as fallback for initial commits (no parent to diff against)"
  - "Identity matching uses case-insensitive partial match on both email and name"
metrics:
  duration: "2m44s"
  completed: "2026-05-18T18:02:57Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 01 Plan 04: Git History Adapter Summary

Git adapter extracts commits by date from configured repos using simple-git, with case-insensitive partial-match identity filtering and conventional-commit tag inference.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Implement Git adapter with identity filtering and repo discovery | `1cb62d1` | src/server/adapters/git/git.adapter.ts |
| 1a | Fix initial commit file listing (Rule 1 bug) | `5e8f16f` | src/server/adapters/git/git.adapter.ts |
| 2 | Create Git adapter tests with temp repo (8 tests) | `6a3391c` | src/server/adapters/git/git.adapter.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Initial commit has no parent for diff**
- **Found during:** Task 2 (test revealed empty files array)
- **Issue:** `diffSummary([hash^, hash])` throws for the first commit in a repo since there is no parent
- **Fix:** Added fallback using `git diff-tree --root --no-commit-id --name-only -r` to extract files from initial commits
- **Files modified:** src/server/adapters/git/git.adapter.ts
- **Commit:** `5e8f16f`

## Verification Results

- `npx tsc --noEmit` passes (0 errors)
- `npx vitest run src/server/adapters/git/git.adapter.test.ts` passes (8/8 tests)

## Key Implementation Details

- **Repo discovery:** Manual paths checked with `fs.existsSync`, scan dirs iterate subdirectories looking for `.git`
- **Identity filter:** When `gitIdentities` is empty, all commits included; otherwise case-insensitive partial match on email or name
- **Tag inference:** Conventional commit prefixes (feat, fix, refactor, docs, test, chore) mapped to tags
- **Safety:** `--max-count=200` prevents excessive queries on active repos
- **Deduplication:** Repos discovered from both scan and manual are deduplicated via `Set`

## Known Stubs

None - all functionality is fully implemented and tested.

## Self-Check: PASSED
