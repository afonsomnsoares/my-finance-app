import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    /*
     * Proxies the API through the dev server so the browser only ever talks
     * to one origin.
     *
     * Without this the app runs on localhost:3000 and the API on
     * 127.0.0.1:5000 — different hosts, so the browser treats them as
     * different *sites* and refuses to attach a SameSite=Lax session cookie
     * to XHR. Every request would arrive unauthenticated. Proxying also
     * makes development match production, where Express serves both.
     */
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
    // The backend suite runs on Node's own test runner
    // (`npm test --prefix backend`), not on Vitest.
    exclude: ['node_modules/**', 'dist/**', 'backend/**'],
  },
});
