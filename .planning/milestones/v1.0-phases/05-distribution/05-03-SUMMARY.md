---
phase: 05-distribution
plan: 03
subsystem: infra
tags: [github-actions, ci, npm-publish, provenance, cross-platform]

# Dependency graph
requires:
  - phase: 05-01
    provides: "npm package structure (package.json, tsup config, dist/ output)"
provides:
  - "Cross-platform CI matrix (ubuntu, macos, windows) validating build+test"
  - "Tag-triggered npm publish workflow with provenance"
affects: [distribution, releases]

# Tech tracking
tech-stack:
  added: [actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4]
  patterns: [github-actions-matrix, npm-provenance-oidc, tag-triggered-publish]

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/publish.yml
  modified: []

key-decisions:
  - "Used actions/checkout@v4 (verified stable) over v6 (speculative in research)"
  - "fail-fast: false for CI matrix to get full platform coverage per run"
  - "npm publish (not pnpm publish) for more reliable provenance flag support"

patterns-established:
  - "CI: Matrix strategy with fail-fast: false for cross-platform validation"
  - "Publish: OIDC id-token + --provenance for supply chain trust"

requirements-completed: [OPS-02]

# Metrics
duration: 4min
completed: 2026-06-01
---

# Phase 5 Plan 3: CI/CD Workflows Summary

**GitHub Actions CI matrix (3 platforms) and tag-triggered npm publish with OIDC provenance**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-01T08:33:50Z
- **Completed:** 2026-06-01T08:37:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Cross-platform CI validates build+test on ubuntu, macos, and windows for every push/PR to main
- Automated npm publish triggers on v* git tags with supply chain provenance via OIDC
- Both workflows use consistent action versions (checkout@v4, setup-node@v4, pnpm/action-setup@v4)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cross-platform CI workflow** - `b996d2e` (feat)
2. **Task 2: Create tag-triggered publish workflow** - `0c57bc0` (feat)

## Files Created/Modified
- `.github/workflows/ci.yml` - CI matrix: ubuntu/macos/windows, Node 20.x, pnpm install+build+test
- `.github/workflows/publish.yml` - Tag-triggered npm publish with OIDC provenance and NPM_TOKEN secret

## Decisions Made
- Used `actions/checkout@v4` instead of v6 mentioned in RESEARCH.md (v4 is the verified stable version)
- Set `fail-fast: false` on CI matrix so all platforms report independently even if one fails early
- Used `npm publish` (not `pnpm publish`) because npm's `--provenance` flag is more reliable
- Added `--access public` for first-publish compatibility with unscoped packages
- Omitted explicit `version:` in pnpm/action-setup@v4 (auto-detects from packageManager field)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

**NPM_TOKEN secret must be configured in GitHub repo settings before first publish.**
- Go to npmjs.com > Access Tokens > Generate New Token (Granular Access Token, publish scope)
- Go to GitHub repo > Settings > Secrets and variables > Actions > New repository secret
- Name: `NPM_TOKEN`, Value: the npm token

## Next Phase Readiness
- CI workflows ready; will activate once code is pushed to GitHub
- Publish workflow ready; requires NPM_TOKEN secret in repo settings
- Combined with 05-01 (npm packaging) and 05-02 (scheduler), the distribution phase is complete

---
*Phase: 05-distribution*
*Completed: 2026-06-01*
