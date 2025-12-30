import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ESTA CONFIGURAÇÃO É OBRIGATÓRIA PARA NÃO DAR TELA BRANCA:
  optimizeDeps: {
    include: ['chart.js', 'react-chartjs-2']
  },
  server: {
    host: true
  }
})