/* yy-count.js — count-up for case-study impact numbers.

   Replaces the PureCounter build the Webflow pages pulled from a jsDelivr CDN
   at runtime. Same behaviour (count once, when the number scrolls into view),
   without the third-party request or the jQuery/Webflow runtime around it.

   Markup contract: an element carrying `data-count-to="<number>"`. Its text is
   replaced with the running value and settles on the target. Optional
   `data-count-duration` in ms (default 1000).

   Server-rendered text is the final value, not "0", so the number is correct
   with JS disabled, with the script blocked, and for anything reading the DOM
   before hydration. This script only animates from 0 up to what is already
   there — it can never leave a wrong number on screen. */
(function () {
  'use strict';

  var nodes = document.querySelectorAll('[data-count-to]');
  if (!nodes.length) return;

  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Reduced motion, or no observer support: leave the rendered final values. */
  if (reduced || typeof IntersectionObserver === 'undefined') return;

  function format(value, target) {
    /* Match the target's own precision so 3000 never renders as 3000.4. */
    var decimals = (String(target).split('.')[1] || '').length;
    return value.toFixed(decimals);
  }

  function run(el) {
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (!isFinite(target)) return;

    var duration = parseInt(el.getAttribute('data-count-duration'), 10);
    if (!isFinite(duration) || duration <= 0) duration = 1000;

    var started = null;
    el.textContent = format(0, target);

    function frame(now) {
      if (started === null) started = now;
      var t = Math.min(1, (now - started) / duration);
      /* Same ease-out shape as --ease-smooth-out reads: fast start, soft stop. */
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(target * eased, target);
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = format(target, target);
    }

    requestAnimationFrame(frame);
  }

  var seen = new WeakSet();
  var io = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting || seen.has(entry.target)) continue;
        seen.add(entry.target);
        io.unobserve(entry.target);
        run(entry.target);
      }
    },
    { rootMargin: '0px 0px -15% 0px' }
  );

  for (var i = 0; i < nodes.length; i++) io.observe(nodes[i]);
})();
