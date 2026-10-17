import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '../..', // One optional .env.local at the monorepo root.
  server: {
    host: true, // reachable from a phone on the same network
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: {
    target: 'es2022',
    // React + Motion are most of the bundle (~135 kB gzip); nothing worth splitting yet.
    chunkSizeWarningLimit: 600,
  },
});
