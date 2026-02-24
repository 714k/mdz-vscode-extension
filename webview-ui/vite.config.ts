import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [solid()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: '../dist/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
