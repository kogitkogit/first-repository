import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 기존 설정은 그대로 유지하고, 프록시만 추가했습니다.
// - /api 로 시작하는 요청을 FastAPI 서버(예: http://localhost:8000)로 프록시
// - changeOrigin: true 로 CORS 우회
// - '/api' prefix는 그대로 전달( rewrite 사용하지 않음 )

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_ORIGIN || 'http://localhost:8000',
        changeOrigin: true,
        // rewrite: (path) => path, // '/api' prefix 유지
        ws: true,
      },
    },
  },
})