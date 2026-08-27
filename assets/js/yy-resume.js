(function () {
  'use strict';

  if (!window.customElements || customElements.get('yy-resume-content')) return;

  var SRC = (document.currentScript && document.currentScript.src) || '';
  var ROOT = SRC ? SRC.replace(/assets\/js\/yy-resume\.js.*$/, '') : '';

  var jobs = [
    {
      company: 'AtlasNova AI',
      url: 'https://www.atlasnova.ai/',
      role: 'Design & Product Lead, AI Product',
      date: 'Sep 2025 — Present',
      type: 'Full-time',
      location: 'Bay Area, CA',
      summary: 'Design and product lead for an agentic marketing automation platform, partnering with founders and engineering to define the MVP, product flows, and release-ready requirements.',
      highlights: [
        'Defined the MVP scope, customer data objects, product flows, and release-ready requirements with founders and engineering.',
        'Designed human-in-the-loop Content Studio workflows spanning prompting, templates, brand grounding, and controllable campaign, image, and video generation.',
        'Designed Ads Manager workflows across Meta, TikTok, and Google Ads, from creative generation and targeting through launch, review, and analytics.',
        'Partnered with engineering on a multilevel account architecture for headquarters, store managers, and local teams.'
      ]
    },
    {
      company: 'Cummins Inc.',
      url: 'https://www.cummins.com/',
      role: 'Senior Product Designer',
      date: 'Jul 2023 — Sep 2025',
      type: 'Full-time',
      summary: 'Led end-to-end design for Guidanz, a web and mobile SaaS product that helps technicians diagnose and repair heavy-duty engines.',
      highlights: [
        'Redesigned online diagnostic sessions by reframing the information architecture and introducing a side panel, helping technicians resolve field-service issues faster.',
        'Built a scalable design system from the ground up, reducing design-to-development handoff time by 50% and improving consistency across platforms.',
        'Conducted on-site research with certified Cummins technicians; findings directly informed product iterations and improved task completion.',
        'Reworked calibration installation flows and UI, improving task efficiency by 31.2%.'
      ]
    },
    {
      company: 'Thunderbit AI',
      url: 'https://thunderbit.com/',
      role: 'UX Strategy Intern',
      date: 'May 2023 — Dec 2023',
      type: 'Internship',
      summary: 'Led design strategy and early business-use-case exploration for Thunderbit AI’s MVP, supporting growth from zero to 5K daily active users and the product monetization roadmap.',
      highlights: [
        'Conducted market and competitor research on AI productivity tools to shape the MVP concept, core functionality, and AI-first product flow.',
        'Led global expert and user interviews to define core user flows and inform product strategy.',
        'Introduced LLM-driven design thinking and early prompt-design experiments to validate co-creation between users and AI agents.'
      ]
    },
    {
      company: 'McKinsey & Company',
      url: 'https://www.mckinsey.com/',
      role: 'UX Designer',
      date: 'Jun 2022 — Aug 2022',
      type: 'Internship',
      summary: 'Designed B2B and B2C experiences across e-commerce and data management.',
      highlights: [
        'Shipped a live-shopping mobile experience that reached 100% user satisfaction during an eight-week engagement.',
        'Built core flows for a global data-management platform, combining user research, UX strategy, and business goals to increase adoption by 20%.',
        'Facilitated cross-team workshops and coached client and internal teams on Lean UX principles.',
        'Contributed visual styles, 50+ components, and 10+ interaction patterns to the McKinsey Digital design system.'
      ]
    },
    {
      company: 'TikTok, ByteDance',
      url: 'https://www.tiktok.com/',
      role: 'Product Designer',
      date: 'Oct 2020 — Aug 2021',
      type: 'Full-time',
      summary: 'Redesigned Lark onboarding, led research for the Lark for School MVP, and informed TikTok Trust & Safety guidelines through global research.',
      highlights: [
        'Iterated Lark onboarding and member-invitation flows for mobile and web, increasing new-user engagement by 14%.',
        'Led on-site and remote research for Lark for School through surveys, interviews, and competitive analysis.',
        'Assessed content-moderation strategy through 30+ global expert interviews and surveys of more than 10,000 users.'
      ]
    },
    {
      company: 'Xiaomi Global',
      url: 'https://www.mi.com/',
      role: 'Product Designer',
      date: 'Oct 2019 — Oct 2020',
      type: 'Full-time',
      summary: 'Rebuilt key experiences for Mi Finance, a digital banking service.',
      highlights: [
        'Improved account opening from customer feedback and rebuilt the dashboard information architecture, increasing conversion by 25%.',
        'Applied financial-domain and regulatory knowledge to product design decisions.',
        'Collaborated with brand design to build the Airstar Bank Global design system.'
      ]
    }
  ];

  var education = [
    { school: 'University of Michigan', degree: 'Master of Science in Information', detail: 'Human–Computer Interaction · GPA 4.0' },
    { school: 'Pratt Institute', degree: 'Bachelor of Fine Arts', detail: 'Fashion Design' }
  ];

  var awards = [
    { name: 'iF Design Award', tier: 'Winner', note: 'Digital product experience' },
    { name: 'Red Dot Design Award', tier: 'Winner', note: 'Interactive experience recognition' },
    { name: 'A’ Design Award', tier: 'Winner', note: 'Interface, interaction, and UX design' },
    { name: 'VEGA Design Award', tier: 'Gold Winner', note: 'The Future of At-Home AI Concert Experiences' },
    { name: 'MUSE Design Award', tier: 'Platinum Gold Winner', note: 'OpusClip — Product UX and AI creative workflow', url: 'https://design.museaward.com/winner-info.php?id=21933' }
  ];

  var publications = [
    { title: 'DeepSORT-Driven Visual Tracking Approach for Gesture Recognition in Interactive Systems', publisher: 'IEEE · May 2025', url: 'https://arxiv.org/abs/2505.07110' },
    { title: 'Automated UI Interface Generation via Diffusion Models: Enhancing Personalization and Efficiency', publisher: 'ISCAIT 2025 · Mar 2025', url: 'https://arxiv.org/abs/2503.20229' },
    { title: 'Optimizing Gesture Recognition for Seamless UI Interaction Using Convolutional Neural Networks', publisher: 'IEEE · Nov 2024', url: 'https://arxiv.org/abs/2411.15598' },
    { title: 'Computer Vision-Driven Gesture Recognition: Toward Natural and Intuitive Human–Computer Interfaces', publisher: 'IEEE · Nov 2024', url: 'https://arxiv.org/abs/2412.18321' }
  ];

  var skills = [
    { category: 'Design', items: ['UI and interaction design', 'Prototyping', 'Wireframing', 'Design systems', 'Motion design', 'Information architecture', 'User journeys and flows', 'Accessibility and inclusive design'] },
    { category: 'Research', items: ['User interviews', 'Field research', 'Surveys', 'Usability testing', 'A/B testing', 'Heuristic evaluation', 'Competitive analysis', 'Journey mapping', 'Kano model'] },
    { category: 'AI tools', items: ['Cursor', 'ChatGPT', 'Claude', 'Midjourney', 'Adobe Firefly', 'Runway', 'Framer AI', 'Notion AI', 'Canva', 'Whisper', 'Kimi', 'Warp', 'Gamma'] },
    { category: 'Development and collaboration', items: ['HTML', 'CSS', 'JavaScript', 'Python', 'SQL', 'R', 'WebGL', 'Astro', 'Cloudflare', 'Agile development', 'Jira', 'Cross-functional collaboration'] }
  ];

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
          '<h1 class="resume__name">Yanice Yang</h1>' +
          '<p class="resume__title">Senior Product Designer</p>' +
          '<p class="resume__location">Bay Area, United States</p>' +
          '<div class="resume__contact" aria-label="Contact links">' +
            '<a href="mailto:yaniceydesign@gmail.com">Email</a>' +
            external('https://www.linkedin.com/in/yanice-yang', 'LinkedIn', false) +
          '</div>' +
        '</div>' +
      '</header>' +
      '<section class="resume-section resume-grid resume-rule" id="work" aria-labelledby="resume-work-heading">' +
        '<div class="resume__label"><h2 class="resume-eyebrow" id="resume-work-heading">Work</h2><p class="resume__range">2019 — Present</p></div>' +
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
