/* ============================================================================
   yy-cursor.js — landing "view" cursor + soft diffusion wake.

   Position is written as CSS vars; the lead disc eases in CSS. The wake is a
   sibling (#yy-cursor-wake) of lagged ghost discs (fluid trail inspired by
   yy-flow’s pointer seed, without ASCII / green chroma).
   ============================================================================ */
(function () {
  'use strict';
  var html = document.documentElement;
  var el = document.getElementById('yy-cursor');
  var wake = document.getElementById('yy-cursor-wake');
  var label = el && el.querySelector('.yy-cursor__t');
  if (!el) return;

  var MQ = matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)');
  var RM = matchMedia('(prefers-reduced-motion: reduce)');

  var WAKE_N = 8;
  var IDLE_MS = 420;
  var wakeDots = [];
  var samples = [];
  var tx = -1e4;
  var ty = -1e4;
  var raf = 0;
  var idleTimer = 0;
  var lastMove = 0;
  var moves = 0;

  function ensureWake() {
    if (!wake) {
      wake = document.createElement('div');
      wake.id = 'yy-cursor-wake';
      wake.setAttribute('aria-hidden', 'true');
      el.parentNode.insertBefore(wake, el);
    }
    if (wakeDots.length) return;
    wake.textContent = '';
    for (var i = 0; i < WAKE_N; i++) {
      var dot = document.createElement('i');
      var t = (i + 1) / WAKE_N;
      /* Older samples = larger, softer, fainter — keep readable on light canvas. */
      dot.style.setProperty('--wake-opacity', String((1 - t) * 0.55 + 0.12));
      dot.style.setProperty('--wake-scale', String(0.7 + t * 1.55));
      dot.style.setProperty('--wake-blur', 12 + t * 22 + 'px');
      dot.style.setProperty('--wake-size', 28 + t * 36 + 'px');
      wake.appendChild(dot);
      wakeDots.push(dot);
      samples.push({ x: tx, y: ty });
    }
  }

  function standDown() {
    html.classList.remove('yy-cursor-live');
    html.classList.remove('yy-cursor-bloom');
    el.classList.remove('on');
    if (wake) wake.classList.add('is-fading');
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function markMoving() {
    lastMove = performance.now();
    if (wake) wake.classList.remove('is-fading');
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (wake) wake.classList.add('is-fading');
    }, IDLE_MS);
  }

  function tick() {
    raf = 0;
    if (!MQ.matches || RM.matches || !html.classList.contains('yy-cursor-live')) return;

    var prevX = tx;
    var prevY = ty;
    for (var i = 0; i < samples.length; i++) {
      var s = samples[i];
      /* Chain: each node eases toward the previous (or the pointer). */
      var ax = i === 0 ? prevX : samples[i - 1].x;
      var ay = i === 0 ? prevY : samples[i - 1].y;
      var ease = 0.22 - i * 0.018;
      if (ease < 0.08) ease = 0.08;
      s.x += (ax - s.x) * ease;
      s.y += (ay - s.y) * ease;
      wakeDots[i].style.setProperty('--wx', s.x.toFixed(2) + 'px');
      wakeDots[i].style.setProperty('--wy', s.y.toFixed(2) + 'px');
    }

    /* Keep looping while live so the trail can settle after the last move. */
    var idle = performance.now() - lastMove > IDLE_MS + 80;
    if (!idle || html.classList.contains('yy-cursor-live')) {
      raf = requestAnimationFrame(tick);
    }
  }

  function kickRaf() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  try {
    ensureWake();

    window.addEventListener('mousemove', function (e) {
      if (!MQ.matches || RM.matches) {
        standDown();
        return;
      }
      tx = e.clientX;
      ty = e.clientY;
      el.style.setProperty('--cx', tx + 'px');
      el.style.setProperty('--cy', ty + 'px');
      moves++;
      if (!html.classList.contains('yy-cursor-live')) {
        html.classList.add('yy-cursor-live');
        /* Seed the trail at the pointer so the first frame isn't a streak from off-screen. */
        for (var i = 0; i < samples.length; i++) {
          samples[i].x = tx;
          samples[i].y = ty;
        }
      }
      markMoving();
      kickRaf();
    }, { passive: true });

    var onChange = function () {
      if (!MQ.matches || RM.matches) standDown();
    };
    if (MQ.addEventListener) {
      MQ.addEventListener('change', onChange);
      RM.addEventListener('change', onChange);
    } else if (MQ.addListener) {
      MQ.addListener(onChange);
      RM.addListener(onChange);
    }

    setInterval(function () {
      if (moves === 0 && html.classList.contains('yy-cursor-live')) standDown();
    }, 500);

    document.querySelectorAll('a.slot').forEach(function (t) {
      t.addEventListener('mouseenter', function () {
        if (!MQ.matches || RM.matches) return;
        if (label) label.textContent = 'view';
        el.classList.add('on');
        html.classList.add('yy-cursor-bloom');
      });
      t.addEventListener('mouseleave', function () {
        el.classList.remove('on');
        html.classList.remove('yy-cursor-bloom');
      });
    });

    window.addEventListener('blur', function () {
      el.classList.remove('on');
      html.classList.remove('yy-cursor-bloom');
    });
    document.addEventListener('mouseleave', function () {
      el.classList.remove('on');
      html.classList.remove('yy-cursor-bloom');
      if (wake) wake.classList.add('is-fading');
    });
  } catch (e) {
    standDown();
    el.style.display = 'none';
    if (wake) wake.style.display = 'none';
    if (window.console) console.error('[landing] cursor off, native cursor active:', e);
  }
})();
