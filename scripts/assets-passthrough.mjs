/**
 * assets-passthrough — makes the hand-managed `assets/` tree behave like a
 * second public directory, in dev and in the build.
 *
 * `assets/` is not `public/`: it holds ~1 GB of image variants of which only a
 * fraction is referenced, and its paths are baked into stylesheets, data files
 * and page markup as `/assets/...`. Astro would copy the whole tree verbatim.
 * So this integration
 *
 *   · serves `/assets/*` straight from the repo during `astro dev`, and
 *   · copies `assets/` into `dist/` at build time, skipping any `-p-<width>`
 *     responsive variant that nothing in the repo actually references.
 *
 * A page may build its srcset from a directory constant, so the full path never
 * appears literally anywhere: `${IMG}/photo-p-800.webp` puts only the FILENAME
 * in the source text. Matching on the filename as well as the full path is what
 * keeps those variants shippable. This cost a live bug once — the whole
 * Alzheimer image set 404'd in `dist/` while every path looked right in source,
 * because a srcset candidate that 404s does not fall back to `src`; the image
 * simply fails at that viewport width. check-site.mjs now walks srcset for
 * exactly this.
 *
 * The filename is only ever used to KEEP a file, never to drop one, so a
 * coincidental match costs a few kilobytes and can never de-ship anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();

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
  const paths = new Set();
  const names = new Set();
  const pathRe = /(?:^|["'(\s,])(\/?assets\/[^"' )\s,]+)/g;
  const nameRe = /([\w-]+-p-\d+\.(?:webp|png|jpe?g))/gi;
  for (const file of walkFiles(ROOT)) {
    if (!TEXT_SCAN.has(path.extname(file).toLowerCase())) continue;
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    let m;
    while ((m = pathRe.exec(text))) paths.add(m[1].replace(/^\//, '').replace(/\\/g, '/'));
    while ((m = nameRe.exec(text))) names.add(m[1]);
  }
  return { paths, names };
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
    const referenced = refs.paths.has(rel) || refs.names.has(entry.name);
    if (VARIANT_RE.test(entry.name) && !referenced) continue;
    fs.copyFileSync(from, to);
  }
}

export default function assetsPassthrough() {
  return {
    name: 'assets-passthrough',
    hooks: {
      'astro:config:setup'({ updateConfig }) {
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'serve-workspace-assets',
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                    const url = decodeURIComponent((req.url || '/').split('?')[0]);
                    const rel = url.replace(/^\//, '');
                    if (!rel.startsWith('assets/') || rel.includes('..') || path.isAbsolute(rel)) {
                      return next();
                    }
                    const fromRoot = path.join(ROOT, rel);
                    if (fs.existsSync(fromRoot) && fs.statSync(fromRoot).isFile()) {
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
      }
    }
  };
}
