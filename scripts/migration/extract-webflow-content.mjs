#!/usr/bin/env node
/**
 * One-time migration: pull the words and media references out of the legacy
 * Webflow export (and the yy-* JS panels) and write them as content-collection
 * entries under `src/content/`.
 *
 * The legacy files no longer live on this branch. Point the script at a
 * checkout of `main` (or any commit that still has the .html pages):
 *
 *   node scripts/migration/extract-webflow-content.mjs /path/to/legacy/checkout
 *
 * Output is deterministic; re-running overwrites the generated files. Hand
 * edits belong in the content files themselves once the migration is frozen.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import * as cheerio from 'cheerio';
import YAML from 'yaml';

const LEGACY = path.resolve(process.argv[2] || '.');
const OUT = path.resolve(process.cwd(), 'src/content');

if (!fs.existsSync(path.join(LEGACY, 'larkdesign.html'))) {
  console.error(`No Webflow export found at ${LEGACY}. Pass the path to a checkout of main.`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Curated metadata (carried over from the old src/data/projects.ts). */
/* ------------------------------------------------------------------ */

const CASES = [
  {
    slug: 'ai-driven-product-design',
    legacyFile: 'ai-driven-product-design.html',
    title: 'Opus Clip',
    headline: 'Video Creation Beyond Prompts',
    scope: 'Web-based AI SaaS',
    note: 'Turning prompt-based generation into an intent-led video workflow',
    description: 'AI-driven product design for Opus Clip, from a prompt to a finished cut.',
    status: 'published',
    theme: 'dark',
    order: 1,
    featured: true,
    logo: { src: '/assets/images/brands/logo-opusclip.svg', alt: 'OpusClip', width: 135, height: 24 },
    video: {
      src: '/assets/videos/case-opusclip-marquee.mp4',
      poster: '/assets/images/home/case-opusclip-frame.jpg',
      width: 1440,
      height: 1080,
      label: 'Opus Clip marquee preview'
    }
  },
  {
    slug: 'atlasnova',
    legacyFile: null,
    title: 'AtlasNova',
    headline: 'AI-Guided Brand Discovery',
    scope: 'Web App',
    note: 'Designing a brand kit that helps SMB build up visual language across marketing assets',
    status: 'in-progress',
    theme: 'light',
    order: 2,
    featured: true,
    logo: { src: '/assets/images/brands/logo-atlasnova.svg', alt: 'AtlasNova', width: 133, height: 24 },
    video: {
      src: '/assets/videos/case-atlasnova.mp4',
      poster: '/assets/images/home/case-atlasnova-frame.jpg',
      width: 1440,
      height: 1080,
      label: 'AtlasNova brand kit input cover'
    }
  },
  {
    slug: 'mckinseyecommerce',
    legacyFile: 'mckinseyecommerce.html',
    title: 'McKinsey Ecommerce',
    headline: 'Live shopping from 0 to 1',
    scope: 'Mobile App',
    note: 'Helping an established organization build its first digital commerce business from the ground up.',
    status: 'published',
    theme: 'light',
    order: 3,
    featured: true,
    logo: { src: '/assets/images/brands/logo-mckinsey.svg', alt: 'McKinsey Design', width: 97, height: 44 },
    cover: { src: '/assets/images/home/case-mckinsey-frame.jpg', alt: 'McKinsey live-streamed ecommerce case study', width: 1440, height: 1080 },
    video: {
      src: '/assets/videos/case-mckinsey.mp4',
      poster: '/assets/images/home/case-mckinsey-frame.jpg',
      width: 1440,
      height: 1080,
      label: 'McKinsey orbit preview'
    }
  },
  {
    slug: 'larkdesign',
    legacyFile: 'larkdesign.html',
    title: 'Lark Design',
    headline: 'Team onboarding in all-in-one office tool',
    scope: 'Web & Mobile App',
    note: 'Reducing information gaps in Lark’s collaboration experience',
    status: 'published',
    theme: 'light',
    order: 4,
    featured: true,
    logo: { src: '/assets/images/brands/logo-bytedance.png', alt: 'ByteDance', width: 133, height: 22 },
    cover: { src: '/assets/images/home/case-lark-frame.jpg', alt: 'Lark Design onboarding case study', width: 1440, height: 1080 },
    video: {
      src: '/assets/videos/case-lark.mp4',
      poster: '/assets/images/home/case-lark-frame.jpg',
      width: 1440,
      height: 1080,
      label: 'Lark Design carousel preview'
    }
  },
  {
    slug: 'mifinance',
    legacyFile: 'mifinance.html',
    title: 'MiFinance',
    scope: 'Interaction & Craft',
    note: 'Account flows where the detail is the point.',
    status: 'published',
    theme: 'light',
    order: 5,
    featured: false,
    cover: { src: '/assets/images/home/hero-mi-finance-account-card-cover.webp', alt: 'MiFinance account flows case study', width: 492, height: 369 }
  },
  {
    slug: 'cummins-digitalization',
    legacyFile: 'cummins-digitalization.html',
    title: 'Cummins',
    scope: 'Enterprise · Digitalization',
    note: 'Service tooling for people who use it all day.',
    status: 'published',
    theme: 'light',
    order: 6,
    featured: false,
    cover: { src: '/assets/images/home/hero-cummins-guidanz-card-cover.webp', alt: 'Cummins service tooling case study', width: 492, height: 369 }
  },
  {
    slug: 'alzheimerdisease',
    legacyFile: 'alzheimerdisease.html',
    title: 'Medical Assistive',
    scope: 'Health · Wearable',
    note: 'A wearable for care, designed around the carer as much as the patient.',
    status: 'published',
    theme: 'dark',
    order: 7,
    featured: false,
    cover: { src: '/assets/images/home/hero-alzheimer-care-wearable-card-cover.webp', alt: 'Medical assistive wearable case study', width: 492, height: 369 }
  },
  {
    slug: 'tiktok-research',
    legacyFile: 'tiktok-research.html',
    title: 'TikTok Research',
    scope: 'Quantitative research & analysis',
    note: 'Global platform research case study.',
    status: 'published',
    theme: 'light',
    order: 8,
    featured: false
  },
  {
    slug: 'fashion',
    legacyFile: 'fashion.html',
    title: 'Fashion',
    scope: 'Gallery',
    note: 'Fashion design work from before UX.',
    status: 'published',
    theme: 'light',
    order: 9,
    featured: false
  }
];

/* Legacy .html → new route. */
const ROUTE = new Map([
  ['index.html', '/'],
  ['landing.html', '/'],
  ['projects.html', '/work'],
  ['aboutme.html', '/about'],
  ...CASES.filter((c) => c.legacyFile).map((c) => [c.legacyFile, `/work/${c.slug}`])
]);

/* ------------------------------------------------------------------ */
/* HTML → Markdown                                                     */
/* ------------------------------------------------------------------ */

const SKIP_SELECTOR = [
  'script:not(.w-json)',
  'style',
  'noscript',
  '.navbar',
  '.w-nav',
  '.footer-section',
  '.footer-credit-wrapper',
  '.w-webflow-badge',
  '[class*="preloader"]',
  '.w-condition-invisible'
].join(',');


function normalizeAsset(src) {
  if (!src) return null;
  let s = src.trim().split('?')[0];
  s = s.replace(/^(\.\.\/)+/, '').replace(/^\.?\//, '');
  if (/^https?:\/\//.test(s) || s.startsWith('data:')) return s;
  // The .mov clips were remuxed (losslessly, same H.264 stream) to .mp4 for browser support.
  s = s.replace(/\.mov$/i, '.mp4');
  return '/' + s.replace(/\\/g, '/');
}

function normalizeHref(href) {
  if (!href) return null;
  const h = href.trim();
  if (h.startsWith('#')) return h;
  if (/^(https?:|mailto:|tel:)/.test(h)) return h;
  const [file, hash] = h.split('#');
  const base = path.basename(file);
  return (ROUTE.get(base) || `/${base.replace(/\.html$/, '')}`) + (hash ? `#${hash}` : '');
}

const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

function clean(text) {
  return text
    .replace(INVISIBLE, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t\r\n]+/g, ' ')
    .replace(/(\s*<br>\s*)+$/g, '')
    .replace(/^(\s*<br>\s*)+/g, '')
    .replace(/(<br>\s*){2,}/g, '<br>')
    .trim();
}

function escapeMd(text) {
  return text.replace(/([*_`[\]])/g, '\\$1');
}

class Extractor {
  constructor($, pageName) {
    this.$ = $;
    this.page = pageName;
    this.blocks = [];
    this.media = { images: [], videos: [], iframes: [], lottie: [], lightboxes: 0 };
    this.links = new Set();
  }

  push(block) {
    if (!block || /^(<br>|\s)*$/.test(block)) return;
    const last = this.blocks[this.blocks.length - 1];
    if (last === block) return; // Webflow desktop/mobile duplicates
    this.blocks.push(block);
  }

  inline(node) {
    const $ = this.$;
    let out = '';
    for (const child of node.childNodes || []) {
      if (child.type === 'text') {
        out += escapeMd(child.data.replace(INVISIBLE, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' '));
        continue;
      }
      if (child.type !== 'tag') continue;
      const el = $(child);
      if (el.is(SKIP_SELECTOR)) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'br') { out += '<br>'; continue; }
      if (tag === 'img') { out += this.image(child, true); continue; }
      if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i') {
        const mark = tag === 'strong' || tag === 'b' ? '**' : '*';
        const raw = this.inline(child);
        const inner = clean(raw);
        if (!inner) continue;
        const trailingBreak = /(<br>\s*)+\s*$/.test(raw.replace(INVISIBLE, '').trim());
        out += ' ' + inner.split(/\s*<br>\s*/).filter(Boolean).map((part) => `${mark}${part}${mark}`).join('<br>') + (trailingBreak ? '<br>' : '') + ' ';
        continue;
      }
      if (tag === 'a') {
        const href = normalizeHref(el.attr('href'));
        const inner = this.inline(child).trim();
        if (href && !href.startsWith('#')) this.links.add(href);
        if (!inner) continue;
        out += href && href !== '#' ? `[${inner}](${href})` : inner;
        continue;
      }
      out += this.inline(child);
    }
    return out;
  }

  image(node, inlineOnly = false) {
    const $ = this.$;
    const el = $(node);
    const src = normalizeAsset(el.attr('src'));
    if (!src || src.startsWith('data:')) return '';
    const alt = clean(el.attr('alt') || '');
    const width = el.attr('width');
    const height = el.attr('height');
    this.media.images.push({ src, alt, width, height });
    const md = `![${alt.replace(/[[\]]/g, '')}](${src})`;
    if (!inlineOnly) this.push(md);
    return inlineOnly ? md : '';
  }

  lightbox(anchor) {
    const $ = this.$;
    const json = $(anchor).find('script.w-json').first().html();
    const shown = $(anchor).find('img').first();
    const shownSrc = shown.length ? normalizeAsset(shown.attr('src')) : null;
    if (shown.length) this.image(shown[0]);
    if (!json) return;
    let data;
    try { data = JSON.parse(json); } catch { return; }
    const items = (data.items || []).filter((it) => it.url);
    this.media.lightboxes += 1;
    const extra = items.map((it) => normalizeAsset(it.url)).filter((u) => u && u !== shownSrc);
    if (extra.length) {
      this.push(`<!-- lightbox: ${items.length} item(s) open in an overlay -->`);
      for (const u of extra) {
        this.media.images.push({ src: u, alt: '', lightbox: true });
        this.push(`![](${u})`);
      }
    } else {
      this.push(`<!-- lightbox: opens the image above in an overlay -->`);
    }
  }

  video(node) {
    const $ = this.$;
    const el = $(node);
    const src = normalizeAsset(el.attr('src') || el.find('source').first().attr('src'));
    if (!src) return;
    const attrs = ['autoplay', 'loop', 'muted', 'playsinline'].filter((a) => el.is(`[${a}]`));
    this.media.videos.push({ src, attrs });
    this.push(`<video src="${src}"${attrs.length ? ' ' + attrs.join(' ') : ''}></video>`);
  }

  iframe(node) {
    const el = this.$(node);
    const src = el.attr('src');
    if (!src) return;
    const title = clean(el.attr('title') || '');
    this.media.iframes.push({ src, title });
    this.push(`<iframe src="${src}"${title ? ` title="${title}"` : ''}></iframe>`);
  }

  lottie(node) {
    const el = this.$(node);
    const src = normalizeAsset(el.attr('data-src'));
    if (!src) return;
    this.media.lottie.push({ src, loop: el.attr('data-loop'), autoplay: el.attr('data-autoplay') });
    this.push(`<!-- lottie: ${src} -->`);
  }

  isLeafText(node) {
    // A div/span that carries text directly (Webflow "text block") and no block children.
    const $ = this.$;
    const el = $(node);
    if (!el.is('div,span')) return false;
    if (el.find('h1,h2,h3,h4,h5,h6,p,li,div,img,video,iframe,a').length) return false;
    const text = clean(el.text());
    return text.length > 0;
  }

  walk(node, depth = 0) {
    const $ = this.$;
    for (const child of node.childNodes || []) {
      if (child.type !== 'tag') continue;
      const el = $(child);
      if (el.is(SKIP_SELECTOR)) continue;
      const tag = child.tagName.toLowerCase();
      const cls = (el.attr('class') || '').split(/\s+/).filter(Boolean);

      if (tag === 'section' || cls.some((c) => /^section/.test(c))) {
        const id = el.attr('id');
        const label = [id ? `#${id}` : '', cls.filter((c) => c !== 'wf-section').slice(0, 2).map((c) => `.${c}`).join('')].filter(Boolean).join(' ');
        this.push(`<!-- section${label ? ': ' + label : ''} -->`);
      }

      if (/^h[1-6]$/.test(tag)) {
        const text = clean(this.inline(child));
        if (text) this.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
        continue;
      }
      if (tag === 'p' || tag === 'blockquote' || tag === 'figcaption') {
        const text = clean(this.inline(child));
        if (text) this.push(tag === 'blockquote' ? `> ${text}` : text);
        continue;
      }
      if (tag === 'ul' || tag === 'ol') {
        const items = el.children('li').toArray().map((li, i) => {
          const text = clean(this.inline(li));
          return text ? `${tag === 'ol' ? `${i + 1}.` : '-'} ${text}` : null;
        }).filter(Boolean);
        if (items.length) this.push(items.join('\n'));
        continue;
      }
      if (tag === 'a' && el.hasClass('w-lightbox')) { this.lightbox(child); continue; }
      if (tag === 'a') {
        const href = normalizeHref(el.attr('href'));
        if (href && !href.startsWith('#')) this.links.add(href);
        const hasBlocks = el.find('h1,h2,h3,h4,h5,h6,p,ul,ol,img,video,iframe').length > 0;
        if (!hasBlocks) {
          const text = clean(this.inline(child));
          if (text) this.push(href && href !== '#' ? `[${text}](${href})` : text);
          continue;
        }
        if (href && href !== '#') this.push(`<!-- link: the block(s) below link to ${href} -->`);
        this.walk(child, depth + 1);
        continue;
      }
      if (tag === 'img') { this.image(child); continue; }
      if (tag === 'video') { this.video(child); continue; }
      if (tag === 'iframe') { this.iframe(child); continue; }
      if (el.attr('data-animation-type') === 'lottie') { this.lottie(child); continue; }
      if (tag === "svg") continue;
      if (this.isLeafText(child)) {
        const text = clean(this.inline(child));
        if (text) this.push(text);
        continue;
      }
      this.walk(child, depth + 1);
    }
  }

  markdown() {
    // Collapse runs of section comments and drop trailing ones.
    const out = [];
    for (const b of this.blocks) {
      const isSection = b.startsWith('<!-- section');
      if (isSection && out.length && out[out.length - 1].startsWith('<!-- section')) out.pop();
      out.push(b);
    }
    while (out.length && out[out.length - 1].startsWith('<!-- section')) out.pop();
    return out.join('\n\n') + '\n';
  }
}

function loadPage(file) {
  const html = fs.readFileSync(path.join(LEGACY, file), 'utf8');
  const $ = cheerio.load(html);
  const meta = {
    title: clean($('title').text()),
    description: $('meta[name="description"]').attr('content') || undefined,
    ogTitle: $('meta[property="og:title"]').attr('content') || undefined,
    ogImage: $('meta[property="og:image"]').attr('content') || undefined,
    webflowPageId: $('html').attr('data-wf-page') || undefined
  };
  return { $, meta };
}

function extractPage(file) {
  const { $, meta } = loadPage(file);
  const ex = new Extractor($, file);
  ex.walk($('body')[0]);
  return { meta, body: ex.markdown(), media: ex.media, links: [...ex.links] };
}

/* ------------------------------------------------------------------ */
/* yy-*.js panels → rendered HTML → Markdown                           */
/* ------------------------------------------------------------------ */

function renderPanelScript(file) {
  let code = fs.readFileSync(path.join(LEGACY, 'assets/js', file), 'utf8');
  // Expose the module-private render() and data arrays.
  code = code.replace(/\}\)\(\);\s*$/, 'globalThis.__render = render; try { globalThis.__data = { jobs, education, awards, publications, skills }; } catch (e) {} try { globalThis.__cards = cards; } catch (e) {} })();');
  const sandbox = {
    window: { customElements: { get: () => undefined, define() {} } },
    customElements: { get: () => undefined, define() {} },
    document: { currentScript: { src: 'assets/js/' + file }, createElement: () => ({}) },
    HTMLElement: class {},
    Reflect,
    console
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { html: sandbox.__render(), data: sandbox.__data, cards: sandbox.__cards };
}

function markdownFromHtml(html, name) {
  const $ = cheerio.load(`<body>${html}</body>`);
  const ex = new Extractor($, name);
  ex.walk($('body')[0]);
  return { body: ex.markdown(), media: ex.media, links: [...ex.links] };
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log('wrote', path.relative(process.cwd(), file));
}

function md(frontmatter, body) {
  return `---\n${YAML.stringify(frontmatter, { lineWidth: 0 })}---\n\n${body}`;
}

function stripUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const inventory = { pages: {}, panels: {} };

/* Cases */
for (const c of CASES) {
  const { legacyFile, ...meta } = c;
  let body = '';
  let source;
  if (legacyFile) {
    const page = extractPage(legacyFile);
    body = page.body;
    source = { legacyFile, webflowPageId: page.meta.webflowPageId, legacyTitle: page.meta.title };
    inventory.pages[legacyFile] = { ...page.meta, media: page.media, links: page.links, blocks: body.split('\n\n').length };
  } else {
    body = '<!-- No legacy page. Case study copy still to be written. -->\n';
  }
  write(`cases/${c.slug}.md`, md(stripUndefined({ ...meta, source }), body));
}

/* About: Webflow page (the yy-about.js panel carries the same copy plus a fashion CTA). */
{
  const page = extractPage('aboutme.html');
  inventory.pages['aboutme.html'] = { ...page.meta, media: page.media, links: page.links };
  const panel = renderPanelScript('yy-about.js');
  const panelMd = markdownFromHtml(panel.html, 'yy-about.js');
  inventory.panels['yy-about.js'] = { media: panelMd.media, links: panelMd.links };
  write(
    'pages/about.md',
    md(
      {
        title: 'About',
        description: 'About Yanice Yang, product designer in the Bay Area.',
        source: { legacyFile: 'aboutme.html', webflowPageId: page.meta.webflowPageId, panelScript: 'assets/js/yy-about.js' }
      },
      `<!-- Source A: Webflow aboutme.html -->\n\n${page.body}\n<!-- Source B: nav "About" panel (yy-about.js). Same story, slightly different copy. Pick one. -->\n\n${panelMd.body}`
    )
  );
}

/* Resume: structured data lives in yy-resume.js. */
{
  const panel = renderPanelScript('yy-resume.js');
  const d = panel.data;
  inventory.panels['yy-resume.js'] = { jobs: d.jobs.length, education: d.education.length, awards: d.awards.length, publications: d.publications.length, skills: d.skills.length };
  write(
    'pages/resume.md',
    md(
      stripUndefined({
        title: 'Resume',
        description: 'Yanice Yang resume: work, education, awards, publications, skills.',
        source: { panelScript: 'assets/js/yy-resume.js' },
        profile: {
          name: 'Yanice Yang',
          role: 'Senior Product Designer',
          location: 'Bay Area, United States',
          email: 'yaniceydesign@gmail.com',
          linkedin: 'https://www.linkedin.com/in/yanice-yang'
        },
        workRange: '2019 — Present',
        jobs: d.jobs,
        education: d.education,
        awards: d.awards,
        publications: d.publications,
        skills: d.skills
      }),
      '<!-- All resume content is structured in the frontmatter above. -->\n'
    )
  );
}

/* Work index: projects.html + yy-work.js cards. */
{
  const page = extractPage('projects.html');
  inventory.pages['projects.html'] = { ...page.meta, media: page.media, links: page.links };
  const panel = renderPanelScript('yy-work.js');
  const cards = panel.cards.map((card) => ({
    href: card.href ? normalizeHref(card.href) : null,
    title: card.title,
    subtitle: card.sub,
    cover: normalizeAsset(card.cover),
    coverPosition: card.pos,
    comingSoon: Boolean(card.unable)
  }));
  inventory.panels['yy-work.js'] = { cards: cards.length };
  write(
    'pages/work.md',
    md(
      {
        title: 'Work',
        description: 'Selected projects by Yanice Yang.',
        source: { legacyFile: 'projects.html', webflowPageId: page.meta.webflowPageId, panelScript: 'assets/js/yy-work.js' },
        cards
      },
      `<!-- Source A: Webflow projects.html (card titles differ from the panel cards in frontmatter) -->\n\n${page.body}`
    )
  );
}

/* Home: current Astro landing copy + archived Webflow homepage. */
{
  const page = extractPage('index.webflow.html');
  inventory.pages['index.webflow.html'] = { ...page.meta, media: page.media, links: page.links };
  write(
    'pages/home.md',
    md(
      {
        title: 'Yanice Yang — Product Designer',
        description: 'Product designer. Selected work in research, consumer product, enterprise and health.',
        source: { legacyFile: 'index.webflow.html', astroFile: 'src/pages/index.astro (pre-rebuild)' },
        hero: {
          eyebrow: 'Yanice Yang',
          meta: ['Product Designer', 'Bay Area, US'],
          kicker: 'Portfolio',
          statement: {
            lead: 'Build AI-native experiences',
            pairs: [
              { beyond: 'prompts,', toward: 'intent.' },
              { beyond: 'outputs,', toward: 'outcomes.' },
              { beyond: 'automation,', toward: 'flow.' }
            ],
            accessible: 'Build AI-native experiences beyond prompts, toward intent. Beyond outputs, toward outcomes. Beyond automation, toward flow.'
          },
          canvasStill: '/assets/images/home/landing-canvas-still.png'
        },
        featuredLabel: 'Featured projects'
      },
      `<!-- Archived Webflow homepage (index.webflow.html), not live since the Astro landing shipped. Kept for copy reference. -->\n\n${page.body}`
    )
  );
}

/* Site chrome: nav, footer, social. */
write(
  'site/navigation.json',
  JSON.stringify(
    {
      brand: { label: 'Yanice Yang', href: '/', orb: '/assets/images/ui/nav-orb.gif' },
      primary: [
        { label: 'Work', href: '/work' },
        { label: 'About', href: '/about' },
        { label: 'Resume', href: '/resume' }
      ],
      legacyWebflowNav: [
        { label: 'Projects', href: '/work' },
        { label: 'About', href: '/about' }
      ],
      social: [
        { label: 'Resume (hello.cv)', href: 'https://302437672248143872.hello.cv/', icon: '/assets/images/ui/icon-resume.webp' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/in/yanice-yang', icon: '/assets/images/ui/icon-linkedin.webp' },
        { label: 'Email', href: 'mailto:yaniceydesign@gmail.com', icon: '/assets/images/ui/icon-email.webp' }
      ],
      footer: { credit: '© Yanice Yang 2026', prevLabel: 'Previous', nextLabel: 'Next Project' },
      caseOrder: CASES.filter((c) => c.status === 'published' && c.slug !== 'fashion').sort((a, b) => a.order - b.order).map((c) => c.slug)
    },
    null,
    2
  ) + '\n'
);

fs.writeFileSync(path.join(process.cwd(), 'scripts/migration/extraction-report.json'), JSON.stringify(inventory, null, 2) + '\n');
console.log('wrote scripts/migration/extraction-report.json');
