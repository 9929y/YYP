# Handoff: how to continue the rebuild

Written for the next Claude session (any model) that picks up this branch.
Read this, `AGENTS.md`, and `README.md` before touching anything. It has three
parts: how to work with Yanice, how this codebase is meant to be reasoned
about, and the step-by-step plan with acceptance criteria.

---

## 1. Working with Yanice

Yanice is a product designer, not an engineer. Everything below follows from that.

- **Plain language.** Explain each technical term once, in one clause, the first
  time it appears ("lightbox, the click-to-enlarge overlay"). Never assume she
  knows what a route, frontmatter, island, or preflight is.
- **She never touches code.** Copy changes: she says "Lark page, Overview,
  second paragraph → …" in chat and you edit `src/content/`. Decisions: she
  answers by ID from `docs/WEBFLOW_REPLACEMENT_INVENTORY.md` ("A5: no
  lightbox"). Designs: she gives Figma links or exported frames; you read them.
- **Decision lists, not open questions.** When something is hers to decide,
  give a short numbered list with the current state and a recommended default,
  then proceed with everything that does not depend on it.
- **Review happens on the Cloudflare tunnel only** (`AGENTS.md`). No
  screenshots, no recordings. Prove behaviour with `npm run check`,
  `npm run smoke` (DOM assertions), `curl`, and the tunnel URL.
- **Her work is sacred.** The landing page, capsule nav, panels and footer are
  hers. Never restyle them "while you're in there". Changes to them come only
  from her Figma and only in the step that owns them (Step 4 below).
- **Media fidelity.** Never re-encode, downscale, crop, or drop a video or
  image without asking. When a format change is needed, do it losslessly and
  prove it (the .mov → .mp4 remux was verified frame-by-frame with MD5s).
- **Chinese in chat, English in the repo.** She writes Chinese; reply in
  Chinese. Code, comments, commits, and docs stay English (except the
  inventory, which is her decision sheet and is in Chinese on purpose).

## 2. How to reason about this codebase

These are the habits that made the first phase go smoothly. Keep them.

1. **Measure, don't assume.** Before claiming parity, diff built output
   (`dist/`) against a build of the previous commit. Before claiming content is
   complete, compute coverage (every word of the source appears in the
   extraction). Before touching a video, probe its codec. Every "it works" in
   this repo has a command behind it.
2. **Restore, don't recreate.** Everything that ever existed is in git history
   (`main` = the pre-rebuild site, commit `a76478f` = branch base). When
   something from the old site is needed, `git show <commit>:<path>` it back,
   then adapt. Rewriting from memory or from a Figma export loses the
   hand-tuning.
3. **Words live in `src/content/`, never in components.** Case copy:
   `cases/<slug>.md`. Structured copy (hero, resume, about, work cards):
   frontmatter in `pages/*.md`. Site chrome text: `site/navigation.json`. The
   nav panels read the same files through the `#yy-content` JSON that
   `BaseLayout.astro` embeds. If you find yourself typing a sentence into a
   `.astro` or `.tsx` file, stop and move it to content.
4. **Two style worlds, one shell.** `BaseLayout.astro` = shell + yy-chrome,
   **no Tailwind** (the landing was tuned against browser defaults and
   Tailwind's preflight would shift it). `PageLayout.astro` = BaseLayout +
   Tailwind, for every new page. Nav/footer live in shadow DOM, so page CSS
   never leaks into them. Do not merge these two layouts.
5. **Smallest reversible change, verified, then commit.** One concern per
   commit, descriptive message, `npm run check` + `npm run build` green before
   every push. Push after every meaningful step; the container is ephemeral.
6. **State assumptions, then keep moving.** When a detail is unknown, pick the
   most conservative option, write the assumption down (in the commit message
   or the inventory), and do everything that does not depend on it.
7. **Route keys, absolute asset paths.** Pages are identified by route
   (`/work/larkdesign`), never by filename. Assets are referenced as
   `/assets/...` (absolute). The chrome scripts accept both absolute and
   ROOT-relative paths via their `asset()` helper.

### Things that bit us (so they don't bite you)

- The sandbox blocks bulk deletes (`rm -rf`, `git rm -f` over many files).
  Delete in small `git rm` batches; if blocked, unstage and explain.
- `docs.astro.build` and `ui.shadcn.com` are unreachable from the sandbox;
  the npm registry works. `npx shadcn add` will fail here; the conventions
  (`components.json`, `cn()`, tokens) are already in place so it works on
  Yanice's machine. Write shadcn-style components by hand if needed.
- Astro 7: `import { z } from 'astro/zod'` (not `astro:content`);
  `z.record(keySchema, valueSchema)` needs both arguments (Zod 4);
  `glob` from `astro/loaders`; `render(entry)` from `astro:content`.
- `npm create astro` fails offline (template fetch). Scaffold by hand.
- No system ffmpeg. `npm i @ffmpeg-installer/ffmpeg @ffprobe-installer/ffprobe`
  in a scratch dir gives working binaries.
- Headless Chromium cannot decode H.264, so `npm run smoke` reports video
  requests as failed. That is expected noise, already filtered.
- `public/` is excluded from `astro check` on purpose (legacy-style scripts).
- The extractor (`npm run extract:webflow -- <checkout of main>`) is one-shot.
  `pages/about.md` is hand-maintained and the extractor skips it. Once content
  has been hand-edited, do not re-run the extractor.

## 3. Map of the code

```
src/pages/index.astro            landing (Yanice's). Data via src/data/projects.ts
src/data/projects.ts             cases collection → Project shape the landing components use
src/components/Project*.astro    landing case list (unchanged from main)
src/components/islands/*.tsx     React islands: landing canvas, morphing text, note effect, Reveal
src/layouts/BaseLayout.astro     shell + tokens + yy-chrome, embeds #yy-content JSON. NO Tailwind
src/layouts/PageLayout.astro     BaseLayout + Tailwind (global.css). All new pages
src/pages/work/[slug].astro      PLACEHOLDER case template → Step 3 replaces this
src/pages/work/index.astro       PLACEHOLDER work index (cards from pages/work.md)
src/pages/about.astro, resume.astro   PLACEHOLDER pages (same data as the panels)
src/content/**                   all words + media refs. Schemas in src/content.config.ts
src/styles/global.css            Tailwind entry + shadcn token variables (neutral defaults)
src/styles/landing.css           landing styles (has its own spacing/type variables: --edge, --t-*, --col-gap)
public/assets/css/yy-tokens.css  site-wide design tokens used by the chrome + landing
public/assets/js/yy-chrome.js    capsule nav + panels + footer; per-route palettes/dark pages
public/assets/js/yy-{work,about,resume}.js   panel renderers, read #yy-content
public/assets/{images,videos,lottie,fonts}   media, referenced as /assets/...
scripts/check-content.mjs        npm test: asset refs resolve, case frontmatter complete
scripts/smoke.mjs                npm run smoke: DOM-level checks against a running preview
scripts/migration/               one-shot Webflow extractor + report
docs/WEBFLOW_REPLACEMENT_INVENTORY.md   Yanice's decision sheet (Chinese)
vercel.json                      old .html URLs → 301 to new routes; noindex header
```

## 4. The plan, in order

Each step ends with: `npm run check` green, `npm run build` green,
`npm run smoke` green against the preview, a push, and a tunnel URL for Yanice.
Do not start the next step until she has looked at the tunnel.

### Step 1 — Restore landing + chrome  ✅ done (commit a506834)

### Step 2 — Case-study template in Figma  (Yanice, in progress)

Nothing to build. When the design arrives, before writing code:

- Map every Figma component to a content field. Which frontmatter/body element
  feeds each block (hero title = `headline`, meta grid = the Role/Duration/
  Scope lines at the top of the body, etc.).
- List what the design does NOT specify and ask by ID (inventory A5–A11).
- Read the extracted Markdown for the first case end to end so you know which
  structures actually occur (numbered step cards, bold lead sentence +
  paragraph, image + caption, video, iframe, lottie comment, lightbox comment).

### Step 3 — Build the Opus Clip page (`/work/ai-driven-product-design`) as the reference

Opus Clip first because it exercises everything: 7 looping videos, a Lottie,
a dark theme, entrance motion.

Build order inside the step:

1. **Theme variants.** Add `theme` handling: `data-theme="dark"` (or a case
   accent) on the page from the case frontmatter; extend `global.css` tokens
   so shadcn/21st.dev components pick it up. Yanice will send accent values.
2. **Case components** in `src/components/case/` (Astro where static, React
   island only where interactive): `CaseHero`, `CaseMeta` (Role/Scope/…),
   `CaseSection`, `CaseFigure` (image + optional caption), `CaseVideo`
   (muted/loop/playsinline, lazy `preload="none"`, poster), `CaseSteps`
   (numbered cards), `CaseLottie` (React island, `client:visible`, load the
   player lazily, respect reduced motion), `CasePrevNext`.
3. **Motion.** Use `Reveal.tsx` (motion/react) or a CSS-only equivalent for
   fade-in; parameters from Figma or the landing's timing in
   `src/data/motion.ts`. Always `useReducedMotion`.
4. **Rendering the body.** Either keep Markdown → `<Content />` with Tailwind
   arbitrary-variant styling (fast) or convert the body to MDX so sections map
   to components (cleaner). Decide with the design in hand; MDX is the likely
   answer once step cards and meta grids need real components. If MDX: add
   `@astrojs/mdx`, rename `.md` → `.mdx` for cases only, replace the
   `<!-- section -->` comments with components.
5. **Page title/description** per case (inventory A10).
6. Verify: build, check, smoke (extend `scripts/smoke.mjs` with the new
   selectors), tunnel. Iterate with Yanice until she approves this one page.

### Step 4 — Unify spacing, padding, and layout across the site  ← the "token pass"

**Why here and not earlier or later:** before Step 3 there is nothing to unify
against; after Step 5 you would touch eight pages twice. Do it once, right
after the reference case page is approved, so the other seven inherit it.

1. Read the approved Opus Clip page and the landing side by side. Extract the
   shared scale: page max-width, edge padding (`--edge` on the landing is
   `10vw`), vertical rhythm between sections, grid gap, type scale (`--t-11`…
   `--t-64`), radius.
2. Put the scale in **one place**: `public/assets/css/yy-tokens.css` (already
   loaded by every page, including the landing). Landing keeps its variable
   names; `landing.css` maps to the shared tokens instead of hard-coding.
3. Expose the same tokens to Tailwind in `src/styles/global.css` via
   `@theme inline` (e.g. `--spacing-edge: var(--edge)`, `--container-site:
   var(--frame-spine)`), so case pages use `px-edge`, `max-w-site` and stay in
   sync automatically.
4. Apply Yanice's landing/nav/footer adjustments from Figma in this step, and
   only in this step. Verify the landing with the HTML/CSS diff technique from
   Step 1 so every change is intentional.
5. Tunnel review of landing + Opus Clip together.

### Step 5 — Roll the template out to the other seven cases

Order: `mckinseyecommerce` (Vimeo iframes), `larkdesign` (most images, step
cards), `mifinance`, `cummins-digitalization`, `alzheimerdisease` (dark +
brand preloader), `tiktok-research`, `fashion`. For each: convert body to the
template's structure, per-case decisions from the inventory (B section),
build/check/smoke, tunnel. One commit per case.

The Alzheimer preloader: the old animation was driven by Webflow's engine. Its
timing lives in the IX2 data inside `webflow.*.js` on `main` (search for the
preloader element's `data-w-id`). Recover duration/easing from there, rebuild
with motion.

### Step 6 — About and Resume changes

Wait for Yanice's Figma. The panels (`yy-about.js`, `yy-resume.js`) and the
pages (`/about`, `/resume`) read the same content files; decide with her
whether the panels stay, become pages, or both. Copy edits go to
`src/content/pages/about.md` / `resume.md` only.

### Step 7 — Launch checklist (only when she says "go live")

- Remove noindex: `BaseLayout.astro` meta, `public/robots.txt`,
  `vercel.json` header. Add `sitemap` if wanted.
- Real page titles/descriptions for every route; OG image if she wants one.
- 404 page (`src/pages/404.astro`).
- Verify every `vercel.json` redirect against the old URL list.
- `npm run check && npm run build && npm run smoke` green; open a PR to `main`
  (she asks for it explicitly); Vercel preview URL is the final review.

## 5. Decisions already made (do not re-open)

| Topic | Decision |
|-------|----------|
| Landing, nav, footer | Keep the current Astro version; adjust from Figma later (Step 4), never rebuild from scratch |
| Stack for new pages | Astro + React islands + Tailwind v4 + shadcn conventions + motion |
| Routes | `/`, `/work`, `/work/<slug>`, `/about`, `/resume`; old `.html` URLs 301 |
| Opus Clip videos | Keep all 7; the four .mov are now lossless .mp4 |
| Lottie (Opus Clip) | Keep, lazy-loaded island |
| Entrance motion | Yes, fade-in style, motion/react |
| Alzheimer brand preloader | Keep, rebuild with motion |
| Theme colours | Unified base + per-case variants; values to come from Yanice |
| About / Resume | Will change; wait for Figma (Step 6) |
| Spacing/layout unification | Step 4, after the reference case page, before the other seven |
| Open (inventory) | A5 lightbox, A6 prev/next, A7 captions, A10 titles, McKinsey Vimeo, TikTok/Fashion page fate |

## 6. Starter prompt for the next session

> Read `docs/HANDOFF.md`, `AGENTS.md`, and `README.md` first. We are on branch
> `claude/website-tech-stack-eval-camxmg`. Step 1 is done. I am giving you the
> Figma for the case-study template now. Follow Step 2 (map design → content),
> then Step 3 (build Opus Clip as the reference page). Reply in Chinese, keep
> the repo in English, review only via the Cloudflare tunnel.
