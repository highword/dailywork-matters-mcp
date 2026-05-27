import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  root: 'src/ui',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src/ui') },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:37888', changeOrigin: true } },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/ui'),
    emptyOutDir: true,
  },
});
