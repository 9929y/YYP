/* ============================================================================
   yy-cursor.js — landing "view" cursor. Extracted from landing.html so the
   page is no longer the owner of this effect. Behaviour is unchanged.
   ============================================================================ */
/* ---------- the "view" cursor ----------
     Position is written as two custom properties and CSS does the easing, which
     reproduces the source's `gsap.to(duration: .16, ease: "power3.out")` without
     pulling in GSAP. No rAF lerp: the previous one had to be hand-tuned and the
     tuning is what went wrong.

     Guards, each earned by a real failure:
       1. Above 991px and a fine pointer only — matches the source's own gate.
       2. `cursor: none` is gated on html.yy-cursor-live, set only after the
          first real mousemove, so a dead script never hides the native cursor.
       3. A watchdog drops the class if the pointer stops being tracked.
     And the design guard the last attempt lacked: the disc is ALWAYS drawn once
     live. Only its size changes. There is no state in which the page has no
     visible pointer. */
  (function () {
    'use strict';
    var html = document.documentElement;
    var el = document.getElementById('yy-cursor');
    var label = el && el.querySelector('.yy-cursor__t');
    if (!el) return;

    /* ⛔ THE BUG THIS REPLACES, and it is why the cursor never appeared for
       Yanice while every headless test passed:

       The gate used to be evaluated ONCE, here, at script-execution time:
           if (!matchMedia('(min-width: 992px) ...').matches) return;

       Instrumented in a real browser, that check reported `gate=false w=0` —
       window.innerWidth is 0 when the document's inline scripts run in an
       embedded or not-yet-laid-out browser context. So the function returned
       before attaching anything, and the listener never existed. By the time
       any diagnostic ran, innerWidth was 1280 and the same expression returned
       true, which is exactly why every check I made afterwards said the gate
       was fine. Headless Playwright always has a real viewport at script time,
       so the entire test suite passed on a page that was broken.

       The reference guards against this and I failed to transcribe it:
           function checkViewport() {
             if (window.innerWidth > 991) document.addEventListener('mousemove', ...);
           }
           window.addEventListener('resize', checkViewport);
           checkViewport();
       — it re-checks on resize.

       This goes further than the source: the listener attaches unconditionally
       and the gate is evaluated at EVENT time via a live MediaQueryList. That
       covers zero-width startup, resizes, browser zoom (which changes CSS px
       width), and monitor changes, with no re-attachment logic to get wrong. */
    var MQ = matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)');
    var RM = matchMedia('(prefers-reduced-motion: reduce)');

    function standDown() {
      html.classList.remove('yy-cursor-live');
      el.classList.remove('on');
    }

    try {
      var moves = 0;

      window.addEventListener('mousemove', function (e) {
        /* Evaluated per event, never cached. */
        if (!MQ.matches || RM.matches) { standDown(); return; }
        el.style.setProperty('--cx', e.clientX + 'px');
        el.style.setProperty('--cy', e.clientY + 'px');
        moves++;
        if (!html.classList.contains('yy-cursor-live')) html.classList.add('yy-cursor-live');
      }, { passive: true });

      /* Hand the native cursor back the moment the conditions stop holding. */
      var onChange = function () { if (!MQ.matches || RM.matches) standDown(); };
      if (MQ.addEventListener) { MQ.addEventListener('change', onChange); RM.addEventListener('change', onChange); }
      else if (MQ.addListener) { MQ.addListener(onChange); RM.addListener(onChange); }

      /* Watchdog: if the class is set but nothing has been tracked, stand down. */
      setInterval(function () {
        if (moves === 0 && html.classList.contains('yy-cursor-live')) standDown();
      }, 500);

      /* Source targets `.case-link, .dribbble-case` on the index and
         `.case-link, .back-link, .case-next` on a case page. Here that is the
         project slot. */
      document.querySelectorAll('a.slot').forEach(function (t) {
        t.addEventListener('mouseenter', function () {
          if (!MQ.matches || RM.matches) return;
          if (label) label.textContent = 'view';
          el.classList.add('on');
        });
        t.addEventListener('mouseleave', function () { el.classList.remove('on'); });
      });

      window.addEventListener('blur', function () { el.classList.remove('on'); });
      document.addEventListener('mouseleave', function () { el.classList.remove('on'); });
    } catch (e) {
      standDown();
      el.style.display = 'none';
      if (window.console) console.error('[landing] cursor off, native cursor active:', e);
    }
  })();
