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

  /* Footer carries the tail. `fashion.html`'s only inbound link today is a
     sentence inside aboutme.html — the site graph must not depend on one
     page's prose, so the chrome links it explicitly. */
  var FOOT = [
    { href: 'projects.html', label: 'Work' },
    { href: 'aboutme.html',  label: 'About' },
    { href: 'fashion.html',  label: 'Fashion' },
    { panel: 'resume',       label: 'Resume' }
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
    'html.yy-chrome{scrollbar-gutter:stable}' +
    'html.yy-chrome .navbar.w-nav{display:none}' +
    'html.yy-chrome .footer-credit-wrapper{display:none}' +
    'html.yy-panel-open,html.yy-panel-open body{overflow:hidden!important}';
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
    '  --yy-panel-full-fill: rgba(255,255,255,.92);',
    '  --yy-ease: cubic-bezier(1,0,.4,1);',
    '  --yy-orbit-ease: cubic-bezier(.22,1.08,.36,1);',
    '  --yy-panel-radius: 30px;',
    '  --yy-nav-zone: 72px;',
    '  --yy-panel-width: min(83.4vw, 1600px);',
    '  --yy-panel-height: min(73.9vh, 798px);',
    '  --yy-panel-height: min(73.9dvh, 798px);',
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
    '  top: 0;',
    '  left: 0;',
    '  right: 0;',
    '  bottom: 0;',
    '  display: flex;',
    '  justify-content: center;',
    '  pointer-events: none;',
    '}',
    ':host(yy-nav) .panel,',
    ':host(yy-nav) .cap,',
    ':host(yy-nav) .skip{ pointer-events: auto; }',
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
       Reference look: frosted translucent fill so page type reads through,
       inset hairlines, drop shadow, saturate so colour behind stays alive.
       -------------------------------------------------------------------- */
    '.cap{',
    '  position: absolute; z-index: 4; left: 50%; bottom: 16px;',
    '  transform: translateX(-50%);',
    '  display: flex; align-items: center; gap: 2px;',
    '  padding: 6px;',
    '  box-sizing: border-box;',
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
    '  overflow: hidden;',
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
    '  :host{ --yy-fill: rgba(255,255,255,.94); --yy-hair: rgba(26,25,23,.10); }',
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
    '  transition: color .2s var(--yy-ease), font-weight .2s var(--yy-ease);',
    '}',
    '.cap a:hover, .cap button:hover{ color: var(--yy-ink); background: transparent; }',
    '.cap a:focus-visible, .cap button:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 1px; }',
    '.cap a[aria-current="page"]{ color: var(--yy-ink); background: transparent; font-weight: 600; }',
    '.cap button[aria-expanded="true"]{ color: var(--yy-ink); background: transparent; font-weight: 600; }',
    '.cap button[aria-current="location"]{ color: var(--yy-ink); font-weight: 600; background: transparent; }',
    '.cap-back{ display: inline-flex !important; align-items: center; justify-content: center; padding: 8px 12px !important; }',
    '.cap-back svg{ display: block; width: 16px; height: 16px; }',

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

    /* ---- navigation panel --------------------------------------------- */
    '.panel{',
    '  position: absolute; z-index: 1; left: 0; right: 0; bottom: auto;',
    '  top: max(16px, calc((100vh - var(--yy-nav-zone) - var(--yy-panel-height)) / 2));',
    '  top: max(16px, calc((100dvh - var(--yy-nav-zone) - var(--yy-panel-height)) / 2));',
    '  width: var(--yy-panel-width); height: var(--yy-panel-height);',
    '  margin-inline: auto; overflow: hidden;',
    '  box-sizing: border-box; border: 0; border-radius: var(--yy-panel-radius);',
    '  color: var(--yy-ink); background: var(--yy-fill);',
    '  -webkit-backdrop-filter: blur(12px) saturate(1.6);',
    '  backdrop-filter: blur(12px) saturate(1.6);',
    '  box-shadow:',
    '    inset 0 1px 0 rgba(255,255,255,.92),',
    '    inset 0 0 0 1.5px rgba(255,255,255,.82),',
    '    inset 0 -1px 0 rgba(26,25,23,.05),',
    '    0 5px 50px 5px rgba(0,0,0,.18);',
    '  opacity: 0; visibility: hidden; pointer-events: none;',
    '  transform-origin: center bottom; contain: layout paint;',
    '  transition: background-color 680ms var(--ease-smooth-out,ease-out), box-shadow 680ms var(--ease-smooth-out,ease-out), backdrop-filter 680ms var(--ease-smooth-out,ease-out);',
    '}',
    ':host(.is-open) .panel{ opacity: 1; visibility: visible; pointer-events: auto; }',
    '.panel.is-expanded{',
    '  inset: 0;',
    '  width: 100vw; height: 100vh; height: 100dvh; max-width: none;',
    '  border-radius: 0; background: var(--yy-panel-full-fill);',
    '  -webkit-backdrop-filter: blur(20px) saturate(1.35);',
    '  backdrop-filter: blur(20px) saturate(1.35);',
    '  box-shadow:',
    '    inset 0 0 0 1.5px rgba(255,255,255,.96),',
    '    inset 0 0 0 1px rgba(255,255,255,.88),',
    '    inset 0 1px 0 rgba(255,255,255,.96),',
    '    inset 0 -18px 42px rgba(255,255,255,.18);',
    '}',
    '.panel-scroll{',
    '  height: 100%; overflow: auto; overflow-y: auto;',
    '  overscroll-behavior: contain;',
    '  touch-action: pan-y;',
    '  -webkit-overflow-scrolling: touch;',
    '  scrollbar-gutter: stable; box-sizing: border-box;',
    '}',
    '.panel-view{ min-height: 100%; box-sizing: border-box; padding: 72px clamp(24px,4vw,72px); }',
    '.panel-view--resume{ padding: 0; }',
    'yy-resume-content{ display: block; min-height: 100%; }',
    '.panel-view[hidden]{ display: none; }',
    '.panel-kicker{',
    '  margin: 0 0 10px; color: var(--yy-ink-dim);',
    '  font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase;',
    '}',
    '.panel-title{ margin: 0; font-size: clamp(32px,5vw,64px); line-height: 1; letter-spacing: -.04em; }',
    '.panel-note{ margin: 18px 0 0; max-width: 38rem; color: var(--yy-ink-dim); font-size: 14px; }',
    '.expand{',
    '  position: absolute; z-index: 2; top: 18px; right: 18px;',
    '  width: 38px; height: 38px; padding: 0; border: 0; border-radius: 999px;',
    '  color: var(--yy-ink); background: rgba(255,255,255,.38);',
    '  box-shadow: inset 0 0 0 1px rgba(255,255,255,.68), 0 3px 12px rgba(62,65,116,.12);',
    '  cursor: pointer; transition: background-color var(--duration-fast,.25s) var(--ease-smooth-out,ease-out), transform var(--duration-fast,.25s) var(--ease-smooth-out,ease-out);',
    '}',
    '.expand:hover{ background: rgba(255,255,255,.62); transform: scale(1.06); }',
    '.expand:active{ transform: scale(.94); }',
    '.expand:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 2px; }',
    /* Expanded layer is a dedicated URL — exit only via Back / history, never a shrink control. */
    '.panel.is-expanded .expand{ display: none !important; }',
    '.expand-icon{ position: absolute; inset: 10px; }',
    '.corner{ position: absolute; width: 6px; height: 6px; transition: transform var(--duration-slow,.4s) var(--m-overshoot,var(--ease-smooth-out,ease-out)); }',
    '.corner-nw{ left: 0; top: 0; border-left: 1.5px solid; border-top: 1.5px solid; }',
    '.corner-ne{ right: 0; top: 0; border-right: 1.5px solid; border-top: 1.5px solid; }',
    '.corner-sw{ left: 0; bottom: 0; border-left: 1.5px solid; border-bottom: 1.5px solid; }',
    '.corner-se{ right: 0; bottom: 0; border-right: 1.5px solid; border-bottom: 1.5px solid; }',
    '.panel.is-expanded .corner-nw{ transform: translate(4px,4px) rotate(180deg); }',
    '.panel.is-expanded .corner-ne{ transform: translate(-4px,4px) rotate(180deg); }',
    '.panel.is-expanded .corner-sw{ transform: translate(4px,-4px) rotate(180deg); }',
    '.panel.is-expanded .corner-se{ transform: translate(-4px,-4px) rotate(180deg); }',

    /* The full navigation is the default everywhere. Only an expanded panel
       earns the quiet Orbit state; touch never depends on hover to reveal nav. */
    '@media (hover: hover) and (pointer: fine) and (min-width: 561px){',
    '  .cap{',
    '    width: 377px; height: 56px;',
    '    transition:',
    '      width 520ms var(--yy-orbit-ease),',
    '      height 520ms var(--yy-orbit-ease),',
    '      padding 520ms var(--yy-orbit-ease),',
    '      background-color 680ms var(--ease-smooth-out,ease-out),',
    '      box-shadow 680ms var(--ease-smooth-out,ease-out);',
    '  }',
    '  .cap::before, .cap::after{',
    '    opacity: 0;',
    '    transition: opacity 680ms var(--ease-smooth-out,ease-out);',
    '  }',
    '  .cap > *{',
    '    opacity: 1; pointer-events: auto; transform: none;',
    '    transition: opacity 420ms var(--ease-smooth-out,ease-out), transform 520ms var(--yy-orbit-ease);',
    '  }',
    '  :host(.is-fullpage) .cap{',
    '    width: 36px; height: 36px; padding: 3px;',
    '    box-shadow:',
    '      inset 0 1px 0 rgba(255,255,255,.98),',
    '      inset 0 0 0 1.5px rgba(255,255,255,.96),',
    '      inset 0 -1px 0 rgba(26,25,23,.05),',
    '      0 1px 2px rgba(62,65,116,.07),',
    '      0 2px 8px -2px rgba(62,65,116,.09),',
    '      0 12px 36px -8px rgba(62,65,116,.20);',
    '  }',
    '  :host(.is-fullpage) .cap::before{ opacity: .80; }',
    '  :host(.is-fullpage) .cap::after{ opacity: 1; }',
    '  :host(.is-fullpage) .cap > *{ opacity: 0; pointer-events: none; transform: translateY(2px) scale(.90); }',
    '  :host(.is-fullpage) .cap:hover, :host(.is-fullpage) .cap:focus-within{',
    '    width: 377px; height: 56px; padding: 6px;',
    '  }',
    '  :host(.is-fullpage) .cap:hover::before, :host(.is-fullpage) .cap:focus-within::before{ opacity: .08; }',
    '  :host(.is-fullpage) .cap:hover::after, :host(.is-fullpage) .cap:focus-within::after{ opacity: .10; }',
    '  :host(.is-fullpage) .cap:hover > *, :host(.is-fullpage) .cap:focus-within > *{',
    '    opacity: 1; pointer-events: auto; transform: none;',
    '  }',
    '  /* Resume section nav must stay readable — Orbit compact would hide jumps. */',
    '  :host(.is-fullpage.is-resume-nav) .cap,',
    '  :host(.is-fullpage.is-resume-nav) .cap:hover,',
    '  :host(.is-fullpage.is-resume-nav) .cap:focus-within{',
    '    width: max-content; max-width: calc(100vw - 24px); height: 56px; padding: 6px;',
    '  }',
    '  :host(.is-fullpage.is-resume-nav) .cap::before,',
    '  :host(.is-fullpage.is-resume-nav) .cap::after,',
    '  :host(.is-fullpage.is-resume-nav) .cap:hover::before,',
    '  :host(.is-fullpage.is-resume-nav) .cap:focus-within::before,',
    '  :host(.is-fullpage.is-resume-nav) .cap:hover::after,',
    '  :host(.is-fullpage.is-resume-nav) .cap:focus-within::after{ opacity: 0; }',
    '  :host(.is-fullpage.is-resume-nav) .cap > *,',
    '  :host(.is-fullpage.is-resume-nav) .cap:hover > *,',
    '  :host(.is-fullpage.is-resume-nav) .cap:focus-within > *{',
    '    opacity: 1; pointer-events: auto; transform: none;',
    '  }',
    '  :host(.is-resume-nav) .cap{',
    '    width: max-content; max-width: calc(100vw - 24px);',
    '  }',
    '}',

    /* Below 560px the brand is the first thing to go: the four links are
       navigation, the brand is decoration that also links home. */
    '@media (max-width: 560px){',
    '  .brand, .rule{ display: none !important; }',
    '  .cap{ gap: 0; }',
    '  .cap a, .cap button{ padding: 8px 12px; font-size: 13px; }',
    '  :host(.is-resume-nav) .cap{',
    '    max-width: calc(100vw - 16px);',
    '    overflow-x: auto;',
    '    -webkit-overflow-scrolling: touch;',
    '    scrollbar-width: none;',
    '  }',
    '  :host(.is-resume-nav) .cap::-webkit-scrollbar{ display: none; }',
    '  :host(.is-resume-nav) .cap button{ padding: 8px 10px; font-size: 12px; }',
    '  .panel{',
    '    --yy-nav-zone: 64px;',
    '    width: calc(100vw - 24px); height: min(78vh,720px); height: min(78dvh,720px);',
    '    border-radius: 24px;',
    '  }',
    '  .panel.is-expanded{ inset: 0; width: 100vw; height: 100vh; height: 100dvh; border-radius: 0; }',
    '  .panel-view{ padding: 64px 24px 32px; }',
    '  .panel-view--resume{ padding: 0; }',
    '  .expand{ top: 14px; right: 14px; }',
    '}',
    '@media (max-height: 560px){',
    '  .panel{ --yy-nav-zone: 72px; top: 8px; height: calc(100vh - 80px); height: calc(100dvh - 80px); }',
    '  .panel.is-expanded{ inset: 0; height: 100vh; height: 100dvh; }',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  .cap, .cap::before, .cap::after, .cap > *, .expand, .corner{ transition-duration: 1ms !important; }',
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
    '.ft a,.ft button{ margin:0; padding:0; border:0; background:none; color: var(--yy-ink-dim); font:inherit; text-decoration: none; cursor:pointer; transition: color .2s var(--yy-ease); }',
    '.ft a:hover,.ft button:hover{ color: var(--yy-ink); text-decoration: underline; text-underline-offset: 3px; }',
    '.ft a:focus-visible,.ft button:focus-visible{ outline: 2px solid var(--yy-ink); outline-offset: 3px; border-radius: 2px; }',
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
       ROOT 只用于资源（css / 图片），那里相对路径才真的可能解析到别处。
       On the homepage, Work scrolls to #work instead of bouncing to projects.html. */
    var href = (here === 'index.html' && item.homeHref) ? item.homeHref : item.href;
    var attrs = 'href="' + esc(href) + '"';
    if (item.ext) attrs += ' target="_blank" rel="noopener"';
    if (!item.ext && item.href === here) attrs += ' aria-current="page"';
    return '<a ' + attrs + (item.ext ? ' class="ext"' : '') + '>' + esc(item.label) + '</a>';
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
    return '<button type="button" class="cap-back" data-resume-back aria-label="Back">' +
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
    return '<section class="panel-view" data-panel-view="' + esc(item.panel) + '" hidden>' +
      '<p class="panel-kicker">Component shell</p>' +
      '<h2 class="panel-title">' + esc(item.label) + '</h2>' +
      '<p class="panel-note">This space is ready for the ' + esc(item.label) + ' interface.</p>' +
    '</section>';
  }

  var resumeLoad = null;
  function ensureResumeComponent() {
    if (window.customElements && customElements.get('yy-resume-content')) {
      return Promise.resolve();
    }
    if (resumeLoad) return resumeLoad;
    resumeLoad = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = ROOT + 'assets/js/yy-resume.js';
      script.onload = resolve;
      script.onerror = function () {
        resumeLoad = null;
        reject(new Error('Resume component failed to load'));
      };
      (document.head || HTML).appendChild(script);
    });
    return resumeLoad;
  }

  function footerItem(item, here) {
    if (item.panel) {
      return '<button type="button" data-open-panel="' + esc(item.panel) + '">' + esc(item.label) + '</button>';
    }
    return link(item, here);
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
      if (name !== 'resume') return;
      ensureResumeComponent().catch(function (error) {
        var view = viewFor('resume');
        if (view) {
          view.innerHTML = '<p class="panel-note" role="alert">Resume could not load. Please try again.</p>';
        }
        if (window.console) console.error('[yy-chrome] resume load failed:', error);
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
      while (wrap.firstChild) cap.appendChild(wrap.firstChild);
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
        views[j].hidden = views[j].getAttribute('data-panel-view') !== name;
      }
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
        transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')'
      };
      var large = { opacity: 1, transform: 'none' };
      return closing ? [large, small] : [small, large];
    }

    function announcePanelState(expanded, open) {
      window.dispatchEvent(new CustomEvent('yy:panel-state', {
        detail: { expanded: expanded, open: open }
      }));
    }

    function animatePanel(from, closing, done) {
      if (panelAnimation) panelAnimation.cancel();
      if (reduced || !panel.animate) {
        done();
        return;
      }
      var to = panel.getBoundingClientRect();
      panelAnimation = panel.animate(keyframesBetween(from, to, closing), {
        duration: closing ? 350 : 500,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'both'
      });
      panelAnimation.onfinish = done;
      panelAnimation.oncancel = null;
    }

    function open(name, trigger, opener) {
      closing = false;
      lastOpener = opener || trigger || lastOpener;
      prepare(name);
      active = name;
      sync(name);
      var start = trigger.getBoundingClientRect();
      if (name === 'resume') enterResumeNav();
      else leaveResumeNav();
      clearFullpageUrl();
      panel.classList.remove('is-expanded');
      host.classList.remove('is-fullpage');
      HTML.classList.remove('yy-panel-fullpage');
      HTML.classList.add('yy-panel-open');
      setBackgroundInert(false);
      panel.setAttribute('aria-modal', 'false');
      expand.hidden = false;
      expand.setAttribute('aria-label', 'Expand panel');
      expand.setAttribute('aria-pressed', 'false');
      announcePanelState(false, true);
      host.classList.add('is-open');
      restoreViewScroll(name);
      var targetView = viewFor(name);
      animatePanel(start, false, function () {
        panelAnimation = null;
        if (targetView && !reduced && targetView.animate) {
          targetView.animate(
            [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
            { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' }
          );
        }
        if (!expand.hidden) expand.focus({ preventScroll: true });
      });
    }

    function close(returnFocus) {
      if (!active || closing) return;
      closing = true;
      var former = active;
      saveViewScroll(former);
      var wasExpanded = panel.classList.contains('is-expanded');
      if (wasExpanded) {
        host.classList.remove('is-fullpage');
        HTML.classList.remove('yy-panel-fullpage');
        setBackgroundInert(false);
        panel.setAttribute('aria-modal', 'false');
      }
      clearFullpageUrl();
      HTML.classList.remove('yy-panel-open');
      announcePanelState(false, false);
      setBackgroundInert(false);
      leaveResumeNav();
      var target = returnFocus || lastOpener || triggerFor(former);
      var destination = target ? target.getBoundingClientRect() : panel.getBoundingClientRect();
      for (var i = 0; i < triggers.length; i++) triggers[i].setAttribute('aria-expanded', 'false');
      animatePanel(destination, true, function () {
        if (!closing) return;
        panelAnimation = null;
        closing = false;
        active = '';
        host.classList.remove('is-open');
        host.classList.remove('is-fullpage');
        HTML.classList.remove('yy-panel-fullpage');
        HTML.classList.remove('yy-panel-open');
        setBackgroundInert(false);
        panel.setAttribute('aria-modal', 'false');
        panel.classList.remove('is-expanded');
        expand.hidden = false;
        expand.setAttribute('aria-label', 'Expand panel');
        expand.setAttribute('aria-pressed', 'false');
        for (var j = 0; j < views.length; j++) views[j].hidden = true;
        if (target) target.focus({ preventScroll: true });
      });
    }

    function switchView(name, opener) {
      closing = false;
      if (panelAnimation) panelAnimation.cancel();
      if (opener) lastOpener = opener;
      saveViewScroll(active);
      prepare(name);
      active = name;
      sync(name);
      if (name === 'resume') enterResumeNav();
      else leaveResumeNav();
      if (panel.classList.contains('is-expanded')) {
        /* Keep the fullpage layer, but retarget the hash to the active panel. */
        history.replaceState(
          { yyPanelFull: true, panel: name },
          '',
          location.pathname + location.search + fullpageHash(name)
        );
        fullHistoryPushed = true;
      }
      restoreViewScroll(name);
      var next = viewFor(name);
      if (next && !reduced && next.animate) {
        next.animate(
          [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 250, easing: 'cubic-bezier(.22,1,.36,1)' }
        );
      }
    }

    function applyExitFullpageUI() {
      if (!panel.classList.contains('is-expanded')) return;
      var before = panel.getBoundingClientRect();
      panel.classList.remove('is-expanded');
      host.classList.remove('is-fullpage');
      HTML.classList.remove('yy-panel-fullpage');
      setBackgroundInert(false);
      panel.setAttribute('aria-modal', 'false');
      announcePanelState(false, true);
      expand.hidden = false;
      expand.setAttribute('aria-label', 'Expand panel');
      expand.setAttribute('aria-pressed', 'false');
      fullHistoryPushed = false;
      var after = panel.getBoundingClientRect();
      if (!reduced && panel.animate) {
        var scale = Math.min(before.width / Math.max(after.width, 1), before.height / Math.max(after.height, 1));
        var dx = before.left + before.width / 2 - (after.left + after.width / 2);
        var dy = before.top + before.height / 2 - (after.top + after.height / 2);
        panel.animate([
          {
            transformOrigin: 'center',
            transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')'
          },
          { transformOrigin: 'center', transform: 'none' }
        ], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }

    function requestExitFullpage() {
      if (!panel.classList.contains('is-expanded')) return;
      if (fullHistoryPushed) {
        history.back();
        return;
      }
      applyExitFullpageUI();
    }

    function expandToFullpage() {
      if (closing || !active) return;
      if (panel.classList.contains('is-expanded')) return;
      var before = panel.getBoundingClientRect();
      panel.classList.add('is-expanded');
      host.classList.add('is-fullpage');
      HTML.classList.add('yy-panel-fullpage');
      setBackgroundInert(true);
      panel.setAttribute('aria-modal', 'false');
      announcePanelState(true, true);
      expand.hidden = true;
      expand.setAttribute('aria-pressed', 'true');
      history.pushState(
        { yyPanelFull: true, panel: active },
        '',
        location.pathname + location.search + fullpageHash(active)
      );
      fullHistoryPushed = true;
      var after = panel.getBoundingClientRect();
      if (!reduced && panel.animate) {
        var scale = Math.min(before.width / after.width, before.height / after.height);
        var dx = before.left + before.width / 2 - (after.left + after.width / 2);
        var dy = before.top + before.height / 2 - (after.top + after.height / 2);
        panel.animate([
          {
            transformOrigin: 'center',
            transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')'
          },
          { transformOrigin: 'center', transform: 'none' }
        ], { duration: 500, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    }

    function onCapClick(event) {
      var back = event.target.closest('[data-resume-back]');
      if (back && cap.contains(back)) {
        /* Fullpage is its own URL layer — Back returns to the previous page layer. */
        if (panel.classList.contains('is-expanded')) {
          requestExitFullpage();
          return;
        }
        leaveResumeNav();
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
    expand.addEventListener('click', expandToFullpage);
    window.addEventListener('popstate', function (event) {
      var state = event.state;
      if (panel.classList.contains('is-expanded') && !(state && state.yyPanelFull)) {
        applyExitFullpageUI();
      }
    });
    window.addEventListener('yy:open-panel', function (event) {
      var name = event.detail && event.detail.name;
      /* After Back, Resume triggers are gone — reopen via footer or recreate main capsule. */
      if (resumeNavMode && name && name !== 'resume') leaveResumeNav();
      var trigger = triggerFor(name);
      if (!trigger) {
        if (name === 'resume' && resumeNavMode) return;
        if (name === 'resume') {
          leaveResumeNav();
          trigger = triggerFor(name);
        }
      }
      if (!trigger) return;
      var opener = event.detail && event.detail.returnFocus;
      if (closing) open(name, trigger, opener);
      else if (!host.classList.contains('is-open')) open(name, trigger, opener);
      else if (active !== name) switchView(name, opener);
      else if (name === 'resume' && !resumeNavMode) enterResumeNav();
    });
    window.addEventListener('yy:resume-section', function (event) {
      var id = event.detail && event.detail.id;
      if (id) setResumeSectionCurrent(id);
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && active) {
        event.preventDefault();
        if (panel.classList.contains('is-expanded')) {
          requestExitFullpage();
          return;
        }
        close();
      }
    });
  }

  function setupFooterPanelTriggers(host) {
    var buttons = host.shadowRoot.querySelectorAll('[data-open-panel]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (event) {
        window.dispatchEvent(new CustomEvent('yy:open-panel', {
          detail: {
            name: event.currentTarget.getAttribute('data-open-panel'),
            returnFocus: event.currentTarget
          }
        }));
      });
    }
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
      '<div class="panel" id="yy-nav-panel" role="dialog" aria-modal="false" aria-label="Navigation content">' +
        '<button class="expand" type="button" aria-label="Expand panel" aria-pressed="false">' +
          '<span class="expand-icon" aria-hidden="true">' +
            '<span class="corner corner-nw"></span><span class="corner corner-ne"></span>' +
            '<span class="corner corner-sw"></span><span class="corner corner-se"></span>' +
          '</span>' +
        '</button>' +
        '<div class="panel-scroll">' + NAV.map(panelView).join('') + '</div>' +
      '</div>' +
      '<nav class="cap" aria-label="Main" style="--yy-orb:url(' +
        esc(ROOT + 'assets/images/ui/nav-orb.gif') + ')">' +
        '<a class="brand" href="index.html"' +
          (here === 'index.html' ? ' aria-current="page"' : '') + '>Yanice Yang</a>' +
        '<span class="rule" aria-hidden="true"></span>' +
        NAV.map(panelTrigger).join('') +
      '</nav>';

    var navHost = shadow('yy-nav', navHTML);
    document.body.insertBefore(navHost, document.body.firstChild);
    setupPanel(navHost);

    /* ---- footer ----
       One code path, three cases. Insert after `.footer-credit-wrapper` where
       it exists (9 pages) and let the boot CSS hide the original; append to
       body where it does not (fashion.html, tiktok-research.html).

       `.four-column` is NEVER touched — the prev/next project links in it are
       content, not chrome. */
    var footHTML =
      '<footer class="ft">' +
        '<nav aria-label="Footer">' +
          FOOT.map(function (i) { return footerItem(i, here); }).join('') +
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
    setupFooterPanelTriggers(host);
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
