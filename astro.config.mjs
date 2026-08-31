import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import assetsPassthrough from './scripts/assets-passthrough.mjs';

export default defineConfig({
  site: 'https://www.yaniceyang.com',
  output: 'static',
  integrations: [react(), assetsPassthrough()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  build: {
    format: 'file',
    assets: '_astro'
  },
  devToolbar: { enabled: false },
  vite: {
    server: {
      fs: { allow: ['.'] },
      /* Cloudflare quick tunnels + local previews when port-forward fails. */
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']
    }
  }
});
