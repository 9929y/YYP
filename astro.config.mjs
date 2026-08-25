import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import legacyPassthrough from './scripts/legacy-passthrough.mjs';

export default defineConfig({
  site: 'https://www.yaniceyang.com',
  output: 'static',
  integrations: [react(), legacyPassthrough()],
  build: {
    format: 'file',
    assets: '_astro'
  },
  devToolbar: { enabled: false },
  vite: {
    server: {
      fs: { allow: ['.'] }
    }
  }
});
