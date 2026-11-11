import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Override when the API runs elsewhere, e.g. API_PROXY_TARGET=http://localhost:5055 npm run dev
const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Proxy keeps the browser on one origin in dev (no CORS / cookie headaches).
    proxy: {
      '/api': API_TARGET,
      '/uploads': API_TARGET,
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
});
