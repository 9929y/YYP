/* ============================================================================
   yy-landing-clip.js — bleibtgleich-style clip-down wipe for homepage slots.

   bleibtgleich.dev marks image frames with data-reveal="clip-down": the frame
   opens via clip-path rather than the picture sliding. Our case pages already
   do this as yy-rv--wipe (via yy-reveal + yy-scroll). The landing runs
   reveal={false}, so that path never fires — and it must not: .slot media already
   owns opacity/filter (skeleton) and transform (hover).

   Free lane: clip-path on the .slot frame itself. This script only writes
   clip-path state via gated classes. It never touches opacity, filter, or transform.

   Timing note: clip-path shrinks the IntersectionObserver intersection rect. If we
   closed the clip before observing, slots would stay at zero visible area and
   never fire. Sequence is therefore:
     1. Observe while frames are still fully visible (fail-safe default).
     2. On intersect: add is-clip-ready (closes) → double-rAF → is-clip-in (opens).
     3. Already-in-view frames skip the wipe and get is-clip-in immediately.

   Fail-safe: content is fully visible until this script opts a frame into the
   ready/in classes. JS off / no IntersectionObserver / reduced motion /
   any throw → no classes → no clip → slots render normally.
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

    function openFrame(el, animate) {
      if (el.classList.contains('is-clip-in')) return;
      if (!animate) {
        el.classList.add('is-clip-in');
        return;
      }
      el.classList.add('is-clip-ready');
      /* Double rAF so the closed clip paints before we transition open. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.classList.add('is-clip-in');
        });
      });
    }

    function alreadyInView(el) {
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      /* Match the observer's -12% bottom margin roughly. */
      return r.top < vh * 0.88 && r.bottom > vh * 0.08;
    }

    /* Frames already on screen: show immediately (no wipe from a past scroll). */
    for (var i = 0; i < slots.length; i++) {
      if (alreadyInView(slots[i])) openFrame(slots[i], false);
    }

    var io = new IntersectionObserver(
      function (entries) {
        for (var j = 0; j < entries.length; j++) {
          var entry = entries[j];
          if (!entry.isIntersecting) continue;
          openFrame(entry.target, true);
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    for (var k = 0; k < slots.length; k++) {
      if (!slots[k].classList.contains('is-clip-in')) io.observe(slots[k]);
    }
  } catch (e) {
    html.classList.remove('yy-clip-reveal');
    if (window.console) console.error('[yy-landing-clip] off, slots shown:', e);
  }
})();
