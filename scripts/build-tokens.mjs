#!/usr/bin/env node
/**
 * Emit docs/design-tokens.json from assets/css/yy-tokens.css.
 *
 * WHY THIS EXISTS
 * Scanning the stylesheets for `--custom-properties` does not find the design
 * system — it finds 298 declarations across 12 files, and four different kinds
 * of thing look identical:
 *
 *   · the 160 real tokens in yy-tokens.css
 *   · 28 legacy variables inherited from the old export (--coral-text, --grey …)
 *   · 31 page-local variables (--ops-accent, --mif-ink-2 …), same naming shape
 *     but scoped to one page
 *   · scope overrides that redeclare a real token under a different value
 *
 * Anything reading the CSS has to guess which is which, and will guess wrong.
 * This file removes the guess: one artifact, every token, with its layer,
 * category, raw and resolved value, and the reasoning from its source comment.
 *
 * Run: node scripts/build-tokens.mjs        (writes the file)
 *      node scripts/build-tokens.mjs --check (fails if it is stale)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE = 'assets/css/yy-tokens.css';
const OUTPUT = 'docs/design-tokens.json';

/**
 * A non-:root block in the source file is a MODE: the same token under a
 * different value, declared deliberately and in one place. The type ladder is
 * the only one today — the landing page runs ~12.5% under the document scale,
 * rung for rung. A mode is not a scope override: an override is a page file
 * quietly contradicting the system (a bug, until proven otherwise), a mode is
 * the system saying this token has two values and here is when each applies.
 * Figma models a mode natively; it cannot model an override at all.
 */
function modeBlocks(css) {
  /* Comments are masked to same-length spaces rather than removed, so a
     selector never swallows the banner above it while every byte offset still
     points at the original text. */
  const masked = css.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));
  const out = [];
  /* `}` and `;` are excluded from the selector, so a match can never span the
     previous rule's closing brace and no delimiter prefix is needed. */
  const re = /([^\s@{};][^{};]*?)\s*\{/g;
  let m;
  while ((m = re.exec(masked))) {
    const selector = m[1].trim();
    const start = m.index + m[0].length;
    let depth = 1;
    let j = start;
    while (depth > 0 && j < masked.length) {
      if (masked[j] === '{') depth += 1;
      else if (masked[j] === '}') depth -= 1;
      j += 1;
    }
    re.lastIndex = j;
    if (!selector || selector.includes(':root')) continue;
    const body = css.slice(start, j - 1);
    if (!/--[\w-]+\s*:/.test(body)) continue;
    out.push({ selector, body, before: css.slice(0, m.index) });
  }
  return out;
}

/** Which :root block a token came from decides its layer. */
const LAYERS = [
  { match: /PRIMITIVES/, layer: 'primitive' },
  { match: /SEMANTIC/, layer: 'semantic' }
];

const CATEGORIES = [
  [/^--color-/, 'color'],
  [/^--size-/, 'type.size'],
  [/^--leading-/, 'type.leading'],
  [/^--weight-/, 'type.weight'],
  [/^--tracking-/, 'type.tracking'],
  [/^--space-/, 'space'],
  [/^--radius-/, 'radius'],
  [/^--blur-/, 'blur'],
  [/^--opacity-/, 'opacity'],
  [/^--duration-/, 'motion.duration'],
  [/^--ease-/, 'motion.ease'],
  [/^--distance-/, 'motion.distance'],
  [/^--scale-/, 'motion.scale'],
  [/^--(ink|ground|slot)/, 'color.surface'],
  [/^--(hair|rule)/, 'color.line'],
  [/^--(glass|frost)-/, 'color.glass'],
  [/^--shadow-/, 'elevation'],
  [/^--state-/, 'state'],
  [/^--focus-ring-/, 'state.focus'],
  [/^--z-/, 'layering'],
  [/^--text-/, 'type.size'],
  [/^--lh-/, 'type.leading'],
  [/^--(frame|col|edge|rule-x)/, 'layout'],
  [/^--(slot|case)-radius/, 'radius']
];

function categorise(name) {
  for (const [re, category] of CATEGORIES) if (re.test(name)) return category;
  return 'other';
}

/** Split into :root blocks, keeping comments so descriptions survive. */
function rootBlocks(css) {
  const blocks = [];
  let i = 0;
  while (true) {
    const m = /:root\s*\{/.exec(css.slice(i));
    if (!m) break;
    const start = i + m.index + m[0].length;
    let depth = 1;
    let j = start;
    while (depth > 0 && j < css.length) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    blocks.push({ before: css.slice(Math.max(0, i + m.index - 900), i + m.index), body: css.slice(start, j - 1) });
    i = j;
  }
  return blocks;
}

/**
 * The comment immediately above a declaration is its reasoning. These comments
 * carry the provenance — what a value was measured off, the contrast ratio it
 * fixes, the alternative that was rejected — which is the part worth keeping
 * and the part a bare value dump throws away.
 */
/**
 * `---- ink ----` is a section banner, not a description. Strip banners, and
 * drop a note that is nothing but one, so a token without real reasoning has no
 * description rather than a misleading one.
 */
function cleanNote(note) {
  const text = note
    .split('\n')
    .map((l) => l.replace(/^\s*\*?\s?/, '').trim())
    .filter((l) => !/^[-=]{2,}.*[-=]{2,}$/.test(l) && !/^[-=]{4,}$/.test(l))
    .join(' ')
    .replace(/[-=]{4,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 12 ? text : '';
}

function parseBlock(body, layer) {
  const out = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);([ \t]*\/\*[\s\S]*?\*\/)?/g;
  let m;
  let cursor = 0;
  while ((m = re.exec(body))) {
    // A comment on the same line after the declaration belongs to THIS token;
    // attributing it to the next one shifts every trailing note down by one.
    const trailing = /\/\*([\s\S]*?)\*\//.exec(m[3] || '');
    const gap = body.slice(cursor, m.index);
    const leading = [...gap.matchAll(/\/\*([\s\S]*?)\*\//g)].map((c) => c[1]);
    const note = trailing ? trailing[1] : leading.length ? leading[leading.length - 1] : '';
    out.push({
      name: m[1],
      layer,
      category: categorise(m[1]),
      value: m[2].trim().replace(/\s+/g, ' '),
      description: cleanNote(note)
    });
    cursor = m.index + m[0].length;
  }
  return out;
}

function resolve(name, byName, seen = new Set()) {
  if (seen.has(name)) return '<cycle>';
  const token = byName.get(name);
  if (!token) return null;
  const next = new Set(seen).add(name);
  let value = token.value;
  let previous = null;
  while (previous !== value) {
    previous = value;
    value = value.replace(/var\((--[\w-]+)\)/g, (whole, ref) => resolve(ref, byName, next) ?? whole);
  }
  return value.replace(/\s+/g, ' ').trim();
}

/** Scan page stylesheets for redeclarations of tokens defined in the source. */
function scopeOverrides() {
  const owned = new Set(
    [...fs.readFileSync(path.join(ROOT, SOURCE), 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1])
  );
  const out = [];
  const dirs = ['src/styles', 'assets/css'];
  for (const dir of dirs) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const file of fs.readdirSync(full).filter((f) => f.endsWith('.css'))) {
      const rel = `${dir}/${file}`;
      if (rel === SOURCE) continue;
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      // Only rules other than :root — a page redefining a token under a scope.
      for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = m[1].trim().split('\n').pop().trim();
        for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
          if (!owned.has(d[1])) continue;
          out.push({ token: d[1], selector, value: d[2].trim(), file: rel });
        }
      }
    }
  }
  return out;
}

/**
 * Emit one entry per mode block, with each token's value resolved through the
 * mode itself, so a reader never has to re-derive what the override means.
 */
function modeSets(css, byName) {
  return modeBlocks(css).map((block) => {
    const local = new Map(byName);
    const tokens = parseBlock(block.body, 'semantic');
    for (const token of tokens) local.set(token.name, token);

    /* The banner comment directly above the block is its documentation: first
       ALL-CAPS line is the mode's name, the prose under it is the why. */
    const banner = [...block.before.matchAll(/\/\*([\s\S]*?)\*\//g)].pop();
    const lines = banner ? banner[1].split('\n').map((l) => l.trim()) : [];
    const heading = lines.find((l) => /^[A-Z][A-Z ]{3,}$/.test(l)) || '';

    return {
      selector: block.selector,
      name: heading ? heading.toLowerCase() : block.selector,
      note: cleanNote(lines.filter((l) => l !== heading).join('\n')),
      tokens: tokens.map((token) => ({
        name: token.name,
        value: token.value,
        resolved: resolve(token.name, local)
      }))
    };
  });
}

function build() {
  const css = fs.readFileSync(path.join(ROOT, SOURCE), 'utf8');
  const tokens = [];
  for (const block of rootBlocks(css)) {
    const hit = LAYERS.find((l) => l.match.test(block.before));
    // The motion block predates the layered structure and has no banner; its
    // values are raw, so it belongs with the primitives.
    tokens.push(...parseBlock(block.body, hit ? hit.layer : 'primitive'));
  }
  const byName = new Map(tokens.map((t) => [t.name, t]));
  for (const token of tokens) {
    const resolved = resolve(token.name, byName);
    if (resolved !== token.value) token.resolved = resolved;
    if (!token.description) delete token.description;
  }

  return {
    $comment:
      'Generated by scripts/build-tokens.mjs from ' +
      SOURCE +
      '. Do not hand-edit. This is the machine-readable form of the design system: ' +
      'the CSS custom property name IS the token name, so a Figma variable should ' +
      'carry the same name character for character, with no mapping table.',
    source: SOURCE,
    counts: {
      total: tokens.length,
      primitive: tokens.filter((t) => t.layer === 'primitive').length,
      semantic: tokens.filter((t) => t.layer === 'semantic').length
    },
    /* Breakpoints cannot be CSS custom properties — a media query cannot read
       one — so they are carried here instead of being lost. */
    breakpoints: [1280, 992, 991, 900, 878, 877, 768, 767, 560, 479],
    /* Declared modes: the same token under a second value, on purpose. Build
       each of these as a Figma mode on the collection that owns the token —
       never as a second token with a decorated name. */
    modes: modeSets(css, byName),
    /* Tokens that a PAGE stylesheet redeclares under a different value. Unlike
       a mode, nothing here is sanctioned: each one is a mode that should be
       promoted into the source file, a separate token, or a bug. Do not copy any
       of it into Figma at face value. */
    scopeOverrides: scopeOverrides(),
    tokens
  };
}

const data = build();
const json = JSON.stringify(data, null, 2) + '\n';
const outPath = path.join(ROOT, OUTPUT);

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  if (current !== json) {
    console.error(`${OUTPUT} is stale — run: node scripts/build-tokens.mjs`);
    process.exit(1);
  }
  console.log(`design-tokens: in sync (${data.counts.total} tokens)`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, json);
  console.log(
    `design-tokens: wrote ${OUTPUT} — ${data.counts.total} tokens ` +
      `(${data.counts.primitive} primitive, ${data.counts.semantic} semantic)`
  );
}
