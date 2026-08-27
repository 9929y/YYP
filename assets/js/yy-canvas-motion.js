/* ============================================================================
   yy-canvas-motion.js — scroll-driven Canvas / CanvasCover on the landing.

   Progress is keyed to hero → each `.case` focus → page bottom (not a single
   linear fade). Canvas keeps opacity / scale / rotate / translate. Cover
   opacity / scale / rotate / translate stay frozen; only coverBlur + coverFill
   change per stop (coverOpacity drops only at the footer clear).
   Shader playback is separate (LandingCanvasGradient keeps animate on).
   ============================================================================ */
(function () {
  'use strict';

  var root = document.querySelector('[data-motion-root]');
  if (!root) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (v, min, max) {
    return Math.min(max, Math.max(min, v));
  };
  var lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  /*
    Keyframe stops (landing order: Opus → Atlas → McKinsey → Lark):
    - Hero: canvas scale 1.3; soft frost (blur + fill only)
    - Opus: canvas 1.9 / 0.3; heavy frost
    - Atlas Nova: canvas 2.8 / 0.4; clearest glass
    - McKinsey: canvas 2.8 / 0.3; medium frost
    - Lark: canvas 1.5 / 0.2; medium-heavy frost
    - Bottom / footer: canvas + cover → 0
    Cover character = blur + fill. Cover opacity/scale/rotate/xy do not vary
    across cases (opacity only fades at bottom clear).
    During projects, shader speed is marked 0.7× via data-motion-zone.
  */
  var HERO = {
    opacity: 0.9,
    scale: 1.3,
    rotate: 0,
    x: 0,
    y: 0,
    coverOpacity: 1,
    coverBlur: 70,
    coverFill: 0.16
  };

  var CASES = [
    /* 0 Opus — heavy frost */
    {
      opacity: 0.3,
      scale: 1.9,
      rotate: 8,
      x: -20,
      y: 36,
      coverOpacity: 1,
      coverBlur: 80,
      coverFill: 0.42
    },
    /* 1 Atlas Nova — clearest glass */
    {
      opacity: 0.4,
      scale: 2.8,
      rotate: 15,
      x: -32,
      y: 44,
      coverOpacity: 1,
      coverBlur: 28,
      coverFill: 0.05
    },
    /* 2 McKinsey — medium frost */
    {
      opacity: 0.3,
      scale: 2.8,
      rotate: 28,
      x: -10,
      y: 22,
      coverOpacity: 1,
      coverBlur: 70,
      coverFill: 0.28
    },
    /* 3 Lark — medium-heavy frost */
    {
      opacity: 0.2,
      scale: 1.5,
      rotate: 8,
      x: -26,
      y: 40,
      coverOpacity: 1,
      coverBlur: 75,
      coverFill: 0.34
    }
  ];

  var BOTTOM = {
    opacity: 0,
    scale: 1.4,
    rotate: 8,
    x: -12,
    y: 18,
    coverOpacity: 0,
    coverBlur: 40,
    coverFill: 0
  };

  var lastAppliedScroll = -1;
  var rafPending = false;
  var cachedStops = null;
  var cachedZone = null;
  var canvasLayer = document.querySelector('.yy-canvas');
  var coverLayer = document.querySelector('.yy-canvas__cover:not(.yy-canvas__cover--heavy)');
  var coverHeavy = document.querySelector('.yy-canvas__cover--heavy');
  var BLUR_MIN = 28;
  var BLUR_MAX = 80;

  function invalidateStops() {
    cachedStops = null;
    cachedZone = null;
  }

  function readScrollY() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function caseNodes() {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-motion-case], .case')
    );
  }

  /** Build scrollY anchors for hero, each case focus, and page bottom. */
  function buildStops() {
    if (cachedStops) return cachedStops;
    var scrollY = readScrollY();
    var vh = window.innerHeight || 1;
    var cases = caseNodes();
    var stops = [{ y: 0, state: HERO }];

    for (var i = 0; i < cases.length; i++) {
      var el = cases[i];
      var rect = el.getBoundingClientRect();
      var top = rect.top + scrollY;
      var focusY = top + rect.height / 2 - vh / 2;
      var key = CASES[i] || CASES[CASES.length - 1];
      stops.push({ y: Math.max(0, focusY), state: key });
    }

    var docBottom = Math.max(
      0,
      (document.documentElement.scrollHeight || document.body.scrollHeight) - vh
    );
    /*
      Clear the board once the last case is leaving the viewport so footer /
      chrome sit on plain white — not only at the absolute scroll end.
    */
    var lastCase = cases.length ? cases[cases.length - 1] : null;
    var clearY = docBottom;
    if (lastCase) {
      var lastRect = lastCase.getBoundingClientRect();
      var lastBottom = lastRect.bottom + scrollY;
      clearY = Math.min(docBottom, Math.max(stops[stops.length - 1].y + 48, lastBottom - vh * 0.45));
    }
    stops.push({ y: clearY, state: BOTTOM });
    if (docBottom > clearY + 1) stops.push({ y: docBottom, state: BOTTOM });

    stops.sort(function (a, b) {
      return a.y - b.y;
    });
    cachedStops = stops;
    return cachedStops;
  }

  function mixStates(a, b, t, noMotion) {
    if (noMotion) {
      return {
        opacity: lerp(a.opacity, b.opacity, t),
        scale: 1,
        rotate: 0,
        x: 0,
        y: 0,
        coverOpacity: lerp(a.coverOpacity, b.coverOpacity, t),
        coverBlur: lerp(a.coverBlur, b.coverBlur, t),
        coverFill: lerp(a.coverFill, b.coverFill, t)
      };
    }
    return {
      opacity: lerp(a.opacity, b.opacity, t),
      scale: lerp(a.scale, b.scale, t),
      rotate: lerp(a.rotate, b.rotate, t),
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      coverOpacity: lerp(a.coverOpacity, b.coverOpacity, t),
      coverBlur: lerp(a.coverBlur, b.coverBlur, t),
      coverFill: lerp(a.coverFill, b.coverFill, t)
    };
  }

  function stateAtScroll(scrollY) {
    var stops = buildStops();
    if (!stops.length) return HERO;

    if (scrollY <= stops[0].y) return stops[0].state;
    var last = stops[stops.length - 1];
    if (scrollY >= last.y) return last.state;

    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i];
      var b = stops[i + 1];
      if (scrollY >= a.y && scrollY <= b.y) {
        var span = Math.max(1, b.y - a.y);
        var t = clamp((scrollY - a.y) / span, 0, 1);
        return mixStates(a.state, b.state, t, reduce.matches);
      }
    }
    return last.state;
  }

  function apply(state) {
    var canvasTarget = canvasLayer || root;
    var coverTarget = coverLayer || root;
    canvasTarget.style.setProperty('--canvas-scale', state.scale.toFixed(4));
    canvasTarget.style.setProperty('--canvas-rotate', state.rotate.toFixed(2) + 'deg');
    canvasTarget.style.setProperty('--canvas-x', state.x.toFixed(2) + 'px');
    canvasTarget.style.setProperty('--canvas-y', state.y.toFixed(2) + 'px');
    canvasTarget.style.setProperty('--canvas-opacity', state.opacity.toFixed(3));
    coverTarget.style.setProperty('--cover-fill', state.coverFill.toFixed(3));
    var t = clamp((state.coverBlur - BLUR_MIN) / (BLUR_MAX - BLUR_MIN), 0, 1);
    var light = state.coverOpacity * (1 - t);
    var heavy = state.coverOpacity * t;
    coverTarget.style.setProperty('--cover-opacity', light.toFixed(3));
    if (coverHeavy) coverHeavy.style.setProperty('--cover-opacity', heavy.toFixed(3));
    /* Hard-clear for footer readability once both layers are effectively gone. */
    var clear = state.opacity < 0.02 && state.coverOpacity < 0.02;
    root.setAttribute('data-canvas-clear', clear ? 'true' : 'false');
  }

  function zoneBounds() {
    if (cachedZone) return cachedZone;
    var cases = caseNodes();
    if (!cases.length) {
      cachedZone = { firstTop: Infinity, lastBottom: Infinity };
      return cachedZone;
    }
    var scrollY = readScrollY();
    var first = cases[0].getBoundingClientRect();
    var last = cases[cases.length - 1].getBoundingClientRect();
    cachedZone = {
      firstTop: first.top + scrollY,
      lastBottom: last.bottom + scrollY
    };
    return cachedZone;
  }

  function motionZone(scrollY) {
    var bounds = zoneBounds();
    var vh = window.innerHeight || 1;
    if (scrollY + vh * 0.4 < bounds.firstTop) return 'hero';
    if (scrollY > bounds.lastBottom - vh * 0.45) return 'footer';
    return 'projects';
  }

  function applyScrollState(scrollY) {
    if (Math.abs(scrollY - lastAppliedScroll) < 0.5) return;
    lastAppliedScroll = scrollY;
    apply(stateAtScroll(scrollY));
    root.setAttribute('data-motion-zone', motionZone(scrollY));
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
  window.addEventListener('resize', function () {
    invalidateStops();
    scheduleApply();
  }, { passive: true });
  document.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'IMG') {
      invalidateStops();
      scheduleApply();
    }
  }, true);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) scheduleApply();
  });
  if (reduce.addEventListener) reduce.addEventListener('change', scheduleApply);
  else if (reduce.addListener) reduce.addListener(scheduleApply);

  /* Opening intro: one frame so opacity:0 paints first. */
  requestAnimationFrame(function () {
    root.setAttribute('data-intro-ready', 'true');
  });

  applyScrollState(readScrollY());
})();
