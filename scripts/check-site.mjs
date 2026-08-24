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
  'assets/js/yy-chrome.js',
  'assets/js/yy-reveal.js',
  'assets/js/yy-scroll.js',
  'assets/js/yy-cursor.js',
  'assets/js/yy-slots.js',
  'assets/js/yy-flow.js'
];
for (const asset of requiredAssets) {
  const here = path.join(ROOT, asset);
  if (!fs.existsSync(here)) errors.push(`missing ${asset}`);
}

for (const project of projectsMod.projects) {
  if (project.cover && !project.placeholderFile) {
    const p = path.join(ROOT, toDisk(project.cover.src));
    if (!fs.existsSync(p)) errors.push(`${project.slug}: missing cover ${project.cover.src}`);
  }
  if (project.video) {
    for (const src of [project.video.src, project.video.poster]) {
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
