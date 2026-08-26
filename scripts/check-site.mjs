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
  if (!fs.existsSync(path.join(distDir, 'assets/css/yy-tokens.css'))) {
    errors.push('dist/assets/css/yy-tokens.css missing');
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
  'assets/css/yy-chrome.css',
  'assets/css/yy-case-type.css',
  'assets/js/yy-chrome.js',
  'assets/js/yy-reveal.js',
  'assets/js/yy-scroll.js',
  'assets/js/yy-cursor.js',
  'assets/js/yy-slots.js',
  'assets/js/yy-flow.js',
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
if (!chromeJs.includes("document.body.appendChild(shadow('yy-footer'")) {
  errors.push('yy-chrome.js must append the shared footer to document.body (landing chrome, not Webflow grid)');
}
if (chromeJs.includes('insertBefore(host, credit')) {
  errors.push('yy-chrome.js must not nest the shared footer next to .footer-credit-wrapper');
}
if (!chromeJs.includes('.footer-section:not(:has(.four-column))')) {
  errors.push('yy-chrome.js must hide credit-only Webflow footer shells');
}
if (!chromeJs.includes(':host(yy-footer){') || !chromeJs.includes('background: #fff;')) {
  errors.push('yy-footer host must paint a light band so dark case pages match landing chrome');
}

if (!chromeJs.includes('yy-case-type.css')) {
  errors.push('yy-chrome.js must load yy-case-type.css on case / projects pages');
}
if (!chromeJs.includes('CASE_TYPE_PAGES')) {
  errors.push('yy-chrome.js missing CASE_TYPE_PAGES for the landing type overlay');
}

const caseTypeCssPath = path.join(ROOT, 'assets/css/yy-case-type.css');
const caseTypeCss = fs.existsSync(caseTypeCssPath) ? fs.readFileSync(caseTypeCssPath, 'utf8') : '';
if (!caseTypeCss.includes('--ink-2')) {
  errors.push('yy-case-type.css must use landing ink tokens');
}
if (!caseTypeCss.includes('.heading-xl') || !caseTypeCss.includes('.headingpt') || !caseTypeCss.includes('.heading-medium-3')) {
  errors.push('yy-case-type.css must restyle display, mid, and label headings');
}
if (caseTypeCss.includes('.section-layout1') && /section-layout1[^{]*\{[^}]*padding-left/.test(caseTypeCss)) {
  errors.push('yy-case-type.css must not change .section-layout1 horizontal padding');
}

const tokensCss = fs.readFileSync(path.join(ROOT, 'assets/css/yy-tokens.css'), 'utf8');
if (!tokensCss.includes('--slot-radius: 36px')) {
  errors.push('yy-tokens.css missing --slot-radius: 36px for the Landing redesign');
}
if (!tokensCss.includes('--frame-case: 1260px')) {
  errors.push('yy-tokens.css missing --frame-case: 1260px for the Landing redesign');
}

const indexAstro = fs.readFileSync(path.join(ROOT, 'src/pages/index.astro'), 'utf8');
if (!indexAstro.includes('yy-canvas')) {
  errors.push('src/pages/index.astro missing the Figma GIF canvas stack');
}
if (indexAstro.includes('yy-flow.js')) {
  errors.push('src/pages/index.astro must not load yy-flow.js after the GIF canvas cutover');
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
