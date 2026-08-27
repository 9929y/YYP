/* ============================================================================
   yy-slots.js — show the slot placeholder only when media is missing or failed.
   Enter motion for loaded media is yy-reveal / yy-motion.css, not this file.
   ============================================================================ */
(function () {
  'use strict';
  try {
    document.querySelectorAll('.slot').forEach(function (slot) {
      var vid = slot.querySelector('video');
      var img = slot.querySelector('img');
      var placeholder = function () { slot.classList.add('is-placeholder'); };
      var ready = function () { slot.classList.remove('is-placeholder'); };

      if (vid) {
        if (vid.readyState >= 1 || vid.getAttribute('poster')) ready();
        else vid.addEventListener('loadedmetadata', ready, { once: true });
        vid.addEventListener('error', placeholder, { once: true });
        return;
      }
      if (!img) {
        placeholder();
        return;
      }
      var show = function () {
        if (img.naturalWidth > 0) ready();
        else placeholder();
      };
      img.addEventListener('error', placeholder, { once: true });
      if (img.complete) show();
      else img.addEventListener('load', show, { once: true });
    });
  } catch (e) {
    if (window.console) console.error('[landing] slot placeholder off:', e);
  }
})();
