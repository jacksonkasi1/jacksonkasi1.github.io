import { defineConfig } from 'vite';

export default defineConfig({
  base: '/launch-land-3d/',
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 650
  }
});
