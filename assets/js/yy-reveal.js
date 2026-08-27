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
   IX2 [data-w-id] is never a target; neither are containers that wrap IX2.

   Case pages: do NOT prime first-viewport media before the hide gate — that
   skipped the enter transition and made hero images look static. Landing still
   primes so in-view nodes do not stack a second opacity:0 enter on page fade.
   ============================================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  var SKIP = 'yy-nav,yy-footer,.sr-only,.navbar,.preloader-lark,.w-lightbox-backdrop,.footer-credit-wrapper';
  var io = null;
  var observed = typeof WeakSet === 'function' ? new WeakSet() : null;
  var observedFallback = observed ? null : [];
  var isLanding = /\byy-landing\b/.test(html.className);

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

  function wrapsIx2(el) {
    return !!(el.querySelector && el.querySelector('[data-w-id]'));
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

  /* Project / case pages: enter + exit (inout). Landing stays once unless marked. */
  var defaultMode = isLanding ? 'once' : 'inout';

  function modeOf(el) {
    return (el.getAttribute && el.getAttribute('data-reveal-mode')) || defaultMode;
  }

  function isObserved(el) {
    if (observed) return observed.has(el);
    for (var i = 0; i < observedFallback.length; i++) if (observedFallback[i] === el) return true;
    return false;
  }

  function markObserved(el) {
    if (observed) observed.add(el);
    else observedFallback.push(el);
  }

  function eligible(el) {
    return el && !el.closest(SKIP) && !ownedByIx2(el) && !wrapsIx2(el) &&
      !skipMarked(el) && !isObserved(el);
  }

  function collectAuto() {
    var out = [];
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (!eligible(im) || clippedOut(im)) continue;
      if (im.getBoundingClientRect().width < 80) continue;
      out.push(im);
    }
    var blocks = document.querySelectorAll('p,h1,h2,h3,h4,blockquote,li,div');
    for (var j = 0; j < blocks.length; j++) {
      var el = blocks[j];
      if (!eligible(el) || clippedOut(el)) continue;
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
      if (el.closest(SKIP) || ownedByIx2(el) || wrapsIx2(el) || skipMarked(el)) continue;
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

  /** When any member of a sync group enters, reveal the whole group together. */
  function expandSync(list) {
    var out = [];
    var seenGroups = [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var g = el.closest && el.closest('[data-reveal-sync]');
      if (!g) {
        out.push(el);
        continue;
      }
      var already = false;
      for (var s = 0; s < seenGroups.length; s++) if (seenGroups[s] === g) { already = true; break; }
      if (already) continue;
      seenGroups.push(g);
      var members = g.querySelectorAll('[data-reveal], .rv, .yy-rv');
      for (var m = 0; m < members.length; m++) {
        var node = members[m];
        if (skipMarked(node) || ownedByIx2(node) || wrapsIx2(node)) continue;
        out.push(node);
      }
    }
    return out;
  }

  function revealList(list, observer) {
    var expanded = expandSync(list);
    var seen = [];
    for (var i = 0; i < expanded.length; i++) {
      var key = syncKey(expanded[i]);
      var idx = -1;
      for (var s = 0; s < seen.length; s++) if (seen[s] === key) { idx = s; break; }
      if (idx < 0) {
        idx = seen.length;
        seen.push(key);
      }
      /* Sync groups share one start — no stagger between members. */
      if (expanded[i].closest && expanded[i].closest('[data-reveal-sync]')) {
        expanded[i].style.setProperty('--d', '0ms');
      } else {
        setStagger(expanded[i], idx);
      }
      expanded[i].classList.add('in');
      if (modeOf(expanded[i]) !== 'inout' && observer) observer.unobserve(expanded[i]);
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

  /* Landing only: mark in-view nodes .in before the hide gate so page fade is
     not stacked on a second opacity:0. Case pages skip this so hero media still
     runs the enter transition. */
  function primeOnScreen(items) {
    if (!isLanding) return;
    revealList(onScreenItems(items), null);
  }

  function tagAuto(list) {
    for (var i = 0; i < list.length; i++) {
      if (!list[i].classList.contains('yy-rv')) list[i].classList.add('yy-rv');
    }
  }

  function observeNew(list, autoTagged) {
    if (!io) return;
    for (var i = 0; i < list.length; i++) {
      if (isObserved(list[i])) continue;
      markObserved(list[i]);
      if (autoTagged && !list[i].classList.contains('yy-rv') &&
          !list[i].hasAttribute('data-reveal') && !list[i].classList.contains('rv')) {
        list[i].classList.add('yy-rv');
      }
      io.observe(list[i]);
    }
  }

  function sweepPending() {
    if (!io) return;
    var pend = document.querySelectorAll(
      '.yy-rv:not(.in), .rv:not(.in), [data-reveal]:not(.in):not([data-reveal="none"]):not([data-reveal^="intro-"])'
    );
    for (var s = 0; s < pend.length; s++) {
      if (skipMarked(pend[s]) || ownedByIx2(pend[s]) || wrapsIx2(pend[s])) continue;
      var r = pend[s].getBoundingClientRect();
      if (r.top < innerHeight + 48 && r.bottom > -48) {
        pend[s].style.setProperty('--d', '0ms');
        pend[s].classList.add('in');
        if (modeOf(pend[s]) !== 'inout') io.unobserve(pend[s]);
      }
    }
  }

  function rescanLazyImages() {
    if (!io || !html.classList.contains('yy-reveal')) return;
    var imgs = document.querySelectorAll('img:not(.yy-rv):not(.in)');
    var added = [];
    for (var i = 0; i < imgs.length; i++) {
      var im = imgs[i];
      if (!eligible(im) || clippedOut(im)) continue;
      if (im.getBoundingClientRect().width < 80) continue;
      im.classList.add('yy-rv');
      added.push(im);
    }
    if (!added.length) return;
    observeNew(added, false);
    /* Case: wait a paint so newly tagged imgs can transition. Landing: prime. */
    if (isLanding) primeOnScreen(onScreenItems(added));
    else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          revealList(onScreenItems(added), io);
        });
      });
    }
  }

  function start() {
    try {
      var explicit = collectExplicit();
      var items;
      if (isLanding) {
        items = explicit;
      } else {
        /* Case pages: explicit hero recipes + auto-collect for IX2 gaps. */
        var auto = collectAuto();
        items = [];
        var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
        var seenList = seen ? null : [];
        function pushUnique(el) {
          if (seen) {
            if (seen.has(el)) return;
            seen.add(el);
          } else {
            for (var u = 0; u < seenList.length; u++) if (seenList[u] === el) return;
            seenList.push(el);
          }
          items.push(el);
        }
        for (var e = 0; e < explicit.length; e++) pushUnique(explicit[e]);
        for (var a = 0; a < auto.length; a++) pushUnique(auto[a]);
      }
      if (!items.length) return;

      if (!isLanding) tagAuto(items.filter(function (el) {
        return !el.hasAttribute('data-reveal') && !el.classList.contains('rv');
      }));

      primeOnScreen(items);
      html.classList.add('yy-reveal');

      io = new IntersectionObserver(function (entries) {
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

      observeNew(items, false);

      var sweepTimer = null;
      function scheduleSweep() {
        clearTimeout(sweepTimer);
        sweepTimer = setTimeout(sweepPending, 120);
      }
      window.addEventListener('scroll', scheduleSweep, { passive: true });
      window.addEventListener('yy:scroll', scheduleSweep, { passive: true });
      setTimeout(sweepPending, isLanding ? 900 : 2500);

      /* Two frames: paint opacity:0, then .in so the CSS transition runs.
         Landing primed nodes already have .in — this is a no-op for them. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          revealList(onScreenItems(items), io);
        });
      });

      document.addEventListener('load', function (e) {
        if (e.target && e.target.tagName === 'IMG') rescanLazyImages();
      }, true);

      /* Failsafe: IX2 opacity:0 nodes that never cleared (common when scroll
         IX2 races Lenis) — fade them in if still invisible after settle. */
      if (!isLanding) {
        setTimeout(function () {
          var stuck = document.querySelectorAll('[data-w-id]');
          for (var i = 0; i < stuck.length; i++) {
            var el = stuck[i];
            if (el.classList.contains('preloader-lark') || el.closest('.preloader-lark')) continue;
            var op = parseFloat(getComputedStyle(el).opacity);
            if (!(op < 0.05)) continue;
            var box = el.getBoundingClientRect();
            if (box.bottom < -80 || box.top > innerHeight + 80) continue;
            el.style.transition = 'opacity 420ms var(--ease-smooth-out, ease), transform 420ms var(--ease-smooth-out, ease)';
            el.style.opacity = '1';
            el.style.transform = 'none';
          }
        }, 3200);
      }
    } catch (e) {
      html.classList.remove('yy-reveal');
      if (window.console) console.error('[yy-reveal] off, content shown:', e);
    }
  }

  try {
    if (!('IntersectionObserver' in window)) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var boot = function () {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          if (document.readyState === 'complete') start();
          else window.addEventListener('load', start, { once: true });
        }, { once: true });
      } else if (document.readyState === 'complete') start();
      else window.addEventListener('load', start, { once: true });
    };
    boot();
  } catch (e) {
    html.classList.remove('yy-reveal');
    if (window.console) console.error('[yy-reveal] off, content shown:', e);
  }
})();
