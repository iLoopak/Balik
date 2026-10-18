import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '../..', // One optional .env.local at the monorepo root.
  server: {
    host: true, // reachable from a phone on the same network
    // BALIK_WEB_PORT / BALIK_WS_PORT let a second checkout run next to the first one.
    port: Number(process.env.BALIK_WEB_PORT ?? 5173),
    strictPort: !!process.env.BALIK_WEB_PORT,
    proxy: {
      '/ws': { target: `ws://localhost:${process.env.BALIK_WS_PORT ?? 8787}`, ws: true },
    },
  },
  build: {
    target: 'es2022',
    // React + Motion are most of the bundle (~135 kB gzip); nothing worth splitting yet.
    chunkSizeWarningLimit: 600,
  },
});
