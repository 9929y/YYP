/**
 * Motion property ownership + named reveal recipes.
 *
 * One animated CSS property may have only one writer. The deleted velocity-blur
 * effect failed because reveal and scroll both wrote `filter`.
 *
 * Recipes live in assets/css/yy-motion.css. yy-reveal.js only toggles `.in`.
 * Webflow IX2 on [data-w-id] is a separate writer — do not compete.
 *
 * CSS custom properties in assets/css/yy-tokens.css are the visual authority.
 * Numbers here are the same values for islands that cannot read CSS vars.
 *
 * Exceptions (layout-triggering, documented):
 *   - nav `.cap` animates width/max-width/height/padding (yy-chrome.js)
 *   - #yy-cursor animates width/height (yy-cursor.css)
 */
export const motionOwnership = {
  reveal: ['opacity', 'transform', 'clip-path'],
  hover: ['transform', 'opacity'],
  cursor: ['transform', 'width', 'height', 'background-color', 'color'],
  chromeCapsule: ['width', 'max-width', 'height', 'padding'],
  ix2: ['any property on [data-w-id] — do not compete'],
  lenis: ['scroll position'],
  flow: ['canvas pixels only'],
  page: ['root opacity via View Transitions; yy-nav / yy-footer named snapshots']
} as const;

/** Milliseconds — keep in lockstep with `--duration-*` in yy-tokens.css. */
export const durations = {
  stagger: 40,
  micro: 80,
  quick: 150,
  fast: 250,
  medium: 350,
  slow: 400,
  verySlow: 500
} as const;

export const islandTiming = {
  textGenerateStagger: 0.1,
  textGenerateDuration: 0.5,
  caseNoteStagger: 0.06,
  caseNoteDuration: 0.45,
  morphTime: 1.5,
  morphCooldown: 1.8,
  canvasMountDelayMs: 320
} as const;

export const revealRecipes = {
  text: 'Default copy enter: fade + 8px rise + scale-small (0.98), 250ms',
  fade: 'Opacity only',
  wipe: 'Landing thumbnails: clip wipe from bottom + scale-medium (0.97); syncs with case label',
  media: 'Fade + 8px rise + scale-medium (0.97); Astro case-study figures',
  clip: 'Headline-style clip-path open',
  'from-top': 'Case hero: slide down from above + fade (sync with from-right)',
  'from-bottom': 'Case hero: slide up from below + fade',
  'from-left': 'Case hero: slide in from left + fade',
  'from-right': 'Case hero: slide in from right + fade (Lark phones, etc.)',
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
  canvasLight: 900,
  landingCollapse: 877,
  landingMidMin: 878,
  landingMidMax: 1259,
  caseNoteStatic: 768,
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
