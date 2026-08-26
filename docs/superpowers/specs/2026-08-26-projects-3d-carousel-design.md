# Projects Page 3D Carousel — Design Spec

**Date:** 2026-08-26  
**Branch:** `cursor/projects-3d-carousel-d425`  
**Status:** Approved in conversation; awaiting final review of this written spec

## Goal

Replace the legacy Webflow `projects.html` work hub with a new Astro page whose primary experience is a framer-motion–based 3D photo carousel (adapted from the provided `3d-carousel` component). This revision ships **UI skeleton and motion only** — real copy, click-through detail flows, and the special Web Coding 3D object are deferred to later branches.

## Non-goals (explicit)

- Do not revamp the homepage Featured Work section (`src/pages/index.astro` / `ProjectIndex`).
- Do not implement project detail panels, overlays with case copy, or click-to-navigate alignment (will be designed on another branch).
- Do not build the differentiated Web Coding 3D object; only regular project cards (6–7 slots).
- Do not fill final titles, path-text strings, or production PNG assets; use placeholders.
- Do not introduce Tailwind CSS or shadcn/ui as a site design system.
- Do not rewrite case-study bodies or change landing canvas-motion ownership.

## Context & constraints

| Constraint | Detail |
|---|---|
| Stack | Astro 5 static (`build.format: 'file'`) + React 19 islands; TypeScript strict; path alias `@/*` → `src/*` |
| Styling | Custom CSS + `assets/css/yy-tokens.css` + `yy-chrome`; **no Tailwind / shadcn** |
| Motion ownership | One writer per animated property; respect `src/data/motion.ts` and existing Lenis / chrome rules |
| Reduced motion | Disable drag + scroll-driven rotation; show a static readable arc / grid; content visible without JS |
| Chrome | Keep `yy-nav` / footer behavior; glass recipe must match nav capsule (blur, saturate, semi-transparent fill, inset hairlines) |
| Route ownership | New Astro page must own `projects.html`; legacy root passthrough must not overwrite it |
| Data SSOT | `src/data/projects.ts` (`featuredOnProjects`) |

The pasted demo assumed a shadcn + Tailwind app. This repo does **not**. Integration means adapting the component into an island and restyling with site tokens — not scaffolding a parallel shadcn tree under `/components/ui`.

## Decisions (locked)

1. **Surface:** New Astro projects hub replacing `projects.html` (not the homepage work strip).
2. **Approach:** Adapt the provided framer-motion cylindrical carousel (Approach A), not R3F/Three and not pure-CSS sphere-scroll.
3. **Layout:** Cylindrical remnant — keep cylindrical perspective, expose roughly the front half-arc (~180°), fade side cards; slight left/right stagger so cards are not a rigid grid.
4. **Drive:** Combined — vertical scroll gently advances `rotateY`; drag/touch selects precisely with spring settle on release.
5. **Hover:** Path text crawls along the card frame from right to left; placeholder strings only.
6. **Click (this version):** Visual select / bring-forward only. No detail panel. No required navigation.
7. **Web Coding special:** Skipped this version.
8. **Content:** Deferred; placeholders for labels and transparent-PNG media.
9. **Typography:** Unify with current site style — reuse landing eyebrow / case name / scope recipes and `yy-tokens` type + ink. No new display system for this page.

## Architecture

```
src/pages/projects.astro
  ├─ BaseLayout / shared chrome scripts (yy-chrome, Lenis, yy-scroll)
  ├─ short page header (does not overpower brand chrome)
  └─ client island: ProjectsCarousel3D
        ├─ framer-motion cylinder remnant
        ├─ scroll ↔ rotation bridge (Lenis-aware or window scroll fallback)
        ├─ drag controls + spring
        ├─ glass overlay per card (nav-matched)
        └─ SVG/CSS path-text hover treatment (placeholder copy)

src/data/projects.ts
  └─ featuredOnProjects (or a small dedicated helper) → 6–7 card slots

assets/… or public placeholders
  └─ transparent PNG stubs per slot (replaceable later)
```

### Route cutover

1. Add `src/pages/projects.astro` so Astro emits `dist/projects.html`.
2. Add `projects.html` to `GENERATED_HTML` in `scripts/legacy-passthrough.mjs` (dev middleware + build copy must not clobber Astro output).
3. Retire or archive the root Webflow `projects.html` (move aside / stop treating as passthrough source) so the Astro page is authoritative.
4. Update `docs/BASELINE.md` / `docs/EXTENDING.md` and `scripts/check-site.mjs` expectations for the new owner.

### Component adaptation (from pasted `3d-carousel`)

| Pasted piece | Adaptation |
|---|---|
| Tailwind utility classes | Replace with BEM-ish / token classes in `src/styles/projects.css` |
| `bg-mauve-dark-2`, picsum URLs | Transparent PNG placeholders + glass fill from nav recipe |
| Full 360° cylinder | Clamp visible faces to front remnant; opacity/scale falloff on sides |
| Click → fullscreen `AnimatePresence` image | Drop detail overlay for now; optional brief selected state only |
| `useMediaQuery` helpers | Keep locally in the island or a tiny shared hook file under `src/components/islands/` |
| Demo dashed border wrapper | Not used; page owns framing |

Dependency to add: `framer-motion` only (plus existing React). Do not add shadcn CLI, Tailwind, or lucide unless a later pass needs icons.

## Visual & interaction design

### Page composition (first viewport)

One composition, not a dashboard:

1. Site chrome (existing bottom nav capsule).
2. Quiet page title / eyebrow using the **same type recipes as the landing** (not a new display style).
3. Dominant carousel stage (edge-aware, full-bleed within content width rules of the site).
4. No stat strips, no schedule blocks, no multi-card marketing grids in the hero.

### Typography (must match current site)

All readable text on the new projects hub — page chrome labels, any selected-card meta, and path-text placeholders — must reuse the existing system. Do **not** invent a parallel type scale for this page.

| Role | Match existing | Tokens / recipe |
|---|---|---|
| Page / section label | Landing `.eyebrow` / `.index__head .eyebrow` | `Plus Jakarta Sans`, `--t-11`, uppercase, `letter-spacing: .12em`, `--ink-3`, `--lh-caption` |
| Project name (when shown) | `.case__name` | `--t-20`, weight 600, `letter-spacing: -0.03em`, `--ink`, `--lh-heading` |
| Scope / secondary line | `.case__scope` | `--t-13`, `--ink-3`, `--lh-caption` |
| Path-text on card frame | Same family + caption scale as eyebrow (mono only if a measured site pattern already uses it for micro labels) | Prefer `--t-11` / `--ink` or `--ink-2` on glass; keep tracking tight enough to read while crawling |
| Colors / ground | Landing tokens | `--ink`, `--ink-2`, `--ink-3`, `--ground`, `--hair`, `--slot` |

Implementation rule: pull sizes, weights, tracking, and ink from `yy-tokens.css` + the landing case label CSS. Placeholder strings are fine; **placeholder styling is not** — text must already look like the rest of the site.

### Card anatomy

- Media: transparent-background PNG placeholder at **1:1** (matches the pasted carousel faces). Later art can change aspect without changing the remnant layout contract.
- Overlay: glass layer matching `.cap` nav treatment (`backdrop-filter: blur(12px) saturate(1.6)`, semi-transparent `--yy-fill`, inset hairlines / soft indigo shadow as used in `yy-chrome`).
- Frame: rounded corners aligned with existing `--slot-radius` / case frame tokens where sensible.
- Path text: absolute path along the frame perimeter; animates right→left on hover; uses placeholder glyphs (`PROJECT 01` …) until real copy arrives; **styled with the site eyebrow/caption recipe** (see Typography above), not demo/Tailwind defaults.
- Stagger: each face gets a small X offset / yaw bias so the remnant reads creative, not a perfect fence.

### Motion

- Scroll: map scroll delta (while stage is in view) to incremental `rotateY`; keep gains subtle so Lenis soft scrolling remains pleasant.
- Drag: reuse demo’s drag + spring end (`stiffness` / `damping` / `mass` in the same ballpark as the pasted component).
- Hover: path-text draw/crawl + slight Z lift / brightness; reverse on leave.
- Reduced motion: no auto rotation from scroll/drag; static remnant or simple responsive wrap; path text may appear fully without crawl.

### Responsive

- Desktop: full remnant carousel with drag + scroll coupling.
- Small screens: tighter cylinder width (as in demo’s `max-width: 640px` branch), larger face scale, touch-drag primary; ensure no horizontal page overflow at 375px (baseline gate).

## Data & placeholders

- Source cards from `projects` where `featuredOnProjects === true`, capped/padded to **6–7** slots for the UI scaffold.
- If fewer than 6 published flags exist, duplicate-safe placeholder entries (clearly marked `placeholder: true` in island props) may fill the arc so layout can be judged.
- Image field for this page: prefer a new optional `projectsPageArt?: { src; width; height; alt }` later; **for this UI pass**, hardcode or map to transparent PNG stubs under e.g. `assets/images/projects/placeholders/`.
- Path-text and titles: placeholder strings only.

## Testing & quality gates

- Extend / adjust `scripts/check-site.mjs` so `dist/projects.html` is recognized as Astro-owned (not missing legacy Webflow assumptions that conflict).
- Manual: carousel renders, drag works, scroll nudges rotation, hover path text runs, glass readable on light/dark stage, reduced-motion fallback sane, 375px no horizontal overflow.
- Keep `npm test` / `npm run check` green after cutover edits.
- Do not require Vitest for the island in this pass unless the repo gains a unit harness; site checks remain the automated gate.

## File map (expected)

| Path | Role |
|---|---|
| `src/pages/projects.astro` | New projects hub page |
| `src/components/islands/ProjectsCarousel3D.tsx` | Adapted 3D carousel island |
| `src/styles/projects.css` | Page + card glass + path-text styles |
| `src/data/projects.ts` | Helper / flags for projects-hub listing if needed |
| `scripts/legacy-passthrough.mjs` | Add `projects.html` to `GENERATED_HTML`; stop clobber |
| Root `projects.html` | Archive / remove from passthrough source |
| `docs/BASELINE.md`, `docs/EXTENDING.md` | Document Astro ownership of projects hub |
| `scripts/check-site.mjs` | Update invariants for new page |
| `package.json` | Add `framer-motion` |

## Open items (intentionally deferred)

- Final path-text copy and project naming on cards.
- Production transparent PNGs (including Web Coding hero object).
- Click → detail / case-study alignment on a future branch.
- Whether selected cards should deep-link to existing `href`s once interaction lands.
- Exact scroll-to-rotation gain curve (tune during implementation against Lenis).

## Success criteria

1. Visiting `/projects.html` shows the new Astro 3D remnant carousel, not the Webflow projects hub.
2. Six to seven glass-framed placeholder cards read as a creative front-arc, not a closed ring or flat grid.
3. Scroll and drag both affect rotation; hover shows frame path-text crawl with placeholders.
4. Homepage featured work and case studies are unchanged.
5. Site checks pass; reduced-motion and no-JS remain acceptable for content visibility.
