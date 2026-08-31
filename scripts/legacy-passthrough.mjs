import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
/** HTML emitted by Astro — never overwrite with a root passthrough copy. */
const GENERATED_HTML = new Set(['index.html', 'landing.html']);
/**
 * Kept in git for rollback reference, but never published.
 *
 * Every page migrated to Astro is renamed `<slug>.webflow.html` and listed here
 * in the same commit. That rename is not bookkeeping — without it the dev server
 * and the build disagree: the middleware below answers `/<slug>.html` from the
 * repo root *before* Astro's router (so dev shows the old page), while
 * `astro:build:done` skips the root copy when Astro already emitted that
 * filename (so the build ships the new one). Reviews happen on the dev server,
 * so a migration that leaves the root file in place looks like it did nothing.
 */
const UNPUBLISHED_HTML = new Set([
  'index.webflow.html',
  'fashion.webflow.html',
  'alzheimerdisease.webflow.html',
  'mifinance.webflow.html',
  'cummins-digitalization.webflow.html',
  'larkdesign.webflow.html'
]);

function mime(file) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon'
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function send(res, file) {
  res.statusCode = 200;
  res.setHeader('Content-Type', mime(file));
  fs.createReadStream(file).pipe(res);
}

const VARIANT_RE = /-p-\d+\.(webp|png|jpe?g)$/i;
const TEXT_SCAN = new Set(['.html', '.css', '.js', '.mjs', '.astro', '.ts', '.tsx', '.json', '.md']);

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function referencedAssets() {
  const refs = new Set();
  const re = /(?:^|["'(\s,])(\/?assets\/[^"' )\s,]+)/g;
  for (const file of walkFiles(ROOT)) {
    if (!TEXT_SCAN.has(path.extname(file).toLowerCase())) continue;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    let m;
    while ((m = re.exec(text))) refs.add(m[1].replace(/^\//, '').replace(/\\/g, '/'));
  }
  return refs;
}

function copyAssetsFiltered(src, dest, refs) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyAssetsFiltered(from, to, refs);
      continue;
    }
    const rel = path.relative(ROOT, from).replace(/\\/g, '/');
    if (VARIANT_RE.test(entry.name) && !refs.has(rel)) continue;
    fs.copyFileSync(from, to);
  }
}

export default function legacyPassthrough() {
  return {
    name: 'legacy-passthrough',
    hooks: {
      'astro:config:setup'({ updateConfig }) {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'serve-workspace-legacy',
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                    const url = decodeURIComponent((req.url || '/').split('?')[0]);

                    // Let Astro own the homepage and the /landing.html redirect stub.
                    if (
                      url === '/' ||
                      url === '/index' ||
                      url === '/index.html' ||
                      url === '/landing' ||
                      url === '/landing.html'
                    ) {
                      return next();
                    }

                    const rel = url.replace(/^\//, '');
                    if (!rel || rel.includes('..') || path.isAbsolute(rel)) return next();

                    const fromRoot = path.join(ROOT, rel);
                    const isAsset = rel === 'assets' || rel.startsWith('assets/');
                    const isHtml =
                      rel.endsWith('.html') &&
                      !GENERATED_HTML.has(path.basename(rel)) &&
                      !UNPUBLISHED_HTML.has(path.basename(rel));
                    if ((isAsset || isHtml) && fs.existsSync(fromRoot) && fs.statSync(fromRoot).isFile()) {
                      return send(res, fromRoot);
                    }
                    return next();
                  });
                }
              }
            ]
          }
        });
      },
      'astro:build:done': async ({ dir }) => {
        const out = fileURLToPath(dir);
        copyAssetsFiltered(path.join(ROOT, 'assets'), path.join(out, 'assets'), referencedAssets());
        for (const name of fs.readdirSync(ROOT)) {
          if (!name.endsWith('.html')) continue;
          if (GENERATED_HTML.has(name) || UNPUBLISHED_HTML.has(name)) continue;
          const dest = path.join(out, name);
          if (fs.existsSync(dest)) continue;
          fs.copyFileSync(path.join(ROOT, name), dest);
        }
      }
    }
  };
}
