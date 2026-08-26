/* ============================================================================
   yy-canvas-motion.js — scroll-driven Canvas / CanvasCover on the landing.

   Progress is keyed to hero → each `.case` focus → page bottom (not a single
   linear fade). Each stop sets opacity, scale, and translate together so the
   background shifts with the four project bands. Shader playback is separate
   (LandingCanvasGradient keeps animate on).
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
    - Hero: scale 1.3, rotate 0
    - Opus: scale 1.9, opacity 0.3, cover 0.7
    - Atlas Nova: scale 2.8, canvas 0.4, cover 0.1, rotate 15deg CW
    - McKinsey: scale 2.8, opacity 0.3, cover 0.5
    - Lark: scale 1.5, opacity 0.2, cover 0.6, rotate 8deg CW
    - Bottom / footer: canvas + cover → 0
    During projects, shader speed is marked 0.7× via data-motion-zone.
  */
  var HERO = {
    opacity: 0.9,
    scale: 1.3,
    rotate: 0,
    x: 0,
    y: 0,
    coverOpacity: 0.25,
    coverScale: 1,
    coverRotate: 0,
    coverX: 0,
    coverY: 0
  };

  var CASES = [
    /* 0 Opus — cover 0.7 */
    {
      opacity: 0.3,
      scale: 1.9,
      rotate: 8,
      x: -20,
      y: 36,
      coverOpacity: 0.7,
      coverScale: 1.06,
      coverRotate: 5,
      coverX: 14,
      coverY: 18
    },
    /* 1 Atlas Nova — cover 0.1 (clearest glass) */
    {
      opacity: 0.4,
      scale: 2.8,
      rotate: 15,
      x: -32,
      y: 44,
      coverOpacity: 0.1,
      coverScale: 1.12,
      coverRotate: 10,
      coverX: 22,
      coverY: 26
    },
    /* 2 McKinsey — cover 0.5 */
    {
      opacity: 0.3,
      scale: 2.8,
      rotate: 28,
      x: -10,
      y: 22,
      coverOpacity: 0.5,
      coverScale: 1.12,
      coverRotate: 20,
      coverX: 8,
      coverY: 14
    },
    /* 3 Lark — cover 0.6 */
    {
      opacity: 0.2,
      scale: 1.5,
      rotate: 8,
      x: -26,
      y: 40,
      coverOpacity: 0.6,
      coverScale: 1.05,
      coverRotate: 5,
      coverX: 18,
      coverY: 24
    }
  ];

  var BOTTOM = {
    opacity: 0,
    scale: 1.4,
    rotate: 8,
    x: -12,
    y: 18,
    coverOpacity: 0,
    coverScale: 1.02,
    coverRotate: 5,
    coverX: 6,
    coverY: 10
  };

  var lastAppliedScroll = -1;
  var rafPending = false;

  function readScrollY() {
    return window.scrollY || window.pageYOffset || 0;
  }

  function caseNodes() {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-motion-case], .case')
    );
  }

  /** Build scrollY anchors for hero, each case focus, and page bottom. */
  function buildStops(scrollY) {
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
    return stops;
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
        coverScale: 1,
        coverRotate: 0,
        coverX: 0,
        coverY: 0
      };
    }
    return {
      opacity: lerp(a.opacity, b.opacity, t),
      scale: lerp(a.scale, b.scale, t),
      rotate: lerp(a.rotate, b.rotate, t),
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      coverOpacity: lerp(a.coverOpacity, b.coverOpacity, t),
      coverScale: lerp(a.coverScale, b.coverScale, t),
      coverRotate: lerp(a.coverRotate, b.coverRotate, t),
      coverX: lerp(a.coverX, b.coverX, t),
      coverY: lerp(a.coverY, b.coverY, t)
    };
  }

  function stateAtScroll(scrollY) {
    var stops = buildStops(scrollY);
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
    root.style.setProperty('--canvas-scale', state.scale.toFixed(4));
    root.style.setProperty('--canvas-rotate', state.rotate.toFixed(2) + 'deg');
    root.style.setProperty('--canvas-x', state.x.toFixed(2) + 'px');
    root.style.setProperty('--canvas-y', state.y.toFixed(2) + 'px');
    root.style.setProperty('--canvas-opacity', state.opacity.toFixed(3));
    root.style.setProperty('--cover-scale', state.coverScale.toFixed(4));
    root.style.setProperty('--cover-rotate', state.coverRotate.toFixed(2) + 'deg');
    root.style.setProperty('--cover-x', state.coverX.toFixed(2) + 'px');
    root.style.setProperty('--cover-y', state.coverY.toFixed(2) + 'px');
    root.style.setProperty('--cover-opacity', state.coverOpacity.toFixed(3));
    /* Hard-clear for footer readability once both layers are effectively gone. */
    var clear = state.opacity < 0.02 && state.coverOpacity < 0.02;
    root.setAttribute('data-canvas-clear', clear ? 'true' : 'false');
  }

  function motionZone(scrollY) {
    var cases = caseNodes();
    if (!cases.length) return 'hero';
    var vh = window.innerHeight || 1;
    var first = cases[0].getBoundingClientRect();
    var firstTop = first.top + scrollY;
    if (scrollY + vh * 0.4 < firstTop) return 'hero';
    var last = cases[cases.length - 1].getBoundingClientRect();
    var lastBottom = last.bottom + scrollY;
    if (scrollY > lastBottom - vh * 0.45) return 'footer';
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
  window.addEventListener('resize', scheduleApply, { passive: true });
  if (reduce.addEventListener) reduce.addEventListener('change', scheduleApply);
  else if (reduce.addListener) reduce.addListener(scheduleApply);

  /* Opening intro: wait two frames so opacity:0 / scaleY(0) paint first. */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      root.setAttribute('data-intro-ready', 'true');
    });
  });

  applyScrollState(readScrollY());
})();
