# Landing case enter: text rise + media wipe

Approved 2026-08-27.

## Goal

When a featured project row enters the viewport, the label keeps the default rise enter, and the thumbnail uses the existing wipe recipe (clip reveal from bottom + scale).

## Behavior

1. Label: `data-reveal="text"` — fade + `translateY(8px)` + `scale(0.98→1)`, 250ms, `--ease-smooth-out`.
2. Media: `data-reveal="wipe"` — `clip-path: inset(100% 0 0 0) → inset(0)` + `scale(--scale-medium)` + fade, 250ms.
3. Both start together via `data-reveal-sync="case"` (no stagger delay).

## Out of scope

- Stagger delay between label and media
- Full-case clip open
- Soft snap / Lenis / video preload changes
- Case-study / IX2 pages

## Success

- Scroll to each project: copy rises, thumbnail wipes up
- ~250ms, not sluggish
- `npm test` passes
