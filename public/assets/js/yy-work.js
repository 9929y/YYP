(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-work-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-work\.js.*$/, '') : '';

  /* Cards come from src/content/pages/work.md (frontmatter `cards`), embedded
     by BaseLayout.astro as #yy-content. */
  function readCards() {
    var el = document.getElementById('yy-content');
    if (!el) return [];
    try { return (JSON.parse(el.textContent || '{}').work) || []; } catch (e) { return []; }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function asset(path) {
    return path && path.charAt(0) === '/' ? path : ROOT + path;
  }

  function cardHTML(card) {
    var inner =
      '<div class="card__media" style="background-image:url(\'' + esc(asset(card.cover)) + '\')' +
        (card.coverPosition ? ';background-position:' + esc(card.coverPosition) : '') + '"></div>' +
      '<div class="card__meta">' +
        '<p class="card__title">' + esc(card.title) + '</p>' +
        '<p class="card__sub">' + esc(card.subtitle) + '</p>' +
      '</div>';
    if (card.comingSoon || !card.href) {
      return '<article class="card card--unable" aria-label="' + esc(card.title) + '">' + inner + '</article>';
    }
    return '<a class="card" href="' + esc(card.href) + '" data-cursor-label="view">' + inner + '</a>';
  }

  function render() {
    return '<div class="work">' +
      '<div class="work__grid">' + readCards().map(cardHTML).join('') + '</div>' +
    '</div>';
  }

  function YYWorkContent() {
    var self = Reflect.construct(HTMLElement, [], YYWorkContent);
    var shadow = self.attachShadow({ mode: 'open' });
    var sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = ROOT + 'assets/css/yy-work.css';
    self.setAttribute('data-yy-pending', '');
    self.__yyStylesReady = new Promise(function (resolve) {
      var settled = false;
      function done() {
        if (settled) return;
        settled = true;
        /* Paint markup only after CSS applies — never show unstyled HTML. */
        var shell = document.createElement('div');
        shell.innerHTML = render();
        while (shell.firstChild) shadow.appendChild(shell.firstChild);
        if (typeof window.__yyCursorBind === 'function') window.__yyCursorBind(shadow);
        self.removeAttribute('data-yy-pending');
        resolve();
      }
      sheet.addEventListener('load', done);
      sheet.addEventListener('error', done);
      shadow.appendChild(sheet);
      try { if (sheet.sheet) done(); } catch (err) {}
    });
    return self;
  }

  YYWorkContent.prototype = Object.create(HTMLElement.prototype);
  YYWorkContent.prototype.constructor = YYWorkContent;
  Object.setPrototypeOf(YYWorkContent, HTMLElement);

  customElements.define('yy-work-content', YYWorkContent);
})();
