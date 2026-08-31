# Yanice Yang — portfolio

A static portfolio site: Astro 5, plain CSS with custom properties, a few React
islands, deployed to Vercel. Every page is an Astro route in `src/pages/`.

## Run locally

```bash
npm install
npm run dev        # http://127.0.0.1:4800
npm run build      # writes dist/ — this is what Vercel publishes
npm test           # token manifest freshness + project schema + asset/link checks
npm run check      # astro check + the same site checks against dist/
```

Agents must not record or screenshot this project. Review in-progress work on the
Cloudflare quick tunnel to port 4800 (see `AGENTS.md` and `.cursor/rules/preview-only.mdc`).

## How it is laid out

| Path | What lives there |
|---|---|
| `src/pages/` | One file per URL. `[slug].astro` is a scaffold for case studies with no hand-written page; it emits nothing today. |
| `src/layouts/` | `BaseLayout` (every page) and `CaseStudyLayout` (the scaffold route). |
| `src/styles/` | `base.css` (the shared normalize) plus one stylesheet per page. |
| `src/data/` | `projects.ts` is the single source of truth for slugs, hrefs and landing order. `motion.ts` owns which runtime may animate which property. |
| `assets/` | Hand-managed images, video, fonts and the shared scripts. Served as a second public directory by `scripts/assets-passthrough.mjs`. |
| `assets/css/yy-tokens.css` | The design tokens. Primitives → semantic, in one file. |
| `docs/design-tokens.json` | Generated from that file by `npm run tokens`; the machine-readable form of the design system. |

The nav and footer are not page markup: `assets/js/yy-chrome.js` builds both in
Shadow DOM on every page, so no page stylesheet can reach them and every page
gets the same chrome.

Responsive image variants keep a `-p-<width>` suffix and sit beside the original.
`assets-passthrough.mjs` only ships a variant that some file textually
references, so a `srcset` built by string concatenation silently de-ships its
own variants — keep srcset strings literal.

How to add pages, case studies, motion and React islands: `docs/EXTENDING.md`.

## Image catalog

`docs/CATALOG.md` describes all 261 distinct images — what each one shows, the
job it does on the page, and whether it can be reused elsewhere.
`docs/images-manifest.json` is the same data, one record per image, with the
pre-rename filename kept in `legacy` so anything can be traced back through git.

Files live in per-case-study folders under names that say what they are:
`lark/flow-lark-mobile-add-external-contact-5up.webp` rather than
`62f86a4a9fb1b00887d462c0_Group_538.webp`.

## History worth keeping

The site began as an exported static mirror of an earlier build: eleven HTML
files driven by one 19,487-line stylesheet and a third-party animation runtime.
It has been rewritten page by page into Astro; the last two pages moved in
2026-08, and the export, its stylesheet and its runtime were deleted with them.
Anything you need from the old markup is in git history.

Three passes over that mirror produced numbers still worth knowing:

**Images (321 MB → 96 MB, −70%).** 981 of 1041 PNG/JPEG files converted to WebP
at `cwebp -q 82`; the other 60 stayed as-is because WebP came out larger (small
flat-colour icons where PNG already wins). 54 images were above 3200px wide and
were capped there — the worst was 10822×8369, 90 megapixels, for a slot that
renders at 1143px.

**Fonts.** Eight Google families / 52 weight variants were being loaded, four of
them used nowhere. The site now self-hosts a subset: Plus Jakarta Sans 400/500/
600/700 and Caveat 500. Three dangling `@font-face` rules pointing at deleted
`.zip` files went at the same time.

**Mobile legibility.** Below 992px the site had been rendering real content at
sizes no one can read: an `<h1>` at 6.4px, body paragraphs at 7px, card headings
at 8px; 110 elements under 11px at 479px. Twenty rules were retuned inside the
`≤991px` / `≤767px` / `≤479px` media queries and desktop was left untouched
(measured: identical font-size distribution at 1440px before and after). The
floor is now 10px, and prose on a phone is 13px — that is a deliberate value, not
a rounding artefact. Do not raise it without re-measuring.
