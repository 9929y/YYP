/* ============================================================================
   yy-reveal.js — IntersectionObserver for named recipes in yy-motion.css.

   Marks nodes with .in when they enter view. Hidden state is CSS-only, gated on
   html.yy-reveal, so JS off / no observer / any throw leaves content visible.

   Targets:
     · Explicit: [data-reveal] (except none / intro-*) and .rv
     · Landing (html.yy-landing): explicit only — never auto-collect (hero intro
       is a CSS timeline; auto-collect would steal those nodes).
     · Other pages: if nothing is marked, auto-collect images + text that IX2
       does not own, stamp .yy-rv.

   data-reveal="none" excludes a node (and descendants via closest).
   data-reveal-mode="inout" re-hides on leave; default is once (enter only).
   IX2 [data-w-id] is never a target.
   ============================================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  var SKIP = 'yy-nav,yy-footer,.sr-only,.navbar,.preloader-lark,.w-lightbox-backdrop,.footer-credit-wrapper';

  function clippedOut(el) {
    var r = el.getBoundingClientRect();
    var e = el.parentElement;
    while (e && e !== document.body) {
      var cs = getComputedStyle(e);
      if (/hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        var pr = e.getBoundingClientRect();
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

  function recipeOf(el) {
    return (el.getAttribute && el.getAttribute('data-reveal')) || '';
  }

  function skipMarked(el) {
    var r = recipeOf(el);
    if (r === 'none' || r.indexOf('intro-') === 0) return true;
    if (el.closest && el.closest('[data-reveal="none"]')) return true;
    return false;
  }

  function modeOf(el) {
    return (el.getAttribute && el.getAttribute('data-reveal-mode')) || 'once';
  }

  function collectAuto() {
    var out = [];
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (im.closest(SKIP) || ownedByIx2(im) || clippedOut(im) || skipMarked(im)) continue;
      if (im.getBoundingClientRect().width < 80) continue;
      out.push(im);
    }
    var blocks = document.querySelectorAll('p,h1,h2,h3,h4,blockquote,li,div');
    for (var j = 0; j < blocks.length; j++) {
      var el = blocks[j];
      if (el.closest(SKIP) || ownedByIx2(el) || clippedOut(el) || skipMarked(el)) continue;
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

  function collectExplicit() {
    var nodes = document.querySelectorAll('[data-reveal], .rv, .yy-rv');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest(SKIP) || ownedByIx2(el) || skipMarked(el)) continue;
      out.push(el);
    }
    return out;
  }

  function setStagger(el, step) {
    el.style.setProperty('--d', (Math.min(step, 4) * 40) + 'ms');
  }

  function syncKey(el) {
    var g = el.closest && el.closest('[data-reveal-sync], .case');
    return g || el;
  }

  function revealList(list, io) {
    var seen = [];
    for (var i = 0; i < list.length; i++) {
      var key = syncKey(list[i]);
      var idx = -1;
      for (var s = 0; s < seen.length; s++) if (seen[s] === key) { idx = s; break; }
      if (idx < 0) {
        idx = seen.length;
        seen.push(key);
      }
      setStagger(list[i], idx);
      list[i].classList.add('in');
      if (modeOf(list[i]) !== 'inout' && io) io.unobserve(list[i]);
    }
  }

  function onScreenItems(items) {
    var out = [];
    for (var q = 0; q < items.length; q++) {
      var box = items[q].getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0) out.push(items[q]);
    }
    return out;
  }

  /* Mark first-viewport nodes before the hide gate so a page fade is not
     stacked on a second opacity:0 enter for content already in view. */
  function primeOnScreen(items) {
    revealList(onScreenItems(items), null);
  }

  /** Landing cases + index head: show immediately, no scroll enter animation. */
  function landingInstantReveal(items) {
    var remaining = [];
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (el.closest && el.closest('.case, .index__head')) {
        el.style.setProperty('--reveal-duration', '0ms');
        el.style.setProperty('--d', '0ms');
        el.classList.add('in');
      } else {
        remaining.push(el);
      }
    }
    return remaining;
  }

  try {
    if (!('IntersectionObserver' in window)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var start = function () {
      try {
        var isLanding = /\byy-landing\b/.test(html.className);
        var explicit = collectExplicit();
        var items = (isLanding || explicit.length) ? explicit : collectAuto();
        if (isLanding) items = landingInstantReveal(items);
        if (!items.length) return;

        if (!explicit.length && !isLanding) {
          for (var i = 0; i < items.length; i++) items[i].classList.add('yy-rv');
        }

        primeOnScreen(items);
        html.classList.add('yy-reveal');

        var io = new IntersectionObserver(function (entries) {
          var shown = [];
          var left = [];
          for (var n = 0; n < entries.length; n++) {
            if (entries[n].isIntersecting) shown.push(entries[n].target);
            else left.push(entries[n].target);
          }
          shown.sort(function (a, b) {
            return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
          });
          revealList(shown, io);
          for (var h = 0; h < left.length; h++) {
            if (modeOf(left[h]) === 'inout') left[h].classList.remove('in');
          }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

        for (var p = 0; p < items.length; p++) io.observe(items[p]);

        var sweep = function () {
          var pend = document.querySelectorAll(
            '.yy-rv:not(.in), .rv:not(.in), [data-reveal]:not(.in):not([data-reveal="none"]):not([data-reveal^="intro-"])'
          );
          for (var s = 0; s < pend.length; s++) {
            if (skipMarked(pend[s]) || ownedByIx2(pend[s])) continue;
            var r = pend[s].getBoundingClientRect();
            if (r.top < innerHeight + 200) {
              pend[s].style.setProperty('--d', '0ms');
              pend[s].classList.add('in');
              if (modeOf(pend[s]) !== 'inout') io.unobserve(pend[s]);
            }
          }
        };
        if (!isLanding) {
          var sweepTimer = null;
          window.addEventListener('scroll', function () {
            clearTimeout(sweepTimer);
            sweepTimer = setTimeout(sweep, 400);
          }, { passive: true });
          setTimeout(sweep, 2500);
        }

        requestAnimationFrame(function () {
          revealList(onScreenItems(items), io);
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
