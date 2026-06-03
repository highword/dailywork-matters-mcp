---
title: Fetch valid models from API and populate model selection
priority: medium
created: 2026-06-02
source: user request
category: feature
---

## Description

Settings page should dynamically fetch the list of valid models from the AI endpoint (using the configured baseUrl or default) and present them as a dropdown/selectable list instead of free-text input for Window Model and Merge Model fields.

## Implementation Notes

- Call the models endpoint (e.g., Anthropic's `/v1/models` or proxy equivalent) using the configured apiKey + baseUrl
- Populate Window Model and Merge Model fields as `<Select>` with fetched options
- Fallback to free-text input if the models endpoint is unavailable or returns an error
- Cache the model list (short TTL or on-demand refresh button)
- Consider: proxy endpoints may have different model listing APIs — need to handle gracefully
