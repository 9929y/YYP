import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
/** HTML emitted by Astro — never overwrite with a root passthrough copy. */
const GENERATED_HTML = new Set(['index.html', 'landing.html']);

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
                    const isHtml = rel.endsWith('.html') && !GENERATED_HTML.has(path.basename(rel));
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
        fs.cpSync(path.join(ROOT, 'assets'), path.join(out, 'assets'), {
          recursive: true,
          dereference: true
        });
        for (const name of fs.readdirSync(ROOT)) {
          if (!name.endsWith('.html')) continue;
          if (GENERATED_HTML.has(name)) continue;
          const dest = path.join(out, name);
          if (fs.existsSync(dest)) continue;
          fs.copyFileSync(path.join(ROOT, name), dest);
        }
      }
    }
  };
}
