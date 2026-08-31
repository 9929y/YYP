#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const distDir = path.join(ROOT, 'dist');
const useDist = args.has('--dist');

const errors = [];
const warnings = [];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.astro') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

async function loadProjects() {
  return import(pathToFileURL(path.join(ROOT, 'src/data/projects.ts')).href);
}

function resolveRef(file, ref, baseDir) {
  const clean = ref.split('?')[0].split('#')[0];
  if (!clean) return null;
  if (clean.startsWith('/')) return path.join(baseDir, clean.replace(/^\//, ''));
  return path.normalize(path.join(path.dirname(file), clean));
}

function isRedirectStub(html) {
  return /http-equiv=["']refresh["']/i.test(html) || /location\.replace\s*\(/.test(html);
}

function checkHtmlFile(file, baseDir, optionalMissing, knownGenerated) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(baseDir, file);
  const redirect = isRedirectStub(html);
  if (html.includes('mcp.figma.com/mcp/html-to-design/capture.js')) {
    errors.push(`${rel}: temporary Figma capture script must not ship`);
  }
  if (
    rel.endsWith('.html') &&
    !redirect &&
    !html.includes('yy-tokens.css') &&
    !rel.startsWith('_astro')
  ) {
    errors.push(`${rel}: missing yy-tokens.css link`);
  }

  const refs = [];
  const re = /\b(?:src|href)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) refs.push(m[1]);

  /* srcset candidates count as references. They were unchecked until a whole
     case study's responsive variants 404'd in dist while every `src` resolved:
     the page built its srcset from a directory constant, so the full paths never
     appeared literally in source and the asset filter left the variants behind.
     A srcset candidate that 404s does not fall back to `src` — the browser just
     fails to paint the image at that viewport width, which is invisible until
     someone loads the page at exactly the wrong size. */
  const srcsetRe = /\bsrcset=["']([^"']+)["']/g;
  while ((m = srcsetRe.exec(html))) {
    for (const candidate of m[1].split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) refs.push(url);
    }
  }

  for (const ref of refs) {
    if (!ref || ref.startsWith('#') || ref.startsWith('mailto:') || ref.startsWith('tel:')) continue;
    if (/^https?:\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('//')) continue;
    const clean = ref.split('?')[0].split('#')[0].replace(/^\//, '');
    if (knownGenerated.has(clean) || knownGenerated.has(path.basename(clean))) continue;
    if (optionalMissing.has(clean)) continue;
    const resolved = resolveRef(file, ref, baseDir);
    if (resolved && !fs.existsSync(resolved)) {
      errors.push(`${rel}: broken ${ref}`);
    }
  }
}

const projectsMod = await loadProjects();
const schemaErrors = projectsMod.validateProjects();
for (const e of schemaErrors) errors.push(`projects schema: ${e}`);

if (!fs.existsSync(path.join(ROOT, 'src/pages/index.astro'))) {
  errors.push('src/pages/index.astro missing — Astro is the source of truth for the homepage');
}
if (fs.existsSync(path.join(ROOT, 'landing.html'))) {
  errors.push('root landing.html must not exist — Astro owns / and /landing.html');
}
// Every page is an Astro route now. A .html file at the repo root would be
// served by nothing in the build and by nothing in dev, so it can only be a
// stale copy someone is about to edit by mistake.
for (const name of fs.readdirSync(ROOT)) {
  if (name.endsWith('.html')) {
    errors.push(`root ${name} must not exist — pages live in src/pages/ and Astro emits them`);
  }
}

const resumePagePath = path.join(ROOT, 'src/pages/resume.astro');
if (fs.existsSync(resumePagePath)) {
  errors.push('src/pages/resume.astro must not exist — Resume is embedded in the shared popup');
}

const resumeCssPath = path.join(ROOT, 'assets/css/yy-resume.css');
const resumeCss = fs.existsSync(resumeCssPath) ? fs.readFileSync(resumeCssPath, 'utf8') : '';
for (const marker of [
  'font-family: Caveat',
  '--resume-brand-red',
  '.resume__contact a:hover',
  'backdrop-filter: blur(12px)',
  '.resume-section__body--grid',
  'scroll-margin-top: 24px'
]) {
  if (!resumeCss.includes(marker)) {
    errors.push(`assets/css/yy-resume.css missing ${marker}`);
  }
}

const chromePath = path.join(ROOT, 'assets/js/yy-chrome.js');
const chromeSource = fs.readFileSync(chromePath, 'utf8');
if (chromeSource.includes('resume.html')) {
  errors.push('yy-chrome.js must not expose Resume as a standalone route');
}
for (const marker of ['<yy-resume-content', 'ensureResumeComponent', '<yy-about-content', 'ensureAboutComponent', '<yy-work-content', 'ensureWorkComponent', 'yy:open-panel', 'RESUME_SECTIONS', 'data-resume-back', 'is-resume-nav', 'yy:resume-navigate', 'data-lenis-prevent']) {
  if (!chromeSource.includes(marker)) {
    errors.push(`yy-chrome.js missing embedded panel integration marker ${marker}`);
  }
}
if (chromeSource.includes("{ href: 'projects.html'") || chromeSource.includes("{ href: 'aboutme.html'")) {
  errors.push('yy-chrome.js must not route Work/About through standalone page hrefs in chrome config');
}

const resumeJsPath = path.join(ROOT, 'assets/js/yy-resume.js');
const resumeJs = fs.existsSync(resumeJsPath) ? fs.readFileSync(resumeJsPath, 'utf8') : '';
for (const marker of [
  "customElements.define('yy-resume-content'",
  'attachShadow',
  'disconnectedCallback',
  'resume-section',
  'resume-card',
  'yy:resume-section',
  'yy:resume-navigate',
  'data-yy-preview',
  'ensureLinkPreview'
]) {
  if (!resumeJs.includes(marker)) {
    errors.push(`assets/js/yy-resume.js missing ${marker}`);
  }
}
if (resumeJs.includes('data-resume-tabs') || resumeJs.includes('resume__tabs')) {
  errors.push('yy-resume.js must not render in-panel sticky tabs — section nav lives in the capsule');
}

const aboutJs = fs.existsSync(path.join(ROOT, 'assets/js/yy-about.js'))
  ? fs.readFileSync(path.join(ROOT, 'assets/js/yy-about.js'), 'utf8')
  : '';
for (const marker of ["customElements.define('yy-about-content'", 'attachShadow', 'A little about me', 'fashion.html']) {
  if (!aboutJs.includes(marker)) {
    errors.push(`assets/js/yy-about.js missing ${marker}`);
  }
}

const workJs = fs.existsSync(path.join(ROOT, 'assets/js/yy-work.js'))
  ? fs.readFileSync(path.join(ROOT, 'assets/js/yy-work.js'), 'utf8')
  : '';
for (const marker of ["customElements.define('yy-work-content'", 'attachShadow', 'ai-driven-product-design.html', 'Lark Education Field Study']) {
  if (!workJs.includes(marker)) {
    errors.push(`assets/js/yy-work.js missing ${marker}`);
  }
}
if (workJs.includes('inner-page-hero') || workJs.includes('xxl-heading')) {
  errors.push('yy-work.js must not include the projects page title/banner');
}

const linkPreviewPath = path.join(ROOT, 'assets/js/yy-link-preview.js');
const linkPreviewJs = fs.existsSync(linkPreviewPath) ? fs.readFileSync(linkPreviewPath, 'utf8') : '';
for (const marker of ['YYLinkPreview', 'api.microlink.io', 'data-yy-preview', 'enhance']) {
  if (!linkPreviewJs.includes(marker)) {
    errors.push(`assets/js/yy-link-preview.js missing ${marker}`);
  }
}

const requiredCaseStudyComponents = [
  'CaseSection.astro',
  'CaseMetaGrid.astro',
  'MediaVideo.astro',
  'CaseQuote.astro',
  'CaseStat.astro'
];
for (const component of requiredCaseStudyComponents) {
  const componentPath = path.join(ROOT, 'src/components', component);
  if (!fs.existsSync(componentPath)) {
    errors.push(`src/components/${component} missing — required by the case-study Foundation`);
  }
}

const caseStudyCssPath = path.join(ROOT, 'src/styles/case-study.css');
const caseStudyCss = fs.existsSync(caseStudyCssPath) ? fs.readFileSync(caseStudyCssPath, 'utf8') : '';
for (const selector of [
  '.case-section',
  '.case-meta',
  '.media--video',
  '.media-pair',
  '.case-quote',
  '.case-stat',
  '.case-stat-grid'
]) {
  if (!caseStudyCss.includes(selector)) {
    errors.push(`src/styles/case-study.css missing ${selector} Foundation styles`);
  }
}

const dynamicCasePath = path.join(ROOT, 'src/pages/[slug].astro');
if (fs.existsSync(dynamicCasePath)) {
  const dynamicCaseSource = fs.readFileSync(dynamicCasePath, 'utf8');
  if (dynamicCaseSource.includes('Case-study body goes here')) {
    errors.push('src/pages/[slug].astro still contains the placeholder case-study body');
  }
  for (const component of ['CaseSection', 'CaseMetaGrid', 'CaseQuote', 'CaseStat']) {
    if (!dynamicCaseSource.includes(component)) {
      errors.push(`src/pages/[slug].astro does not compose ${component}`);
    }
  }
}

const mediaVideoPath = path.join(ROOT, 'src/components/MediaVideo.astro');
if (fs.existsSync(mediaVideoPath)) {
  const mediaVideoSource = fs.readFileSync(mediaVideoPath, 'utf8');
  if (/\sautoplay(?:\s|>)/.test(mediaVideoSource)) {
    errors.push('MediaVideo.astro must not autoplay before its scroll/reduced-motion gate runs');
  }
  if (!mediaVideoSource.includes('data-play="scroll"')) {
    errors.push('MediaVideo.astro missing the shared data-play="scroll" motion contract');
  }
}

const scrollScriptPath = path.join(ROOT, 'assets/js/yy-scroll.js');
if (fs.existsSync(scrollScriptPath)) {
  const scrollSource = fs.readFileSync(scrollScriptPath, 'utf8');
  if (!scrollSource.includes('.media--video video')) {
    errors.push('yy-scroll.js does not include case-study videos in its visibility gate');
  }
}

const morphingStatementPath = path.join(ROOT, 'src/components/islands/MorphingStatement.tsx');
if (fs.existsSync(morphingStatementPath)) {
  const morphingSource = fs.readFileSync(morphingStatementPath, 'utf8');
  if (!morphingSource.includes('{beyondWords[0]}') || !morphingSource.includes('{towardWords[0]}')) {
    errors.push('MorphingStatement must server-render its first visible word pair');
  }
}

const root = useDist ? distDir : ROOT;
const htmlFiles = (useDist ? walk(distDir) : fs.readdirSync(ROOT).map((name) => path.join(ROOT, name)))
  .filter((f) => f.endsWith('.html') && fs.existsSync(f) && fs.statSync(f).isFile());

if (useDist) {
  const distIndex = path.join(distDir, 'index.html');
  if (!fs.existsSync(distIndex)) {
    errors.push('dist/index.html missing — run npm run build');
  } else {
    const indexHtml = fs.readFileSync(distIndex, 'utf8');
    if (!indexHtml.includes('yy-landing')) {
      errors.push('dist/index.html is not the Astro homepage (missing yy-landing)');
    }
  }
  const distLanding = path.join(distDir, 'landing.html');
  if (!fs.existsSync(distLanding)) {
    errors.push('dist/landing.html missing — compatibility redirect stub required');
  } else if (!isRedirectStub(fs.readFileSync(distLanding, 'utf8'))) {
    errors.push('dist/landing.html should redirect to /');
  }
  if (fs.existsSync(path.join(distDir, 'resume.html'))) {
    errors.push('dist/resume.html must not exist — Resume is embedded in the navigation popup');
  }
  if (!fs.existsSync(path.join(distDir, 'assets/css/yy-tokens.css'))) {
    errors.push('dist/assets/css/yy-tokens.css missing');
  }
  if (!fs.existsSync(path.join(distDir, 'assets/css/yy-motion.css'))) {
    errors.push('dist/assets/css/yy-motion.css missing');
  }
  const templatePath = path.join(distDir, 'case-study-template.html');
  if (!fs.existsSync(templatePath)) {
    errors.push('dist/case-study-template.html missing — Foundation needs a rendered review surface');
  } else {
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    for (const marker of ['case-meta', 'case-section', 'case-quote', 'case-stat']) {
      if (!templateHtml.includes(marker)) errors.push(`case-study-template.html missing ${marker}`);
    }
    if (!templateHtml.includes('content="noindex"')) {
      errors.push('case-study-template.html must be noindex');
    }
    if (!templateHtml.includes('yy-case--dark')) {
      errors.push('case-study-template.html missing document-level dark theme class');
    }
    if (!/<meta property="og:image" content="https?:\/\//.test(templateHtml)) {
      errors.push('case-study-template.html og:image must be absolute');
    }
  }
}

const toDisk = projectsMod.diskPath || ((src) => String(src).replace(/^\//, ''));
const optionalMissing = new Set();

// Pages only exist after a build, so a link to one is not a broken link when
// scanning sources. Derived from projects.ts rather than listed by hand.
const astroGenerated = projectsMod.astroGeneratedHtml ? projectsMod.astroGeneratedHtml() : [];
const knownGenerated = useDist
  ? new Set()
  : new Set(['index.html', 'landing.html', ...astroGenerated]);

for (const file of htmlFiles) {
  checkHtmlFile(file, root, optionalMissing, knownGenerated);
}

const requiredAssets = [
  'assets/css/yy-tokens.css',
  'assets/css/yy-chrome.css',
  'assets/css/yy-resume.css',
  'assets/css/yy-motion.css',
  'assets/css/yy-case-type.css',
  'assets/css/yy-about.css',
  'assets/css/yy-work.css',
  'assets/css/yy-cursor.css',
  'assets/js/yy-chrome.js',
  'assets/js/yy-reveal.js',
  'assets/js/yy-scroll.js',
  'assets/js/yy-cursor.js',
  'assets/js/yy-slots.js',
  'assets/js/yy-flow.js',
  'assets/images/ui/nav-orb.gif',
  'assets/js/yy-resume.js',
  'assets/js/yy-about.js',
  'assets/js/yy-work.js',
  'assets/js/yy-link-preview.js',
  'assets/fonts/plus-jakarta-sans-400.woff2',
  'assets/fonts/plus-jakarta-sans-600.woff2',
  'assets/fonts/caveat-500.woff2',
  'assets/images/home/landing-canvas-still.png'
];
for (const asset of requiredAssets) {
  const here = path.join(ROOT, asset);
  if (!fs.existsSync(here)) errors.push(`missing ${asset}`);
}

const chromeJsPath = path.join(ROOT, 'assets/js/yy-chrome.js');
const chromeJs = fs.readFileSync(chromeJsPath, 'utf8');
if (!chromeJs.includes('html.yy-chrome{scrollbar-gutter:stable}')) {
  errors.push('yy-chrome.js must reserve the scrollbar gutter before <body> parses');
}
if (!chromeJs.includes('yy-cursor.css') || !chromeJs.includes('yy-cursor.js')) {
  errors.push('yy-chrome.js must load the shared cursor sheet and script on every page');
}
if (!chromeJs.includes('FLOW_PALETTES') || !chromeJs.includes('loadFlow') || !chromeJs.includes('data-yy-base')) {
  errors.push('yy-chrome.js must inject #yy-flow with per-project ASCII palettes (FLOW_PALETTES)');
}
for (const [flowPage, swatch] of [
  ['larkdesign.html', '#2a73e2'],
  ['mckinseyecommerce.html', '#e03400'],
  ['ai-driven-product-design.html', '#d4c8ff'],
  ['mifinance.html', '#e8710a'],
  ['cummins-digitalization.html', '#980000'],
  ['alzheimerdisease.html', '#8eb0f0']
]) {
  if (!chromeJs.includes("'" + flowPage + "'") || !chromeJs.includes("'" + swatch + "'")) {
    errors.push(`yy-chrome.js FLOW_PALETTES must map ${flowPage} to base ${swatch}`);
  }
}

const flowJs = fs.readFileSync(path.join(ROOT, 'assets/js/yy-flow.js'), 'utf8');
if (!flowJs.includes('data-yy-base') || !flowJs.includes('hexToRgb')) {
  errors.push('yy-flow.js must read case palettes from data-yy-base/alt/idle');
}

const chromeCssFlow = fs.readFileSync(path.join(ROOT, 'assets/css/yy-chrome.css'), 'utf8');
if (!chromeCssFlow.includes('yy-flow-case') || !chromeCssFlow.includes('#yy-flow')) {
  errors.push('yy-chrome.css must position #yy-flow under case content (yy-flow-case)');
}
if (!chromeJs.includes('on-dark') || !chromeJs.includes('yy-chrome-on-dark')) {
  errors.push('yy-chrome.js must mark Opus pages (yy-chrome-on-dark / on-dark)');
}
if (!chromeJs.includes('DARK_NAV_PAGES') || !chromeJs.includes("'ai-driven-product-design.html'")) {
  errors.push('yy-chrome.js must whitelist only Opus for Opus nav blur (DARK_NAV_PAGES)');
}
if (chromeJs.includes("'larkdesign.html'") && /DARK_NAV_PAGES[\s\S]{0,120}'larkdesign\.html'/.test(chromeJs)) {
  errors.push('yy-chrome.js must not use dark nav on Lark (light nav only)');
}
if (/:host\(yy-nav\.on-dark\)[\s\S]{0,120}--yy-ink:/.test(chromeJs)) {
  errors.push('yy-chrome.js Opus nav must keep default ink (no on-dark text color override)');
}
if (!/:host\(yy-nav\.on-dark\)[\s\S]{0,200}blur\(100px\)/.test(chromeJs)) {
  errors.push('yy-chrome.js Opus nav capsule must use backdrop blur 100px');
}
if (!chromeJs.includes('Popups always light')) {
  errors.push('yy-chrome.js must keep navigation popups on light tokens (panel-stack --yy-ink)');
}
if (/\.panel\.is-work[\s\S]{0,200}background:\s*transparent/.test(chromeJs)) {
  errors.push('yy-chrome.js Work panel must use a light glass fill, not a transparent backdrop');
}
/* Figma glass popup / Canvas Cover / YyNav — light glass for all three popups */
if (!chromeJs.includes('--yy-panel-fill: rgba(255,255,255,.70)') || !chromeJs.includes('--yy-panel-blur: 200px')) {
  errors.push('yy-chrome.js must use Figma glass fill (.70) and blur 200px');
}
if (!chromeJs.includes('--yy-page-cover-fill: rgba(255,250,250,.20)') || !chromeJs.includes('--yy-page-cover-blur: 100px')) {
  errors.push('yy-chrome.js must keep Figma Canvas Cover tokens');
}
if (!chromeJs.includes('--yy-fill: rgba(255,255,255,.72)') || !chromeJs.includes('blur(8px) saturate(1.6)')) {
  errors.push('yy-chrome.js nav capsule must use Figma YyNav fill (.72) and blur 8px');
}
if (/:host\(yy-nav\.on-dark\)[\s\S]{0,200}--yy-fill:\s*rgba\(16,16,14/.test(chromeJs)) {
  errors.push('yy-chrome.js must not dark-fill the nav capsule on Opus (text color only)');
}
if (!chromeJs.includes('inset 0 15px 20px 0 rgba(255,255,255,.13)') || !chromeJs.includes('0 5px 40px 2px rgba(0,0,0,.15)')) {
  errors.push('yy-chrome.js panel must use Figma glass inset + drop shadow');
}
/* Shadow DOM cannot sample page backdrop — frost must live in light DOM */
const chromeCssFrost = fs.readFileSync(path.join(ROOT, 'assets/css/yy-chrome.css'), 'utf8');
if (!chromeCssFrost.includes('html.yy-panel-open body::before') ||
    !chromeCssFrost.includes('backdrop-filter: blur(200px)')) {
  errors.push('yy-chrome.css must frost the page in light DOM while popups are open (blur 200)');
}
if (/\.brand-orb[\s\S]{0,120}width: 16px/.test(chromeJs)) {
  errors.push('yy-chrome.js must keep the 44px Orbit disc; only the inner GIF should be smaller than 36px');
}
if (!chromeJs.includes("document.body.appendChild(host)")) {
  errors.push('yy-chrome.js must append the shared footer to document.body');
}
if (!chromeJs.includes('© Yanice Yang 2026') || chromeJs.includes('setupFooterPanelTriggers')) {
  errors.push('yy-chrome.js footer must be credit-only (no footer panel triggers)');
}
if (chromeJs.includes('insertBefore(host, credit')) {
  errors.push('yy-chrome.js must not nest the shared footer next to .footer-credit-wrapper');
}
if (!chromeJs.includes("html.yy-panel-open,html.yy-panel-open body{overflow:hidden!important}")) {
  errors.push('yy-chrome.js must lock scrolling while a nav panel is open');
}
if (!chromeJs.includes(':host(yy-footer){') || !chromeJs.includes('background: #fff;')) {
  errors.push('yy-footer host must paint a light band by default so light pages match landing chrome');
}
if (!chromeJs.includes(':host(yy-footer.is-dark)') || !chromeJs.includes('DARK_FOOTER')) {
  errors.push('yy-footer must support is-dark / DARK_FOOTER for Opus Clip and Alzheimer');
}
if (/DARK_FOOTER[\s\S]{0,200}mckinseyecommerce\.html/.test(chromeJs)) {
  errors.push('yy-chrome.js must not mark McKinsey as a dark footer page (McKinsey is light)');
}

const chromeCss = fs.readFileSync(path.join(ROOT, 'assets/css/yy-chrome.css'), 'utf8');
if (!chromeCss.includes('html.yy-chrome .paragraph') || !chromeCss.includes('max-width: none')) {
  errors.push('yy-chrome.css must lift the 36em paragraph cap so case copy fills its cell');
}

if (!chromeJs.includes('yy-motion.css')) {
  errors.push('yy-chrome.js must load yy-motion.css so every page shares the landing recipes');
}
if (!chromeJs.includes('yy-case-type.css')) {
  errors.push('yy-chrome.js must load yy-case-type.css on documents carrying html.yy-case');
}

const motionCssPath = path.join(ROOT, 'assets/css/yy-motion.css');
const motionCss = fs.existsSync(motionCssPath) ? fs.readFileSync(motionCssPath, 'utf8') : '';
const motionCssCode = motionCss.replace(/\/\*[\s\S]*?\*\//g, '');
if (!motionCss.includes('--reveal-text-distance') || !motionCss.includes('[data-reveal="text"]')) {
  errors.push('yy-motion.css must define the default text recipe (--reveal-text-distance + data-reveal=text)');
}
if (!motionCss.includes('--page-fade-out') || !motionCss.includes('--page-fade-in') || !motionCss.includes('@view-transition')) {
  errors.push('yy-motion.css must define MPA page fades (@view-transition + --page-fade-out/in)');
}
if (!motionCss.includes('view-transition-name: yy-nav') || !motionCss.includes('view-transition-name: yy-footer')) {
  errors.push('yy-motion.css must name yy-nav and yy-footer for view transitions');
}
if (!motionCss.includes('view-transition-name: yy-cursor')) {
  errors.push('yy-motion.css must name #yy-cursor so the disc does not snap to the system arrow on MPA fades');
}
if (!motionCss.includes(':not(.in)') || !motionCss.includes('[data-reveal].in')) {
  errors.push('yy-motion.css must hide with :not(.in) so .in can actually reveal data-reveal nodes');
}
if (!motionCss.includes('[data-reveal="intro-headline"]') || !motionCss.includes('[data-reveal="media"]')) {
  errors.push('yy-motion.css must include intro-headline and media recipes');
}
if (/grid-template-columns/.test(motionCssCode)) {
  errors.push('yy-motion.css must not set grid-template-columns');
}
if (/\bpadding-left\b|\bpadding-right\b|\bmargin-left\b|\bmargin-right\b/.test(motionCssCode)) {
  errors.push('yy-motion.css must not set horizontal padding or margin');
}

const baseLayout = fs.readFileSync(path.join(ROOT, 'src/layouts/BaseLayout.astro'), 'utf8');
if (!baseLayout.includes('yy-motion.css')) {
  errors.push('BaseLayout.astro must link yy-motion.css');
}

const caseLayout = fs.readFileSync(path.join(ROOT, 'src/layouts/CaseStudyLayout.astro'), 'utf8');
if (!caseLayout.includes('data-reveal="text"')) {
  errors.push('CaseStudyLayout.astro must mark titles with data-reveal=text');
}

const revealJs = fs.readFileSync(path.join(ROOT, 'assets/js/yy-reveal.js'), 'utf8');
if (!revealJs.includes('data-reveal-mode') || !revealJs.includes('yy-landing')) {
  errors.push('yy-reveal.js must support data-reveal-mode and landing explicit-only collection');
}
if (!revealJs.includes("'once'") || !/defaultMode[\s\S]{0,80}once/.test(revealJs)) {
  errors.push('yy-reveal.js must default all pages to data-reveal-mode once (no re-hide on scroll-up)');
}
if (!revealJs.includes('function primeOnScreen') || revealJs.indexOf('function primeOnScreen') > revealJs.indexOf("html.classList.add('yy-reveal')")) {
  errors.push('yy-reveal.js must mark in-view nodes .in before adding html.yy-reveal');
}
if (!revealJs.includes('data-reveal-sync') || !fs.readFileSync(path.join(ROOT, 'src/components/ProjectIndex.astro'), 'utf8').includes('data-reveal-sync="case"')) {
  errors.push('landing case rows must share one reveal (data-reveal-sync) so text and cards enter together');
}
if (!revealJs.includes('intro-')) {
  errors.push('yy-reveal.js must skip intro-* CSS-timeline recipes');
}
const cursorJs = fs.readFileSync(path.join(ROOT, 'assets/js/yy-cursor.js'), 'utf8');
if (cursorJs.includes('moves === 0') && cursorJs.includes('standDown()')) {
  errors.push('yy-cursor.js must not stand down the disc when the pointer is idle');
}
if (!cursorJs.includes('yy-cursor-ready')) {
  errors.push('yy-cursor.js must set html.yy-cursor-ready so the system arrow stays hidden before the first move');
}
// The type overlay is opt-in per document via `html.yy-case`, never by filename.
// A filename map here would silently re-apply the overlay to a page that already
// bakes the same tokens into its own stylesheet.
if (chromeJs.includes('CASE_TYPE_PAGES')) {
  errors.push('yy-chrome.js must not key the type overlay by filename — use the yy-case document class');
}
if (!/brand-orb[\s\S]{0,120}36px/.test(chromeJs)) {
  errors.push('yy-chrome.js Orbit brand-orb must be 36px');
}

const caseTypeCssPath = path.join(ROOT, 'assets/css/yy-case-type.css');
const caseTypeCss = fs.existsSync(caseTypeCssPath) ? fs.readFileSync(caseTypeCssPath, 'utf8') : '';
const caseTypeCssCode = caseTypeCss.replace(/\/\*[\s\S]*?\*\//g, '');
if (!caseTypeCss.includes('--t-16') || !caseTypeCss.includes('--lh-body')) {
  errors.push('yy-case-type.css must use landing typography tokens');
}
if (!caseTypeCss.includes('.heading-xl') || !caseTypeCss.includes('.headingpt') || !caseTypeCss.includes('.heading-medium-3')) {
  errors.push('yy-case-type.css must restyle display, mid, and label headings');
}
if (caseTypeCssCode.includes('background-color: var(--ground)') || caseTypeCssCode.includes('color: var(--ink)')) {
  errors.push('yy-case-type.css must not override authored page colors or backgrounds');
}
if (caseTypeCssCode.includes('aspect-ratio') || caseTypeCssCode.includes('object-fit')) {
  errors.push('yy-case-type.css must not resize or crop case-study images');
}
if (caseTypeCssCode.includes('.section-layout1') && /section-layout1[^{]*\{[^}]*padding-left/.test(caseTypeCssCode)) {
  errors.push('yy-case-type.css must not change .section-layout1 horizontal padding');
}
if (/grid-template-columns/.test(caseTypeCssCode)) {
  errors.push('yy-case-type.css must not set grid-template-columns (keep authored 2-column layout)');
}
if (/\bpadding-left\b|\bpadding-right\b|\bmargin-left\b|\bmargin-right\b/.test(caseTypeCssCode)) {
  errors.push('yy-case-type.css must not set horizontal padding or margin (fonts + vertical spacing only)');
}
if (/margin:\s*0\s+0\s+/.test(caseTypeCssCode)) {
  errors.push('yy-case-type.css must not use margin shorthand that zeros left/right');
}

// ---- raw-colour ratchet ------------------------------------------------------
// Every colour on a design-system surface should come from a token. The raw hex
// values counted here predate the token layer, most of them in the case-study
// stylesheets. Banning them outright would fail today, so this
// is a ratchet instead: the count may fall, never rise. Lower the budget when
// you retire some.
//
// Primitive definitions (--color-*) are where raw hex is supposed to live, so
// they are not counted.
const RAW_HEX_BUDGET = 78;
const tokenGovernedCss = [
  'assets/css/yy-tokens.css',
  'src/styles/landing.css',
  'src/styles/case-study.css',
  'src/styles/fashion.css',
  ...fs
    .readdirSync(path.join(ROOT, 'src/styles'))
    .filter((f) => f.startsWith('case-') && f.endsWith('.css'))
    .map((f) => `src/styles/${f}`)
];
let rawHex = 0;
const rawHexFiles = [];
for (const rel of [...new Set(tokenGovernedCss)]) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  let count = 0;
  for (const m of text.matchAll(/(--[\w-]+)?\s*:\s*[^;{}]*?#[0-9a-fA-F]{3,8}\b/g)) {
    if ((m[1] || '').startsWith('--color-')) continue;
    count += 1;
  }
  if (count) rawHexFiles.push(`${rel} (${count})`);
  rawHex += count;
}
if (rawHex > RAW_HEX_BUDGET) {
  errors.push(
    `raw hex colours rose to ${rawHex} (budget ${RAW_HEX_BUDGET}) — use a token: ${rawHexFiles.join(', ')}`
  );
} else if (rawHex < RAW_HEX_BUDGET) {
  warnings.push(
    `raw hex colours are down to ${rawHex} (budget ${RAW_HEX_BUDGET}) — lower RAW_HEX_BUDGET in check-site.mjs`
  );
}

const tokensCss = fs.readFileSync(path.join(ROOT, 'assets/css/yy-tokens.css'), 'utf8');
// 36px now lives on the primitive; --slot-radius aliases it. Assert both ends
// so the value is still pinned and the alias cannot be flattened back.
if (!tokensCss.includes('--radius-slot: 36px')) {
  errors.push('yy-tokens.css missing --radius-slot: 36px for the Landing redesign');
}
if (!tokensCss.includes('--slot-radius: var(--radius-slot)')) {
  errors.push('yy-tokens.css: --slot-radius must alias --radius-slot');
}
if (!tokensCss.includes('--frame-case: 1260px')) {
  errors.push('yy-tokens.css missing --frame-case: 1260px for the Landing redesign');
}

// The token layer the design system is built on. Each of these families was
// missing entirely before and every one of them is something Figma mirrors, so
// losing one silently would desync the two sides.
for (const [token, why] of [
  ['--color-shadow-rgb', 'the blue behind every card shadow'],
  ['--color-glass-rgb', 'glass fill / highlight / border'],
  ['--color-ink-rgb', 'ink at alpha'],
  ['--color-frost-rgb', 'panel frost'],
  ['--space-28', 'the most-used spacing value on the site'],
  ['--rule-hero', 'the hero rule, which is NOT --rule'],
  ['--state-hover-opacity', 'hover state'],
  ['--focus-ring-color', 'focus ring']
]) {
  if (!tokensCss.includes(token + ':')) {
    errors.push(`yy-tokens.css missing ${token} — ${why}`);
  }
}

if (!tokensCss.includes('--case-radius: var(--slot-radius)')) {
  errors.push('yy-tokens.css missing --case-radius alias of --slot-radius');
}

// assets/css/yy-case-layout.css is gone. It restyled the exported markup on the
// pages that had not been rewritten yet; every case study is now an Astro page
// with its own stylesheet, so the assertions that pinned that file went with it.

for (const panelName of ['work', 'about', 'resume']) {
  if (!chromeJs.includes(`panel: '${panelName}'`)) {
    errors.push(`yy-chrome.js missing ${panelName} panel configuration`);
  }
}
if (!chromeJs.includes('data-panel-trigger="') || !chromeJs.includes('data-panel-view="')) {
  errors.push('yy-chrome.js must generate panel triggers and views');
}
if (!chromeJs.includes('role="dialog"') || !chromeJs.includes('aria-modal="false"')) {
  errors.push('yy-chrome.js popup must expose a modeless dialog');
}
if (!chromeJs.includes('class="expand"')) {
  errors.push('yy-chrome.js popup missing expand control');
}
if (!chromeJs.includes('@media (prefers-reduced-motion: reduce)')) {
  errors.push('yy-chrome.js popup missing reduced-motion fallback');
}
if (!chromeJs.includes('--yy-panel-full-fill: rgba(255,255,255,.78)') ||
    !chromeJs.includes('.panel.is-expanded{') ||
    !chromeJs.includes('.panel-stack.is-expanded{')) {
  errors.push('yy-chrome.js expanded panel must fully cover the viewport with a glass fill');
}
if (!chromeJs.includes('yy:panel-state')) {
  errors.push('yy-chrome.js must announce expanded panel state');
}
if (!chromeJs.includes('yy-panel-open') || !chromeJs.includes('open: open')) {
  errors.push('yy-chrome.js must lock the underlay for every open popup state');
}
if (!chromeJs.includes('scrollbar-gutter:stable')) {
  errors.push('yy-chrome.js must reserve the page scrollbar gutter while popup scroll is locked');
}
if (!chromeJs.includes('data-lenis-prevent') ||
    !chromeJs.includes('touch-action: pan-y') ||
    !chromeJs.includes('-webkit-overflow-scrolling: touch')) {
  errors.push('yy-chrome.js panel-scroll must allow nested wheel/touch scrolling under page lock');
}
if (!chromeJs.includes('viewScroll') || !chromeJs.includes('restoreViewScroll')) {
  errors.push('yy-chrome.js must explicitly preserve each popup view scroll position');
}
for (const marker of ['closing', 'setBackgroundInert', 'lastOpener', '--yy-panel-gap: 12px']) {
  if (!chromeJs.includes(marker)) {
    errors.push(`yy-chrome.js missing popup lifecycle safeguard ${marker}`);
  }
}
if (!chromeJs.includes(':host(.is-ready.is-open) .panel-stack') ||
    !chromeJs.includes("host.classList.add('is-ready')") ||
    !chromeJs.includes("classList.toggle('is-active'") ||
    !chromeJs.includes('[data-panel-view].is-active') ||
    !chromeJs.includes('void panel.offsetHeight') ||
    !chromeJs.includes('armPanelOpen') ||
    !chromeJs.includes(':not(:defined)') ||
    !chromeJs.includes('data-yy-pending') ||
    !chromeJs.includes('waitContentReady') ||
    !chromeJs.includes('__yyStylesReady')) {
  errors.push('yy-chrome.js must gate panel visibility on is-ready+is-open and sync is-active views');
}
for (const [file, label] of [
  ['assets/js/yy-work.js', 'Work'],
  ['assets/js/yy-about.js', 'About'],
  ['assets/js/yy-resume.js', 'Resume']
]) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (!src.includes('data-yy-pending') || !src.includes('__yyStylesReady')) {
    errors.push(`${label} panel CE must hide until stylesheet ready (__yyStylesReady / data-yy-pending)`);
  }
  if (!src.includes('Paint markup only after CSS')) {
    errors.push(`${label} panel CE must defer HTML until stylesheet load (no unstyled FOUC)`);
  }
}
if (!chromeJs.includes('function expandToFullpage()') ||
    !chromeJs.includes('if (closing || !active) return;')) {
  errors.push('yy-chrome.js must expand to a URL layer without a shrink toggle');
}
if (!chromeJs.includes('.panel.is-expanded .expand{ display: none') ||
    !chromeJs.includes('leaveFullpageToOrigin') ||
    !chromeJs.includes('yyPanelFull') ||
    !chromeJs.includes('fullpageHash')) {
  errors.push('yy-chrome.js expanded layer must hide the expand control and exit via Go Back to the origin page');
}
if (!chromeJs.includes('View full screen') ||
    !chromeJs.includes('expand-label') ||
    !chromeJs.includes("top: 18px; right: 18px;") ||
    !chromeJs.includes('inset 0 15px 20px 0 rgba(255,255,255,.13)')) {
  errors.push('yy-chrome.js popup must keep View full screen as an icon inside the panel card');
}
if (!chromeJs.includes('/* Popup always keeps main Navigation') ||
    !chromeJs.includes("if (active === 'resume') enterResumeNav()")) {
  errors.push('yy-chrome.js must keep main nav on Resume popup and enter section nav only on expand');
}
if (!chromeJs.includes('.cap button[aria-expanded="true"]{ color: var(--yy-ink); background: rgba(36,34,32,.075); font-weight: 600; }') ||
    !chromeJs.includes('.cap a[aria-current="page"]{ color: var(--yy-ink); background: rgba(36,34,32,.075); font-weight: 600; }')) {
  errors.push('yy-chrome.js capsule must show a selected pill for active nav items');
}
if (chromeJs.includes('width: 36px; height: 36px;') &&
    chromeJs.includes(':host(.is-fullpage) .cap{')) {
  errors.push('yy-chrome.js must not shrink the capsule into a 36px Orbit on fullpage');
}
if (!chromeJs.includes('class="brand-orb"') ||
    !chromeJs.includes('aria-label="Yanice Yang home"') ||
    !chromeJs.includes('assets/images/ui/nav-orb.gif')) {
  errors.push('yy-chrome.js capsule brand must be the Orbit home link');
}
if (chromeJs.includes('width: 377px; height: var(--yy-cap-size)') ||
    chromeJs.includes('>Yanice Yang</a>')) {
  errors.push('yy-chrome.js must not keep the fixed wordmark capsule width or text brand');
}
if (!chromeJs.includes("host.classList.toggle('is-fullpage'") ||
    !chromeJs.includes('is-resume-nav') ||
    !chromeJs.includes('Go Back')) {
  errors.push('yy-chrome.js fullpage Resume must keep the navigation bar with Go Back');
}
if (!chromeJs.includes('inset 0 15px 20px 0 rgba(255,255,255,.13)')) {
  errors.push('yy-chrome.js fullpage glass missing Figma Glass-canva inset glow');
}
if (!chromeJs.includes('--yy-cap-size: 56px') ||
    !chromeJs.includes('bottom: calc(var(--yy-nav-zone) + var(--yy-panel-gap))') ||
    !chromeJs.includes('top: var(--yy-panel-gap)')) {
  errors.push('yy-chrome.js normal panel must use equal top/bottom gaps above the capsule');
}
if (!chromeJs.includes('0 12px 36px -8px rgba(62,65,116,.20)')) {
  errors.push('yy-chrome.js capsule must carry the shared nav shadow');
}
if (chromeJs.includes("borderRadius: '999px'")) {
  errors.push('yy-chrome.js panel animation must not tween through an elliptical radius');
}

const canvasGradient = fs.readFileSync(
  path.join(ROOT, 'src/components/islands/LandingCanvasGradient.tsx'),
  'utf8'
);
if (!canvasGradient.includes('yy:panel-state') || !canvasGradient.includes('panelExpanded')) {
  errors.push('LandingCanvasGradient must pause for expanded navigation panels');
}
if (
  !canvasGradient.includes('.slot') ||
  !canvasGradient.includes('pointerenter') ||
  !canvasGradient.includes('pauseForThumbnail')
) {
  errors.push('LandingCanvasGradient must pause the background loop only while a project card is hovered');
}

const scrollJs = fs.readFileSync(path.join(ROOT, 'assets/js/yy-scroll.js'), 'utf8');
if (scrollJs.includes('yy-rv--wipe') || scrollJs.includes('function tagImages')) {
  errors.push('yy-scroll.js must not tag images with yy-rv--wipe; default enter lives in yy-motion.css');
}
if (!scrollJs.includes('yy:panel-state') || !scrollJs.includes('panelExpanded')) {
  errors.push('yy-scroll.js must pause videos for expanded navigation panels');
}
if (scrollJs.includes('yy:scroll-idle') || scrollJs.includes('setScrollIdle')) {
  errors.push('yy-scroll.js must not pause the landing background on scroll idle');
}
if (!scrollJs.includes('--rule-draw') || !scrollJs.includes('applyCaseRuleDraw')) {
  errors.push('yy-scroll.js must draw the case spine as a scroll progressor (--rule-draw)');
}
if (!scrollJs.includes('panelOpen') ||
    !scrollJs.includes('lenis.stop()') ||
    !scrollJs.includes('lenis.start()')) {
  errors.push('yy-scroll.js must pause Lenis while any popup is open');
}

const indexAstro = fs.readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
if (!indexAstro.includes('yy-canvas')) {
  errors.push('src/pages/index.astro missing the Figma GIF canvas stack');
}
if (!indexAstro.includes('data-reveal="intro-headline"') || !indexAstro.includes('data-reveal="intro-meta"')) {
  errors.push('src/pages/index.astro must use data-reveal intro recipes (not data-intro)');
}
if (indexAstro.includes('data-intro=')) {
  errors.push('src/pages/index.astro still uses data-intro; migrate to data-reveal recipes');
}
if (indexAstro.includes('reveal={false}')) {
  errors.push('src/pages/index.astro must load yy-reveal.js for below-fold recipes (explicit nodes only)');
}
if (!indexAstro.includes('id="yy-flow"') || !indexAstro.includes('yy-flow.js')) {
  errors.push('src/pages/index.astro must mount #yy-flow and load yy-flow.js for ASCII cursor wake');
}

const landingCss = fs.readFileSync(path.join(ROOT, 'src/styles/landing.css'), 'utf8');
if (!/html\.yy-landing[\s\S]{0,240}background:\s*var\(--ground\)/.test(landingCss)) {
  errors.push('landing.css must set html.yy-landing background to var(--ground) for light nav chrome');
}
/* Case title: centered in label column; hover note 24px under title; small = 2-col header */
if (!landingCss.includes('top: calc(100% + 24px)') || !landingCss.includes('.case__copy')) {
  errors.push('landing.css must center case title and hang hover note 24px below (.case__copy)');
}
if (!landingCss.includes('justify-content: center') || !/align-items:\s*stretch/.test(landingCss)) {
  errors.push('landing.css case label must vertically center the title against stretched media');
}
if (!landingCss.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)')) {
  errors.push('landing.css small screens must keep title | note as a 2-column header');
}
const projectIndexAstro = fs.readFileSync(path.join(ROOT, 'src/components/ProjectIndex.astro'), 'utf8');
if (!projectIndexAstro.includes('case__copy') ||
    !/<div class="case__copy">[\s\S]*?case__meta[\s\S]*?CaseNoteGenerate/.test(projectIndexAstro)) {
  errors.push('ProjectIndex.astro must render title block before CaseNoteGenerate inside .case__copy');
}
if (landingCss.includes('8px 0 28px -12px') || landingCss.includes('-8px 0 28px -12px')) {
  errors.push('landing .slot must not use left/right directional shadows that square the corners');
}
if (!landingCss.includes('.slot__media')) {
  errors.push('landing .slot must clip media in .slot__media so drop shadows are not squared');
}
if (!/\.slot\s*\{[^}]*overflow:\s*visible/.test(landingCss)) {
  errors.push('landing .slot must use overflow: visible so shadows follow the radius');
}
if (
  !landingCss.includes('caseRuleDraw') ||
  !landingCss.includes('animation-timeline: view()') ||
  !landingCss.includes('--rule-draw')
) {
  errors.push('landing case spine must reveal with scroll (view timeline + --rule-draw)');
}
if (/\.hero\.row--ruled::before[\s\S]{0,200}--rule-draw/.test(landingCss)) {
  errors.push('hero spine must stay on the intro grow, not the case progressor');
}
if (!landingCss.includes('introLineGrowX') ||
    !landingCss.includes('transform-origin: left center') ||
    !landingCss.includes('transform-origin: right center')) {
  errors.push('landing.css hero hairlines must grow from left/right toward center with introLineGrowX');
}
if (!landingCss.includes('.hero__zone--meta::after') || !landingCss.includes('.hero__title::before')) {
  errors.push('landing.css must draw hero hairlines as ::after/::before (not static borders only)');
}
if (/\.slot img,\s*\n\s*\.slot video \{[^}]*opacity:\s*0/.test(landingCss)) {
  errors.push('landing.css must not hide slot media with opacity:0; reveal owns enter, placeholder is load-fail only');
}

const slotAstro = fs.readFileSync(path.join(ROOT, 'src/components/ProjectSlot.astro'), 'utf8');
const slotMediaAstro = fs.readFileSync(path.join(ROOT, 'src/components/SlotMedia.astro'), 'utf8');
const slotMarkup = slotAstro + slotMediaAstro;
if (/<a class="slot"[^>]*data-reveal/.test(slotAstro) || /class:list=\{\['slot'[\s\S]*?data-reveal="media"/.test(slotAstro.split('slot__media')[0])) {
  errors.push('ProjectSlot.astro must put data-reveal on inner media, not the slot chrome');
}
if (!slotMarkup.includes('slot__media') || !slotMarkup.includes('data-reveal="wipe"')) {
  errors.push('ProjectSlot.astro must wrap img/video in .slot__media with data-reveal=wipe');
}

const landingFeatured = projectsMod.landingProjects();
if (landingFeatured.length !== 4) {
  errors.push(`landing must feature exactly 4 projects (got ${landingFeatured.length})`);
} else {
  const order = landingFeatured.map((p) => p.slug);
  const expected = ['ai-driven-product-design', 'atlasnova', 'mckinseyecommerce', 'larkdesign'];
  if (order.join(',') !== expected.join(',')) {
    errors.push(`landing order must be ${expected.join(' → ')} (got ${order.join(' → ')})`);
  }
}

const opusMarquee = path.join(ROOT, 'assets/videos/case-opusclip-marquee.mp4');
if (fs.existsSync(opusMarquee) && fs.statSync(opusMarquee).size > 5.5 * 1024 * 1024) {
  errors.push('case-opusclip-marquee.mp4 exceeds the 5.5 MB homepage thumbnail budget');
}

const landingVideoBudget = 5.5 * 1024 * 1024;
for (const project of landingFeatured) {
  if (!project.video?.src) {
    errors.push(`${project.slug}: landing case must use a video thumbnail`);
    continue;
  }
  const videoPath = path.join(ROOT, toDisk(project.video.src));
  if (fs.existsSync(videoPath) && fs.statSync(videoPath).size > landingVideoBudget) {
    errors.push(`${project.slug}: landing video exceeds 5.5 MB thumbnail budget`);
  }
  if (!project.video.poster || !/assets\/images\/home\/case-[a-z0-9-]+-frame\.jpe?g$/i.test(project.video.poster)) {
    errors.push(`${project.slug}: landing poster must be a case-*-frame.jpg extracted from the video`);
  }
  if (project.video.poster && /hero-.*-card-cover/.test(project.video.poster)) {
    errors.push(`${project.slug}: landing poster must not use legacy hero-*-card-cover thumbnails`);
  }
}

if (!slotMediaAstro.includes('priority') || !slotMediaAstro.includes("priority ? 'metadata'")) {
  errors.push('SlotMedia.astro must preload metadata only for the priority (first) case');
}
if (!slotMediaAstro.includes('slot__poster') || !slotMediaAstro.includes('fetchpriority')) {
  errors.push('SlotMedia.astro must render a poster <img> (eager for first case)');
}
if (!slotMediaAstro.includes('data-src') || !/priority \? undefined : videoUrl/.test(slotMediaAstro)) {
  errors.push('SlotMedia.astro must defer non-first case video src via data-src until scroll');
}
if (!scrollJs.includes('ensureSource') || !scrollJs.includes("getAttribute('data-src')")) {
  errors.push('yy-scroll.js must attach deferred video sources on scroll/play');
}

if (!projectIndexAstro.includes('priority={index === 0}')) {
  errors.push('ProjectIndex.astro must mark the first case SlotMedia as priority');
}

if (!indexAstro.includes('rel="preload"') || !indexAstro.includes('as="image"')) {
  errors.push('index.astro must preload the first case poster image');
}

const canvasGif = path.join(ROOT, 'assets/images/home/landing-canvas.gif');
if (fs.existsSync(canvasGif) && fs.statSync(canvasGif).size > 4 * 1024 * 1024) {
  errors.push('landing-canvas.gif exceeds the 4 MB homepage background budget');
}

for (const project of projectsMod.projects) {
  if (project.cover) {
    const p = path.join(ROOT, toDisk(project.cover.src));
    if (!fs.existsSync(p)) errors.push(`${project.slug}: missing cover ${project.cover.src}`);
  }
  if (project.logo) {
    const logoPath = path.join(ROOT, toDisk(project.logo.src));
    if (!fs.existsSync(logoPath)) errors.push(`${project.slug}: missing logo ${project.logo.src}`);
  }
  if (project.video) {
    for (const src of [project.video.src, project.video.poster].filter(Boolean)) {
      if (!fs.existsSync(path.join(ROOT, toDisk(src)))) errors.push(`${project.slug}: missing ${src}`);
    }
  }
}

// The [slug].astro scaffold ships placeholder copy the moment a project is
// published with an href and has no dedicated page. This fired for
// real once: alzheimerdisease emitted twice and the scaffold overwrote the real
// page. Fail the build rather than publish it.
if (useDist) {
  const placeholders = [
    'strongest evidence artifact here',
    'Primary outcome',
    'Supporting outcome'
  ];
  for (const file of htmlFiles) {
    if (path.basename(file) === 'case-study-template.html') continue;
    const html = fs.readFileSync(file, 'utf8');
    for (const needle of placeholders) {
      if (html.includes(needle)) {
        errors.push(
          `${path.relative(distDir, file)}: ships [slug].astro placeholder copy (${needle})`
        );
      }
    }
  }
}

// Every published project must have a page in src/pages/ (or be picked up by the
// [slug].astro scaffold, which the placeholder guard above keeps out of dist).
for (const project of projectsMod.projects) {
  if (project.status !== 'published' || !project.href) continue;
  const page = path.join(ROOT, 'src/pages', toDisk(project.href).replace(/\.html$/, '.astro'));
  const scaffolded = fs.existsSync(path.join(ROOT, 'src/pages/[slug].astro'));
  if (!fs.existsSync(page) && !scaffolded) {
    errors.push(`${project.slug}: published but src/pages/${toDisk(project.href).replace(/\.html$/, '.astro')} is missing`);
  }
}

if (warnings.length) {
  for (const w of warnings) console.warn('warn:', w);
}

if (errors.length) {
  for (const e of errors) console.error('error:', e);
  console.error(`\ncheck-site: ${errors.length} error(s)`);
  process.exit(1);
}

console.log(`check-site: ok (${htmlFiles.length} html files, ${projectsMod.projects.length} projects, root=${path.relative(ROOT, root) || '.'})`);
