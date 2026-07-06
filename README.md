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
- **Dropped 3 unused font `.zip` archives** (leftover downloads, never referenced).

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

> Note: the live site (yaniceyang.com) still serves the pre-cleanup clone. Since
> rendering is identical, redeploying this cleaned copy is optional — its value
> is being a tidier, more maintainable source.
