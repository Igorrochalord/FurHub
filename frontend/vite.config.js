import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true, // permite acessar via túnel (trycloudflare.com)
    proxy: { '/api': process.env.VITE_API_PROXY || 'http://localhost:8000' },
  },
})
