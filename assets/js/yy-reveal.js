/* ============================================================================
   yy-reveal.js — fills the gaps in the case pages' entrance animations.

   THE PROBLEM, measured. Entrance motion on the case pages comes from Webflow
   IX2, which only animates elements carrying `data-w-id`. That attribute was
   added by hand, per page, in the Webflow editor, and it was never applied
   consistently. Coverage of images plus text blocks:

       mckinseyecommerce         94%      fashion              67%
       ai-driven-product-design  93%      tiktok-research      18%
       cummins-digitalization    89%      alzheimerdisease     14%
                                          mifinance            11%
                                          larkdesign            7%

   larkdesign has 7 data-w-id elements to cover 87 images and text blocks.
   McKinsey has 18 covering 51. That is why some things animate in and some
   just appear — it is the original authoring, not a regression: the
   data-w-id counts are identical before and after this round's work.

   THE APPROACH. This layer animates ONLY what IX2 does not own. The selector is
   literally `:not([data-w-id])` and not a descendant of one, so the two systems
   cannot fight over an element — there is no shared target by construction.

   MATCHING THE EXISTING FEEL is the whole point; a second reveal with different
   timing would make the page read as two pages. Both numbers below are measured,
   not chosen:

     · 500ms — the dominant duration in McKinsey's IX2 action list (39 of 308
       items), confirmed by frame-sampling a live reveal.
     · outQuad, i.e. cubic-bezier(.25,.46,.45,.94) — the named easing IX2 uses
       for entrances. Sampled opacity decelerates 0.13 → 0.34 → 0.52 → 0.65 →
       0.76 → 0.84 → 0.90, and y decelerates 87 → 66 → 48 → 35 → 24 → 16 → 10.
       Ease-out is also the correct family for entering elements.
     · translateY 100px → 0 — IX2's own travel distance for these blocks.

   Stagger is 40ms, within the 30-50ms band for related items, capped at 5 steps
   so a group never takes longer than 500 + 4x40 = 660ms to settle. Beyond that a
   reader has already scrolled past.

   FAILING SAFE. Content is visible by default and the animation is opted into by
   a class this script sets before first paint. If the script never runs, throws,
   or the browser has no IntersectionObserver, every element stays visible. This
   is the opposite of the first landing-page attempt, which defaulted to
   opacity 0 and left content permanently invisible when JS was off.
   ============================================================================ */
(function () {
  'use strict';

  var html = document.documentElement;

  /* Never animate: chrome, the preloader (it sits at z-index 10000 over
     everything), sticky/fixed elements whose position we must not disturb, and
     anything inside a lightbox. */
  var SKIP = 'yy-nav,yy-footer,.sr-only,.navbar,.preloader-lark,.w-lightbox-backdrop,.footer-credit-wrapper';

  /* Skip anything the page is ALREADY hiding by clipping it out of an
     overflow:hidden ancestor — those are hover-reveal labels and carousel slides
     whose visibility the page controls itself.

     Measured case: projects.html has `.text-gradient-class` labels inside
     `.card-gradient` (overflow: hidden), shown on hover. Adding opacity:0 to one
     of them locked it off permanently, because IntersectionObserver correctly
     reports a clipped-out element as not intersecting, so `.in` never arrived
     and hovering revealed nothing. Layering a second opacity system on top of a
     page's own is the bug; not doing it is the fix. */
  function clippedOut(el) {
    var r = el.getBoundingClientRect();
    var e = el.parentElement;
    while (e && e !== document.body) {
      var cs = getComputedStyle(e);
      if (/hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        var pr = e.getBoundingClientRect();
        /* Outside the clipper's box on either axis, with a 2px tolerance. */
        if (r.bottom < pr.top - 2 || r.top > pr.bottom + 2 ||
            r.right < pr.left - 2 || r.left > pr.right + 2) return true;
      }
      e = e.parentElement;
    }
    return false;
  }

  function ownedByIx2(el) {
    var e = el;
    while (e && e !== document.body) {
      if (e.hasAttribute && e.hasAttribute('data-w-id')) return true;
      e = e.parentElement;
    }
    return false;
  }

  function collect() {
    var out = [];

    /* Images big enough to be content rather than an icon. */
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.closest(SKIP) || ownedByIx2(im) || clippedOut(im)) continue;
      if (im.getBoundingClientRect().width < 80) continue;
      out.push(im);
    }

    /* Innermost text blocks — a container whose child also holds long text
       would double up with that child and the two would stagger against each
       other. */
    var blocks = document.querySelectorAll('p,h1,h2,h3,h4,blockquote,li,div');
    for (var j = 0; j < blocks.length; j++) {
      var el = blocks[j];
      if (el.closest(SKIP) || ownedByIx2(el) || clippedOut(el)) continue;
      var t = (el.textContent || '').trim();
      if (t.length < 30) continue;
      var nested = false;
      for (var k = 0; k < el.children.length; k++) {
        if ((el.children[k].textContent || '').trim().length >= 30) { nested = true; break; }
      }
      if (nested) continue;
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.position === 'sticky' || cs.position === 'fixed') continue;
      out.push(el);
    }
    return out;
  }

  try {
    if (!('IntersectionObserver' in window)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Set before paint so opting in never causes a flash of already-visible
       content being hidden. */
    html.className += ' yy-reveal';

    var start = function () {
      try {
        var items = collect();
        if (!items.length) { html.classList.remove('yy-reveal'); return; }

        for (var i = 0; i < items.length; i++) items[i].classList.add('yy-rv');

        var io = new IntersectionObserver(function (entries) {
          /* Sort by document position so a group staggers top-to-bottom rather
             than in observer-callback order, which is not guaranteed. */
          var shown = [];
          for (var n = 0; n < entries.length; n++)
            if (entries[n].isIntersecting) shown.push(entries[n].target);
          shown.sort(function (a, b) {
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
          });
          for (var m = 0; m < shown.length; m++) {
            /* Cap the stagger at 5 steps: 500 + 4 x 40 = 660ms to settle. */
            shown[m].style.transitionDelay = (Math.min(m, 4) * 40) + 'ms';
            shown[m].classList.add('in');
            io.unobserve(shown[m]);
          }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

        for (var p = 0; p < items.length; p++) io.observe(items[p]);

        /* ---- safety sweep: a GUARANTEE, not a diagnosis ----
           IntersectionObserver can legitimately never fire for an element the
           page itself clips or moves — projects.html has a hover-reveal label
           inside an overflow:hidden card that behaves exactly this way, and an
           earlier attempt to detect that case by geometry still missed it.

           Rather than keep guessing at causes, this sweep force-reveals anything
           still waiting once the reader has scrolled past where it sits. The
           layer therefore CANNOT leave content permanently invisible regardless
           of why the observer stayed quiet — which is the property that actually
           matters, and the one this project has repeatedly failed to hold. */
        var sweep = function () {
          var pend = document.querySelectorAll('.yy-rv:not(.in)');
          for (var i = 0; i < pend.length; i++) {
            var r = pend[i].getBoundingClientRect();
            if (r.top < innerHeight + 200) {
              pend[i].style.transitionDelay = '0ms';
              pend[i].classList.add('in');
              io.unobserve(pend[i]);
            }
          }
        };
        var sweepTimer = null;
        window.addEventListener('scroll', function () {
          clearTimeout(sweepTimer);
          sweepTimer = setTimeout(sweep, 400);
        }, { passive: true });
        /* Also sweep once well after load, for anything already passed on arrival
           (a deep link, or a restored scroll position). */
        setTimeout(sweep, 2500);

        /* Anything already on screen at load reveals immediately — waiting for a
           scroll that may never happen would leave the first screen blank. */
        requestAnimationFrame(function () {
          var d = 0;
          for (var q = 0; q < items.length; q++) {
            var r = items[q].getBoundingClientRect();
            if (r.top < innerHeight && r.bottom > 0) {
              items[q].style.transitionDelay = (Math.min(d++, 4) * 40) + 'ms';
              items[q].classList.add('in');
              io.unobserve(items[q]);
            }
          }
        });
      } catch (e) {
        html.classList.remove('yy-reveal');
        if (window.console) console.error('[yy-reveal] off, content shown:', e);
      }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  } catch (e) {
    html.classList.remove('yy-reveal');
    if (window.console) console.error('[yy-reveal] off, content shown:', e);
  }
})();
