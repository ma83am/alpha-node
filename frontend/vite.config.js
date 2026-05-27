import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'web' ? '/alpha-node/docs/' : '/',
  build: {
    outDir: mode === 'web' ? '../docs' : 'dist',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
}))
