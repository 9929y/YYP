# Yanice Yang Portfolio

Portfolio site for AI-first product/design work. Live site: [yaniceyang.com](https://yaniceyang.com) · Repo: [github.com/9929y/YYP](https://github.com/9929y/YYP)

## Status: rebuild branch

This branch is the **clean rebuild**. The Webflow export and the custom `yy-*`
layer that sat on top of it are gone; only the words and the media survived.

- **Content** lives in `src/content/` (extracted from Webflow, see below).
- **UI** is a placeholder. Every visual decision is waiting on the Figma design.
- **Stack** is Astro + React islands + Tailwind v4 + shadcn/ui conventions + motion,
  so components from [21st.dev](https://21st.dev) paste in unchanged.

`main` still serves the old site. Nothing here is deployed until it is merged.

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | [Astro](https://astro.build) 7, static output | Content-heavy pages ship as HTML; React only where a component needs it |
| Interactivity | React 19 via `@astrojs/react`, used as islands (`client:visible` etc.) | The dialect 21st.dev / shadcn components are written in |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Same as above; tokens are CSS variables in `src/styles/global.css` |
| Components | shadcn/ui conventions (`components.json`, `@/lib/utils` `cn()`), `lucide-react` | `npx shadcn add button` works; 21st.dev snippets assume this layout |
| Motion | `motion` (`motion/react`) | Framer Motion's successor; what most 21st.dev components import |
| Hosting | Vercel, `npm run build` → `dist/` | Unchanged |

## Content model

```
src/content/
  cases/<slug>.md        one per case study: frontmatter = curated metadata, body = extracted copy
  pages/home.md          hero copy (structured) + archived Webflow homepage copy
  pages/work.md          work-index cards (structured) + old projects.html copy
  pages/about.md         about copy (two historical sources, pick one)
  pages/resume.md        fully structured resume (jobs, education, awards, publications, skills)
  site/navigation.json   nav labels, social links, footer, case order
```

Schemas: `src/content.config.ts`. Media: `public/assets/{images,videos,lottie,fonts}`,
referenced as `/assets/...`. `npm test` verifies every reference resolves.

Markdown bodies contain HTML comments such as `<!-- section: .section-layout1 -->`,
`<!-- lightbox: ... -->`, `<!-- lottie: ... -->`. They mark where the Webflow page had a
section boundary, an image lightbox, or a Lottie animation, so the new layout can decide
what to do there. They render as nothing.

## What still has to be decided

`docs/WEBFLOW_REPLACEMENT_INVENTORY.md` lists, page by page and site-wide, every
Webflow / `yy-*` behaviour that needs a replacement decision (navigation model,
fonts, per-case theme colours, lightboxes, videos, Lottie, smooth scroll, cursor,
page titles, OG images, 404…). Fill in the decision column and the UI work follows.

## Run locally

```bash
npm install
npm run dev        # http://127.0.0.1:4800
npm run build      # writes dist/ (what Vercel publishes)
npm test           # content integrity: asset references, case frontmatter
npm run check      # astro check (types) + npm test
```

Review happens on a Cloudflare quick tunnel to port 4800, never via screenshots
or recordings. See `AGENTS.md`.

## Re-running the extraction

The extractor needs the legacy files, which live on `main`:

```bash
git worktree add ../yyp-legacy main
npm run extract:webflow -- ../yyp-legacy
```

It rewrites `src/content/**` and `scripts/migration/extraction-report.json`.
Once the content has been hand-edited, stop re-running it.

## Adding UI

See `docs/EXTENDING.md` for how to add a shadcn primitive, paste a 21st.dev
component, add a page, and what to watch for with React islands.
