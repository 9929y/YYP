#!/usr/bin/env node
/**
 * Content integrity checks (no build required):
 *  - every /assets/... reference in src/content resolves to a file in public/
 *  - every case entry has the frontmatter the pages rely on
 *  - no Webflow responsive variants (-p-NNN) are referenced
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'src/content');
const PUBLIC = path.join(ROOT, 'public');
const errors = [];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(CONTENT);
const refs = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\/assets\/[^\s)"'\]<>]+/g)) {
    const ref = m[0];
    if (!refs.has(ref)) refs.set(ref, []);
    refs.get(ref).push(path.relative(ROOT, file));
  }
}

for (const [ref, where] of refs) {
  if (/-p-\d+\.\w+$/.test(ref)) errors.push(`${ref} is a Webflow responsive variant (referenced by ${where[0]})`);
  if (!fs.existsSync(path.join(PUBLIC, ref))) errors.push(`${ref} does not exist under public/ (referenced by ${where[0]})`);
}

const REQUIRED = ['slug', 'title', 'scope', 'note', 'status', 'order'];
for (const file of files.filter((f) => f.includes(`${path.sep}cases${path.sep}`) && f.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8');
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { errors.push(`${path.relative(ROOT, file)} has no frontmatter`); continue; }
  for (const key of REQUIRED) {
    if (!new RegExp(`^${key}:`, 'm').test(fm[1])) errors.push(`${path.relative(ROOT, file)} is missing "${key}"`);
  }
  const slug = fm[1].match(/^slug:\s*(.+)$/m)?.[1]?.trim();
  if (slug && slug !== path.basename(file, '.md')) errors.push(`${path.relative(ROOT, file)}: slug "${slug}" does not match the filename`);
}

if (errors.length) {
  console.error(`check-content: ${errors.length} problem(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`check-content: ${files.length} content files, ${refs.size} asset references, all resolved.`);
