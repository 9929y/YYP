/* ============================================================================
   yy-slots.js — skeleton -> content reveal for .slot images/videos.
   Extracted from landing.html. Behaviour is unchanged for images.
   Videos wait for the poster image to decode before revealing, so the
   striped placeholder does not flash under an empty <video>.
   ============================================================================ */
(function () {
  'use strict';
  try {
    document.querySelectorAll('.slot').forEach(function (slot) {
      var vid = slot.querySelector('video');
      if (vid) {
        var showV = function () { slot.classList.add('is-revealed'); };
        var poster = vid.getAttribute('poster');
        if (vid.readyState >= 2) {
          showV();
          return;
        }
        if (poster) {
          var probe = new Image();
          probe.onload = showV;
          probe.onerror = showV;
          probe.src = poster;
          if (probe.complete && probe.naturalWidth > 0) showV();
          return;
        }
        vid.addEventListener('loadeddata', showV, { once: true });
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
