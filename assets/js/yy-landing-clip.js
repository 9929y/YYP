/* ============================================================================
   yy-landing-clip.js — bleibtgleich-style clip-down wipe for homepage slots.

   bleibtgleich.dev marks image frames with data-reveal="clip-down": the frame
   opens via clip-path rather than the picture sliding. Our case pages already
   do this as yy-rv--wipe (via yy-reveal + yy-scroll). The landing runs
   reveal={false}, so that path never fires — and it must not: .slot media already
   owns opacity/filter (skeleton) and transform (hover).

   Free lane: clip-path on the .slot frame itself. This script only writes
   clip-path state via a gated html class + .is-clip-in. It never touches
   opacity, filter, or transform.

   Fail-safe: content is fully visible until this script successfully opts into
   html.yy-clip-reveal. JS off / no IntersectionObserver / reduced motion /
   any throw → no class → no clip → slots render normally.
   ============================================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  if (!html.classList.contains('yy-landing')) return;

  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    var slots = document.querySelectorAll('.slot[data-clip-reveal], .panel[data-clip-reveal]');
    if (!slots.length) return;

    html.classList.add('yy-clip-reveal');

    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-clip-in');
          io.unobserve(entry.target);
        }
      },
      /* Match the masked-text island: start a bit before the frame is centered. */
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    for (var j = 0; j < slots.length; j++) io.observe(slots[j]);
  } catch (e) {
    html.classList.remove('yy-clip-reveal');
    if (window.console) console.error('[yy-landing-clip] off, slots shown:', e);
  }
})();
