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

  var RESUME = 'https://302437672248143872.hello.cv/';

  /* Capsule link set. Deliberately four items: any more and the capsule stops
     being a capsule at 375px. `projects.html` is the hub — it links to all
     eight content pages — so Work covers the whole case-study graph. */
  var NAV = [
    { href: 'projects.html', label: 'Work' },
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

  var boot = document.createElement('style');
  boot.textContent =
    'html.yy-chrome .navbar.w-nav{display:none}' +
    'html.yy-chrome .footer-credit-wrapper{display:none}';
  (document.head || HTML).appendChild(boot);

  var sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = ROOT + 'assets/css/yy-chrome.css';
  (document.head || HTML).appendChild(sheet);

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
    '  /* Linearity glass, light-adapted: their fill is white/5 on black.',
    '     On #fff that is invisible, so we keep a translucent white wash',
    '     strong enough for 14px ink, thin enough that blur reads as glass. */',
    '  --yy-fill: linear-gradient(180deg, rgba(255,255,255,.58) 0%, rgba(255,255,255,.38) 100%);',
    '  --yy-ease: cubic-bezier(1,0,.4,1);',
    '  font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;',
    '  font-size: 16px;',
    '  line-height: 1.55;',
    '  color: var(--yy-ink);',
    '  -webkit-font-smoothing: antialiased;',
    '}',

    /* ---- nav host: fixed, bottom-centred, below the preloader (10000) ---- */
    ':host(yy-nav){',
    '  position: fixed;',
    '  z-index: 9000;',
    '  left: 50%;',
    '  bottom: 16px;',
    '  transform: translateX(-50%);',
    '  display: block;',
    '}',
    ':host(yy-footer){ display: block; }',

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
       Recipe measured off linearity.io (static layers only — no animate-border):
         · fill: white/5 + backdrop-blur (their nav pills use 4px; large panels
           use 12–200px). 20px is the size that still reads as frost on a 50px
           capsule without milking the type.
         · kp-glass-border: 1px 135deg specular stroke, punched with a mask
           so the highlight lives ON the edge, not as a flat box-shadow ring.
         · inner glow: inset 0 0 11px #ffffff29
         · drop: 0 2px 2px #00000026, plus the existing lift so it still
           separates from #fff.
       -------------------------------------------------------------------- */
    '.cap{',
    '  position: relative;',
    '  isolation: isolate;',
    '  display: flex; align-items: center; gap: 2px;',
    '  padding: 6px;',
    '  border-radius: 999px;',
    '  background: var(--yy-fill);',
    '  -webkit-backdrop-filter: blur(20px) saturate(1.6);',
    '  backdrop-filter: blur(20px) saturate(1.6);',
    '  box-shadow:',
    '    inset 0 0 11px rgba(255,255,255,.16),',
    '    inset 0 1px 0 rgba(255,255,255,.55),',
    '    0 2px 2px rgba(0,0,0,.15),',
    '    0 12px 36px -8px rgba(62,65,116,.20);',
    '}',
    /* Linearity .kp-glass-border — gradient hairline via mask-composite.
       On light ground their all-white stroke vanishes, so the 135deg ramp
       still starts specular-white (top-left) but lands on ink at ~12%. */
    '.cap::before{',
    '  content: "";',
    '  position: absolute; inset: 0; z-index: 0;',
    '  border-radius: inherit;',
    '  padding: 1px;',
    '  pointer-events: none;',
    '  box-sizing: border-box;',
    '  background: linear-gradient(135deg, rgba(255,255,255,.85), rgba(255,255,255,.22) 25%, rgba(26,25,23,.12), rgba(255,255,255,.16) 75%, rgba(26,25,23,.16));',
    '  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);',
    '  -webkit-mask-composite: xor;',
    '  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);',
    '  mask-composite: exclude;',
    '}',
    /* Where backdrop-filter is unsupported OR silently dead (an ancestor
       forming a backdrop root), the fill alone must carry legibility. */
    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){',
    '  :host{ --yy-fill: rgba(255,255,255,.94); }',
    '}',
    '@media (prefers-reduced-transparency: reduce){',
    '  :host{ --yy-fill: rgba(255,255,255,.94); }',
    '  .cap{ -webkit-backdrop-filter: none; backdrop-filter: none; }',
    '}',

    '.cap a{',
    '  position: relative; z-index: 1;',
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
    '.cap a:hover{ color: var(--yy-ink); background: rgba(255,255,255,.42); }',
    '.cap a:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 1px; }',
    /* Active pill = Linearity annually toggle, static: top specular, inner
       frost, and a held magenta glow at the bottom-right. No animation. */
    '.cap a[aria-current="page"]{',
    '  color: var(--yy-ink);',
    '  background: rgba(255,255,255,.52);',
    '  box-shadow:',
    '    inset 0 1px 0 rgba(255,255,255,.7),',
    '    inset 0 0 11px rgba(255,255,255,.28),',
    '    0 2px 2px rgba(0,0,0,.08);',
    '}',
    '.cap a[aria-current="page"]::after{',
    '  content: "";',
    '  position: absolute;',
    '  left: 18%; right: 8%; bottom: -2px;',
    '  height: 13px;',
    '  border-radius: 999px;',
    '  background: rgba(196, 90, 210, .42);',
    '  filter: blur(14px);',
    '  opacity: .65;',
    '  pointer-events: none;',
    '  z-index: -1;',
    '}',

    /* The handwritten wordmark — same typeface as the legacy navbar.
       Measured, not read off the stylesheet: the sheet's one Caveat rule says
       1.5625rem, but the legacy name actually renders at Caveat 500, 32px, with
       line-height 20px (the 0.62 ratio Phase 1 found pinned on it), because a
       later rule overrides the size.

       Caveat is loaded document-wide by every legacy page's WebFont.load, and
       landing.html now requests it too. @font-face is document-scoped and does
       resolve inside a shadow root, which is why Plus Jakarta Sans already works
       in here.

       Size is 22px, not the legacy 32px: that was sized for an 80px navbar, and
       this capsule is 49.7px tall with 14px links beside it. Caveat also runs
       narrow for its em — 22px Caveat measures 111px against 125px for the same
       string in Plus Jakarta Sans — so 22px carries the same optical weight as
       the links while keeping the letterforms she asked for.

       line-height 1 rather than the legacy 0.62, so the capsule's flex centring
       has a normal box to centre. */
    '.brand{',
    '  font-family: Caveat, "Plus Jakarta Sans", cursive !important;',
    '  font-size: 22px !important;',
    '  font-weight: 500 !important;',
    '  line-height: 1 !important;',
    '  letter-spacing: 0 !important;',
    '  color: var(--yy-ink) !important;',
    '  padding-left: 16px !important;',
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

  /* --------------------------------------------------------------------------
     Which page are we on? `index.html` ≡ `/` ≡ `''`.
     -------------------------------------------------------------------------- */
  function currentPage() {
    var last = location.pathname.split('/').pop();
    return (!last || last === 'index.html') ? 'index.html' : last;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function link(item, here) {
    /* 页面链接用相对路径 —— 与站上 11 个页面既有的写法一致。
       ROOT 只用于资源（css / 图片），那里相对路径才真的可能解析到别处。 */
    var attrs = 'href="' + esc(item.href) + '"';
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
       One code path, three cases. Insert after `.footer-credit-wrapper` where
       it exists (9 pages) and let the boot CSS hide the original; append to
       body where it does not (fashion.html, tiktok-research.html).

       `.four-column` is NEVER touched — the prev/next project links in it are
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

    var host = shadow('yy-footer', footHTML);
    var credit = document.querySelector('.footer-credit-wrapper');
    if (credit && credit.parentNode) credit.parentNode.insertBefore(host, credit.nextSibling);
    else document.body.appendChild(host);
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
