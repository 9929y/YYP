# Extending this site

The site is an Astro static build with Webflow pages copied through unchanged.
Add new work on the Astro side. Do not edit the 19k-line Webflow stylesheet.

Nav and footer are one component (`assets/js/yy-chrome.js`) on every page,
including case studies. Do not restyle Webflow case **body** padding to match
the landing spine. Type size, leading, and ink (`assets/css/yy-case-type.css`)
do overlay the case pages so they share the landing type system.

## Commands

```bash
npm install
npm run dev        # http://127.0.0.1:4800  (Astro homepage at /)
npm run build      # writes dist/ — this is what Vercel publishes
npm test           # project schema + asset/link checks
npm run check      # astro check + the same site checks
```

The live homepage is `src/pages/index.astro` → `/` / `index.html`.
`/landing.html` redirects to `/`. The pre-cutover Webflow homepage is archived
as `index.webflow.html`.

## Add a page

1. Put a file in `src/pages/`. `build.format` is `file`, so `src/pages/foo.astro`
   becomes `foo.html` — the same URL shape as the rest of the site.
2. Wrap it in `src/layouts/BaseLayout.astro` (marketing / index) or
   `src/layouts/CaseStudyLayout.astro` (case study).
3. Import page CSS in the frontmatter. Do not add rules to
   `assets/css/123-782b5b.webflow.shared.a9431a3c9.css`.

## Add a case study

1. Append a record to `src/data/projects.ts`.
   - `engine: 'astro'` and `status: 'published'` with `href: 'your-slug.html'`
     makes `src/pages/[slug].astro` emit the page.
   - `featuredOnLanding` controls the live homepage (`src/pages/index.astro`).
     `featuredOnIndex` and `featuredOnProjects` are schema placeholders for
     future Astro listings — only `featuredOnLanding` is read in code today.
     Keep flags honest; legacy surfaces still disagree on purpose (see
     `docs/BASELINE.md`).
2. Put the narrative in the `[slug].astro` slot, using `MediaFigure` for images.
3. Cover images live under `assets/images/<slug>/` plus a 4:3 card at
   `assets/images/home/`. Update `docs/images-manifest.json` when you add files.
4. Leave existing Webflow case HTML alone until you migrate that slug. The
   build will not overwrite an Astro-emitted HTML file with a legacy copy.

AtlasNova is already in the data file as `in-progress` with no `href`. When it
is ready: set `status: 'published'`, `href: 'atlasnova.html'`, and write the body.

## Add hover / scroll / animation

Tokens: `assets/css/yy-tokens.css`, linked in `<head>` on every page.

| Kind | Where it lives | Rule |
|---|---|---|
| CSS hover | page stylesheet | Only `transform` and `opacity` unless budgeted |
| Entrance reveal | add class `rv` | `yy-reveal.js` observes `.rv`; do not also add `.yy-rv` |
| Scroll / video | `assets/js/yy-scroll.js` or a sibling `yy-*.js` | One boot, reduced-motion gate, fail visible |
| Canvas / shader | new `assets/js/yy-*.js`, mount on an id | Lazy, pointer + reduced-motion gated |
| React widget | `src/components/islands/`, `client:visible` | Not a site-wide default |

Property ownership is documented at the top of `assets/css/yy-chrome.css` and in
`src/data/motion.ts`. If two layers write `filter` (or any other property),
delete one. Gate motion-only islands with `prefers-reduced-motion` (see
`LandingCanvasGradient.tsx`) rather than a wrapper component.

Do not install Tailwind, shadcn, Three.js, or Remotion into the site bundle.
React Bits / Motion Primitives are allowed as a **single-route island** after
license, weight, keyboard, and reduced-motion review.
`video-shotcraft` / Remotion belong in a separate `video/` package, not here.

## Reference catalog

`creative_web_motion_notes.html` is a candidate list, not a dependency list.
Copy a snippet in; do not `npm install` from a catalog URL.

## Deploy

Vercel builds with `npm run build` and publishes `dist/`. Deploys are still
manual relative to content review — diff `dist/` against production after a
release, as the README already requires.
