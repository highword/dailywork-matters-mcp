---
title: UI visual redesign — from functional to polished and distinctive
priority: high
created: 2026-06-03
source: user request
category: design
---

## Description

Current UI is functional but visually plain/generic — looks like a default shadcn/ui scaffold with minimal styling effort. Needs a comprehensive visual upgrade to feel polished, distinctive, and aesthetically pleasing.

## Areas to Address

### Overall Visual Identity
- Define a cohesive color palette beyond default gray/white
- Choose a distinctive design direction (e.g., developer-tool aesthetic, minimal dark theme, warm/friendly productivity app, data-dashboard feel)
- Add subtle texture, gradients, or visual rhythm to break the flat look
- Typography: consider font pairing, weight hierarchy, spacing

### Layout & Spacing
- Review whitespace, padding, section rhythm
- Add visual breathing room between sections
- Sidebar could be more visually interesting (icons, hover states, active indicators)

### Components
- Cards/containers: add depth (subtle shadows, borders, background variations)
- Buttons: more personality (rounded vs sharp, hover animations)
- Inputs/selects: refined styling beyond browser defaults
- Tables/lists: zebra striping, hover highlights, better density control

### Micro-interactions & Polish
- Page transitions/animations
- Loading states (skeleton screens, shimmer effects)
- Hover/focus feedback
- Success/error state animations (not just toast text)

### Pages Specific
- **Summaries**: task cards could be more visually rich (category colors, progress indicators, time badges)
- **Generate**: generation progress could have a more engaging visual (animated progress, step indicators)
- **Charts**: already data-rich, but could have better chart theming and card framing
- **Settings**: form sections could have icons, better grouping, card-based layout

## Open Questions

- Dark mode? Light mode? Both with toggle?
- Any reference apps/sites whose aesthetic we want to draw from?
- Should it feel more like a "developer tool" (VS Code/terminal aesthetic) or a "productivity app" (Linear/Notion aesthetic)?

## Implementation Notes

- This is a design-first task — likely needs mockups/exploration before code
- Consider using `/gsd-sketch` or `/gsd-ui-phase` to design before implementing
- May be broken into multiple phases: color/theme → layout → components → animations
