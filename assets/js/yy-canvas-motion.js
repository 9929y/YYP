/* ============================================================================
   yy-canvas-motion.js — scroll-driven Canvas / CanvasCover on the landing.

   Binds existing .yy-canvas layers (data-motion-*). Does NOT create a second
   Lenis instance — yy-scroll.js already owns smooth scroll when present.
   Per-frame values go to CSS variables on [data-motion-root], never React state.

   Scroll stop = freeze current scale/translate/opacity (no idle drift, no
   extra lerp after Lenis settles). Shader/GIF frame pause is handled separately
   by LandingCanvasGradient.
   ============================================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-motion-root]');
  var projects = document.querySelector('#work, [data-section="projects"]');
  if (!root || !projects) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (v, min, max) {
    return Math.min(max, Math.max(min, v));
  };

  var lastAppliedScroll = -1;
  var rafPending = false;

  function readScrollY() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function applyScrollState(scrollY) {
    if (Math.abs(scrollY - lastAppliedScroll) < 0.5) return;
    lastAppliedScroll = scrollY;

    var projectTop = projects.getBoundingClientRect().top + scrollY;
    var fadeStart = Math.max(0, projectTop - window.innerHeight * 0.9);
    var fadeEnd = Math.max(fadeStart + 1, projectTop - window.innerHeight * 0.25);
    var p = clamp((scrollY - fadeStart) / (fadeEnd - fadeStart), 0, 1);

    var scale = 1;
    var x = 0;
    var y = 0;
    /* Canvas fades down toward projects (~0.9 → 0.3). */
    var opacity = 0.9 - p * 0.6;
    var coverScale = 1;
    var coverX = 0;
    var coverY = 0;
    /* Cover goes the other way: clearer on hero, denser over projects. */
    var coverOpacity = 0.25 + p * 0.5;

    if (!reduce.matches) {
      scale = 1 + p * 0.08;
      x = -24 * p;
      y = 32 * p;
      coverScale = 1 + p * 0.04;
      coverX = 16 * p;
      coverY = 20 * p;
    }

    root.style.setProperty('--canvas-scale', scale.toFixed(4));
    root.style.setProperty('--canvas-x', x.toFixed(2) + 'px');
    root.style.setProperty('--canvas-y', y.toFixed(2) + 'px');
    root.style.setProperty('--canvas-opacity', opacity.toFixed(3));
    root.style.setProperty('--cover-scale', coverScale.toFixed(4));
    root.style.setProperty('--cover-x', coverX.toFixed(2) + 'px');
    root.style.setProperty('--cover-y', coverY.toFixed(2) + 'px');
    root.style.setProperty('--cover-opacity', coverOpacity.toFixed(3));
  }

  function scheduleApply() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      applyScrollState(readScrollY());
    });
  }

  window.addEventListener('scroll', scheduleApply, { passive: true });
  window.addEventListener('resize', scheduleApply, { passive: true });
  if (reduce.addEventListener) reduce.addEventListener('change', scheduleApply);
  else if (reduce.addListener) reduce.addListener(scheduleApply);

  /* Opening intro: one-shot ready flag for CSS stagger. */
  requestAnimationFrame(function () {
    root.setAttribute('data-intro-ready', 'true');
  });

  applyScrollState(readScrollY());
})();
