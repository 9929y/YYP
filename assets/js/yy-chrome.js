/* ============================================================================
   yy-chrome.js — the shared chrome layer: one nav + one footer, all 12 pages.

   WHY THIS FILE EXISTS
   Every page currently carries its own copy of the nav and footer markup, and
   those copies have drifted. Measured example: index.html and projects.html
   point the resume icon at hello.cv, while the seven case pages point that
   same "Resume"-labelled icon at Instagram. One component, one link set.

   HOW IT LOADS  (mirrors the w-mod-js IIFE already in every <head>)
   Synchronous script in <head>. It stamps `html.yy-chrome`, injects two hide
   rules inline (no network round-trip, so the old nav never flashes), then
   loads yy-chrome.css and mounts once the body is parsed.

   FAILING SAFE IS THE WHOLE DESIGN
   404, parse error, CSP block, mount throw → `html.yy-chrome` is absent or
   removed, the two hide rules match nothing, and the legacy nav and footer
   render exactly as they do today. Rollback is deleting one <script> line.

   ⚠️  NO BLEND MODES HERE. The host needs position + z-index to sit above
   content, which makes it a stacking context, which makes any
   mix-blend-mode inside it a no-op against the page. Two homepage studies
   shipped invisible navs learning this. The capsule carries its own colour.
   ============================================================================ */
(function () {
  'use strict';

  var HTML = document.documentElement;
  var SRC = (document.currentScript && document.currentScript.src) || '';
  /* Derive asset paths from our own URL rather than assuming repo root, so a
     page moved into a subdirectory keeps working. */
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-chrome\.js.*$/, '') : '';

  function currentPage() {
    var last = location.pathname.split('/').pop();
    return (!last || last === 'index.html') ? 'index.html' : last;
  }

  function lumaOf(color) {
    var s = String(color || '');
    if (!s || s === 'transparent') return null;
    var m = s.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
  }

  /* Nav + popups are always light glass (Figma). Opus only raises capsule
     blur to 100px — ink stays the default dark text. */
  var DARK_NAV_PAGES = {
    'ai-driven-product-design.html': true
  };

  function pageIsDark() {
    return !!DARK_NAV_PAGES[currentPage()];
  }

  function applyChromeTheme(navHost) {
    var dark = pageIsDark();
    HTML.classList.toggle('yy-chrome-on-dark', dark);
    if (navHost) navHost.classList.toggle('on-dark', dark);
  }

  function loadCursor() {
    if (document.querySelector('script[src*="yy-cursor.js"]')) return;
    var s = document.createElement('script');
    s.src = ROOT + 'assets/js/yy-cursor.js';
    s.async = false;
    (document.head || document.body || HTML).appendChild(s);
  }

  /* ASCII cursor wake on case studies. Landing keeps its own #yy-flow + palette
     in index.astro. Colors chosen for page-ground readability (deep accents on
     light pages; luminous pastels on Opus/Medical dark grounds). */
  var FLOW_PALETTES = {
    'larkdesign.html':               { base: '#2a73e2', alt: '#9aa3ad', idle: '#e6e8eb' },
    'mckinseyecommerce.html':        { base: '#e03400', alt: '#a89a94', idle: '#ebe7e4' },
    'ai-driven-product-design.html': { base: '#d4c8ff', alt: '#e8e6f2', idle: '#c5c0d4' },
    'mifinance.html':                { base: '#e8710a', alt: '#9a958e', idle: '#ebe8e4' },
    'cummins-digitalization.html':   { base: '#980000', alt: '#9a9290', idle: '#ebe7e6' },
    'alzheimerdisease.html':         { base: '#8eb0f0', alt: '#d8dce4', idle: '#b0b4bc' },
    'tiktok-research.html':          { base: '#3d5a6c', alt: '#9aa3ad', idle: '#e6e8eb' }
  };

  function loadFlow() {
    var pal = FLOW_PALETTES[currentPage()];
    if (!pal) return;
    if (document.getElementById('yy-flow')) return;
    HTML.classList.add('yy-flow-case');
    var cv = document.createElement('canvas');
    cv.id = 'yy-flow';
    cv.setAttribute('aria-hidden', 'true');
    cv.setAttribute('data-yy-base', pal.base);
    cv.setAttribute('data-yy-alt', pal.alt);
    cv.setAttribute('data-yy-idle', pal.idle);
    document.body.insertBefore(cv, document.body.firstChild);
    if (document.querySelector('script[src*="yy-flow.js"]')) return;
    var s = document.createElement('script');
    s.src = ROOT + 'assets/js/yy-flow.js';
    s.async = false;
    (document.head || document.body || HTML).appendChild(s);
  }

  /* Dark case pages keep a black ground through the credit row.
     Whitelist by filename — Opus + Alzheimer only. McKinsey is a light page
     (body.blk was black-on-black with .paragraph = black). */
  var DARK_FOOTER = {
    'ai-driven-product-design.html': true,
    'alzheimerdisease.html': true
  };

  /* Light case + work-hub pages get the landing type/ink overlay.
     Opus, Alzheimer, and McKinsey keep Webflow black/white; do not list them. */
  var CASE_TYPE_PAGES = {
    'projects.html': 1,
    'larkdesign.html': 1,
    'mifinance.html': 1,
    'cummins-digitalization.html': 1,
    'tiktok-research.html': 1,
    'case-study-template.html': 1
  };

  /* The shared navigation now owns three content surfaces. Their final content
     will arrive independently; keeping the panel keys here gives every Astro
     and legacy page the same shell and state machine today. */
  var NAV = [
    { panel: 'work',   label: 'Work' },
    { panel: 'about',  label: 'About' },
    { panel: 'resume', label: 'Resume' }
  ];

  /* Resume-only capsule: section jumps replace Work/About/Resume while the
     Resume panel is the active surface. Back restores the main capsule without
     closing the popup. */
  var RESUME_SECTIONS = [
    { id: 'work',          label: 'Work' },
    { id: 'education',     label: 'Education' },
    { id: 'awards',        label: 'Awards' },
    { id: 'publications',  label: 'Publication' },
    { id: 'skills',        label: 'Skills' }
  ];

  /* --------------------------------------------------------------------------
     Step 1 — hide the legacy chrome from CSS parsed before <body> exists.

     `.navbar` is `position: fixed; height: 80px` (stylesheet :2593), i.e. it is
     OUT OF FLOW — hiding it moves nothing, so this costs zero layout shift.
     `display:none` also removes it from the a11y tree, so there is no second
     `banner` landmark, while leaving the element in the DOM for Webflow's nav
     module and for the two `#w-node-…` grid-placement rules that target it.
     -------------------------------------------------------------------------- */
  HTML.className += ' yy-chrome';
  var typeBoot = '';
  if (CASE_TYPE_PAGES[currentPage()] || /\byy-case\b/.test(HTML.className)) {
    HTML.className += ' yy-case-type';
    /* Work hub only: inline white ground before CSS loads. Case studies keep
       Webflow-authored page colors (Lark blue wash, etc.). */
    if (currentPage() === 'projects.html') {
      typeBoot =
        'html.yy-case-type,html.yy-case-type body' +
        '{background-color:#fff!important;color:#242220!important}';
    }
  }

  var boot = document.createElement('style');
  boot.textContent =
    'html.yy-chrome{scrollbar-gutter:stable}' +
    'html.yy-chrome .navbar.w-nav{display:none}' +
    'html.yy-chrome .footer-credit-wrapper{display:none}' +
    'html.yy-panel-open,html.yy-panel-open body{overflow:hidden!important}' +
    /* Credit-only Webflow shells (projects, about, archived home). Case pages
       keep `.four-column` prev/next as in-page content, not as a second footer. */
    'html.yy-chrome .footer-section:not(:has(.four-column)){display:none}' +
    'html.yy-chrome .grid-wrapper:has(> .footer-credit-wrapper):not(:has(.four-column)){display:none}' +
    'html.yy-chrome .footer-section{border-top:none;padding-top:48px;padding-bottom:0}' +
    /* Kill Webflow page preloaders before IX2 can flash display:flex. */
    '.preloader-lark{display:none!important}' +
    typeBoot;
  (document.head || HTML).appendChild(boot);

  if (!document.querySelector('link[href*="yy-tokens.css"]')) {
    var tokens = document.createElement('link');
    tokens.rel = 'stylesheet';
    tokens.href = ROOT + 'assets/css/yy-tokens.css';
    (document.head || HTML).appendChild(tokens);
  }

  if (!document.querySelector('link[href*="yy-motion.css"]')) {
    var motion = document.createElement('link');
    motion.rel = 'stylesheet';
    motion.href = ROOT + 'assets/css/yy-motion.css';
    (document.head || HTML).appendChild(motion);
  }

  if (!document.querySelector('link[href*="yy-cursor.css"]')) {
    var cursorSheet = document.createElement('link');
    cursorSheet.rel = 'stylesheet';
    cursorSheet.href = ROOT + 'assets/css/yy-cursor.css';
    (document.head || HTML).appendChild(cursorSheet);
  }

  var sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = ROOT + 'assets/css/yy-chrome.css';
  (document.head || HTML).appendChild(sheet);

  if (/\byy-case-type\b/.test(HTML.className) && !document.querySelector('link[href*="yy-case-type.css"]')) {
    var typeSheet = document.createElement('link');
    typeSheet.rel = 'stylesheet';
    typeSheet.href = ROOT + 'assets/css/yy-case-type.css';
    (document.head || HTML).appendChild(typeSheet);
  }

  /* --------------------------------------------------------------------------
     Shadow-root CSS.

     Three traps, each verified the hard way:

     1. `all: initial` does NOT reset custom properties. Webflow declares 23 of
        them on :root (`--black: #111729`, …) and they inherit straight through
        a shadow boundary. Every variable of ours is `--yy-` prefixed so a
        collision is impossible.
     2. `all: initial` sets `display: inline; position: static`. Both must be
        restated or the fixed capsule silently becomes inline text.
     3. `all: initial` resets font-family to the browser serif. @font-face is
        document-scoped and resolves inside a shadow root, and every page
        already loads Plus Jakarta Sans via WebFont.load — but the family must
        be named explicitly here or the capsule renders in Times.
     -------------------------------------------------------------------------- */
  var CSS = [
    ':host{',
    '  all: initial;',
    '  --yy-ink: #242220;',
    '  --yy-ink-dim: #5b5a56;',
    /* Figma YyNav: rgba(255,255,255,0.72) + blur 8px */
    '  --yy-fill: rgba(255,255,255,.72);',
    /* Glass popup (Figma inspect): rgba(255,255,255,0.7) + blur 200 */
    '  --yy-panel-fill: rgba(255,255,255,.70);',
    '  --yy-hair: rgba(255,255,255,.65);',
    '  --yy-panel-full-fill: rgba(255,255,255,.78);',
    /* Figma Canvas Cover behind open popup */
    '  --yy-page-cover-fill: rgba(255,250,250,.20);',
    '  --yy-page-cover-blur: 100px;',
    '  --yy-panel-blur: 200px;',
    /* Glass shadows: inset 0 15 20 / drop 0 5 40 2 */
    '  --yy-panel-inset: inset 0 15px 20px 0 rgba(255,255,255,.13);',
    '  --yy-panel-drop: 0 5px 40px 2px rgba(0,0,0,.15);',
    '  --yy-ease: cubic-bezier(1,0,.4,1);',
    '  --yy-orbit-ease: cubic-bezier(.22,1.08,.36,1);',
    '  --yy-panel-ease: cubic-bezier(.22,1,.36,1);',
    '  --yy-panel-motion: 520ms;',
    '  --yy-panel-radius: 30px;',
    '  --yy-cap-offset: 16px;',
    '  --yy-cap-size: 56px;',
    '  --yy-panel-gap: 12px;',
    '  --yy-nav-zone: calc(var(--yy-cap-offset) + var(--yy-cap-size));',
    '  --yy-panel-width: min(83.4vw, 1600px);',
    '  font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;',
    '  font-size: 16px;',
    '  line-height: 1.55;',
    '  color: var(--yy-ink);',
    '  -webkit-font-smoothing: antialiased;',
    '}',
    /* Opus: stronger capsule blur only — keep default ink / hover. */
    ':host(yy-nav.on-dark) .cap{',
    '  -webkit-backdrop-filter: blur(100px) saturate(1.6);',
    '  backdrop-filter: blur(100px) saturate(1.6);',
    '}',

    /* ---- nav host: fixed, bottom-centred, below the preloader (10000) ----
       No transform here — a transformed host becomes a backdrop root and
       kills backdrop-filter on .cap (glass reads as a solid milky pill). */
    ':host(yy-nav){',
    '  position: fixed;',
    '  z-index: 9000;',
    '  top: 0;',
    '  left: 0;',
    '  right: 0;',
    '  bottom: 0;',
    '  display: flex;',
    '  justify-content: center;',
    '  pointer-events: none;',
    '}',
    ':host(yy-nav) .panel,',
    ':host(yy-nav) .expand,',
    ':host(yy-nav) .cap,',
    ':host(yy-nav) .skip{ pointer-events: auto; }',
    /* Hide the system cursor inside the panel when the landing custom cursor is live,
       so it does not fight the disc that now stacks above yy-nav. */
    /* Hide the system cursor inside the panel when the landing custom cursor is live,
       so it does not fight the disc that now stacks above yy-nav. */
    ':host-context(html.yy-cursor-ready),',
    ':host-context(html.yy-cursor-ready) .cap,',
    ':host-context(html.yy-cursor-ready) .cap *,',
    ':host-context(html.yy-cursor-ready) .panel,',
    ':host-context(html.yy-cursor-ready) .panel *,',
    ':host-context(html.yy-cursor-ready) .expand{ cursor: none !important; }',
    /* Light band by default (matches landing chrome). Dark cases override via
       .is-dark so Opus Clip / McKinsey stay black through the credit row. */
    ':host(yy-footer){',
    '  display: block;',
    '  background: #fff;',
    '  color: var(--yy-ink);',
    '}',
    ':host(yy-footer.is-dark){',
    '  background: #000;',
    '  color: #fff;',
    '}',

    /* ---- skip link: first tab stop, parked off-screen until focused ---- */
    /* ⚠️ 不能用 `position: fixed` + 负 top 把它藏到视口外。
       宿主带 `transform: translateX(-50%)`，而 **transform 会为 fixed 后代
       建立包含块** —— 于是 `top: -100px` 是相对宿主算的，宿主在视口底部，
       结果这个链接直接显示在页面正中。实测截图抓到，属性级断言没抓到。
       改用不依赖定位上下文的裁剪法；聚焦时浮到胶囊正上方。 */
    '.skip{',
    '  position: absolute; left: 0; bottom: calc(100% + 8px);',
    '  width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;',
    '  overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%);',
    '  white-space: nowrap;',
    '  background: #242220; color: #fff; border-radius: 999px;',
    '  font-size: 13px; font-weight: 600; text-decoration: none;',
    '}',
    '.skip:focus{',
    '  width: auto; height: auto; margin: 0; padding: 10px 16px;',
    '  overflow: visible; clip: auto; clip-path: none;',
    '  outline: 2px solid #242220; outline-offset: 2px;',
    '}',

    /* ---- the glass capsule ----------------------------------------------
       Reference look: frosted translucent fill so page type reads through,
       inset hairlines, drop shadow, saturate so colour behind stays alive.
       -------------------------------------------------------------------- */
    '.cap{',
    '  position: absolute; z-index: 4; left: 50%; bottom: var(--yy-cap-offset);',
    '  transform: translateX(-50%);',
    '  display: flex; align-items: center; gap: 2px;',
    '  height: var(--yy-cap-size);',
    '  padding: 6px;',
    '  box-sizing: border-box;',
    '  border-radius: 999px;',
    '  background: var(--yy-fill);',
    '  -webkit-backdrop-filter: blur(8px) saturate(1.6);',
    '  backdrop-filter: blur(8px) saturate(1.6);',
    '  box-shadow:',
    '    inset 0 1px 0 rgba(255,255,255,.92),',
    '    inset 0 0 0 1px var(--yy-hair),',
    '    inset 0 -1px 0 rgba(36,34,32,.05),',
    '    0 1px 2px rgba(62,65,116,.07),',
    '    0 2px 8px -2px rgba(62,65,116,.09),',
    '    0 12px 36px -8px rgba(62,65,116,.20);',
    '  overflow: hidden;',
    '  transition:',
    '    width 520ms var(--yy-orbit-ease),',
    '    max-width 520ms var(--yy-orbit-ease),',
    '    height 520ms var(--yy-orbit-ease),',
    '    padding 520ms var(--yy-orbit-ease),',
    '    background-color 680ms var(--ease-smooth-out,ease-out),',
    '    box-shadow 680ms var(--ease-smooth-out,ease-out);',
    '}',
    '.cap::before, .cap::after{',
    '  content: ""; position: absolute; inset: 0; border-radius: inherit;',
    '  opacity: 0; pointer-events: none;',
    '}',
    '.cap::before{',
    '  z-index: 0; background-image: var(--yy-orb); background-position: center;',
    '  background-repeat: no-repeat; background-size: cover;',
    '}',
    '.cap::after{',
    '  z-index: 1; background: rgba(255,255,255,.18);',
    '  -webkit-backdrop-filter: blur(7px) saturate(1.25);',
    '  backdrop-filter: blur(7px) saturate(1.25);',
    '}',
    '.cap > *{ position: relative; z-index: 2; }',
    /* Where backdrop-filter is unsupported OR silently dead (an ancestor
       forming a backdrop root), the fill alone must carry legibility. */
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){',
    '  :host{ --yy-fill: rgba(255,255,255,.94); --yy-panel-fill: rgba(255,255,255,.96); --yy-hair: rgba(36,34,32,.10); }',
    '}',

    '.cap a, .cap button{',
    '  display: block; border: 0; margin: 0; font: inherit; cursor: pointer;',
    '  padding: 8px 14px;',
    '  border-radius: 999px;',
    '  font-size: 14px; font-weight: 500;',
    '  letter-spacing: -.01em;',
    '  color: var(--yy-ink-dim);',
    '  background: transparent;',
    '  text-decoration: none;',
    '  white-space: nowrap;',
    '  transition:',
    '    color .2s var(--yy-ease),',
    '    background-color .2s var(--yy-ease),',
    '    font-weight .2s var(--yy-ease),',
    '    opacity 280ms var(--yy-panel-ease,ease-out),',
    '    transform 420ms var(--yy-orbit-ease);',
    '}',
    '.cap a.is-enter, .cap button.is-enter{',
    '  opacity: 0; transform: translateY(4px);',
    '}',
    '.cap a.is-shown, .cap button.is-shown{',
    '  opacity: 1; transform: none;',
    '}',
    '.cap a:hover, .cap button:hover{ color: var(--yy-ink); background: rgba(36,34,32,.055); }',
    '.cap a:focus-visible, .cap button:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 1px; }',
    '.cap a[aria-current="page"]{ color: var(--yy-ink); background: rgba(36,34,32,.075); font-weight: 600; }',
    '.cap button[aria-expanded="true"]{ color: var(--yy-ink); background: rgba(36,34,32,.075); font-weight: 600; }',
    '.cap button[aria-current="location"]{ color: var(--yy-ink); font-weight: 600; background: rgba(36,34,32,.075); }',
    '.cap-back{ display: inline-flex !important; align-items: center; justify-content: center; padding: 8px 12px !important; }',
    '.cap-back svg{ display: block; width: 16px; height: 16px; }',

    /* Orbit brand — animated disc that links home (replaces Caveat wordmark). */
    '.brand{',
    '  display: inline-flex !important; align-items: center; justify-content: center;',
    '  width: 48px !important; height: 48px !important;',
    '  padding: 6px !important; margin: 0 !important;',
    '  border-radius: 999px !important;',
    '  background: transparent !important;',
    '  color: transparent !important;',
    '  font-size: 0 !important; line-height: 0 !important;',
    '  overflow: hidden;',
    '}',
    '.brand:hover, .brand:focus-visible{ background: rgba(36,34,32,.055) !important; }',
    '.brand-orb{',
    '  display: block; width: 36px; height: 36px;',
    '  border-radius: 50%; object-fit: contain;',
    '  pointer-events: none;',
    '}',
    '.rule{ width: 1px; height: 18px; margin: 0 6px; background: rgba(36,34,32,.13); }',
    '.ext::after{ content: " \\2197"; font-size: .85em; opacity: .6; }',

    /* ---- navigation panel ----------------------------------------------
       Figma: Canvas Cover (page frost in light DOM via yy-chrome.css) +
       glass panel fill. Shadow DOM backdrop-filter cannot sample the page,
       so blur lives on html.yy-panel-open body::before; panel keeps fill. */
    '.panel-backdrop{',
    '  position: absolute; z-index: 0; inset: 0;',
    '  opacity: 0; visibility: hidden; pointer-events: none;',
    '  background: transparent;',
    '}',
    ':host(.is-open:not(.is-fullpage)) .panel-backdrop{',
    '  opacity: 1; visibility: visible; pointer-events: auto;',
    '}',
    /* Hidden until host is both ready (wired) and open — no flash of unstyled views. */
    '.panel-stack,.panel,.panel-scroll{',
    '  opacity: 0; visibility: hidden; pointer-events: none;',
    '}',
    '.panel-stack{',
    '  position: absolute; z-index: 1; left: 0; right: 0;',
    '  top: var(--yy-panel-gap);',
    '  bottom: calc(var(--yy-nav-zone) + var(--yy-panel-gap));',
    '  width: var(--yy-panel-width);',
    '  height: auto;',
    '  margin-inline: auto;',
    '  display: flex; flex-direction: column; align-items: stretch;',
    '  box-sizing: border-box;',
    '  /* Popups always light — never inherit the dark nav capsule tokens. */',
    '  --yy-ink: #1a1917;',
    '  --yy-ink-dim: #5b5a56;',
    '  --yy-fill: rgba(255,255,255,.72);',
    '  --yy-panel-fill: rgba(255,255,255,.70);',
    '  --yy-panel-full-fill: rgba(255,255,255,.78);',
    '  color: var(--yy-ink);',
    '}',
    ':host(.is-ready.is-open) .panel-stack,',
    ':host(.is-ready.is-open) .panel,',
    ':host(.is-ready.is-open) .panel-scroll{',
    '  opacity: 1; visibility: visible; pointer-events: auto;',
    '}',
    '.panel-stack.is-expanded{',
    '  inset: 0; top: 0; bottom: 0; width: 100vw; height: 100vh; height: 100dvh;',
    '  max-width: none;',
    '}',
    /* Glass fill + shadows; page blur is light-DOM body::before (see yy-chrome.css). */
    '.panel{',
    '  position: relative; z-index: 1; left: auto; right: auto; bottom: auto; top: auto;',
    '  flex: 1 1 auto; width: 100%; height: 100%; min-height: 0;',
    '  margin-inline: 0; overflow: hidden;',
    '  box-sizing: border-box; border: 0; border-radius: var(--yy-panel-radius);',
    '  color: var(--yy-ink); background: var(--yy-panel-fill);',
    '  box-shadow: var(--yy-panel-inset), var(--yy-panel-drop);',
    '  transform-origin: center bottom;',
    '  transition: background-color 680ms var(--ease-smooth-out,ease-out), box-shadow 680ms var(--ease-smooth-out,ease-out);',
    '}',
    '.panel.is-expanded{',
    '  flex: 1 1 auto;',
    '  width: 100%; height: 100%; max-width: none;',
    '  border-radius: 0; background: var(--yy-panel-full-fill);',
    '  box-shadow: var(--yy-panel-inset);',
    '}',
    '.panel-scroll{',
    '  height: 100%; overflow: auto; overflow-y: auto;',
    '  overscroll-behavior: contain;',
    '  touch-action: pan-y;',
    '  -webkit-overflow-scrolling: touch;',
    '  scrollbar-gutter: stable; box-sizing: border-box;',
    '}',
    '[data-panel-view]{ display: none; }',
    '[data-panel-view].is-active{ display: block; }',
    '.panel-view{ min-height: 100%; box-sizing: border-box; padding: 72px clamp(24px,4vw,72px); }',
    '.panel-view--resume,',
    '.panel-view--about,',
    '.panel-view--work{ padding: 0; height: 100%; }',
    /* Work uses the same glass fill as About / Resume */
    '.panel.is-work{',
    '  background: var(--yy-panel-fill);',
    '  box-shadow: var(--yy-panel-inset), var(--yy-panel-drop);',
    '}',
    '.panel.is-work.is-expanded{',
    '  background: var(--yy-panel-full-fill);',
    '}',
    'yy-resume-content,',
    'yy-about-content,',
    'yy-work-content{ display: block; height: 100%; min-height: 100%; }',
    /* Avoid FOUC / “source-like” flash before panel CE scripts upgrade. */
    'yy-resume-content:not(:defined),',
    'yy-about-content:not(:defined),',
    'yy-work-content:not(:defined){ visibility: hidden; }',
    '.panel-kicker{',
    '  margin: 0 0 10px; color: var(--yy-ink-dim);',
    '  font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;',
    '}',
    '.panel-title{ margin: 0; font-size: clamp(32px,5vw,64px); line-height: 1; letter-spacing: -.04em; }',
    '.panel-note{ margin: 18px 0 0; max-width: 38rem; color: var(--yy-ink-dim); font-size: 14px; }',
    /* Icon-only expand inside the card — no circle, no fill, no outer chrome. */
    '.expand{',
    '  position: absolute; z-index: 4; top: 18px; right: 18px;',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  width: 28px; height: 28px; min-height: 0; padding: 0; border: 0; border-radius: 0;',
    '  color: var(--yy-ink); background: transparent !important;',
    '  -webkit-appearance: none; appearance: none;',
    '  -webkit-tap-highlight-color: transparent;',
    '  box-shadow: none;',
    '  cursor: pointer;',
    '  font: inherit;',
    '  transition: color var(--duration-fast,.25s) var(--ease-smooth-out,ease-out), transform var(--duration-fast,.25s) var(--ease-smooth-out,ease-out);',
    '}',
    '.panel.is-expanded .expand{ display: none !important; }',
    '.expand:hover, .expand:active, .expand:focus{',
    '  color: var(--yy-ink); background: transparent !important; box-shadow: none;',
    '}',
    '.expand:active{ transform: scale(.96); }',
    '.expand:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 3px; }',
    '.expand-label{',
    '  position: absolute; right: calc(100% + 12px); top: 50%;',
    '  transform: translateY(-50%);',
    '  margin: 0; padding: 0; border: 0;',
    '  white-space: nowrap;',
    '  font-size: 12px; font-weight: 500; letter-spacing: -.01em;',
    '  color: var(--yy-ink-dim);',
    '  opacity: 0; pointer-events: none;',
    '  transition: opacity var(--duration-fast,.25s) var(--ease-smooth-out,ease-out), color var(--duration-fast,.25s) var(--ease-smooth-out,ease-out);',
    '}',
    '.expand:hover .expand-label,',
    '.expand:focus-visible .expand-label{ opacity: 1; color: var(--yy-ink); }',
    '.expand-icon{',
    '  position: relative; inset: auto;',
    '  display: block; width: 14px; height: 14px; flex: none;',
    '}',
    '.corner{ position: absolute; width: 4px; height: 4px; transition: transform var(--duration-slow,.4s) var(--m-overshoot,var(--ease-smooth-out,ease-out)); }',
    '.corner-nw{ left: 0; top: 0; border-left: 1px solid; border-top: 1px solid; }',
    '.corner-ne{ right: 0; top: 0; border-right: 1px solid; border-top: 1px solid; }',
    '.corner-sw{ left: 0; bottom: 0; border-left: 1px solid; border-bottom: 1px solid; }',
    '.corner-se{ right: 0; bottom: 0; border-right: 1px solid; border-bottom: 1px solid; }',
    '.panel.is-expanded .corner-nw{ transform: translate(4px,4px) rotate(180deg); }',
    '.panel.is-expanded .corner-ne{ transform: translate(-4px,4px) rotate(180deg); }',
    '.panel.is-expanded .corner-sw{ transform: translate(4px,-4px) rotate(180deg); }',
    '.panel.is-expanded .corner-se{ transform: translate(-4px,-4px) rotate(180deg); }',

    /* Capsule stays a full navigation bar everywhere — including fullpage.
       Brand is the Orbit disc; width hugs content (no fixed 377px wordmark slot). */
    '@media (hover: hover) and (pointer: fine) and (min-width: 561px){',
    '  .cap{',
    '    width: max-content; max-width: calc(100vw - 24px); height: var(--yy-cap-size);',
    '  }',
    '  .cap::before, .cap::after{',
    '    opacity: 0;',
    '    transition: opacity 680ms var(--ease-smooth-out,ease-out);',
    '  }',
    '  .cap > *{',
    '    opacity: 1; pointer-events: auto; transform: none;',
    '  }',
    '}',

    /* Mobile keeps the Orbit home control; section nav may scroll horizontally. */
    '@media (max-width: 560px){',
    '  .cap{ gap: 0; max-width: calc(100vw - 16px); }',
    '  .cap a, .cap button{ padding: 8px 12px; font-size: 13px; }',
    '  .brand{ width: 44px !important; height: 44px !important; padding: 4px !important; }',
    '  .brand-orb{ width: 30px; height: 30px; }',
    '  :host(.is-resume-nav) .cap{',
    '    max-width: calc(100vw - 16px);',
    '    overflow-x: auto;',
    '    -webkit-overflow-scrolling: touch;',
    '    scrollbar-width: none;',
    '  }',
    '  :host(.is-resume-nav) .cap::-webkit-scrollbar{ display: none; }',
    '  :host(.is-resume-nav) .cap button{ padding: 8px 10px; font-size: 12px; }',
    '  .panel-stack{',
    '    --yy-cap-size: 52px;',
    '    --yy-panel-gap: 10px;',
    '    width: calc(100vw - 24px);',
    '  }',
    '  .panel{ border-radius: 24px; }',
    '  .panel-stack.is-expanded{ inset: 0; top: 0; bottom: 0; width: 100vw; height: 100vh; height: 100dvh; }',
    '  .panel.is-expanded{ border-radius: 0; height: 100%; }',
    '  .panel-view{ padding: 64px 24px 32px; }',
    '  .panel-view--resume{ padding: 0; }',
    '  .expand{ top: 14px; right: 14px; width: 26px; height: 26px; }',
    '  .expand-label{ font-size: 11px; }',
    '}',
    '@media (max-height: 560px){',
    '  .panel-stack{ --yy-panel-gap: 8px; }',
    '  .panel-stack.is-expanded{ inset: 0; top: 0; bottom: 0; height: 100vh; height: 100dvh; }',
    '  .panel.is-expanded{ height: 100%; }',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  .cap, .cap::before, .cap::after, .cap > *, .expand, .corner{ transition-duration: 1ms !important; }',
    '}',

    /* ---- footer — credit only, aligned to --frame-spine (1260) -------- */
    '.ft{',
    '  display: block;',
    '  max-width: 1260px; margin: 0 auto;',
    '  padding: 40px 24px 120px;',   /* 120px bottom clears the fixed capsule */
    '  border-top: 1px solid rgba(36,34,32,.10);',
    '  box-sizing: border-box;',
    '}',
    ':host(yy-footer.is-dark) .ft{ border-top-color: rgba(255,255,255,.10); }',
    '.credit{',
    '  margin: 0; color: var(--yy-ink-dim);',
    '  font-size: 13px; font-weight: 500; letter-spacing: .04em;',
    '}',
    ':host(yy-footer.is-dark) .credit{ color: #fff; }'
  ].join('\n');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function panelTrigger(item) {
    return '<button type="button" data-panel-trigger="' + esc(item.panel) + '"' +
      ' aria-controls="yy-nav-panel" aria-expanded="false">' + esc(item.label) + '</button>';
  }

  function resumeSectionTrigger(item) {
    return '<button type="button" data-resume-target="' + esc(item.id) + '">' +
      esc(item.label) + '</button>';
  }

  function resumeBackControl() {
    return '<button type="button" class="cap-back" data-resume-back aria-label="Go Back">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M15 18l-6-6 6-6"/>' +
      '</svg></button>';
  }

  function panelView(item) {
    if (item.panel === 'resume') {
      return '<section class="panel-view panel-view--resume" data-panel-view="resume" hidden>' +
        '<yy-resume-content aria-label="Yanice Yang resume"></yy-resume-content>' +
      '</section>';
    }
    if (item.panel === 'about') {
      return '<section class="panel-view panel-view--about" data-panel-view="about" hidden>' +
        '<yy-about-content aria-label="About Yanice Yang"></yy-about-content>' +
      '</section>';
    }
    if (item.panel === 'work') {
      return '<section class="panel-view panel-view--work" data-panel-view="work" hidden>' +
        '<yy-work-content aria-label="Selected projects"></yy-work-content>' +
      '</section>';
    }
    return '<section class="panel-view" data-panel-view="' + esc(item.panel) + '" hidden>' +
      '<p class="panel-kicker">Component shell</p>' +
      '<h2 class="panel-title">' + esc(item.label) + '</h2>' +
      '<p class="panel-note">This space is ready for the ' + esc(item.label) + ' interface.</p>' +
    '</section>';
  }

  function loadPanelScript(cacheKey, file, tagName, label) {
    if (window.customElements && customElements.get(tagName)) {
      return Promise.resolve();
    }
    if (loadPanelScript[cacheKey]) return loadPanelScript[cacheKey];
    loadPanelScript[cacheKey] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = ROOT + 'assets/js/' + file;
      script.onload = resolve;
      script.onerror = function () {
        loadPanelScript[cacheKey] = null;
        reject(new Error(label + ' component failed to load'));
      };
      (document.head || HTML).appendChild(script);
    });
    return loadPanelScript[cacheKey];
  }

  function ensureResumeComponent() {
    return loadPanelScript('_resume', 'yy-resume.js', 'yy-resume-content', 'Resume');
  }

  function ensureAboutComponent() {
    return loadPanelScript('_about', 'yy-about.js', 'yy-about-content', 'About');
  }

  function ensureWorkComponent() {
    return loadPanelScript('_work', 'yy-work.js', 'yy-work-content', 'Work');
  }

  /* --------------------------------------------------------------------------
     Skip-link target. There is no <main> anywhere on this site, so this is a
     documented fallback chain. It must NEVER overwrite an existing id — most
     containers here carry `#w-node-…` ids that Webflow's own grid rules and
     IX2 triggers select on. We only mint an id when the element has none.
     -------------------------------------------------------------------------- */
  var NOT_CONTENT = /^(SCRIPT|STYLE|LINK|NOSCRIPT|YY-NAV|YY-FOOTER)$/;

  function skipTarget() {
    /* Measured: 0 of 11 pages has <main>, .main-wrapper or .page-wrapper. The
       only reliable structure is "body > .navbar, then the content". So walk
       body's children and take the first one that is not chrome, not the
       preloader, and not a visually-hidden heading. Never match `.body` — that
       IS <body>, the node we insert the nav into. */
    var el = document.querySelector('main, [role="main"]');
    if (!el) {
      var kids = document.body.children;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (NOT_CONTENT.test(k.tagName)) continue;
        if (k.classList.contains('navbar') ||
            k.classList.contains('preloader-lark') ||
            k.classList.contains('sr-only')) continue;
        el = k;
        break;
      }
    }
    if (!el) return null;
    if (!el.id) el.id = 'yy-main';
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    return el.id;
  }

  function shadow(tag, html) {
    var host = document.createElement(tag);
    var root = host.attachShadow({ mode: 'open' });   /* open: QC can read in */
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    while (wrap.firstChild) root.appendChild(wrap.firstChild);
    return host;
  }

  function setupPanel(host) {
    var root = host.shadowRoot;
    var panelBackdrop = root.querySelector('.panel-backdrop');
    var panelStack = root.querySelector('.panel-stack');
    var panel = root.querySelector('.panel');
    var panelScroll = root.querySelector('.panel-scroll');
    var expand = root.querySelector('.expand');
    var cap = root.querySelector('.cap');
    var triggers = Array.prototype.slice.call(root.querySelectorAll('[data-panel-trigger]'));
    var views = Array.prototype.slice.call(root.querySelectorAll('[data-panel-view]'));
    var active = '';
    var panelAnimation = null;
    var viewScroll = {};
    var closing = false;
    var lastOpener = null;
    var backgroundState = [];
    var resumeNavMode = false;
    var fullHistoryPushed = false;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (panelScroll) panelScroll.setAttribute('data-lenis-prevent', '');

    function setExpandedChrome(expanded) {
      panel.classList.toggle('is-expanded', expanded);
      if (panelStack) panelStack.classList.toggle('is-expanded', expanded);
      host.classList.toggle('is-fullpage', expanded);
      HTML.classList.toggle('yy-panel-fullpage', expanded);
    }

    function fullpageHash(name) {
      return '#/' + encodeURIComponent(name || 'panel');
    }

    function clearFullpageUrl() {
      if (!fullHistoryPushed) return;
      fullHistoryPushed = false;
      if (location.hash.indexOf('#/') === 0) {
        history.replaceState(null, '', location.pathname + location.search);
      }
    }

    function prepare(name) {
      var loaders = {
        resume: [ensureResumeComponent, 'Resume'],
        about: [ensureAboutComponent, 'About'],
        work: [ensureWorkComponent, 'Work']
      };
      var spec = loaders[name];
      if (!spec) return;
      spec[0]().catch(function (error) {
        var view = viewFor(name);
        if (view) {
          view.innerHTML = '<p class="panel-note" role="alert">' + spec[1] + ' could not load. Please try again.</p>';
        }
        if (window.console) console.error('[yy-chrome] ' + name + ' load failed:', error);
      });
    }

    function viewFor(name) {
      for (var i = 0; i < views.length; i++) {
        if (views[i].getAttribute('data-panel-view') === name) return views[i];
      }
      return null;
    }

    function triggerFor(name) {
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getAttribute('data-panel-trigger') === name) return triggers[i];
      }
      return null;
    }

    function refreshTriggers() {
      triggers = Array.prototype.slice.call(root.querySelectorAll('[data-panel-trigger]'));
    }

    function paintCapsule(mode) {
      if (!cap) return;
      var children = Array.prototype.slice.call(cap.children);
      for (var i = 0; i < children.length; i++) {
        if (children[i].classList.contains('brand') || children[i].classList.contains('rule')) continue;
        children[i].remove();
      }
      var html = mode === 'resume'
        ? RESUME_SECTIONS.map(resumeSectionTrigger).join('') + resumeBackControl()
        : NAV.map(panelTrigger).join('');
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var entering = [];
      while (wrap.firstChild) {
        var node = wrap.firstChild;
        if (node.nodeType === 1 && (node.tagName === 'A' || node.tagName === 'BUTTON')) {
          node.classList.add('is-enter');
          entering.push(node);
        }
        cap.appendChild(node);
      }
      cap.setAttribute('aria-label', mode === 'resume' ? 'Resume sections' : 'Main');
      if (mode !== 'resume') {
        refreshTriggers();
        if (lastOpener && lastOpener.getAttribute) {
          var openerName = lastOpener.getAttribute('data-panel-trigger');
          if (openerName) {
            var fresh = triggerFor(openerName);
            if (fresh) lastOpener = fresh;
          }
        }
      }
      if (entering.length) {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            for (var e = 0; e < entering.length; e++) {
              entering[e].classList.remove('is-enter');
              entering[e].classList.add('is-shown');
            }
          });
        });
      }
    }

    function enterResumeNav() {
      if (resumeNavMode) return;
      resumeNavMode = true;
      host.classList.add('is-resume-nav');
      paintCapsule('resume');
    }

    function leaveResumeNav() {
      if (!resumeNavMode) return;
      resumeNavMode = false;
      host.classList.remove('is-resume-nav');
      paintCapsule('main');
      if (active) sync(active);
      else {
        for (var i = 0; i < triggers.length; i++) {
          triggers[i].setAttribute('aria-expanded', 'false');
        }
      }
    }

    function setResumeSectionCurrent(id) {
      if (!resumeNavMode || !cap) return;
      var buttons = cap.querySelectorAll('[data-resume-target]');
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].getAttribute('data-resume-target') === id) {
          buttons[i].setAttribute('aria-current', 'location');
        } else {
          buttons[i].removeAttribute('aria-current');
        }
      }
    }

    function sync(name) {
      for (var i = 0; i < triggers.length; i++) {
        var selected = triggers[i].getAttribute('data-panel-trigger') === name;
        triggers[i].setAttribute('aria-expanded', selected ? 'true' : 'false');
      }
      for (var j = 0; j < views.length; j++) {
        var on = views[j].getAttribute('data-panel-view') === name;
        views[j].classList.toggle('is-active', on);
        views[j].hidden = !on;
      }
      panel.classList.toggle('is-work', name === 'work');
    }

    function saveViewScroll(name) {
      if (panelScroll && name) viewScroll[name] = panelScroll.scrollTop;
    }

    function restoreViewScroll(name) {
      if (!panelScroll) return;
      window.requestAnimationFrame(function () {
        panelScroll.scrollTop = viewScroll[name] || 0;
        panelScroll.dispatchEvent(new Event('scroll'));
      });
    }

    function setBackgroundInert(inert) {
      if (inert) {
        if (backgroundState.length) return;
        var children = document.body.children;
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          if (child === host) continue;
          /* Keep the landing cursor above the fullpage panel — never inert it. */
          if (child.id === 'yy-cursor') continue;
          backgroundState.push({ element: child, hadInert: child.hasAttribute('inert') });
          child.setAttribute('inert', '');
        }
        return;
      }
      for (var j = 0; j < backgroundState.length; j++) {
        if (!backgroundState[j].hadInert) backgroundState[j].element.removeAttribute('inert');
      }
      backgroundState = [];
    }

    function keyframesBetween(from, to, closing) {
      var scale = Math.max(Math.min(from.width / to.width, from.height / to.height), .055);
      var dx = from.left + from.width / 2 - (to.left + to.width / 2);
      var dy = from.top + from.height / 2 - (to.top + to.height / 2);
      var small = {
        opacity: 0,
        transformOrigin: 'center center',
        transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')'
      };
      var large = {
        opacity: 1,
        transformOrigin: 'center center',
        transform: 'none'
      };
      return closing ? [large, small] : [small, large];
    }

    function announcePanelState(expanded, open) {
      window.dispatchEvent(new CustomEvent('yy:panel-state', {
        detail: { expanded: expanded, open: open }
      }));
    }

    var PANEL_MOTION_MS = 520;
    var PANEL_MOTION_EASE = 'cubic-bezier(.22,1,.36,1)';

    function clearPanelAnimation() {
      if (!panelAnimation) return;
      try { panelAnimation.cancel(); } catch (err) {}
      panelAnimation = null;
    }

    function animatePanel(from, closing, done) {
      clearPanelAnimation();
      if (reduced || !panel.animate) {
        done();
        return;
      }
      var to = panel.getBoundingClientRect();
      panelAnimation = panel.animate(keyframesBetween(from, to, closing), {
        duration: PANEL_MOTION_MS,
        easing: PANEL_MOTION_EASE,
        fill: 'both'
      });
      panelAnimation.onfinish = function () {
        clearPanelAnimation();
        done();
      };
      panelAnimation.oncancel = null;
    }

    /* Arm open keyframes while still invisible so the first painted frame
       after .is-open is the scaled/transparent start — not a full-opacity flash. */
    function armPanelOpen(from) {
      clearPanelAnimation();
      if (reduced || !panel.animate) return null;
      var to = panel.getBoundingClientRect();
      panelAnimation = panel.animate(keyframesBetween(from, to, false), {
        duration: PANEL_MOTION_MS,
        easing: PANEL_MOTION_EASE,
        fill: 'both'
      });
      panelAnimation.pause();
      panelAnimation.currentTime = 0;
      return panelAnimation;
    }

    function finishClose(target) {
      closing = false;
      active = '';
      host.classList.remove('is-open');
      /* Keep .is-ready so the next open does not flash unstyled content. */
      setExpandedChrome(false);
      HTML.classList.remove('yy-panel-open');
      setBackgroundInert(false);
      panel.setAttribute('aria-modal', 'false');
      expand.hidden = false;
      expand.setAttribute('aria-label', 'View full screen');
      expand.setAttribute('aria-pressed', 'false');
      for (var j = 0; j < views.length; j++) {
        views[j].classList.remove('is-active');
        views[j].hidden = true;
      }
      for (var i = 0; i < triggers.length; i++) triggers[i].setAttribute('aria-expanded', 'false');
      if (target && target.focus) target.focus({ preventScroll: true });
    }

    function open(name, trigger, opener) {
      closing = false;
      lastOpener = opener || trigger || lastOpener;
      prepare(name);
      active = name;
      sync(name);
      var start = trigger.getBoundingClientRect();
      /* Popup always keeps main Navigation; section nav only after expand. */
      leaveResumeNav();
      clearFullpageUrl();
      setExpandedChrome(false);
      setBackgroundInert(false);
      panel.setAttribute('aria-modal', 'false');
      expand.hidden = false;
      expand.setAttribute('aria-label', 'View full screen');
      expand.setAttribute('aria-pressed', 'false');
      if (panelScroll) {
        panelScroll.scrollTop = viewScroll[name] || 0;
      }
      /* Force layout after view/aria prep — only then reveal the panel. */
      void panel.offsetHeight;
      var opening = armPanelOpen(start);
      HTML.classList.add('yy-panel-open');
      host.classList.add('is-open');
      announcePanelState(false, true);
      if (panelScroll) {
        panelScroll.dispatchEvent(new Event('scroll'));
      }
      var targetView = viewFor(name);
      function afterOpen() {
        if (targetView && !reduced && targetView.animate) {
          targetView.animate(
            [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
            { duration: 350, easing: PANEL_MOTION_EASE }
          );
        }
        if (!expand.hidden) expand.focus({ preventScroll: true });
      }
      if (opening) {
        opening.onfinish = function () {
          clearPanelAnimation();
          afterOpen();
        };
        opening.oncancel = null;
        opening.play();
      } else {
        afterOpen();
      }
    }

    function close(returnFocus) {
      if (!active || closing) return;
      if (panel.classList.contains('is-expanded')) {
        leaveFullpageToOrigin();
        return;
      }
      closing = true;
      var former = active;
      saveViewScroll(former);
      clearFullpageUrl();
      HTML.classList.remove('yy-panel-open');
      announcePanelState(false, false);
      setBackgroundInert(false);
      leaveResumeNav();
      var target = returnFocus || lastOpener || triggerFor(former);
      var destination = target ? target.getBoundingClientRect() : panel.getBoundingClientRect();
      animatePanel(destination, true, function () {
        if (!closing) return;
        finishClose(target);
      });
    }

    function switchView(name, opener) {
      closing = false;
      clearPanelAnimation();
      if (opener) lastOpener = opener;
      saveViewScroll(active);
      prepare(name);
      active = name;
      sync(name);
      if (panel.classList.contains('is-expanded') && name === 'resume') {
        enterResumeNav();
        history.replaceState(
          { yyPanelFull: true, panel: name },
          '',
          location.pathname + location.search + fullpageHash(name)
        );
        fullHistoryPushed = true;
      } else {
        leaveResumeNav();
        if (panel.classList.contains('is-expanded')) {
          history.replaceState(
            { yyPanelFull: true, panel: name },
            '',
            location.pathname + location.search + fullpageHash(name)
          );
          fullHistoryPushed = true;
        }
      }
      restoreViewScroll(name);
      var next = viewFor(name);
      if (next && !reduced && next.animate) {
        next.animate(
          [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, easing: PANEL_MOTION_EASE }
        );
      }
    }

    function applyExitFullpageUI() {
      if (!panel.classList.contains('is-expanded')) return;
      setExpandedChrome(false);
      setBackgroundInert(false);
      panel.setAttribute('aria-modal', 'false');
      expand.hidden = false;
      expand.setAttribute('aria-label', 'View full screen');
      expand.setAttribute('aria-pressed', 'false');
      fullHistoryPushed = false;
    }

    /* Back from the fullpage URL layer returns to the pre-expand page —
       one continuous retract (full → trigger), matching the open ease. */
    function leaveFullpageToOrigin() {
      if (!panel.classList.contains('is-expanded') || closing) return;
      if (!active) {
        applyExitFullpageUI();
        return;
      }
      closing = true;
      var former = active;
      saveViewScroll(former);

      if (fullHistoryPushed) {
        fullHistoryPushed = false;
        if (location.hash.indexOf('#/') === 0) {
          history.replaceState(null, '', location.pathname + location.search);
        }
      }

      var before = panel.getBoundingClientRect();
      leaveResumeNav();
      announcePanelState(false, false);
      HTML.classList.remove('yy-panel-open');
      setBackgroundInert(false);
      panel.setAttribute('aria-modal', 'false');
      setExpandedChrome(false);
      expand.hidden = false;
      expand.setAttribute('aria-label', 'View full screen');
      expand.setAttribute('aria-pressed', 'false');

      var target = lastOpener || triggerFor(former);
      var mid = panel.getBoundingClientRect();
      var destination = target ? target.getBoundingClientRect() : mid;

      function end() {
        if (!closing) return;
        finishClose(target);
      }

      if (reduced || !panel.animate) {
        end();
        return;
      }

      var sFull = Math.max(Math.min(before.width / Math.max(mid.width, 1), before.height / Math.max(mid.height, 1)), .055);
      var dxFull = before.left + before.width / 2 - (mid.left + mid.width / 2);
      var dyFull = before.top + before.height / 2 - (mid.top + mid.height / 2);
      var sTrig = Math.max(Math.min(destination.width / Math.max(mid.width, 1), destination.height / Math.max(mid.height, 1)), .055);
      var dxTrig = destination.left + destination.width / 2 - (mid.left + mid.width / 2);
      var dyTrig = destination.top + destination.height / 2 - (mid.top + mid.height / 2);

      clearPanelAnimation();
      panelAnimation = panel.animate([
        {
          opacity: 1,
          transformOrigin: 'center center',
          transform: 'translate(' + dxFull + 'px,' + dyFull + 'px) scale(' + sFull + ')'
        },
        {
          opacity: 0,
          transformOrigin: 'center center',
          transform: 'translate(' + dxTrig + 'px,' + dyTrig + 'px) scale(' + sTrig + ')'
        }
      ], {
        duration: PANEL_MOTION_MS,
        easing: PANEL_MOTION_EASE,
        fill: 'both'
      });
      panelAnimation.onfinish = function () {
        clearPanelAnimation();
        end();
      };
    }

    function expandToFullpage() {
      if (closing || !active) return;
      if (panel.classList.contains('is-expanded')) return;
      var before = panel.getBoundingClientRect();
      setExpandedChrome(true);
      setBackgroundInert(true);
      panel.setAttribute('aria-modal', 'false');
      announcePanelState(true, true);
      expand.hidden = true;
      expand.setAttribute('aria-pressed', 'true');
      if (active === 'resume') enterResumeNav();
      else leaveResumeNav();
      history.pushState(
        { yyPanelFull: true, panel: active },
        '',
        location.pathname + location.search + fullpageHash(active)
      );
      fullHistoryPushed = true;
      var after = panel.getBoundingClientRect();
      if (!reduced && panel.animate) {
        var scale = Math.min(before.width / Math.max(after.width, 1), before.height / Math.max(after.height, 1));
        var dx = before.left + before.width / 2 - (after.left + after.width / 2);
        var dy = before.top + before.height / 2 - (after.top + after.height / 2);
        clearPanelAnimation();
        panelAnimation = panel.animate([
          {
            opacity: 1,
            transformOrigin: 'center center',
            transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')'
          },
          { opacity: 1, transformOrigin: 'center center', transform: 'none' }
        ], {
          duration: PANEL_MOTION_MS,
          easing: PANEL_MOTION_EASE,
          fill: 'both'
        });
        panelAnimation.onfinish = function () {
          clearPanelAnimation();
        };
      }
    }

    function onCapClick(event) {
      var back = event.target.closest('[data-resume-back]');
      if (back && cap.contains(back)) {
        /* Go Back only exists on Resume fullpage — exit to the prior page. */
        leaveFullpageToOrigin();
        return;
      }
      var section = event.target.closest('[data-resume-target]');
      if (section && cap.contains(section)) {
        window.dispatchEvent(new CustomEvent('yy:resume-navigate', {
          detail: { id: section.getAttribute('data-resume-target') }
        }));
        return;
      }
      var trigger = event.target.closest('[data-panel-trigger]');
      if (!trigger || !cap.contains(trigger)) return;
      var name = trigger.getAttribute('data-panel-trigger');
      if (closing) open(name, trigger, trigger);
      else if (!host.classList.contains('is-open')) open(name, trigger, trigger);
      else if (active === name) close(trigger);
      else switchView(name, trigger);
    }

    if (cap) cap.addEventListener('click', onCapClick);
    if (panelBackdrop) {
      panelBackdrop.addEventListener('click', function () {
        if (!active || closing || panel.classList.contains('is-expanded')) return;
        close();
      });
    }
    expand.addEventListener('click', expandToFullpage);
    window.addEventListener('popstate', function (event) {
      var state = event.state;
      if (panel.classList.contains('is-expanded') && !(state && state.yyPanelFull)) {
        fullHistoryPushed = false;
        leaveFullpageToOrigin();
      }
    });
    window.addEventListener('yy:open-panel', function (event) {
      var name = event.detail && event.detail.name;
      if (resumeNavMode && name && name !== 'resume') leaveResumeNav();
      var trigger = triggerFor(name);
      if (!trigger) {
        if (name === 'resume' && resumeNavMode) {
          leaveResumeNav();
          trigger = triggerFor(name);
        }
      }
      if (!trigger) return;
      var opener = event.detail && event.detail.returnFocus;
      if (closing) open(name, trigger, opener);
      else if (!host.classList.contains('is-open')) open(name, trigger, opener);
      else if (active !== name) switchView(name, opener);
    });
    window.addEventListener('yy:resume-section', function (event) {
      var id = event.detail && event.detail.id;
      if (id) setResumeSectionCurrent(id);
    });
    window.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !active) return;
      event.preventDefault();
      if (panel.classList.contains('is-expanded')) {
        leaveFullpageToOrigin();
        return;
      }
      close();
    });

    host.classList.add('is-ready');
  }

  function mount() {
    var here = currentPage();
    var target = skipTarget();

    /* ---- nav ----
       insertBefore(body.firstChild), never appendChild. appendChild makes the
       site nav the LAST tab stop on the page — a silent a11y regression that
       renders identically, so only focus order catches it. */
    var navHTML =
      (target ? '<a class="skip" href="#' + esc(target) + '">Skip to content</a>' : '') +
      '<div class="panel-backdrop" aria-hidden="true"></div>' +
      '<div class="panel-stack">' +
        '<div class="panel" id="yy-nav-panel" role="dialog" aria-modal="false" aria-label="Navigation content">' +
          '<button class="expand" type="button" aria-label="View full screen" aria-pressed="false">' +
            '<span class="expand-label" aria-hidden="true">View full screen</span>' +
            '<span class="expand-icon" aria-hidden="true">' +
              '<span class="corner corner-nw"></span><span class="corner corner-ne"></span>' +
              '<span class="corner corner-sw"></span><span class="corner corner-se"></span>' +
            '</span>' +
          '</button>' +
          '<div class="panel-scroll">' + NAV.map(panelView).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="cap" aria-label="Main">' +
        '<a class="brand" href="index.html" aria-label="Yanice Yang home"' +
          (here === 'index.html' ? ' aria-current="page"' : '') + '>' +
          '<img class="brand-orb" src="' + esc(ROOT + 'assets/images/ui/nav-orb.gif') +
            '?v=16" alt="" width="24" height="24" decoding="async">' +
        '</a>' +
        '<span class="rule" aria-hidden="true"></span>' +
        NAV.map(panelTrigger).join('') +
      '</nav>';

    var navHost = shadow('yy-nav', navHTML);
    document.body.insertBefore(navHost, document.body.firstChild);
    applyChromeTheme(navHost);
    setupPanel(navHost);

    /* ---- footer ----
       Credit only. Always append to <body>, same as the Astro landing.
       Nesting inside `.footer-section` / `.grid-wrapper` inherited Webflow
       5vw gutters and made case footers look like a different component.

       `.four-column` is NEVER hidden — the prev/next project links in it are
       content, not chrome. */
    var footHTML =
      '<footer class="ft">' +
        '<p class="credit">© Yanice Yang 2026</p>' +
      '</footer>';

    var host = shadow('yy-footer', footHTML);
    if (DARK_FOOTER[here]) {
      host.classList.add('is-dark');
      /* Light-DOM patch: Webflow's .footer-section is hard-coded #fff and
         would leave a white band under dark case pages. Keep prev/next
         (four-column) as content; only retint the section + link chrome. */
      var darkFoot = document.createElement('style');
      darkFoot.textContent =
        'html.yy-chrome .footer-section{' +
        'background-color:#000!important;' +
        'border-top-color:rgba(255,255,255,.12)!important;' +
        '}' +
        'html.yy-chrome .footer-section .footer-link,' +
        'html.yy-chrome .footer-section .text-block-19,' +
        'html.yy-chrome .footer-section .text-block-20{' +
        'color:#fff!important;' +
        '}' +
        'html.yy-chrome .footer-section .hover-line-fill-3{' +
        'background-color:#fff!important;' +
        '}';
      (document.head || HTML).appendChild(darkFoot);
    }
    document.body.appendChild(host);
  }

  function go() {
    try {
      mount();
      loadCursor();
      loadFlow();
    } catch (e) {
      /* Hand the page back to its own chrome, intact, within a frame. */
      HTML.classList.remove('yy-chrome');
      var dead = document.querySelectorAll('yy-nav, yy-footer');
      for (var i = 0; i < dead.length; i++) dead[i].remove();
      if (window.console) console.error('[yy-chrome] mount failed, legacy chrome restored:', e);
    }
  }

  if (document.body) go();
  else document.addEventListener('DOMContentLoaded', go, { once: true });
})();
