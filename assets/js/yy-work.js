(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-work-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-work\.js.*$/, '') : '';

  var cardsLoad = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadCards() {
    if (cardsLoad) return cardsLoad;
    cardsLoad = fetch(ROOT + 'projects-data.json', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('projects-data.json failed with ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        return Array.isArray(payload.cards) ? payload.cards : [];
      })
      .catch(function (error) {
        cardsLoad = null;
        if (window.console) console.error('[yy-work] project data failed:', error);
        return [];
      });
    return cardsLoad;
  }

  function cardHTML(card) {
    var title = card.title || card.slug || 'Project';
    var sub = card.sub || card.note || card.status || '';
    var inner =
      '<div class="card__media" style="background-image:url(\'' + esc(card.cover || '') + '\')"></div>' +
      '<div class="card__meta">' +
        '<p class="card__title">' + esc(title) + '</p>' +
        '<p class="card__sub">' + esc(sub) + '</p>' +
      '</div>';
    if (card.unavailable || !card.href) {
      return '<article class="card card--unable" aria-label="' + esc(title) + '">' + inner + '</article>';
    }
    return '<a class="card" href="' + esc(card.href) + '" data-cursor-label="view">' + inner + '</a>';
  }

  function render(cards) {
    if (!cards.length) {
      return '<div class="work"><p class="work__empty" role="alert">Work is temporarily unavailable.</p></div>';
    }
    return '<div class="work">' +
      '<div class="work__grid">' + cards.map(cardHTML).join('') + '</div>' +
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
        loadCards().then(function (cards) {
          /* Paint markup only after CSS applies — never show unstyled HTML. */
          var shell = document.createElement('div');
          shell.innerHTML = render(cards);
          while (shell.firstChild) shadow.appendChild(shell.firstChild);
          if (typeof window.__yyCursorBind === 'function') window.__yyCursorBind(shadow);
          self.removeAttribute('data-yy-pending');
          resolve();
        });
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
