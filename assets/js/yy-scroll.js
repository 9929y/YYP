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

  function start() {
    if (lenis || RM.matches) return;
    try {
      lenis = new Lenis({
        duration: 1.05,          /* measured off kedavra: ~1s settle */
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

  /* --------------------------------------------------------------------------
     Effect 1 — filmic image reveal.

     yy-reveal.js gives every uncovered element the same treatment: rise 12px,
     un-blur, fade. Correct for text. For a large image the awwwards-standard
     move is a clip wipe with a micro over-scale settling back to 1, so the frame
     opens rather than the picture sliding. Same 500ms and same easing as the
     text reveal, so the two read as one system — only the shape of the motion
     differs, which is the point.

     Applied by tagging the element; all the motion lives in yy-chrome.css.
     -------------------------------------------------------------------------- */
  function tagImages() {
    try {
      var rv = document.querySelectorAll('.yy-rv');
      for (var i = 0; i < rv.length; i++) {
        var el = rv[i];
        if (el.tagName !== 'IMG') continue;
        var r = el.getBoundingClientRect();
        /* Only large imagery earns the wipe — a 90px thumbnail wiping open reads
           as a glitch, not as cinema. */
        if (r.width < 320) continue;
        el.classList.add('yy-rv--wipe');
      }
    } catch (e) { /* the base reveal still applies */ }
  }

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

  function boot() {
    tagImages();
    /* Newly revealed images need tagging too — yy-reveal adds .yy-rv on its own
       schedule, and on the long pages that happens well after load. */
    var n = 0;
    var iv = setInterval(function () { tagImages(); if (++n > 12) clearInterval(iv); }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
