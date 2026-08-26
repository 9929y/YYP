/* ============================================================================
   yy-cursor.js — landing cursor for project slots.

   Published links bloom a round disc with "view".
   In-progress slots (Atlas Nova) bloom a glass chip with "on progress".
   ASCII diffusion wake lives in yy-flow.js (#yy-flow), not here.
   ============================================================================ */
(function () {
  'use strict';
  var html = document.documentElement;
  var el = document.getElementById('yy-cursor');
  var label = el && el.querySelector('.yy-cursor__t');
  if (!el) return;

  var MQ = matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)');
  var RM = matchMedia('(prefers-reduced-motion: reduce)');

  function clearHover() {
    el.classList.remove('on', 'is-chip');
  }

  function standDown() {
    html.classList.remove('yy-cursor-live');
    clearHover();
  }

  function bindSlot(t) {
    t.addEventListener('mouseenter', function () {
      if (!MQ.matches || RM.matches) return;
      var text = t.getAttribute('data-cursor-label') || 'view';
      var chip = t.getAttribute('data-cursor-chip') === 'true';
      if (label) label.textContent = text;
      el.classList.toggle('is-chip', chip);
      el.classList.add('on');
    });
    t.addEventListener('mouseleave', clearHover);
  }

  try {
    var moves = 0;

    window.addEventListener('mousemove', function (e) {
      if (!MQ.matches || RM.matches) { standDown(); return; }
      el.style.setProperty('--cx', e.clientX + 'px');
      el.style.setProperty('--cy', e.clientY + 'px');
      moves++;
      if (!html.classList.contains('yy-cursor-live')) html.classList.add('yy-cursor-live');
    }, { passive: true });

    var onChange = function () { if (!MQ.matches || RM.matches) standDown(); };
    if (MQ.addEventListener) { MQ.addEventListener('change', onChange); RM.addEventListener('change', onChange); }
    else if (MQ.addListener) { MQ.addListener(onChange); RM.addListener(onChange); }

    setInterval(function () {
      if (moves === 0 && html.classList.contains('yy-cursor-live')) standDown();
      moves = 0;
    }, 500);

    document.querySelectorAll('.slot[data-cursor-label]').forEach(bindSlot);

    window.addEventListener('blur', clearHover);
    document.addEventListener('mouseleave', clearHover);
  } catch (e) {
    standDown();
    el.style.display = 'none';
    if (window.console) console.error('[landing] cursor off, native cursor active:', e);
  }
})();
