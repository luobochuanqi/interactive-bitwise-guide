import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/v1': {
        target: 'https://chat.ecnu.edu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1/, '/open/api/v1'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('Referer', 'https://chat.ecnu.edu.cn/')
            proxyReq.setHeader('Origin', 'https://chat.ecnu.edu.cn')
          })
        }
      }
    }
  }
})
