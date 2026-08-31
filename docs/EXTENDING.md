# Extending this site

Astro 5, static output, plain CSS with custom properties. Every URL is a file in
`src/pages/`; `build.format` is `file`, so `src/pages/foo.astro` becomes
`foo.html`.

Nav and footer are not page markup. `assets/js/yy-chrome.js` builds both in
Shadow DOM on every page, so a page never writes its own header or footer and
never styles one.

## Commands

```bash
npm install
npm run dev        # http://127.0.0.1:4800
npm run build      # writes dist/ — this is what Vercel publishes
npm test           # token manifest freshness + project schema + asset/link checks
npm run check      # astro check + the same site checks against dist/
npm run tokens     # regenerate docs/design-tokens.json from yy-tokens.css
```

`/` is `src/pages/index.astro`. `/landing.html` is a redirect stub to `/`.

## Add a page

1. Put a file in `src/pages/`.
2. Wrap it in `src/layouts/BaseLayout.astro` (or `CaseStudyLayout.astro` if it
   really is an eyebrow/title/scope/note case study — the existing case pages are
   not, which is why each has its own route).
3. Import its stylesheet in the frontmatter, one file per page under
   `src/styles/`. There is no global stylesheet to add rules to, and no scoped
   `<style>` blocks anywhere in this codebase — keep it that way.
4. Colour, type and spacing come from `assets/css/yy-tokens.css`. A raw hex on a
   design-system surface is budgeted: `check-site.mjs` has a ratchet that lets the
   count fall and never rise.

## Add a case study

1. Append a record to `src/data/projects.ts`. `status: 'published'` with
   `href: 'your-slug.html'` makes it a real page; without a hand-written
   `src/pages/your-slug.astro`, the `[slug].astro` scaffold renders it, and
   `check-site.mjs` fails the build if the scaffold's placeholder copy would ship.
2. `featuredOnLanding` controls the homepage. `featuredOnProjects` controls the
   work index. `featuredOnIndex` is not read by anything today.
3. Cover images live under `assets/images/<slug>/` plus a 4:3 card at
   `assets/images/home/`. Update `docs/images-manifest.json` when you add files.
4. Keep every `srcset` a literal string. `scripts/assets-passthrough.mjs` ships a
   `-p-<width>` variant only when some file textually references it, so a srcset
   built by concatenation silently de-ships its own variants.

AtlasNova is already in the data file as `in-progress` with no `href`. When it is
ready: set `status: 'published'`, `href: 'atlasnova.html'`, and write the body.

## Add hover / scroll / animation

| Kind | Where it lives | Rule |
|---|---|---|
| CSS hover | page stylesheet | Only `transform` and `opacity` unless budgeted |
| Entrance reveal | add class `rv` | `yy-reveal.js` observes `.rv`; do not also add `.yy-rv` |
| Scroll / video | `assets/js/yy-scroll.js` or a sibling `yy-*.js` | One boot, reduced-motion gate, fail visible |
| Canvas / shader | new `assets/js/yy-*.js`, mount on an id | Lazy, pointer + reduced-motion gated |
| React widget | `src/components/islands/`, `client:visible` | Not a site-wide default |

One animated property may have exactly one writer. Ownership is documented at the
top of `assets/css/yy-chrome.css` and in `src/data/motion.ts`; if two layers write
`filter`, delete one. Gate motion-only islands with `prefers-reduced-motion` (see
`LandingCanvasGradient.tsx`) rather than wrapping them in a component.

Never blanket-disable animation under `prefers-reduced-motion`. Content that
starts hidden and is revealed by an animation would stay permanently invisible.
`yy-motion.css` keeps its hidden state gated on `html.yy-reveal` for that reason.

Do not install Tailwind, shadcn, Three.js, or Remotion into the site bundle.
React Bits / Motion Primitives are allowed as a **single-route island** after
license, weight, keyboard, and reduced-motion review.

## Behaviour gates

These held before the site was rewritten and must still hold. A change that
cannot be shown to preserve them is a regression.

1. **JS off:** `.rv` content is visible. The hidden state is CSS-only and gated on
   `html.yy-reveal`, so no observer, no script, or any throw leaves content
   readable. Never ship content that only appears if a script runs.
2. **`prefers-reduced-motion`:** Lenis destroys itself, the cursor stands down,
   slot hover stays instant rather than being cancelled.
3. **Lenis:** measured identical reveal counts with and without it on every case
   page. Do not replace it or change `duration: 1.05`.
4. **No horizontal overflow** at 375px, on every page.
5. **Chrome fail-safe:** deleting `yy-chrome.js` must degrade to a page with no
   nav, not to a broken page.

## Deploy

Vercel builds with `npm run build` and publishes `dist/`. Deploys are manual
relative to content review — diff `dist/` against production after a release.
