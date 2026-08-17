import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  site: 'https://www.yaniceyang.com',
  // The toolbar is pinned bottom-centre, exactly where the glass nav lives —
  // it covers the nav in dev and swallows its clicks.
  devToolbar: { enabled: false },
});
