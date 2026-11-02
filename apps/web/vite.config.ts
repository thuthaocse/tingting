import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

export default defineConfig(({ mode }) => {
  const { VITE_DEV_API_ORIGIN } = loadEnv(mode, process.cwd(), 'VITE_');
  const apiOrigin = VITE_DEV_API_ORIGIN || 'http://localhost:8080';
  const apiProxy: ProxyOptions = {
    target: apiOrigin,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (request) => request.setHeader('origin', apiOrigin));
    },
  };

  return {
    esbuild: { jsx: 'automatic' },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/auth': apiProxy,
        '/graphql': apiProxy,
        '/health': apiProxy,
      },
    },
  };
});
