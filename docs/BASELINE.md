# Pre-migration baseline

Captured from commit `176d7d4` on branch `new` before the Astro foundation. Visual
and behaviour gates for later work: if a change cannot be shown to preserve these,
it is a regression.

## URLs (flat `*.html`, no directory indexes)

| URL | Role | Owner after cutover |
|---|---|---|
| `/` / `index.html` | Live Astro homepage | Astro `src/pages/index.astro` |
| `landing.html` | Redirect stub → `/` | Astro `src/pages/landing.astro` |
| `index.webflow.html` | Archived Webflow homepage | passthrough |
| `projects.html` | Work hub | Astro `src/pages/projects.astro` |
| `projects.webflow.html` | Archived Webflow work hub | passthrough |
| `aboutme.html` | About | passthrough |
| `fashion.html` | Gallery | passthrough |
| `ai-driven-product-design.html` | Opus Clip case | passthrough (Webflow) |
| `mckinseyecommerce.html` | McKinsey case | passthrough |
| `larkdesign.html` | Lark case | passthrough |
| `cummins-digitalization.html` | Cummins case | passthrough |
| `mifinance.html` | MiFinance case | passthrough |
| `alzheimerdisease.html` | Medical assistive case | passthrough |
| `tiktok-research.html` | Research case | passthrough |

Homepage cutover (`src/pages/index.astro` → `/`) is **done**. The old Webflow
homepage remains at `index.webflow.html` for rollback and comparison.

## Listing disagreement (do not "fix" during foundation)

- Homepage (`/`): AtlasNova (in progress) + Lark, Opus Clip, McKinsey, MiFinance, Cummins, Medical Assistive. No TikTok.
- `index.webflow.html` (archived): Opus Clip, McKinsey, Lark, Cummins, MiFinance, Alzheimer. No TikTok, no AtlasNova.
- `projects.html`: Opus Clip, McKinsey, Lark, Cummins, MiFinance, Alzheimer, TikTok.

## Script order

**Legacy pages (head, synchronous):** `webfont.js` → WebFont.load → `w-mod-js` IIFE → `yy-chrome.js` → `lenis.css` → `yy-reveal.js` → `lenis.min.js` → `yy-scroll.js`.

**Legacy pages (body end):** jQuery → Webflow schunks → page-specific `webflow.*.js` (+ PureCounter on some).

**Landing (before foundation):** inline reveal opt-in → `yy-chrome.js` in head; at end `yy-flow.js` → `lenis.min.js` → `yy-scroll.js` → inline cursor, slot-reveal, IO reveal.

IX2 bundles must not be consolidated:

| Bundle | Pages |
|---|---|
| `webflow.ab7fd40c` | index |
| `webflow.bfeba6ee` | ai-driven-product-design |
| `webflow.eb64d270` | lark, mckinsey, mifinance, cummins |
| `webflow.6847d5dc` | projects, about, fashion, alzheimer, tiktok |

## Breakpoints

| Width | Use |
|---|---|
| 1280 | Desktop frame lock |
| 992 / 991 | Desktop-only cursor + ASCII flow |
| 877 | Landing two-column collapse |
| 767 | Hero type step |
| 560 | Chrome capsule / landing edge |
| 479 | Webflow mobile |

## Behaviour gates (must still hold)

1. **JS off:** landing `.rv` content is visible (opt-in class, never default-hidden). IX2 pages that use inline `opacity: 0` guards remain JS-dependent; do not extend that pattern.
2. **`prefers-reduced-motion`:** do not blanket-disable `[data-w-id]` animations (that would leave IX2-guarded content invisible). Lenis destroys itself. Cursor stands down. Slot hover remains instant, not cancelled.
3. **Lenis + IX2:** measured identical reveal counts with/without Lenis on all case pages. Do not replace Lenis or change `duration: 1.05`.
4. **No horizontal overflow** at 375px on all 12 pages.
5. **yy-chrome fail-safe:** deleting the chrome script restores the legacy nav/footer.

## Out of scope (this foundation)

- Replacing `index.html` with the new landing.
- Rewriting Webflow case-study bodies.
- Installing catalog React/Three/Remotion libraries site-wide.
- Tailwind / shadcn as a default design system.
