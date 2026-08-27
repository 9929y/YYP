/**
 * Motion property ownership + named reveal recipes.
 *
 * One animated CSS property may have only one writer. The deleted velocity-blur
 * effect failed because reveal and scroll both wrote `filter`.
 *
 * Recipes live in assets/css/yy-motion.css. yy-reveal.js only toggles `.in`.
 * Webflow IX2 on [data-w-id] is a separate writer — do not compete.
 *
 * Three knob groups in yy-motion.css :root:
 *   --reveal-text-*     default enter for copy and auto .yy-rv (site-wide)
 *   --reveal-media-*    images/video; inherit text unless overridden
 *   --page-fade-*       MPA View Transition root fade
 *
 * Per-node: data-reveal="…" or --reveal-delay / --reveal-distance /
 * --reveal-duration / --reveal-blur.
 */
export const motionOwnership = {
  reveal: ['opacity', 'transform', 'clip-path'],
  hover: ['transform', 'opacity'],
  cursor: ['transform', 'width', 'height', 'background-color', 'color'],
  ix2: ['any property on [data-w-id] — do not compete'],
  lenis: ['scroll position'],
  flow: ['canvas pixels only'],
  page: ['root opacity via View Transitions; yy-nav / yy-footer named snapshots']
} as const;

/** Named recipes in yy-motion.css. `text` is the site default for copy. */
export const revealRecipes = {
  text: 'Default copy enter: fade + 8px rise + scale-small (0.98), 250ms',
  fade: 'Opacity only',
  wipe: 'Optional clip wipe (unused by default)',
  media: 'Fade + 8px rise + scale-medium (0.97); syncs with case label via data-reveal-sync',
  clip: 'Headline-style clip-path open',
  'intro-meta': 'Landing hero meta (CSS timeline, not IntersectionObserver)',
  'intro-headline': 'Landing hero headline (CSS timeline, same 250ms fade-up)',
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
  cursorFallsBackToNative: true,
  noViewTransitions: true
} as const;
