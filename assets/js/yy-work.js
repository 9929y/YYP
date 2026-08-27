(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-work-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-work\.js.*$/, '') : '';

  var cards = [
    {
      href: 'ai-driven-product-design.html',
      cover: 'assets/images/opusclip/hero-opusclip-ai-video-editing-cover.webp',
      pos: '50%',
      title: 'AI-powered Video Tool',
      sub: 'Launch new features with AI'
    },
    {
      href: 'mckinseyecommerce.html',
      cover: 'assets/images/mckinsey/illustration-mckinsey-design-ecommerce-cover.webp',
      pos: '50% 0',
      title: 'Digital Consulting UXD',
      sub: 'build a product from 0 to 1'
    },
    {
      href: 'larkdesign.html',
      cover: 'assets/images/lark/illustration-bytedance-workspace-modules-ring.webp',
      pos: '50%',
      title: 'All-in-One Office Tool UXD',
      sub: 'Product Ideations and iterations'
    },
    {
      href: 'cummins-digitalization.html',
      cover: 'assets/images/cummins/hero-cummins-diagnostic-session-screens.webp',
      pos: '50% 100%',
      title: 'Cummins Digital Tool UXD',
      sub: 'Design system, ideation and research'
    },
    {
      href: 'mifinance.html',
      cover: 'assets/images/mifinance/screen-mi-finance-e-account-screens-stack.webp',
      pos: '50%',
      title: 'Financial Digital Tool UXD',
      sub: 'ACCESSIBILITY&UX IMPROVEMENT'
    },
    {
      href: 'alzheimerdisease.html',
      cover: 'assets/images/home/hero-alzheimer-care-wearable-card-cover.webp',
      pos: '100%',
      title: 'Wearable Communication Device',
      sub: 'Benefit for medical realm'
    },
    {
      href: 'tiktok-research.html',
      cover: 'assets/images/tiktok/hero-tiktok-safety-strategy-cover.webp',
      pos: '0%',
      title: 'Global Platform Research Case Study',
      sub: 'Quantitative research & analysis'
    },
    {
      href: null,
      cover: 'assets/images/lark/illustration-lark-education-class-collaboration-cover.webp',
      pos: '50%',
      title: 'Lark Education Field Study',
      sub: 'Qualitative&Quantitative (ON process)',
      unable: true
    }
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHTML(card) {
    var inner =
      '<div class="card__media" style="background-image:url(\'' + esc(ROOT + card.cover) + '\')' +
        (card.pos ? ';background-position:' + esc(card.pos) : '') + '"></div>' +
      '<div class="card__meta">' +
        '<p class="card__title">' + esc(card.title) + '</p>' +
        '<p class="card__sub">' + esc(card.sub) + '</p>' +
      '</div>';
    if (card.unable) {
      return '<article class="card card--unable" aria-label="' + esc(card.title) + '">' + inner + '</article>';
    }
    return '<a class="card" href="' + esc(card.href) + '">' + inner + '</a>';
  }

  function render() {
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
    shadow.appendChild(sheet);
    var shell = document.createElement('div');
    shell.innerHTML = render();
    while (shell.firstChild) shadow.appendChild(shell.firstChild);
    return self;
  }

  YYWorkContent.prototype = Object.create(HTMLElement.prototype);
  YYWorkContent.prototype.constructor = YYWorkContent;
  Object.setPrototypeOf(YYWorkContent, HTMLElement);

  customElements.define('yy-work-content', YYWorkContent);
})();
