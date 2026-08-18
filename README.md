# Yanice Yang — portfolio (lightweight-cleaned)

A tidied copy of the faithful Webflow clone. **Rendering is 100% identical** to
the original — this pass only cleaned up how the code is organized, not how it
looks or behaves. The Webflow animation runtime is kept on purpose so every
animation stays pixel-for-pixel the same.

## What changed (code only)

- **Assets organized by type** under `assets/`:
  `images/` (1087) · `videos/` (7) · `lottie/` (2) · `js/` (11) · `css/` (1)
- **Cleaner filenames** — dropped the random 8-char hash prefix the mirror added.
- **Formatted** — all 11 HTML pages and the CSS are pretty-printed and readable
  (e.g. `index.html` went from 2 minified lines to ~284 readable ones).
- **Trimmed fonts** — removed 3 webfonts with zero references (Cairo, Caveat
  Brush, Space Mono); 8 used families kept.
- **Dropped 3 unused font `.zip` archives.** Correction (2026-08-17): they were
  *not* unreferenced — three `@font-face` rules pointed at them with
  `format("undefined")`. No rule ever used those family names, so nothing 404'd,
  but the dangling rules survived this pass. They were removed later; see below.

## Image pass — WebP + resolution cap (2026-08-17)

**321 MB -> 96 MB of images (-70%).** Every reference rewritten in place; still no
build step.

- **981 of 1041** PNG/JPEG converted to WebP at `cwebp -q 82`. The other **60**
  are kept as-is because WebP came out *larger* — small flat-colour icons where
  PNG already wins.
- **54 images were above 3200px wide** and got capped there first. The worst was
  10822x8369 (90 megapixels) for a slot the page renders at 1143px. 3200 matches
  Webflow's own largest generated variant (`-p-3200`).
- **1275 references** rewritten across 11 HTML pages and the shared CSS, plus
  **18 `srcset` width descriptors** corrected for the images that shrank.

Verified after: 1160 references resolve, zero broken, zero orphans, and the
heaviest page (`larkdesign.html`) went 83.2 MB -> 24.7 MB of images.

Originals are recoverable from git history — they were committed before this pass.

## What was deliberately kept

- Webflow runtime JS + jQuery + the webfont loader (these drive every animation;
  removing them would change behavior).
- `w-node-*` / `data-wf-*` attributes (the CSS grid placement depends on them).

## Run locally

```bash
python3 -m http.server 4800   # then open http://localhost:4800
```

## Verified

Homepage, the AI case study (7 videos), and the Lark case study were checked
after cleanup: CSS applies, all images/videos load, Lottie + Webflow animations
run, and no broken references remain.

## Deploy state (verified 2026-08-17)

**All 11 pages in this working tree are byte-identical to yaniceyang.com.**
Checked page by page with `curl` + `diff` on 2026-08-17.

The earlier note here — that the live site still served the pre-cleanup clone —
is obsolete. The cleaned structure has been live since at least 2026-08-11
(Vercel `last-modified`), serving `assets/images/<webflow-id>_name.png` paths.

**Deploys are not automatic on push.** `main` had carried an unreleased
placeholder project card since 2026-07-06 — six weeks of `[New Project Title —
待填充]` sitting one deploy away from the homepage's first slot. It has been
removed (`new-project.html` deleted, card dropped from `index.html`), which is
what brings this tree back in line with production. If you push, push the deploy
too, and diff against live afterwards.

## Font pass (2026-08-17)

Every page loaded **8 Google families / 52 weight variants**; four of them —
Merriweather, Lato, Inconsolata, Pacifico — were used **nowhere on the site**.
Removed from the `WebFont.load` call on all 11 pages, leaving 4 families / 29
variants. The Google request no longer mentions them; rendering is unchanged
(verified via computed styles: Montserrat 87 nodes, Georgia 4, Caveat 1 on
mckinseyecommerce.html, identical before and after).

Also deleted the **3 dangling `@font-face` rules** — Pacifico, "Caveat Pacifico",
"Caveat Pacifico Varela Round" — each pointing at a `.zip` that no longer exists,
with `format("undefined")` and unquoted multi-word family names. No rule used
those names, so they never produced a request; they were dead weight.

Weights were left alone: `<em>` appears 14 times and `.italic-text*` classes 14
times, so Montserrat's italics are genuinely in use and trimming them would not
have been the zero-risk change it looks like.

Full typography audit and the proposed 8-step type scale:
`AI_materials_library/01_projects/portfolio_ux/05_type_audit_and_scale.md`
