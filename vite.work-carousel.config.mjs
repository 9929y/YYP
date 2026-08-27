import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Builds the Work-panel 3D carousel as a classic script chrome can lazy-load. */
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    emptyOutDir: false,
    outDir: path.join(root, 'assets/js'),
    lib: {
      entry: path.join(root, 'src/work-carousel-entry.tsx'),
      name: 'YYWorkCarousel',
      formats: ['iife'],
      fileName: () => 'yy-work.js'
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        assetFileNames: 'yy-work.[ext]'
      }
    }
  }
});
