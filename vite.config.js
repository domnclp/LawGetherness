import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /ollama -> local Ollama server so the browser avoids CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { '/ollama': { target: 'http://localhost:11434', rewrite: p => p.replace(/^\/ollama/, '') } } }
})
