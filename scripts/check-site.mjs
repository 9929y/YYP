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

function checkHtmlFile(file, baseDir) {
  const html = fs.readFileSync(file, 'utf8');
  const rel = path.relative(baseDir, file);
  if (rel.endsWith('.html') && !html.includes('yy-tokens.css') && !rel.startsWith('_astro')) {
    errors.push(`${rel}: missing yy-tokens.css link`);
  }

  const refs = [];
  const re = /\b(?:src|href)=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) refs.push(m[1]);

  for (const ref of refs) {
    if (!ref || ref.startsWith('#') || ref.startsWith('mailto:') || ref.startsWith('tel:')) continue;
    if (/^https?:\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('//')) continue;
    const clean = ref.split('?')[0].split('#')[0];
    if (!clean) continue;
    const resolved = clean.startsWith('/')
      ? path.join(baseDir, clean.slice(1))
      : path.normalize(path.join(path.dirname(file), clean));
    if (!fs.existsSync(resolved)) {
      const fromRoot = path.relative(ROOT, resolved);
      if (optionalMissing.has(fromRoot) || optionalMissing.has(clean.replace(/^\//, ''))) continue;
      errors.push(`${rel}: broken ${ref}`);
    }
  }
}

const projectsMod = await loadProjects();
const schemaErrors = projectsMod.validateProjects();
for (const e of schemaErrors) errors.push(`projects schema: ${e}`);

const root = useDist ? distDir : ROOT;
const htmlFiles = (useDist ? walk(distDir) : fs.readdirSync(ROOT).map((name) => path.join(ROOT, name)))
  .filter((f) => f.endsWith('.html') && fs.existsSync(f) && path.basename(f) !== 'landing.html');

if (useDist && !fs.existsSync(path.join(distDir, 'landing.html'))) {
  errors.push('dist/landing.html missing — run npm run build');
}
if (useDist && !fs.existsSync(path.join(distDir, 'index.html'))) {
  errors.push('dist/index.html missing — legacy passthrough failed');
}
if (useDist && !fs.existsSync(path.join(distDir, 'assets/css/yy-tokens.css'))) {
  errors.push('dist/assets/css/yy-tokens.css missing');
}

const optionalMissing = new Set(
  projectsMod.projects.flatMap((p) => {
    const out = [];
    if (p.placeholderFile && p.cover) out.push(p.cover.src);
    return out;
  })
);
for (const file of htmlFiles) {
  const base = path.basename(file);
  if (base === 'landing.html' && root === ROOT) continue;
  checkHtmlFile(file, root);
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
    const p = path.join(ROOT, project.cover.src);
    if (!fs.existsSync(p)) errors.push(`${project.slug}: missing cover ${project.cover.src}`);
  }
  if (project.video) {
    for (const src of [project.video.src, project.video.poster]) {
      if (!fs.existsSync(path.join(ROOT, src))) errors.push(`${project.slug}: missing ${src}`);
    }
  }
  if (project.href && project.engine === 'webflow') {
    const page = path.join(ROOT, project.href);
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
