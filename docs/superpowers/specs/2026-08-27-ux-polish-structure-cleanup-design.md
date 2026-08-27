# UX polish + structure cleanup (no data refactor)

**Date:** 2026-08-27  
**Scope:** Visitor-facing copy/UX polish (C) + targeted Astro-layer structure cleanup (B)  
**Out of scope:** Unifying `projects.ts` with `yy-work.js` / `projects.html` (data-layer refactor)

## Goal

Improve what visitors read and how clearly in-progress work reads, while reducing duplication and dead code in the Astro stack — without changing listing logic, Webflow case bodies, or chrome architecture.

## Title policy (mixed, intentional)

| Surface | Title | Rationale |
|---|---|---|
| Homepage hero + `<title>` | **Product Designer** | Current positioning; keep as-is |
| `BaseLayout` default meta description | **Product designer** (sentence case) | Align default OG/meta with homepage when pages omit overrides |
| About panel (`yy-about.js`) lead | **User Experience Designer** → tighten to **UX designer** in body copy only; lead can stay “UX Designer” | Legacy About voice; case studies historically say “UX designer” in role context |
| `landing.astro` redirect stub `<title>` | **Product Designer** | Match live homepage, not stale “UX Designer” |
| Webflow case pages | **No edits** | Role titles are project-specific (e.g. MiFinance “UX Designer”, Alzheimer “Product Designer”) |

**Rule:** Do not global-find-replace “UX” → “Product” on legacy HTML. Only fix surfaces the site owns going forward (Astro + chrome JS strings).

---

## Three approaches

### Approach 1 — Surgical patch (recommended)

Fix copy in place, dedupe one hot component, remove provably dead CSS, document dormant schema fields.

| Pros | Cons |
|---|---|
| Smallest diff; easy to review on Cloudflare preview | Does not reduce `yy-chrome.js` size |
| No behaviour change to nav/Work panel data | About bio still duplicated in two files (HTML + JS) |
| Fits “no data refactor” constraint | |

**Estimated touch count:** ~8 files, ~150 LOC changed.

### Approach 2 — Shared copy module

Everything in Approach 1, plus extract About bio + title strings to `assets/js/yy-copy.js` (or `src/data/site-copy.ts` consumed at build for About HTML later).

| Pros | Cons |
|---|---|
| Single source for About paragraph | Requires wiring both `yy-about.js` and `aboutme.html` (or accepting drift on legacy page) |
| Easier future edits | Slightly more setup for a static string |

### Approach 3 — Chrome split + copy module

Split `yy-chrome.js` into nav/footer/panel loaders; add shared copy module.

| Pros | Cons |
|---|---|
| Best long-term maintainability | High regression risk on all 12 pages |
| | Out of proportion for a polish pass |

**Recommendation:** **Approach 1** now; defer Approach 2 until `aboutme.html` is retired or migrated.

---

## UX polish (visitor-facing)

### P0 — Copy & title consistency

1. **`src/layouts/BaseLayout.astro`** — default description: “Product designer…” (match homepage).
2. **`src/pages/landing.astro`** — `<title>` → “Yanice Yang — Product Designer”.
3. **`assets/js/yy-about.js`** — fix bio typos/grammar (see copy block below).
4. **`aboutme.html`** — same bio fixes (keep in sync manually for this pass).

**Revised About bio (both surfaces):**

> Thanks for stopping by. I am a designer passionate about exploring diverse fields and helping users and businesses find a clearer path to success. As a UX designer, I've come to deeply appreciate design as a bridge between user needs and business goals. To me, UX is not just about visually appealing interfaces—it is about solving real problems in ways that feel intuitive, inclusive, and meaningful. Before becoming a UX designer, I was a fashion designer for five years; feel free to check my fashion work here. I also enjoy learning math, physics, and other STEM fields.

Also fix **`yy-about.js` lead line:** “digital problem” → “digital problems”; “through empathizing” → “by empathizing”.

### P1 — In-progress discoverability (AtlasNova + Work panel)

1. **`src/components/ProjectSlot.astro`** — cursor label `"on progress"` → **`"in progress"`** (matches `status: 'in-progress'` and English norm).
2. **`assets/js/yy-work.js`** — Lark Education card sub: `Qualitative&Quantitative (ON process)` → **`Qualitative & quantitative · in progress`**; add visible “In progress” treatment if CSS supports it (grey card already uses `card--unable`).
3. **Optional (P2):** Add AtlasNova to Work panel as a non-link **`card--unable`** row (title/sub from landing `projects.ts` manually copied once — not a data pipeline). *Defer unless Yanice wants Work panel to mirror homepage AtlasNova slot.*

### P2 — Work panel title alignment (manual copy only)

Without touching `projects.ts` → `yy-work.js` plumbing, update **display strings** in `yy-work.js` so published cards feel closer to landing headlines where it helps recognition:

| Current (Work) | Suggested (closer to landing) |
|---|---|
| AI-powered Video Tool | Opus Clip · Video creation beyond prompts |
| Digital Consulting UXD | McKinsey · Live shopping from 0 to 1 |
| All-in-One Office Tool UXD | Lark · Team onboarding |

Keep subs short; do not rename URLs or slugs.

### P3 — Leave alone (documented)

- Webflow case study body copy (grammar issues exist but are historical project voice).
- `projects.html` listing order/content (separate migration).
- Homepage vs Work panel project set mismatch (requires Approach A data work).

---

## Structure cleanup (Astro layer)

### P0 — Deduplicate `ProjectSlot.astro`

Extract inner media block (`video` / `img` + `.ph` placeholder) to a shared fragment or `SlotMedia.astro` used by both link and static branches. Removes ~40 duplicated lines; behaviour unchanged.

### P1 — Remove dead `panel` kind CSS

`AtlasNova` uses `kind: 'slot'` with static video, not `kind: 'panel'`. No project currently uses `panel`.

- Remove `.panel`, `.panel__acts`, `.panel__foot` rules from `landing.css` **only if** grep confirms zero runtime use.
- Keep `ProjectKind` type and `ProjectSlot` panel branch for future use, or remove branch + validator if we want strict YAGNI (prefer **keep branch, delete CSS** to avoid re-adding later).

### P2 — Document dormant listing flags

`featuredOnIndex` and `featuredOnProjects` are written but never read. Options:

- **Minimal (recommended):** JSDoc on fields + comment in `EXTENDING.md` that only `featuredOnLanding` is active until index/projects pages are Astro-generated.
- **Delete fields:** Requires editing every project record — skip for this pass.

### P3 — Stub case template clarity

`src/pages/[slug].astro` ships placeholder “Evidence / Decision / Outcome” sections. Add a one-line comment at top: *“Scaffold only — replace before publishing any `engine: 'astro'` case.”* No user-facing change.

---

## Testing

```bash
npm test           # schema + link checks
npm run build      # ensure Astro build clean
npm run check      # astro check + dist checks
```

Manual on Cloudflare preview (`npm run dev` + tunnel):

1. Homepage — hero still “Product Designer”; AtlasNova cursor chip says “in progress”.
2. Nav → About — bio reads cleanly; no “passioned”.
3. Nav → Work — card titles readable; in-progress card labelled correctly.
4. `/landing.html` — redirects; view-source title updated.

No screenshots/recordings per `preview-only.mdc`.

---

## Implementation order

1. P0 UX copy (BaseLayout, landing stub, About ×2)
2. P0 structure (ProjectSlot dedupe)
3. P1 UX (in-progress labels, Work panel subs)
4. P1 structure (dead panel CSS, flag docs)
5. P2 optional (Work title strings, AtlasNova in Work panel)

---

## Success criteria

- Zero title/description mismatch between `/`, `index.astro`, and `landing.astro` stub.
- About bio grammatically correct on both About surfaces.
- “In progress” labelling consistent on homepage slot and Work panel.
- `ProjectSlot.astro` has a single media-rendering path.
- `npm test` and `npm run check` pass.
- No change to Webflow case HTML bodies or project listing logic.

---

## Open question for Yanice

Should **AtlasNova** appear in the nav **Work** panel as a grey “in progress” card (matching the homepage slot), or stay homepage-only until the case ships?
