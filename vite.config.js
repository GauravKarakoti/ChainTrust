import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/etherscan': {
          target: 'https://api.etherscan.io',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/etherscan/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.removeHeader('Origin');
              proxyReq.removeHeader('Referer');
            });
          }
        },
        '/goplus': {
          target: 'https://api.gopluslabs.io',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/goplus/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              proxyReq.removeHeader('Origin');
              proxyReq.removeHeader('Referer');
            });
          }
        }
      }
    }
  }
})