/**
 * Motion property ownership.
 *
 * One animated CSS property may have only one writer. The deleted velocity-blur
 * effect failed because reveal and scroll both wrote `filter`.
 *
 * When adding an effect, pick an unused lane or replace the current owner
 * explicitly. Do not stack two transitions on the same property.
 */
export const motionOwnership = {
  reveal: ['opacity', 'transform', 'filter', 'clip-path'],
  hover: ['transform', 'opacity'],
  cursor: ['transform', 'width', 'height', 'background-color', 'color'],
  ix2: ['any property on [data-w-id] — do not compete'],
  lenis: ['scroll position'],
  flow: ['canvas pixels only']
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
