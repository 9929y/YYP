/* ============================================================================
   yy-scroll.js — one smooth-scroll config for all 12 pages, plus two restrained
   scroll effects.

   WHY ONE FILE. landing.html had its own inline Lenis init. Putting a second one
   on the case pages would recreate the exact problem the motion audit just
   fixed: two layers doing the same job with different numbers. This is the
   single source; landing loads it too.

   THE COMPATIBILITY GATE, run before any of this was written. IX2 drives every
   entrance animation on the case pages by listening to native scroll, and Lenis
   intercepts wheel input — so "it should be fine" was not good enough. Measured
   with real wheel events on both sides, 52 x 500px to the bottom of even the
   19,700px pages:

       page                       without Lenis    with Lenis
       larkdesign                 7/7  stuck 0     7/7  stuck 0
       mckinseyecommerce         18/18 stuck 0    18/18 stuck 0
       mifinance                  8/8  stuck 0     8/8  stuck 0
       ai-driven-product-design  11/11 stuck 0    11/11 stuck 0
       cummins-digitalization     7/7  stuck 0     7/7  stuck 0
       alzheimerdisease           7/7  stuck 0     7/7  stuck 0
       tiktok-research            2/2  stuck 0     2/2  stuck 0
       index                      6/6  stuck 0     6/6  stuck 0

   Identical on every page. An earlier version of that gate compared
   `lenis.scrollTo({immediate:true})` against `window.scrollTo` and reported two
   pages as changed — two different scroll mechanisms, so it was not comparing
   like with like. Real wheel input on both sides is the only honest test.

   CONFIG measured off the reference rather than chosen: kedavra runs Lenis, and
   one deltaY=1000 wheel settles there in ~1018ms (117ms:501 -> 404ms:909 ->
   788ms:991 -> 1018ms:999). duration 1.05 lands on that curve.

   `anchors: true` matters here — index.html has #one..#six fragment links, and
   Lenis owns the scroll position once it is installed, so without this they stop
   working.
   ============================================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  if (typeof Lenis !== 'function') return;          /* library missing -> native scroll */

  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var lenis = null;
  var isLanding = html.classList.contains('yy-landing');
  var panelOpen = false;

  function start() {
    if (lenis || RM.matches || panelOpen) return;
    try {
      lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        smoothTouch: false,      /* touch keeps native momentum — syncTouch is
                                    unstable below iOS 16 and native already
                                    feels right on a phone */
        anchors: true,           /* index.html's #one..#six depend on this */
        allowNestedScroll: true, /* Webflow lightboxes scroll inside themselves */
        autoRaf: true,
        respectReducedMotion: true
      });
    } catch (e) {
      lenis = null;
      if (window.console) console.error('[yy-scroll] Lenis off, native scroll active:', e);
    }
  }

  function stop() {
    if (!lenis) return;
    try { lenis.destroy(); } catch (e) { /* ignore */ }
    lenis = null;
    html.classList.remove('lenis', 'lenis-smooth');
  }

  start();
  if (RM.addEventListener) RM.addEventListener('change', function () { RM.matches ? stop() : start(); });
  else if (RM.addListener) RM.addListener(function () { RM.matches ? stop() : start(); });

  window.addEventListener('yy:panel-state', function (event) {
    panelOpen = Boolean(event.detail && event.detail.open);
    if (!lenis) {
      if (!panelOpen) start();
      return;
    }
    try {
      if (panelOpen) lenis.stop();
      else lenis.start();
    } catch (e) { /* native overflow lock remains the fallback */ }
  });

  if (isLanding && !RM.matches) {
    window.addEventListener('scroll', scheduleRuleDraw, { passive: true });
    window.addEventListener('resize', scheduleRuleDraw, { passive: true });
  }

  /* --------------------------------------------------------------------------
     Landing case spine — same idea as a reading progressor.

     The 1px rule beside each thumbnail is clipped to the viewport bottom:
     `--rule-draw` is the fraction of the case that sits above that edge.
     CSS `animation-timeline: view()` does this without JS where supported;
     this fallback keeps Firefox/older Safari in the same shape.
     -------------------------------------------------------------------------- */
  var ruleDrawRaf = 0;
  var supportsViewTimeline = false;
  try {
    supportsViewTimeline = CSS.supports('animation-timeline: view()');
  } catch (e) {
    supportsViewTimeline = false;
  }

  function applyCaseRuleDraw() {
    if (!isLanding || RM.matches || supportsViewTimeline) return;
    var cases = document.querySelectorAll('.case.row--ruled');
    if (!cases.length) return;
    var vh = window.innerHeight || 1;
    for (var i = 0; i < cases.length; i++) {
      var rect = cases[i].getBoundingClientRect();
      var h = rect.height || 1;
      var p = (vh - rect.top) / h;
      if (p < 0) p = 0;
      else if (p > 1) p = 1;
      cases[i].style.setProperty('--rule-draw', p.toFixed(4));
    }
  }

  function scheduleRuleDraw() {
    if (!isLanding || RM.matches || supportsViewTimeline) return;
    if (ruleDrawRaf) return;
    ruleDrawRaf = requestAnimationFrame(function () {
      ruleDrawRaf = 0;
      applyCaseRuleDraw();
    });
  }
  /* Default image enter is the same fade + 8px rise as copy (yy-motion.css).
     Optional data-reveal="wipe" still exists in CSS but is unused by default. */

  /* ⛔ 一个被删掉的 Effect 2，记在这里免得再加一次。

     原本是"滚动速度模糊"：读 lenis.velocity，写 --yy-vblur，给图片加动态模糊。
     删掉的原因不是它难写，是这两条：

       · 它根本没渲染出来。属性写到了 1.60px，但 <img> 的 computed filter 始终是
         none —— reveal 层的 `.yy-rv.in { filter: none }` 特异性更高。修它要让两层
         往同一个属性上写，那是最容易出 bug 的结构。
       · 依据站不住。参考站的速度模糊实测是 blur(0.0145px)，在**一个**元素上。
         我做的是 1.6px 加在每张图上 —— 放大 100 倍的自我发明，不是测量结果。

     Lenis 的平滑滚动 + 上面那个 filmic wipe 已经把"更有创意"这件事做到了，
     而且两者都验得过。 */

  /* --------------------------------------------------------------------------
     Effect 2 — play a slot or case-study video on hover or when scrolled into view.

     Deliberately NOT the `autoplay` attribute: that starts on load.

     Modes (data-play on the <video>):
       · scroll — play when in view, pause when leaving (landing default)
       · hover  — play on pointer enter, pause on leave
       · auto   — muted autoplay as soon as the element can play

     Guards:
       · muted + playsinline are on the element
       · play() promise rejection is caught so the poster stays
       · prefers-reduced-motion → never play
       · devices without hover → scroll-in-view fallback for data-play="hover"
     -------------------------------------------------------------------------- */
  function wireVideos() {
    try {
      var vids = document.querySelectorAll('.slot video, .media--video video');
      if (!vids.length) return;
      var panelExpanded = false;

      if (RM.matches) {                 /* poster only, never fetch the video */
        for (var k = 0; k < vids.length; k++) vids[k].removeAttribute('loop');
        return;
      }

      var canHover = false;
      try {
        canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
      } catch (e) { canHover = false; }

      function tryPlay(v) {
        if (panelExpanded) return;
        var pr = v.play();
        if (pr && typeof pr.catch === 'function') pr.catch(function () { /* poster stays */ });
      }

      function wireHover(v) {
        var slot = v.closest('.slot') || v;
        v.__yyUsesHover = true;
        var enter = function () {
          v.__yyHovering = true;
          tryPlay(v);
        };
        var leave = function () {
          v.__yyHovering = false;
          if (!v.paused) v.pause();
        };
        slot.addEventListener('pointerenter', enter);
        slot.addEventListener('pointerleave', leave);
        /* Warm the first frame so hover does not wait on cold start. */
        if (v.preload === 'none') v.preload = 'metadata';
        try { v.load(); } catch (e) { /* ignore */ }
      }

      var scrollVids = [];
      for (var i = 0; i < vids.length; i++) {
        var v = vids[i];
        var mode = v.getAttribute('data-play') || 'scroll';
        if (mode === 'auto') {
          v.__yyInView = true;
          if (v.preload === 'none') v.preload = 'auto';
          tryPlay(v);
        } else if (mode === 'hover' && canHover) wireHover(v);
        else scrollVids.push(v);
      }

      function resumeEligibleVideos() {
        for (var r = 0; r < vids.length; r++) {
          var candidate = vids[r];
          if ((candidate.__yyUsesHover && candidate.__yyHovering) ||
              (!candidate.__yyUsesHover && candidate.__yyInView)) {
            tryPlay(candidate);
          }
        }
      }

      window.addEventListener('yy:panel-state', function (event) {
        panelExpanded = Boolean(event.detail && event.detail.expanded);
        if (panelExpanded) {
          for (var p = 0; p < vids.length; p++) {
            if (!vids[p].paused) vids[p].pause();
          }
        } else {
          resumeEligibleVideos();
        }
      });

      if (!scrollVids.length || !('IntersectionObserver' in window)) {
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) return;
          for (var m = 0; m < vids.length; m++) if (!vids[m].paused) vids[m].pause();
        });
        return;
      }

      /* 进场早、退场晚的迟滞：>=15% 开播，<5% 才暂停。 */
      var PLAY_AT = 0.15, PAUSE_AT = 0.05;
      var io = new IntersectionObserver(function (entries) {
        for (var n = 0; n < entries.length; n++) {
          var e = entries[n], vid = e.target;
          vid.__yyInView = e.intersectionRatio >= PLAY_AT;
          if (e.intersectionRatio >= PLAY_AT) {
            if (vid.paused) tryPlay(vid);
          } else if (e.intersectionRatio < PAUSE_AT && !vid.paused) {
            vid.pause();
          }
        }
      }, {
        threshold: [0, 0.05, 0.15, 0.3, 0.6]
      });

      for (var j = 0; j < scrollVids.length; j++) io.observe(scrollVids[j]);

      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) return;
        for (var m = 0; m < vids.length; m++) if (!vids[m].paused) vids[m].pause();
      });
    } catch (e) {
      if (window.console) console.error('[yy-scroll] video autoplay off, poster kept:', e);
    }
  }

  function boot() {
    wireVideos();
    applyCaseRuleDraw();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
