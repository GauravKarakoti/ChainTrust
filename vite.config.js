import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/restpp': {
          target: env.VITE_TG_URL,
          changeOrigin: true,
          secure: false,
        },
        '/tgcloud': {
          target: 'https://api.tgcloud.io',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/tgcloud/, '')
        }
      }
    }
  }
})