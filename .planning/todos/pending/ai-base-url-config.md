---
title: Support custom AI Base URL in config
priority: medium
created: 2026-06-02
source: user request
category: feature
---

## Description

Allow users to configure a custom `baseUrl` for the AI API alongside the API key. This enables use with proxy services, self-hosted models, or regional endpoints (e.g., Azure OpenAI, Anthropic via proxy).

## Implementation Notes

- Add `ai.baseUrl` field to `Config` type in `src/shared/types.ts`
- Pass `baseUrl` to Anthropic SDK client constructor (`new Anthropic({ apiKey, baseURL })`)
- Settings UI: add Base URL input field next to API Key field
- Default: `undefined` (uses SDK default endpoint)
