import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4174,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@monaco-editor/react', 'lucide-react'],
  },
})
