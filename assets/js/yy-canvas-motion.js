/* ============================================================================
   yy-canvas-motion.js — scroll-driven Canvas / CanvasCover on the landing.

   Binds existing .yy-canvas layers (data-motion-*). Does NOT create a second
   Lenis instance — yy-scroll.js already owns smooth scroll when present.
   Per-frame values go to CSS variables on [data-motion-root], never React state.
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
  var lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  var current = {
    scale: 1,
    x: 0,
    y: 0,
    opacity: 0.9,
    coverScale: 1,
    coverX: 0,
    coverY: 0,
    coverOpacity: 0.85
  };

  var target = {
    scale: 1,
    x: 0,
    y: 0,
    opacity: 0.9,
    coverScale: 1,
    coverX: 0,
    coverY: 0,
    coverOpacity: 0.85
  };

  var rafId = 0;
  var running = false;

  function readProgress() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    var projectTop = projects.getBoundingClientRect().top + scrollY;
    var fadeStart = Math.max(0, projectTop - window.innerHeight * 0.9);
    var fadeEnd = Math.max(fadeStart + 1, projectTop - window.innerHeight * 0.25);
    return clamp((scrollY - fadeStart) / (fadeEnd - fadeStart), 0, 1);
  }

  function setTargets() {
    var p = readProgress();
    if (reduce.matches) {
      target.scale = 1;
      target.x = 0;
      target.y = 0;
      target.opacity = 0.9 - p * 0.6;
      target.coverScale = 1;
      target.coverX = 0;
      target.coverY = 0;
      target.coverOpacity = 0.85 - p * 0.5;
    } else {
      target.scale = 1 + p * 0.08;
      target.x = -24 * p;
      target.y = 32 * p;
      target.opacity = 0.9 - p * 0.6;
      target.coverScale = 1 + p * 0.04;
      target.coverX = 16 * p;
      target.coverY = 20 * p;
      target.coverOpacity = 0.85 - p * 0.5;
    }
  }

  function apply() {
    root.style.setProperty('--canvas-scale', current.scale.toFixed(4));
    root.style.setProperty('--canvas-x', current.x.toFixed(2) + 'px');
    root.style.setProperty('--canvas-y', current.y.toFixed(2) + 'px');
    root.style.setProperty('--canvas-opacity', current.opacity.toFixed(3));
    root.style.setProperty('--cover-scale', current.coverScale.toFixed(4));
    root.style.setProperty('--cover-x', current.coverX.toFixed(2) + 'px');
    root.style.setProperty('--cover-y', current.coverY.toFixed(2) + 'px');
    root.style.setProperty('--cover-opacity', current.coverOpacity.toFixed(3));
  }

  function near(a, b, eps) {
    return Math.abs(a - b) < eps;
  }

  function tick() {
    setTargets();
    var speed = 0.12;
    current.scale = lerp(current.scale, target.scale, speed);
    current.x = lerp(current.x, target.x, speed);
    current.y = lerp(current.y, target.y, speed);
    current.opacity = lerp(current.opacity, target.opacity, speed);
    current.coverScale = lerp(current.coverScale, target.coverScale, speed);
    current.coverX = lerp(current.coverX, target.coverX, speed);
    current.coverY = lerp(current.coverY, target.coverY, speed);
    current.coverOpacity = lerp(current.coverOpacity, target.coverOpacity, speed);
    apply();

    var settled =
      near(current.scale, target.scale, 0.0005) &&
      near(current.x, target.x, 0.05) &&
      near(current.y, target.y, 0.05) &&
      near(current.opacity, target.opacity, 0.002) &&
      near(current.coverScale, target.coverScale, 0.0005) &&
      near(current.coverX, target.coverX, 0.05) &&
      near(current.coverY, target.coverY, 0.05) &&
      near(current.coverOpacity, target.coverOpacity, 0.002);

    if (settled) {
      running = false;
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  function kick() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    setTargets();
    kick();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  if (reduce.addEventListener) reduce.addEventListener('change', onScroll);
  else if (reduce.addListener) reduce.addListener(onScroll);

  /* Opening intro: one-shot ready flag for CSS stagger. */
  requestAnimationFrame(function () {
    root.setAttribute('data-intro-ready', 'true');
  });

  setTargets();
  apply();
  kick();
})();
