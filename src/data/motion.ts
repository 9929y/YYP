/**
 * Motion property ownership + named reveal recipes.
 *
 * One animated CSS property may have only one writer. The deleted velocity-blur
 * effect failed because reveal and scroll both wrote `filter`.
 *
 * Recipes live in assets/css/yy-motion.css. yy-reveal.js only toggles `.in`.
 * Webflow IX2 on [data-w-id] is a separate writer — do not compete.
 *
 * One-shot: change default text enter/exit by editing --reveal-text-* in
 * yy-motion.css. Customize one node with data-reveal="…" or --reveal-delay /
 * --reveal-distance / --reveal-duration / --reveal-blur.
 */
export const motionOwnership = {
  reveal: ['opacity', 'transform', 'filter', 'clip-path'],
  hover: ['transform', 'opacity'],
  cursor: ['transform', 'width', 'height', 'background-color', 'color'],
  ix2: ['any property on [data-w-id] — do not compete'],
  lenis: ['scroll position'],
  flow: ['canvas pixels only']
} as const;

/** Named recipes in yy-motion.css. `text` is the site default for copy. */
export const revealRecipes = {
  text: 'Default copy enter: fade + 12px rise + light blur, 500ms',
  fade: 'Opacity only',
  wipe: 'Clip wipe + micro over-scale (images)',
  media: 'Alias of wipe for figures / slots',
  clip: 'Headline-style clip-path open',
  'intro-meta': 'Landing hero meta (CSS timeline, not IntersectionObserver)',
  'intro-headline': 'Landing hero headline (CSS timeline)',
  none: 'Exclude this node from reveal'
} as const;

export const revealModes = {
  once: 'Enter only (default)',
  inout: 'Enter on intersect, reverse on leave'
} as const;

export const breakpoints = {
  desktopEffectMin: 992,
  desktopEffectMax: 991,
  landingCollapse: 877,
  typeStep: 767,
  chromeCapsule: 560,
  webflowMobile: 479
} as const;

export const reducedMotionPolicy = {
  neverDisableIx2: true,
  contentVisibleWithoutJs: true,
  cursorFallsBackToNative: true
} as const;
