import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The panel runs on the same origin as the API: in development Vite proxies /api to the backend
// (BACKEND_URL, default port 8081), so the session and CSRF cookies work as in production behind
// Caddy.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: env.BACKEND_URL || 'http://localhost:8081' },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test-setup.ts'],
    },
  };
});
