/* ============================================================================
   yy-cursor.js — landing "view" cursor. Extracted from landing.html so the
   page is no longer the owner of this effect. Behaviour is unchanged.

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

  function standDown() {
    html.classList.remove('yy-cursor-live');
    el.classList.remove('on');
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
    }, 500);

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
