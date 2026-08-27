/* ============================================================================
   yy-cursor.js — round disc on every page; "view" (or data-cursor-label) on
   clickable project surfaces. Native arrow stays hidden while the pointer is
   on the page — idle must not stand the disc down.
   ============================================================================ */
(function () {
  'use strict';

  var html = document.documentElement;
  var MQ = matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)');
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var bound = [];

  function ensureEl() {
    var el = document.getElementById('yy-cursor');
    if (el) return el;
    if (!document.body) return null;
    el = document.createElement('div');
    el.id = 'yy-cursor';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span class="yy-cursor__t">view</span>';
    document.body.appendChild(el);
    return el;
  }

  function labelNode(el) {
    return el && el.querySelector('.yy-cursor__t');
  }

  function clearHover(el) {
    if (el) el.classList.remove('on', 'is-chip');
  }

  function hideNative(on) {
    html.classList.toggle('yy-cursor-ready', !!on);
    if (!on) html.classList.remove('yy-cursor-live');
  }

  function desktop() {
    return MQ.matches && !RM.matches;
  }

  function hoverTarget(node) {
    if (!node || !node.closest) return null;
    var labelled = node.closest('[data-cursor-label]');
    if (labelled) return labelled;
    var slot = node.closest('.slot, a.card, .card:not(.card--unable)');
    if (slot && slot.tagName === 'A') return slot;
    return null;
  }

  function bindRoot(root, el) {
    if (!root || bound.indexOf(root) >= 0) return;
    bound.push(root);
    var label = labelNode(el);
    root.addEventListener('pointerover', function (e) {
      if (!desktop()) return;
      var t = hoverTarget(e.target);
      if (!t) {
        clearHover(el);
        return;
      }
      var text = t.getAttribute('data-cursor-label') || 'view';
      var chip = t.getAttribute('data-cursor-chip') === 'true';
      if (label) label.textContent = text;
      el.classList.toggle('is-chip', chip);
      el.classList.add('on');
    });
    root.addEventListener('pointerout', function (e) {
      var next = e.relatedTarget;
      if (next && root.contains && root.contains(next) && hoverTarget(next)) return;
      clearHover(el);
    });
  }

  window.__yyCursorBind = function (root) {
    var el = ensureEl();
    if (el) bindRoot(root, el);
  };

  function start() {
    var el = ensureEl();
    if (!el) return;
    var label = labelNode(el);

    function onMove(e) {
      if (!desktop()) {
        hideNative(false);
        clearHover(el);
        html.classList.remove('yy-cursor-live');
        return;
      }
      hideNative(true);
      el.style.setProperty('--cx', e.clientX + 'px');
      el.style.setProperty('--cy', e.clientY + 'px');
      html.classList.add('yy-cursor-live');
    }

    window.addEventListener('pointermove', onMove, { passive: true });

    var onChange = function () {
      if (!desktop()) {
        hideNative(false);
        clearHover(el);
        html.classList.remove('yy-cursor-live');
      } else {
        hideNative(true);
      }
    };
    if (MQ.addEventListener) {
      MQ.addEventListener('change', onChange);
      RM.addEventListener('change', onChange);
    } else if (MQ.addListener) {
      MQ.addListener(onChange);
      RM.addListener(onChange);
    }

    if (desktop()) hideNative(true);

    bindRoot(document, el);
    document.querySelectorAll('yy-work-content').forEach(function (host) {
      if (host.shadowRoot) bindRoot(host.shadowRoot, el);
    });

    window.addEventListener('blur', function () { clearHover(el); });
    document.addEventListener('mouseleave', function () { clearHover(el); });
    void label;
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  } catch (e) {
    hideNative(false);
    var el = document.getElementById('yy-cursor');
    if (el) el.style.display = 'none';
    if (window.console) console.error('[yy-cursor] off, native cursor active:', e);
  }
})();
