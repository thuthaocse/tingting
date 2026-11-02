import { defineConfig } from 'vite';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/auth': 'http://localhost:8080',
      '/graphql': 'http://localhost:8080',
      '/health': 'http://localhost:8080',
    },
  },
});
