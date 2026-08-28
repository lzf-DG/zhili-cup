import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 前后端统一走代理：前端只请求相对路径 /api 与 /uploads
const proxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy,
    watch: {
      ignored: ['!**/public/assets/**', '**/public/uploads/**'],
    },
  },
  preview: {
    proxy,
  },
})
