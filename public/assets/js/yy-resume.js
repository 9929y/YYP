(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-resume-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-resume\.js.*$/, '') : '';

  /* All resume data comes from src/content/pages/resume.md (frontmatter),
     embedded by BaseLayout.astro as #yy-content. */
  function readResume() {
    var el = document.getElementById('yy-content');
    if (!el) return null;
    try { return JSON.parse(el.textContent || '{}').resume || null; } catch (e) { return null; }
  }
  var data = readResume() || {};
  var profile = data.profile || {};
  var workRange = data.workRange || '';
  var jobs = data.jobs || [];
  var education = data.education || [];
  var awards = data.awards || [];
  var publications = data.publications || [];
  var skills = data.skills || [];

  var previewLoad = null;
  function ensureLinkPreview() {
    if (window.YYLinkPreview) return Promise.resolve(window.YYLinkPreview);
    if (previewLoad) return previewLoad;
    previewLoad = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = ROOT + 'assets/js/yy-link-preview.js';
      script.onload = function () { resolve(window.YYLinkPreview); };
      script.onerror = function () {
        previewLoad = null;
        reject(new Error('Link preview failed to load'));
      };
      (document.head || document.documentElement).appendChild(script);
    });
    return previewLoad;
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function external(url, label, withPreview) {
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener"' +
      (withPreview ? ' data-yy-preview' : '') + '>' + esc(label) + ' ↗</a>';
  }

  function jobCard(job) {
    return '<article class="resume-card resume-job">' +
      '<div class="resume-job__header">' +
        '<h3>' + external(job.url, job.company, true) + '</h3>' +
        '<p class="resume-job__role">' + esc(job.role) + '</p>' +
      '</div>' +
      '<p class="resume-job__meta">' +
        (job.location ? '<span>' + esc(job.location) + '</span>' : '') +
        '<span>' + esc(job.date) + '</span><span>' + esc(job.type) + '</span>' +
      '</p>' +
      '<p class="resume-job__summary">' + esc(job.summary) + '</p>' +
      '<ul>' + job.highlights.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>' +
    '</article>';
  }

  function render() {
    return '<main class="resume">' +
      '<header class="resume__hero resume-grid resume-rule">' +
        '<div class="resume__label"><p class="resume-eyebrow">Profile</p></div>' +
        '<div class="resume__intro">' +
          '<h1 class="resume__name">' + esc(profile.name) + '</h1>' +
          '<p class="resume__title">' + esc(profile.role) + '</p>' +
          '<p class="resume__location">' + esc(profile.location) + '</p>' +
          '<div class="resume__contact" aria-label="Contact links">' +
            '<a href="mailto:' + esc(profile.email) + '">Email</a>' +
            external(profile.linkedin, 'LinkedIn', false) +
          '</div>' +
        '</div>' +
      '</header>' +
      '<section class="resume-section resume-grid resume-rule" id="work" aria-labelledby="resume-work-heading">' +
        '<div class="resume__label"><h2 class="resume-eyebrow" id="resume-work-heading">Work</h2><p class="resume__range">' + esc(workRange) + '</p></div>' +
        '<div class="resume-section__body">' + jobs.map(jobCard).join('') + '</div>' +
      '</section>' +
      '<section class="resume-section resume-grid resume-rule" id="education" aria-labelledby="resume-education-heading">' +
        '<div class="resume__label"><h2 class="resume-eyebrow" id="resume-education-heading">Education</h2></div>' +
        '<div class="resume-section__body resume-section__body--grid">' +
          education.map(function (item) {
            return '<article class="resume-card resume-entry"><h3>' + esc(item.school) + '</h3>' +
              '<p>' + esc(item.degree) + '</p><p class="resume-entry__meta">' + esc(item.detail) + '</p></article>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<section class="resume-section resume-grid resume-rule" id="awards" aria-labelledby="resume-awards-heading">' +
        '<div class="resume__label"><h2 class="resume-eyebrow" id="resume-awards-heading">Awards</h2></div>' +
        '<div class="resume-section__body resume-section__body--grid">' +
          awards.map(function (award) {
            var title = award.url ? external(award.url, award.name, true) : esc(award.name);
            return '<article class="resume-card resume-entry"><div class="resume-entry__heading"><h3>' + title +
              '</h3><span>' + esc(award.tier) + '</span></div><p class="resume-entry__meta">' + esc(award.note) + '</p></article>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<section class="resume-section resume-grid resume-rule" id="publications" aria-labelledby="resume-publications-heading">' +
        '<div class="resume__label"><h2 class="resume-eyebrow" id="resume-publications-heading">Publications</h2></div>' +
        '<div class="resume-section__body resume-section__body--grid">' +
          publications.map(function (publication) {
            return '<article class="resume-card resume-entry"><h3>' + external(publication.url, publication.title, true) +
              '</h3><p class="resume-entry__meta">' + esc(publication.publisher) + '</p></article>';
          }).join('') +
        '</div>' +
      '</section>' +
      '<section class="resume-section resume-grid" id="skills" aria-labelledby="resume-skills-heading">' +
        '<div class="resume__label"><h2 class="resume-eyebrow" id="resume-skills-heading">Skills</h2></div>' +
        '<div class="resume-section__body resume-section__body--grid">' +
          skills.map(function (group) {
            return '<article class="resume-card resume-skills"><h3>' + esc(group.category) + '</h3>' +
              '<ul aria-label="' + esc(group.category) + '">' +
                group.items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') +
              '</ul></article>';
          }).join('') +
        '</div>' +
      '</section>' +
    '</main>';
  }

  function YYResumeContent() {
    var self = Reflect.construct(HTMLElement, [], YYResumeContent);
    var shadow = self.attachShadow({ mode: 'open' });
    var sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = ROOT + 'assets/css/yy-resume.css';
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

  YYResumeContent.prototype = Object.create(HTMLElement.prototype);
  YYResumeContent.prototype.constructor = YYResumeContent;
  Object.setPrototypeOf(YYResumeContent, HTMLElement);

  YYResumeContent.prototype.connectedCallback = function () {
    if (this.__yyReady) return;
    var host = this;
    function start() {
      if (host.__yyReady) return;
      host.__yyReady = true;

    var shadow = host.shadowRoot;
    var scroller = host.closest('.panel-scroll');
    var sections = Array.prototype.slice.call(shadow.querySelectorAll('.resume-section[id]'));
    var queued = false;
    var raf = 0;
    var currentId = '';
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SCROLL_INSET = 24;

    function announceSection(id) {
      if (!id || id === currentId) return;
      currentId = id;
      window.dispatchEvent(new CustomEvent('yy:resume-section', {
        detail: { id: id }
      }));
    }

    function update() {
      queued = false;
      raf = 0;
      if (!scroller || !sections.length) return;
      var scrollerRect = scroller.getBoundingClientRect();
      var line = scrollerRect.top + SCROLL_INSET;
      var current = sections[0].id;
      var nearest = Infinity;

      sections.forEach(function (section) {
        var rect = section.getBoundingClientRect();
        if (rect.top <= line && rect.bottom > line) {
          current = section.id;
          nearest = -1;
        } else if (nearest >= 0) {
          var distance = Math.abs(rect.top - line);
          if (distance < nearest) {
            nearest = distance;
            current = section.id;
          }
        }
      });

      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        current = sections[sections.length - 1].id;
      }
      announceSection(current);
    }

    function requestUpdate() {
      if (queued) return;
      queued = true;
      raf = window.requestAnimationFrame(update);
    }

    function navigateTo(id) {
      var section = shadow.getElementById(id);
      if (!section || !scroller) return;
      var top = scroller.scrollTop + section.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top - SCROLL_INSET;
      scroller.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
      announceSection(section.id);
    }

    function onNavigate(event) {
      var id = event.detail && event.detail.id;
      if (id) navigateTo(id);
    }

    if (scroller) scroller.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('yy:resume-navigate', onNavigate);
    host.__yyScroller = scroller;
    host.__yyRequestUpdate = requestUpdate;
    host.__yyOnNavigate = onNavigate;
    host.__yyRaf = function () { return raf; };

    ensureLinkPreview().then(function (api) {
      if (api && api.enhance) api.enhance(shadow);
    }).catch(function (error) {
      if (window.console) console.error('[yy-resume] link preview unavailable:', error);
    });

    update();
    }

    if (this.__yyStylesReady) this.__yyStylesReady.then(start);
    else start();
  };

  YYResumeContent.prototype.disconnectedCallback = function () {
    if (this.__yyScroller && this.__yyRequestUpdate) {
      this.__yyScroller.removeEventListener('scroll', this.__yyRequestUpdate);
    }
    if (this.__yyRequestUpdate) window.removeEventListener('resize', this.__yyRequestUpdate);
    if (this.__yyOnNavigate) window.removeEventListener('yy:resume-navigate', this.__yyOnNavigate);
    var raf = this.__yyRaf && this.__yyRaf();
    if (raf) window.cancelAnimationFrame(raf);
    this.__yyReady = false;
    this.__yyScroller = null;
    this.__yyRequestUpdate = null;
    this.__yyOnNavigate = null;
    this.__yyRaf = null;
  };

  customElements.define('yy-resume-content', YYResumeContent);
})();
