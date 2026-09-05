// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.yaniceyang.com',
  output: 'static',
  /* Old Webflow .html URLs are redirected in vercel.json (real 301s). */
  integrations: [react()],
  server: { host: '127.0.0.1', port: 4800 },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    server: {
      /* Cloudflare quick tunnels are the review surface (see AGENTS.md). */
      allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1']
    }
  }
});
