import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import app from '../api/src/app.js';

// https://vite.dev/config/
export default defineConfig({
  envDir: '../../',
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(app);
      },
    },
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
