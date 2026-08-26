# Projects Page 3D Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy Webflow `projects.html` with an Astro projects hub whose main stage is a motion/react cylindrical-remnant carousel (adapted from the provided 3d-carousel), shipping UI skeleton + interaction only.

**Architecture:** Astro page owns `projects.html`. A React island (`ProjectsCarousel3D`) renders a front-half-arc 3D carousel driven by scroll + drag, with nav-matched glass card overlays and path-text hover placeholders. Styles live in `src/styles/projects.css` using existing `yy-tokens` / landing type recipes — no Tailwind, no shadcn. Data comes from `featuredOnProjects` in `src/data/projects.ts`.

**Tech Stack:** Astro 5, React 19 islands, existing `motion` (`motion/react` — do **not** add `framer-motion`), site CSS tokens, `scripts/check-site.mjs` as the automated gate.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-26-projects-3d-carousel-design.md`
- No Tailwind / shadcn; React only as a single-route island
- Import motion from `motion/react` (already in `package.json`); do not install `framer-motion`
- Typography must match landing `.eyebrow` / `.case__name` / `.case__scope` + `--ink*` / `--t-*`
- Click detail panels, real copy, and Web Coding special object are out of scope
- Homepage Featured Work (`index.astro` / `ProjectIndex`) must not change
- Lenis + `yy-chrome` stay; reduced-motion disables drag/scroll rotation
- One animated CSS property → one writer
- Branch naming: work stays on `cursor/projects-3d-carousel-d425`

---

## File map

| File | Responsibility |
|---|---|
| `src/data/projects.ts` | Add `hubProjects()` helper (+ optional card art field later; placeholders OK now) |
| `assets/images/projects/placeholders/card-0N.png` | Transparent 1:1 PNG stubs (7 files) |
| `src/components/islands/ProjectsCarousel3D.tsx` | Remnant carousel island (scroll+drag, glass, path text) |
| `src/styles/projects.css` | Page layout + card glass + path-text styles |
| `src/pages/projects.astro` | New hub page → `projects.html` |
| `scripts/legacy-passthrough.mjs` | Treat `projects.html` as Astro-generated |
| `projects.html` → `projects.webflow.html` | Archive Webflow hub (passthrough archive) |
| `scripts/check-site.mjs` | Assert Astro owns projects hub + listing helper |
| `docs/BASELINE.md`, `docs/EXTENDING.md` | Document ownership cutover |

---

### Task 1: Cutover gate — archive Webflow hub + fail check for Astro ownership

**Files:**
- Create: (none yet for page)
- Modify: `scripts/legacy-passthrough.mjs`
- Modify: `scripts/check-site.mjs`
- Rename: `projects.html` → `projects.webflow.html`
- Modify: `docs/BASELINE.md`
- Test: `scripts/check-site.mjs` (via `npm test`)

**Interfaces:**
- Consumes: existing passthrough `GENERATED_HTML` set
- Produces: `projects.html` reserved for Astro; archive at `projects.webflow.html`

- [ ] **Step 1: Write the failing check**

In `scripts/check-site.mjs`, after the existing `root index.html` / `landing.html` guards (~lines 80–84), add:

```js
if (fs.existsSync(path.join(ROOT, 'projects.html'))) {
  errors.push('root projects.html must not exist — Astro owns /projects.html; archive is projects.webflow.html');
}
if (!fs.existsSync(path.join(ROOT, 'projects.webflow.html'))) {
  errors.push('projects.webflow.html missing — archive the pre-cutover Webflow projects hub');
}
```

In the `useDist` block (near `dist/index.html` checks), add:

```js
const distProjects = path.join(distDir, 'projects.html');
if (!fs.existsSync(distProjects)) {
  errors.push('dist/projects.html missing — run npm run build after adding src/pages/projects.astro');
} else {
  const projectsHtml = fs.readFileSync(distProjects, 'utf8');
  if (!projectsHtml.includes('yy-projects')) {
    errors.push('dist/projects.html is not the Astro projects hub (missing yy-projects)');
  }
  if (projectsHtml.includes('w-nav') && projectsHtml.includes('webflow')) {
    // Soft signal only if the archived markup leaked; Astro page must not ship Webflow IX2 shell.
    if (projectsHtml.includes('data-w-id') || projectsHtml.includes('w-mod-js')) {
      errors.push('dist/projects.html still looks like the Webflow projects hub');
    }
  }
}
if (!fs.existsSync(path.join(distDir, 'projects.webflow.html'))) {
  errors.push('dist/projects.webflow.html missing — archived Webflow projects hub should passthrough');
}
```

Also extend `knownGenerated` (non-dist mode) and `GENERATED_HTML` usage:

In `check-site.mjs` where `knownGenerated` is built:

```js
const knownGenerated = useDist
  ? new Set()
  : new Set(['index.html', 'landing.html', 'projects.html']);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL with messages about root `projects.html` still existing and/or missing `projects.webflow.html` (and, if `--dist` not used, that is enough for this task’s red).

- [ ] **Step 3: Minimal cutover plumbing**

1. Rename:

```bash
git mv projects.html projects.webflow.html
```

2. In `scripts/legacy-passthrough.mjs`:

```js
const GENERATED_HTML = new Set(['index.html', 'landing.html', 'projects.html']);
```

Also update the dev middleware comment / early `next()` list so Astro owns `/projects` and `/projects.html` the same way it owns `/` and `/landing.html`:

```js
if (
  url === '/' ||
  url === '/index' ||
  url === '/index.html' ||
  url === '/landing' ||
  url === '/landing.html' ||
  url === '/projects' ||
  url === '/projects.html'
) {
  return next();
}
```

3. Update `docs/BASELINE.md` URLs table row for projects:

| URL | Role | Owner after cutover |
|---|---|---|
| `projects.html` | Work hub | Astro `src/pages/projects.astro` |
| `projects.webflow.html` | Archived Webflow work hub | passthrough |

- [ ] **Step 4: Re-run source-mode check**

Run: `npm test`

Expected: PASS on the new root-archive assertions. (`dist/projects.html` assertions only apply with `--dist`; leave those red until Task 4 builds the page — if `npm test` always runs without `--dist`, keep dist assertions inside the existing `if (useDist)` block only.)

- [ ] **Step 5: Commit**

```bash
git add scripts/legacy-passthrough.mjs scripts/check-site.mjs docs/BASELINE.md projects.webflow.html
git status # ensure projects.html is gone (renamed)
git commit -m "chore: archive Webflow projects hub for Astro cutover"
```

---

### Task 2: Data helper + transparent PNG placeholders

**Files:**
- Modify: `src/data/projects.ts`
- Modify: `scripts/check-site.mjs`
- Create: `assets/images/projects/placeholders/card-01.png` … `card-07.png`
- Create: `scripts/gen-project-placeholders.mjs` (one-shot generator; keep in repo)
- Test: `npm test`

**Interfaces:**
- Consumes: `Project.featuredOnProjects`
- Produces:
  - `hubProjects(): Project[]` — filtered + sorted by `landingOrder`, length 6–7 for current data
  - `HubCard` prop shape used by the island (defined in island file; data layer returns projects)

- [ ] **Step 1: Failing check for hub listing**

Append to `scripts/check-site.mjs`:

```js
const hub = typeof projectsMod.hubProjects === 'function' ? projectsMod.hubProjects() : null;
if (!hub) {
  errors.push('projects.ts must export hubProjects() for the Astro projects hub');
} else if (hub.length < 6 || hub.length > 7) {
  errors.push(`hubProjects() must return 6–7 projects for the UI scaffold (got ${hub.length})`);
} else if (hub.some((p) => !p.featuredOnProjects)) {
  errors.push('hubProjects() must only include featuredOnProjects entries');
}
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test`

Expected: FAIL `projects.ts must export hubProjects()`

- [ ] **Step 3: Implement `hubProjects`**

In `src/data/projects.ts`:

```ts
export function hubProjects(): Project[] {
  return projects
    .filter((p) => p.featuredOnProjects)
    .sort((a, b) => a.landingOrder - b.landingOrder);
}
```

- [ ] **Step 4: Generate transparent PNG placeholders**

Create `scripts/gen-project-placeholders.mjs` that writes seven 800×800 RGBA PNGs (fully transparent pixels) to `assets/images/projects/placeholders/card-0N.png`.

Minimal approach (no new deps) — write a valid empty transparent PNG using a tiny precomputed buffer, or use Node to assemble an IHDR+IDAT+IEND PNG. Acceptable shortcut: copy one generated file seven times with different names after creating a single transparent PNG via Python/`pngjs` if already available; prefer zero new dependencies.

Verify:

```bash
node scripts/gen-project-placeholders.mjs
ls assets/images/projects/placeholders
```

Expected: `card-01.png` … `card-07.png`

Map in the island later by index; do not require a new field on `Project` in this task.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS (including hubProjects length 7 with current data)

- [ ] **Step 6: Commit**

```bash
git add src/data/projects.ts scripts/check-site.mjs scripts/gen-project-placeholders.mjs assets/images/projects/placeholders
git commit -m "feat: add hubProjects helper and transparent card placeholders"
```

---

### Task 3: Projects carousel island + styles (UI core)

**Files:**
- Create: `src/components/islands/ProjectsCarousel3D.tsx`
- Create: `src/styles/projects.css`
- Test: `npm run check` (typecheck) + manual/dev smoke later in Task 4

**Interfaces:**
- Consumes:
  ```ts
  export type ProjectsCarouselCard = {
    id: string;
    title: string;
    scope: string;
    pathLabel: string; // placeholder e.g. "PROJECT 01"
    imageSrc: string;  // /assets/images/projects/placeholders/card-0N.png
  };

  export function ProjectsCarousel3D(props: {
    cards: ProjectsCarouselCard[];
  }): JSX.Element;
  ```
- Produces: remnant carousel with scroll+drag, glass overlay, path-text hover; selected visual state only (no navigation)

- [ ] **Step 1: Typecheck red — add island stub that fails if mis-typed**

Create `src/components/islands/ProjectsCarousel3D.tsx` exporting the types above and a stub:

```tsx
export function ProjectsCarousel3D({ cards }: { cards: ProjectsCarouselCard[] }) {
  if (!cards.length) return null;
  return <div className="yy-projects-carousel" data-testid="projects-carousel-stub" />;
}
```

- [ ] **Step 2: Implement CSS foundation in `src/styles/projects.css`**

Must include:

- `html.yy-projects` page ground using `--ground` / `--ink`
- `.projects-hero` with `.eyebrow` recipe (same as landing)
- `.yy-projects-carousel` stage: height ~min(70vh, 640px), perspective container, overflow hidden
- `.yy-projects-card` face: aspect-ratio 1/1, `--slot-radius`, relative
- `.yy-projects-card__glass` absolute inset overlay matching nav glass:
  - `backdrop-filter: blur(12px) saturate(1.6)`
  - translucent fill using existing chrome fill approach (approximate with `color-mix(in srgb, var(--ground) 55%, transparent)` if Shadow DOM vars are unavailable on the page; mirror inset hairline + soft shadow from measured nav capsule)
- `.yy-projects-card__media` object-fit contain (transparent PNG)
- `.yy-projects-card__path` for path text: `--t-11`, uppercase, `.12em` tracking, `--ink-3` or `--ink-2`
- Side fade helpers via data attributes if needed
- `@media (prefers-reduced-motion: reduce)` static layout fallback classes

Do **not** copy Tailwind class names from the pasted demo.

- [ ] **Step 3: Implement remnant carousel behavior**

Adapt the pasted component with these required changes:

1. Import from `motion/react` (not `framer-motion`).
2. Cylinder math retained, but **visible arc ≈ 180° front remnant**:
   - Position `faceCount` cards around the cylinder as usual.
   - Apply opacity/scale based on normalized angle from front (`Math.cos` falloff); hide or heavily fade backsides.
3. Per-card stagger: small `translateX` alternate ±8–16px in face local space so the arc is not a rigid fence.
4. Drag: same spring end pattern as demo (`stiffness: 100`, `damping: 30`, `mass: 0.1`).
5. Scroll bridge: while the stage is in view, on `wheel` / Lenis scroll listener (prefer `window` scroll + `lenis` custom event if present; otherwise `wheel` with `passive: true` reading delta) add a small `rotation` delta. Gate with `MotionGate` or internal `matchMedia('(prefers-reduced-motion: reduce)')`.
6. Hover path text: SVG `<textPath>` around a rounded-rect path inset to the card frame; animate `startOffset` from ~100% → 0% (right→left crawl). Placeholder `pathLabel`.
7. Click: set local `activeId` for a stronger front scale only; **no** fullscreen overlay; **no** `href` navigation in this version.
8. Wrap motion-heavy tree in existing `MotionGate` with a static fallback grid of the same cards (glass + image, no 3D).

Keep hooks (`useMediaQuery`, isomorphic layout effect) colocated in this file unless they already exist shared — do not add a shadcn `components/ui` tree.

- [ ] **Step 4: Typecheck**

Run: `npx astro check`

Expected: PASS for the new island (fix any type errors before proceeding).

- [ ] **Step 5: Commit**

```bash
git add src/components/islands/ProjectsCarousel3D.tsx src/styles/projects.css
git commit -m "feat: add projects 3D remnant carousel island and styles"
```

---

### Task 4: Astro page wiring + dist ownership checks green

**Files:**
- Create: `src/pages/projects.astro`
- Modify: `docs/EXTENDING.md`
- Test: `npm test`, `npm run build`, `npm run check`

**Interfaces:**
- Consumes: `hubProjects()`, `publicUrl`, `ProjectsCarousel3D`, `projects.css`
- Produces: `dist/projects.html` with `html.yy-projects`

- [ ] **Step 1: Add `src/pages/projects.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { ProjectsCarousel3D } from '../components/islands/ProjectsCarousel3D';
import { hubProjects, publicUrl } from '../data/projects';
import '../styles/projects.css';

const projects = hubProjects();
const cards = projects.map((p, i) => ({
  id: p.slug,
  title: p.title,
  scope: p.scope,
  pathLabel: `PROJECT ${String(i + 1).padStart(2, '0')}`,
  imageSrc: publicUrl(
    `assets/images/projects/placeholders/card-${String(i + 1).padStart(2, '0')}.png`
  )
}));
---

<BaseLayout
  title="Projects — Yanice Yang"
  description="Selected product design work."
  htmlClass="yy-projects"
  reveal={false}
  lenis={true}
  chrome={true}
>
  <main class="projects-wrap">
    <header class="projects-hero">
      <p class="eyebrow">Projects</p>
    </header>
    <section class="projects-stage" aria-label="Project carousel">
      <ProjectsCarousel3D client:visible cards={cards} />
    </section>
  </main>
</BaseLayout>
```

Keep the first viewport sparse: eyebrow + carousel only (per design + frontend rules).

- [ ] **Step 2: Document in EXTENDING.md**

Add under “Add a page” or listings:

- `projects.html` is Astro-owned via `src/pages/projects.astro`
- Archive: `projects.webflow.html`
- Hub listing: `hubProjects()` / `featuredOnProjects`

- [ ] **Step 3: Build + verify checks**

```bash
npm run build
npm run check
```

Expected:
- `dist/projects.html` exists and contains `yy-projects`
- `dist/projects.webflow.html` exists (passthrough archive)
- No Webflow IX2 shell in Astro `projects.html`
- `astro check` clean

- [ ] **Step 4: Manual smoke (dev)**

```bash
npm run dev
```

Open `http://127.0.0.1:4800/projects.html` and verify:

1. Carousel renders 7 glass cards on a front remnant (not a closed ring)
2. Drag rotates; scroll nudges rotation
3. Hover shows path-text crawl with `PROJECT 0N`
4. Typography matches landing eyebrow/caption look
5. Reduced-motion OS setting shows static fallback
6. No horizontal overflow at 375px width

Capture walkthrough screenshots/recording per walkthrough-artifacts skill when finishing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/projects.astro docs/EXTENDING.md
git commit -m "feat: ship Astro projects hub with 3D carousel"
```

---

### Task 5: PR polish + regression lock

**Files:**
- Modify: PR body / any leftover docs
- Test: `npm test && npm run check`

- [ ] **Step 1: Full regression**

```bash
npm test
npm run build
npm run check
```

Expected: all green.

- [ ] **Step 2: Confirm non-goals still hold**

- `src/pages/index.astro` and `ProjectIndex.astro` untouched
- No `framer-motion` dependency added
- No Tailwind / `components/ui` tree
- No click-detail overlay

- [ ] **Step 3: Update PR description** with screenshots/video artifacts and checklist against the spec success criteria.

- [ ] **Step 4: Final commit only if fixes were needed**

```bash
git commit -m "fix: projects hub carousel polish from check/smoke"
git push -u origin cursor/projects-3d-carousel-d425
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|---|---|
| Replace `projects.html` with Astro | 1, 4 |
| Adapt provided carousel via motion island | 3 |
| Front remnant ~180°, side fade, stagger | 3 |
| Glass overlay like nav | 3 |
| Scroll + drag combined | 3 |
| Path-text hover placeholders | 3 |
| Typography = landing recipes | 3, 4 |
| Transparent PNG placeholders | 2 |
| 6–7 projects from `featuredOnProjects` | 2, 4 |
| Defer click detail / Web Coding / real copy | enforced in Task 3/5 |
| Homepage unchanged | Task 5 verify |
| check-site / docs update | 1, 2, 4 |

## Placeholder scan

No TBD steps. Scroll gain constants are allowed to be tuned in Task 3/4 smoke without blocking merge of the skeleton.

## Type consistency

- `hubProjects(): Project[]`
- `ProjectsCarouselCard` fields: `id`, `title`, `scope`, `pathLabel`, `imageSrc`
- HTML class hook: `yy-projects`
- Archive name: `projects.webflow.html`
