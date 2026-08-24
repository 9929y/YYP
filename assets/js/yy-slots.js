/* ============================================================================
   yy-slots.js — skeleton -> content reveal for .slot images/videos.
   Extracted from landing.html. Behaviour is unchanged.
   ============================================================================ */
/* Skeleton -> content reveal (14-skeleton-reveal, reveal half only).
     Adds .is-revealed only after the image actually decodes, so a missing file
     leaves the placeholder in place with no broken-image icon and no layout
     change. `complete` covers images already in cache before this runs. */
  (function () {
    'use strict';
    try {
      document.querySelectorAll('a.slot').forEach(function (slot) {
        /* A video slot reveals as soon as its poster is painted — waiting for the
           video itself would keep the placeholder up until the reader scrolls
           there, since preload is "none" and nothing is fetched before that. */
        var vid = slot.querySelector('video');
        if (vid) {
          var showV = function () { slot.classList.add('is-revealed'); };
          if (vid.readyState >= 1 || vid.getAttribute('poster')) showV();
          else vid.addEventListener('loadedmetadata', showV, { once: true });
          return;
        }
        var img = slot.querySelector('img');
        if (!img) return;
        var show = function () { if (img.naturalWidth > 0) slot.classList.add('is-revealed'); };
        if (img.complete) show();
        else img.addEventListener('load', show, { once: true });
      });
    } catch (e) {
      if (window.console) console.error('[landing] slot reveal off, placeholders kept:', e);
    }
  })();
