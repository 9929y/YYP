/* ============================================================================
   yy-link-preview.js — native hover preview for Resume external links.

   Mirrors the Aceternity LinkPreview interaction (microlink screenshot + soft
   follow) without React, Next, Radix, or framer-motion. Previews portal to
   document.body so Shadow DOM clipping cannot hide them.
   ============================================================================ */
(function () {
  'use strict';

  if (window.YYLinkPreview) return;

  var WIDTH = 200;
  var HEIGHT = 125;
  var OPEN_DELAY = 50;
  var CLOSE_DELAY = 100;
  var Z = 9500;

  var active = null;
  var openTimer = 0;
  var closeTimer = 0;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function microlinkSrc(url, width, height) {
    return 'https://api.microlink.io/?' + [
      'url=' + encodeURIComponent(url),
      'screenshot=true',
      'meta=false',
      'embed=screenshot.url',
      'colorScheme=dark',
      'viewport.isMobile=true',
      'viewport.deviceScaleFactor=1',
      'viewport.width=' + (width * 3),
      'viewport.height=' + (height * 3)
    ].join('&');
  }

  function prefetch(src) {
    if (!src) return;
    var img = new Image();
    img.decoding = 'async';
    img.src = src;
  }

  function clearTimers() {
    if (openTimer) { window.clearTimeout(openTimer); openTimer = 0; }
    if (closeTimer) { window.clearTimeout(closeTimer); closeTimer = 0; }
  }

  function destroyCard() {
    if (!active) return;
    var card = active.card;
    active = null;
    if (!card) return;
    if (reduced || !card.animate) {
      if (card.parentNode) card.parentNode.removeChild(card);
      return;
    }
    var anim = card.animate(
      [
        { opacity: 1, transform: 'translateX(var(--yy-preview-x, 0px)) translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateX(var(--yy-preview-x, 0px)) translateY(12px) scale(.6)' }
      ],
      { duration: 160, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
    );
    anim.onfinish = function () {
      if (card.parentNode) card.parentNode.removeChild(card);
    };
  }

  function positionCard(card, anchor) {
    var rect = anchor.getBoundingClientRect();
    var top = rect.top - HEIGHT - 18;
    var left = rect.left + rect.width / 2 - WIDTH / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - WIDTH - 12));
    if (top < 12) top = rect.bottom + 14;
    card.style.top = Math.round(top) + 'px';
    card.style.left = Math.round(left) + 'px';
  }

  function show(anchor) {
    clearTimers();
    destroyCard();
    var url = anchor.getAttribute('href');
    if (!url || url.indexOf('mailto:') === 0) return;
    var staticSrc = anchor.getAttribute('data-yy-preview-src');
    var src = staticSrc || microlinkSrc(url, WIDTH, HEIGHT);

    var card = document.createElement('div');
    card.className = 'yy-link-preview';
    card.setAttribute('role', 'tooltip');
    card.style.cssText = [
      'position:fixed',
      'z-index:' + Z,
      'width:' + WIDTH + 'px',
      'height:' + HEIGHT + 'px',
      'pointer-events:none',
      'border-radius:14px',
      'overflow:hidden',
      'box-shadow:0 18px 40px -16px rgba(26,25,23,.45),0 0 0 1px rgba(255,255,255,.7)',
      'background:#fff',
      'padding:4px',
      'box-sizing:content-box',
      '--yy-preview-x:0px',
      'transform:translateX(var(--yy-preview-x)) translateY(12px) scale(.6)',
      'opacity:0'
    ].join(';');

    var link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.tabIndex = -1;
    link.style.cssText = 'display:block;font-size:0;border-radius:10px;overflow:hidden;';

    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.width = WIDTH;
    img.height = HEIGHT;
    img.decoding = 'async';
    img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover;border-radius:10px;';
    link.appendChild(img);
    card.appendChild(link);
    document.body.appendChild(card);
    positionCard(card, anchor);

    active = { card: card, anchor: anchor, x: 0 };

    if (reduced || !card.animate) {
      card.style.opacity = '1';
      card.style.transform = 'translateX(var(--yy-preview-x)) translateY(0) scale(1)';
    } else {
      card.animate(
        [
          { opacity: 0, transform: 'translateX(var(--yy-preview-x)) translateY(12px) scale(.6)' },
          { opacity: 1, transform: 'translateX(var(--yy-preview-x)) translateY(0) scale(1)' }
        ],
        { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
      );
    }
  }

  function scheduleOpen(anchor) {
    clearTimers();
    openTimer = window.setTimeout(function () { show(anchor); }, OPEN_DELAY);
  }

  function scheduleClose() {
    clearTimers();
    closeTimer = window.setTimeout(destroyCard, CLOSE_DELAY);
  }

  function onMove(event) {
    if (!active || active.anchor !== event.currentTarget || !active.card) return;
    var rect = event.currentTarget.getBoundingClientRect();
    var offset = ((event.clientX - rect.left) - rect.width / 2) / 2;
    active.x = offset;
    active.card.style.setProperty('--yy-preview-x', offset.toFixed(2) + 'px');
  }

  function enhanceAnchor(anchor) {
    if (!anchor || anchor.__yyPreviewBound) return;
    anchor.__yyPreviewBound = true;
    var url = anchor.getAttribute('href');
    var staticSrc = anchor.getAttribute('data-yy-preview-src');
    prefetch(staticSrc || (url ? microlinkSrc(url, WIDTH, HEIGHT) : ''));

    anchor.addEventListener('pointerenter', function () { scheduleOpen(anchor); });
    anchor.addEventListener('pointerleave', scheduleClose);
    anchor.addEventListener('focus', function () { scheduleOpen(anchor); });
    anchor.addEventListener('blur', scheduleClose);
    anchor.addEventListener('pointermove', onMove);
  }

  function enhance(root) {
    if (!root) return;
    var nodes = root.querySelectorAll
      ? root.querySelectorAll('[data-yy-preview]')
      : [];
    for (var i = 0; i < nodes.length; i++) enhanceAnchor(nodes[i]);
  }

  window.addEventListener('scroll', function () {
    if (active) destroyCard();
  }, true);

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && active) destroyCard();
  });

  window.YYLinkPreview = {
    enhance: enhance,
    microlinkSrc: microlinkSrc
  };
})();
