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

  /* Light case + work-hub pages get the landing type/ink overlay.
     Opus and Alzheimer keep Webflow black/white; do not list them here. */
  var CASE_TYPE_PAGES = {
    'projects.html': 1,
    'mckinseyecommerce.html': 1,
    'larkdesign.html': 1,
    'mifinance.html': 1,
    'cummins-digitalization.html': 1,
    'tiktok-research.html': 1,
    'case-study-template.html': 1
  };

  var RESUME = 'https://302437672248143872.hello.cv/';

  /* Capsule link set. Deliberately four items: any more and the capsule stops
     being a capsule at 375px. `projects.html` is the hub — it links to all
     eight content pages — so Work covers the whole case-study graph. */
  var NAV = [
    { href: 'projects.html', label: 'Work', homeHref: '#work' },
    { href: 'aboutme.html',  label: 'About' },
    { href: RESUME,          label: 'Resume', ext: true }
  ];

  /* Footer carries the tail. `fashion.html`'s only inbound link today is a
     sentence inside aboutme.html — the site graph must not depend on one
     page's prose, so the chrome links it explicitly. */
  var FOOT = [
    { href: 'projects.html', label: 'Work' },
    { href: 'aboutme.html',  label: 'About' },
    { href: 'fashion.html',  label: 'Fashion' },
    { href: RESUME,          label: 'Resume', ext: true }
  ];

  /* Resume is NOT a social profile — it lives in the nav row above as text.
     Dropping it here also retires `icon-resume.webp`, the asset that on all
     seven case pages sits on an href pointing at Instagram. */
  var SOCIAL = [
    { href: 'https://www.linkedin.com/in/yanice-yang', label: 'LinkedIn', img: 'icon-linkedin.webp' },
    { href: 'mailto:yaniceydesign@gmail.com',          label: 'Email',    img: 'icon-email.webp' }
  ];
  /* Instagram exists on the seven case pages but only behind the mislabelled
     resume icon, so nobody can find it. Kept as a text link: no new asset,
     and the link stops lying about where it goes. */
  var INSTAGRAM = 'https://www.instagram.com/tycreated/';

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
    /* Inline so black Webflow shells cannot flash or win on specificity
       before yy-case-type.css arrives. */
    typeBoot =
      'html.yy-case-type,html.yy-case-type body' +
      '{background-color:#fff!important;color:#1a1917!important}';
  }

  var boot = document.createElement('style');
  boot.textContent =
    'html.yy-chrome .navbar.w-nav{display:none}' +
    'html.yy-chrome .footer-credit-wrapper{display:none}' +
    /* Credit-only Webflow shells (projects, about, archived home). Case pages
       keep `.four-column` prev/next as in-page content, not as a second footer. */
    'html.yy-chrome .footer-section:not(:has(.four-column)){display:none}' +
    'html.yy-chrome .grid-wrapper:has(> .footer-credit-wrapper):not(:has(.four-column)){display:none}' +
    'html.yy-chrome .footer-section{border-top:none;padding-top:48px;padding-bottom:0}' +
    typeBoot;
  (document.head || HTML).appendChild(boot);

  if (!document.querySelector('link[href*="yy-tokens.css"]')) {
    var tokens = document.createElement('link');
    tokens.rel = 'stylesheet';
    tokens.href = ROOT + 'assets/css/yy-tokens.css';
    (document.head || HTML).appendChild(tokens);
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
    '  --yy-ink: #1a1917;',
    '  --yy-ink-dim: #5b5a56;',
    '  --yy-fill: rgba(255,255,255,.58);',
    '  --yy-hair: rgba(255,255,255,.65);',
    '  --yy-ease: cubic-bezier(1,0,.4,1);',
    '  font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;',
    '  font-size: 16px;',
    '  line-height: 1.55;',
    '  color: var(--yy-ink);',
    '  -webkit-font-smoothing: antialiased;',
    '}',

    /* ---- nav host: fixed, bottom-centred, below the preloader (10000) ----
       No transform here — a transformed host becomes a backdrop root and
       kills backdrop-filter on .cap (glass reads as a solid milky pill). */
    ':host(yy-nav){',
    '  position: fixed;',
    '  z-index: 9000;',
    '  left: 0;',
    '  right: 0;',
    '  bottom: 16px;',
    '  display: flex;',
    '  justify-content: center;',
    '  pointer-events: none;',
    '}',
    ':host(yy-nav) .cap,',
    ':host(yy-nav) .skip{ pointer-events: auto; }',
    /* Light band on every page, including dark Webflow cases, so the footer
       matches the landing chrome instead of inheriting body #000. */
    ':host(yy-footer){',
    '  display: block;',
    '  background: #fff;',
    '  color: var(--yy-ink);',
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
    '  background: #1a1917; color: #fff; border-radius: 999px;',
    '  font-size: 13px; font-weight: 600; text-decoration: none;',
    '}',
    '.skip:focus{',
    '  width: auto; height: auto; margin: 0; padding: 10px 16px;',
    '  overflow: visible; clip: auto; clip-path: none;',
    '  outline: 2px solid #1a1917; outline-offset: 2px;',
    '}',

    /* ---- the glass capsule ----------------------------------------------
       Reference look: frosted translucent fill so page type reads through,
       inset hairlines, drop shadow, saturate so colour behind stays alive.
       -------------------------------------------------------------------- */
    '.cap{',
    '  display: flex; align-items: center; gap: 2px;',
    '  padding: 6px;',
    '  border-radius: 999px;',
    '  background: var(--yy-fill);',
    '  -webkit-backdrop-filter: blur(12px) saturate(1.6);',
    '  backdrop-filter: blur(12px) saturate(1.6);',
    '  box-shadow:',
    '    inset 0 1px 0 rgba(255,255,255,.92),',
    '    inset 0 0 0 1px var(--yy-hair),',
    '    inset 0 -1px 0 rgba(26,25,23,.05),',
    '    0 1px 2px rgba(62,65,116,.07),',
    '    0 2px 8px -2px rgba(62,65,116,.09),',
    '    0 12px 36px -8px rgba(62,65,116,.20);',
    '}',
    /* Where backdrop-filter is unsupported OR silently dead (an ancestor
       forming a backdrop root), the fill alone must carry legibility. */
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){',
    '  :host{ --yy-fill: rgba(255,255,255,.94); --yy-hair: rgba(26,25,23,.10); }',
    '}',

    '.cap a{',
    '  display: block;',
    '  padding: 8px 14px;',
    '  border-radius: 999px;',
    '  font-size: 14px; font-weight: 500;',
    '  letter-spacing: -.01em;',
    '  color: var(--yy-ink-dim);',
    '  text-decoration: none;',
    '  white-space: nowrap;',
    '  transition: color .2s var(--yy-ease), background-color .2s var(--yy-ease);',
    '}',
    '.cap a:hover{ color: var(--yy-ink); background: rgba(26,25,23,.055); }',
    '.cap a:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 1px; }',
    '.cap a[aria-current="page"]{ color: var(--yy-ink); background: rgba(26,25,23,.075); }',

    /* Handwritten wordmark — Caveat, same as the reference glass capsule.
       No grey chip: the wordmark sits in the glass fill. */
    '.brand{',
    '  font-family: Caveat, "Plus Jakarta Sans", cursive !important;',
    '  font-size: 22px !important;',
    '  font-weight: 500 !important;',
    '  line-height: 1 !important;',
    '  letter-spacing: 0 !important;',
    '  color: var(--yy-ink) !important;',
    '  padding: 8px 14px 8px 16px !important;',
    '  background: transparent !important;',
    '}',
    '.rule{ width: 1px; height: 18px; margin: 0 6px; background: rgba(26,25,23,.13); }',
    '.ext::after{ content: " \\2197"; font-size: .85em; opacity: .6; }',

    /* Below 560px the brand is the first thing to go: the four links are
       navigation, the brand is decoration that also links home. */
    '@media (max-width: 560px){',
    '  .brand, .rule{ display: none !important; }',
    '  .cap{ gap: 0; }',
    '  .cap a{ padding: 8px 12px; font-size: 13px; }',
    '}',

    /* ---- footer -------------------------------------------------------- */
    '.ft{',
    '  display: flex; flex-wrap: wrap; align-items: center; gap: 20px 28px;',
    '  max-width: 1280px; margin: 0 auto;',
    '  padding: 40px 24px 120px;',   /* 120px bottom clears the fixed capsule */
    '  border-top: 1px solid rgba(26,25,23,.10);',
    '  font-size: 13px;',
    '}',
    '.ft nav{ display: flex; flex-wrap: wrap; gap: 4px 18px; }',
    '.ft a{ color: var(--yy-ink-dim); text-decoration: none; transition: color .2s var(--yy-ease); }',
    '.ft a:hover{ color: var(--yy-ink); text-decoration: underline; text-underline-offset: 3px; }',
    '.ft a:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 3px; border-radius: 2px; }',
    '.soc{ display: flex; align-items: center; gap: 16px; }',
    '.soc img{ display: block; width: 18px; height: 18px; object-fit: contain; }',
    '.credit{ margin: 0 0 0 auto; color: var(--yy-ink-dim); }',
    '@media (max-width: 560px){ .credit{ margin-left: 0; flex-basis: 100%; } }'
  ].join('\n');

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function link(item, here) {
    /* 页面链接用相对路径 —— 与站上 11 个页面既有的写法一致。
       ROOT 只用于资源（css / 图片），那里相对路径才真的可能解析到别处。
       On the homepage, Work scrolls to #work instead of bouncing to projects.html. */
    var href = (here === 'index.html' && item.homeHref) ? item.homeHref : item.href;
    var attrs = 'href="' + esc(href) + '"';
    if (item.ext) attrs += ' target="_blank" rel="noopener"';
    if (!item.ext && item.href === here) attrs += ' aria-current="page"';
    return '<a ' + attrs + (item.ext ? ' class="ext"' : '') + '>' + esc(item.label) + '</a>';
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

  function mount() {
    var here = currentPage();
    var target = skipTarget();

    /* ---- nav ----
       insertBefore(body.firstChild), never appendChild. appendChild makes the
       site nav the LAST tab stop on the page — a silent a11y regression that
       renders identically, so only focus order catches it. */
    var navHTML =
      (target ? '<a class="skip" href="#' + esc(target) + '">Skip to content</a>' : '') +
      '<nav class="cap" aria-label="Main">' +
        '<a class="brand" href="index.html"' +
          (here === 'index.html' ? ' aria-current="page"' : '') + '>Yanice Yang</a>' +
        '<span class="rule" aria-hidden="true"></span>' +
        NAV.map(function (i) { return link(i, here); }).join('') +
      '</nav>';

    document.body.insertBefore(shadow('yy-nav', navHTML), document.body.firstChild);

    /* ---- footer ----
       Always append to <body>, same as the Astro landing. Nesting inside
       `.footer-section` / `.grid-wrapper` inherited Webflow 5vw gutters and
       made case footers look like a different component. Page content padding
       (`.section-layout1` etc.) is untouched.

       `.four-column` is NEVER hidden — the prev/next project links in it are
       content, not chrome. */
    var footHTML =
      '<footer class="ft">' +
        '<nav aria-label="Footer">' +
          FOOT.map(function (i) { return link(i, here); }).join('') +
        '</nav>' +
        '<div class="soc">' +
          SOCIAL.map(function (s) {
            return '<a href="' + esc(s.href) + '"' +
              (/^https?:/.test(s.href) ? ' target="_blank" rel="noopener"' : '') +
              ' aria-label="' + esc(s.label) + '">' +
              '<img src="' + esc(ROOT + 'assets/images/ui/' + s.img) + '" alt="" width="18" height="18">' +
              '</a>';
          }).join('') +
          '<a href="' + esc(INSTAGRAM) + '" target="_blank" rel="noopener">Instagram</a>' +
        '</div>' +
        '<p class="credit">© Yanice Yang 2026</p>' +
      '</footer>';

    document.body.appendChild(shadow('yy-footer', footHTML));
  }

  function go() {
    try {
      mount();
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
