(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-about-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-about\.js.*$/, '') : '';

  /* Copy comes from src/content/pages/about.md (frontmatter `about`), embedded
     by BaseLayout.astro as #yy-content. Story paragraphs are trusted HTML
     authored in the content file (they use <strong> and <br>). */
  function readAbout() {
    var el = document.getElementById('yy-content');
    if (!el) return null;
    try { return JSON.parse(el.textContent || '{}').about || null; } catch (e) { return null; }
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

  function img(src, alt) {
    return '<img src="' + esc(asset(src)) + '" alt="' + esc(alt) + '" loading="lazy">';
  }

  var ARROW =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M5.8335 14.1666L14.1668 5.83331M14.1668 5.83331H5.8335M14.1668 5.83331V14.1666" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  var PIN =
    '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
      '<path d="M17.3635 8.36364C17.3635 14.0909 9.99987 19 9.99987 19C9.99987 19 2.63623 14.0909 2.63623 8.36364C2.63623 6.41068 3.41204 4.53771 4.79294 3.15681C6.17384 1.77591 8.04681 1.0001 9.99987 1.0001C11.9529 1.0001 13.8259 1.77591 15.2068 3.15681C16.5877 4.53771 17.3635 6.41068 17.3635 8.36364Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M9.99987 10.8182C11.3555 10.8182 12.4544 9.71924 12.4544 8.36364C12.4544 7.00803 11.3555 5.90909 9.99987 5.90909C8.64426 5.90909 7.54532 7.00803 7.54532 8.36364C7.54532 9.71924 8.64426 10.8182 9.99987 10.8182Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  function button(href, label, external) {
    return '<a class="about__btn" href="' + esc(href) + '"' +
      (external ? ' target="_blank" rel="noopener"' : '') + '>' + esc(label) + ARROW + '</a>';
  }

  function story(item) {
    var images = (item.images || []).map(function (im) { return img(im.src, im.alt); }).join('');
    return '<div class="about__story">' +
      '<div class="about__pair">' + images + '</div>' +
      '<div class="about__story-copy">' +
        '<h3>' + esc(item.title) + '</h3>' +
        '<p>' + (item.html || '') + '</p>' +
      '</div>' +
    '</div>';
  }

  function render() {
    var a = readAbout();
    if (!a) return '<article class="about"><p class="panel-note" role="alert">About content is missing.</p></article>';
    return '<article class="about">' +
      '<header class="about__hero">' +
        '<div class="about__copy">' +
          '<p class="about__place">' + PIN + '<span>' + esc(a.place) + '</span></p>' +
          '<p class="about__hello">' + esc(a.hello) + '</p>' +
          '<h1 class="about__name">' + esc(a.name) + '</h1>' +
          '<p class="about__lead">' + esc(a.lead) + '</p>' +
          button(a.linkedin, 'LinkedIn', true) +
        '</div>' +
        '<div class="about__portrait">' +
          '<div class="about__portrait-frame">' +
            img(a.portrait.src, a.portrait.alt) +
            (a.aurora ? '<img class="about__aurora" alt="" aria-hidden="true" src="' + esc(asset(a.aurora)) + '">' : '') +
          '</div>' +
        '</div>' +
      '</header>' +
      '<section class="about__bio">' +
        (a.bio || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        (a.funFact ? '<h2>' + esc(a.funFact.title) + '</h2><p>' + esc(a.funFact.text) + '</p>' : '') +
        (a.cta ? button(a.cta.href, a.cta.label, /^https?:/.test(a.cta.href)) : '') +
      '</section>' +
      '<section class="about__stories" aria-labelledby="about-stories-heading">' +
        '<h2 id="about-stories-heading">' + esc(a.storiesTitle) + '</h2>' +
        (a.stories || []).map(story).join('') +
      '</section>' +
    '</article>';
  }

  function YYAboutContent() {
    var self = Reflect.construct(HTMLElement, [], YYAboutContent);
    var shadow = self.attachShadow({ mode: 'open' });
    var sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = ROOT + 'assets/css/yy-about.css';
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

  YYAboutContent.prototype = Object.create(HTMLElement.prototype);
  YYAboutContent.prototype.constructor = YYAboutContent;
  Object.setPrototypeOf(YYAboutContent, HTMLElement);

  customElements.define('yy-about-content', YYAboutContent);
})();
