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
if (fs.existsSync(path.join(ROOT, 'index.html'))) {
  errors.push('root index.html must not exist — Astro emits it; archive is index.webflow.html');
}
if (!fs.existsSync(path.join(ROOT, 'index.webflow.html'))) {
  errors.push('index.webflow.html missing — keep the pre-cutover Webflow homepage for rollback');
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
  'MediaPair.astro',
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
    if (indexHtml.includes('data-wf-page')) {
      errors.push('dist/index.html still looks like the Webflow homepage');
    }
  }
  const distLanding = path.join(distDir, 'landing.html');
  if (!fs.existsSync(distLanding)) {
    errors.push('dist/landing.html missing — compatibility redirect stub required');
  } else if (!isRedirectStub(fs.readFileSync(distLanding, 'utf8'))) {
    errors.push('dist/landing.html should redirect to /');
  }
  if (!fs.existsSync(path.join(distDir, 'index.webflow.html'))) {
    errors.push('dist/index.webflow.html missing — archived Webflow homepage should passthrough');
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
const optionalMissing = new Set(
  projectsMod.projects.flatMap((p) => {
    const out = [];
    if (p.placeholderFile && p.cover) out.push(toDisk(p.cover.src));
    return out;
  })
);

const knownGenerated = useDist
  ? new Set()
  : new Set(['index.html', 'landing.html']);

for (const file of htmlFiles) {
  checkHtmlFile(file, root, optionalMissing, knownGenerated);
}

const requiredAssets = [
  'assets/css/yy-tokens.css',
  'assets/css/yy-case-layout.css',
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
  'assets/images/home/landing-canvas.gif',
  'assets/images/home/landing-canvas-still.png'
];
for (const asset of requiredAssets) {
  const here = path.join(ROOT, asset);
  if (!fs.existsSync(here)) errors.push(`missing ${asset}`);
}

const chromeJsPath = path.join(ROOT, 'assets/js/yy-chrome.js');
const chromeJs = fs.readFileSync(chromeJsPath, 'utf8');
if (!chromeJs.includes('html.yy-chrome .navbar.w-nav{display:none}')) {
  errors.push('yy-chrome.js must hide the legacy Webflow navbar');
}
if (!chromeJs.includes('yy-cursor.css') || !chromeJs.includes('yy-cursor.js')) {
  errors.push('yy-chrome.js must load the shared cursor sheet and script on every page');
}
if (!chromeJs.includes('on-dark') || !chromeJs.includes('yy-chrome-on-dark')) {
  errors.push('yy-chrome.js must invert capsule ink on dark pages (yy-chrome-on-dark / on-dark)');
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
if (!chromeJs.includes('.footer-section:not(:has(.four-column))')) {
  errors.push('yy-chrome.js must hide credit-only Webflow footer shells');
}
if (!chromeJs.includes(':host(yy-footer){') || !chromeJs.includes('background: #fff;')) {
  errors.push('yy-footer host must paint a light band by default so light pages match landing chrome');
}
if (!chromeJs.includes(':host(yy-footer.is-dark)') || !chromeJs.includes('DARK_FOOTER')) {
  errors.push('yy-footer must support is-dark / DARK_FOOTER for Opus Clip and McKinsey');
}

const chromeCss = fs.readFileSync(path.join(ROOT, 'assets/css/yy-chrome.css'), 'utf8');
if (!chromeCss.includes('html.yy-chrome .paragraph') || !chromeCss.includes('max-width: none')) {
  errors.push('yy-chrome.css must lift the 36em paragraph cap so case copy fills its cell');
}

if (!chromeJs.includes('yy-motion.css')) {
  errors.push('yy-chrome.js must load yy-motion.css so Webflow pages share landing recipes');
}
if (!chromeJs.includes('yy-case-type.css')) {
  errors.push('yy-chrome.js must load yy-case-type.css on case / projects pages');
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
if (
  /CASE_TYPE_PAGES[\s\S]*ai-driven-product-design\.html/.test(chromeJs) ||
  /CASE_TYPE_PAGES[\s\S]*alzheimerdisease\.html/.test(chromeJs)
) {
  errors.push('Opus and Alzheimer must keep Webflow black/white type — omit them from CASE_TYPE_PAGES');
}

const caseTypeCssPath = path.join(ROOT, 'assets/css/yy-case-type.css');
const caseTypeCss = fs.existsSync(caseTypeCssPath) ? fs.readFileSync(caseTypeCssPath, 'utf8') : '';
const caseTypeCssCode = caseTypeCss.replace(/\/\*[\s\S]*?\*\//g, '');
if (!caseTypeCss.includes('--ink-2')) {
  errors.push('yy-case-type.css must use landing ink tokens');
}
if (!caseTypeCss.includes('.heading-xl') || !caseTypeCss.includes('.headingpt') || !caseTypeCss.includes('.heading-medium-3')) {
  errors.push('yy-case-type.css must restyle display, mid, and label headings');
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
if (!caseTypeCssCode.includes('object-fit: contain') || !caseTypeCssCode.includes('.grid-2-2')) {
  errors.push('yy-case-type.css must equalize .grid-2-2 paired image cell heights');
}

const tokensCss = fs.readFileSync(path.join(ROOT, 'assets/css/yy-tokens.css'), 'utf8');
if (!tokensCss.includes('--slot-radius: 36px')) {
  errors.push('yy-tokens.css missing --slot-radius: 36px for the Landing redesign');
}
if (!tokensCss.includes('--frame-case: 1260px')) {
  errors.push('yy-tokens.css missing --frame-case: 1260px for the Landing redesign');
}

if (!tokensCss.includes('--case-radius: var(--slot-radius)')) {
  errors.push('yy-tokens.css missing --case-radius alias of --slot-radius');
}

const caseLayoutCss = fs.readFileSync(path.join(ROOT, 'assets/css/yy-case-layout.css'), 'utf8');
if (!caseLayoutCss.includes('one-column') || !caseLayoutCss.includes('two-column')) {
  errors.push('yy-case-layout.css must keep one-column and two-column layouts separate');
}
if (!caseLayoutCss.includes('.div-block-37') || !caseLayoutCss.includes('max-width: none')) {
  errors.push('yy-case-layout.css must make one-column case text full width');
}
if (!caseLayoutCss.includes('.layout125_component.mck1.mck2:not(.b1)')) {
  errors.push('yy-case-layout.css must preserve two-column intro grids');
}
if (!caseLayoutCss.includes('.hero-intro-2.mck')) {
  errors.push('yy-case-layout.css must stack McKinsey/Cummins heroes as one column');
}
if (
  !caseLayoutCss.includes('.body.blk .footer-section') ||
  !caseLayoutCss.includes('.body.al .footer-section')
) {
  errors.push('yy-case-layout.css must drop the white prev/next bar on dark case pages');
}
if (!caseLayoutCss.includes('.ural .headingpt.al')) {
  errors.push('yy-case-layout.css must keep Alzheimer ural headings dark on the white island');
}
if (!caseLayoutCss.includes('.heading-medium-3.counttext')) {
  errors.push('yy-case-layout.css must lighten Opus impact captions on black');
}
if (
  !caseLayoutCss.includes('.shadow-card') ||
  !caseLayoutCss.includes('.step-card-2') ||
  !caseLayoutCss.includes('backdrop-filter: blur(16px)')
) {
  errors.push('yy-case-layout.css must frost HTML cards so they read as glass');
}
if (!caseLayoutCss.includes('.section7') || !caseLayoutCss.includes('overflow: visible')) {
  errors.push('yy-case-layout.css must not let .section7 clip McKinsey glass backdrops');
}
if (
  !caseLayoutCss.includes('grid-template-rows: 1fr 1fr') ||
  !caseLayoutCss.includes('align-items: stretch')
) {
  errors.push('yy-case-layout.css must keep same-section cards equal height');
}
if (
  !caseLayoutCss.includes('.step-card-2 .subtitle-4') ||
  !caseLayoutCss.includes('justify-content: flex-start')
) {
  errors.push('yy-case-layout.css must top-align card copy');
}
if (
  !caseLayoutCss.includes('border-radius: var(--case-radius)') ||
  !caseLayoutCss.includes('.shadow-card') ||
  !caseLayoutCss.includes('.step-card-2')
) {
  errors.push('yy-case-layout.css must keep --case-radius on HTML cards only');
}
if (!caseLayoutCss.includes('.grid-img') || !caseLayoutCss.includes('border-radius: 0')) {
  errors.push('yy-case-layout.css must not round exported images including .grid-img');
}
if (!caseLayoutCss.includes('.image-57') || !caseLayoutCss.includes('border-radius: 20px')) {
  errors.push('yy-case-layout.css must soften McKinsey flow-board radius and shadow');
}
if (!caseLayoutCss.includes('overflow: visible')) {
  errors.push('yy-case-layout.css must leave exported composites unclipped (overflow: visible)');
}
if (/overflow:\s*hidden/.test(caseLayoutCss) && /lightbox-link-4[\s\S]{0,280}overflow:\s*hidden/.test(caseLayoutCss)) {
  errors.push('yy-case-layout.css must not clip .lightbox-link-4 — that squares bitmap shadows');
}

const caseLayoutPages = [
  'ai-driven-product-design.html',
  'mckinseyecommerce.html',
  'larkdesign.html',
  'cummins-digitalization.html',
  'mifinance.html',
  'alzheimerdisease.html',
  'tiktok-research.html'
];
for (const name of caseLayoutPages) {
  const html = fs.readFileSync(path.join(ROOT, name), 'utf8');
  if (!html.includes('yy-case-layout.css')) {
    errors.push(`${name}: missing yy-case-layout.css link`);
  }
}

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
if (!chromeJs.includes('--yy-panel-full-fill: rgba(255,255,255,.92)') ||
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
    !chromeJs.includes('inset 0 0 0 1.5px rgba(255,255,255,.96)')) {
  errors.push('yy-chrome.js popup must keep View full screen as an icon inside the panel card');
}
if (!chromeJs.includes('/* Popup always keeps main Navigation') ||
    !chromeJs.includes("if (active === 'resume') enterResumeNav()")) {
  errors.push('yy-chrome.js must keep main nav on Resume popup and enter section nav only on expand');
}
if (!chromeJs.includes('.cap button[aria-expanded="true"]{ color: var(--yy-ink); background: rgba(26,25,23,.075); font-weight: 600; }') ||
    !chromeJs.includes('.cap a[aria-current="page"]{ color: var(--yy-ink); background: rgba(26,25,23,.075); font-weight: 600; }')) {
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
if (!chromeJs.includes('inset 0 0 0 1px rgba(255,255,255,.88)')) {
  errors.push('yy-chrome.js fullpage glass missing its white inset border');
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
if (indexAstro.includes('yy-flow.js')) {
  errors.push('src/pages/index.astro must not load yy-flow.js after the GIF canvas cutover');
}

const landingCss = fs.readFileSync(path.join(ROOT, 'src/styles/landing.css'), 'utf8');
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
if (/\.slot img,\s*\n\s*\.slot video \{[^}]*opacity:\s*0/.test(landingCss)) {
  errors.push('landing.css must not hide slot media with opacity:0; reveal owns enter, placeholder is load-fail only');
}

const slotAstro = fs.readFileSync(path.join(ROOT, 'src/components/ProjectSlot.astro'), 'utf8');
const slotMediaAstro = fs.readFileSync(path.join(ROOT, 'src/components/SlotMedia.astro'), 'utf8');
const slotMarkup = slotAstro + slotMediaAstro;
if (/<a class="slot"[^>]*data-reveal/.test(slotAstro) || /class:list=\{\['slot'[\s\S]*?data-reveal="media"/.test(slotAstro.split('slot__media')[0])) {
  errors.push('ProjectSlot.astro must put data-reveal on inner media, not the slot chrome');
}
if (!slotMarkup.includes('slot__media') || !slotMarkup.includes('data-reveal="media"')) {
  errors.push('ProjectSlot.astro must wrap img/video in .slot__media with data-reveal=media');
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
if (fs.existsSync(opusMarquee) && fs.statSync(opusMarquee).size > 15 * 1024 * 1024) {
  errors.push('case-opusclip-marquee.mp4 exceeds the 15 MB homepage media budget');
}

const canvasGif = path.join(ROOT, 'assets/images/home/landing-canvas.gif');
if (fs.existsSync(canvasGif) && fs.statSync(canvasGif).size > 4 * 1024 * 1024) {
  errors.push('landing-canvas.gif exceeds the 4 MB homepage background budget');
}

for (const project of projectsMod.projects) {
  if (project.cover && !project.placeholderFile) {
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
  if (project.href && project.engine === 'webflow') {
    const page = path.join(ROOT, toDisk(project.href));
    if (!fs.existsSync(page)) errors.push(`${project.slug}: missing ${project.href}`);
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
