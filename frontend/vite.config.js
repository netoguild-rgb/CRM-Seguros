import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['chart.js', 'react-chartjs-2']
  },
  server: {
    host: true,
    proxy: {
      '/login': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/leads': 'http://localhost:3000',
      '/appointments': 'http://localhost:3000',
      '/financial': 'http://localhost:3000',
      '/clients': 'http://localhost:3000',
      '/documents': 'http://localhost:3000',
      '/policies': 'http://localhost:3000',
      '/claims': 'http://localhost:3000',
      '/producer-stats': 'http://localhost:3000',
      '/config': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/dashboard-stats': 'http://localhost:3000'
    }
  }
})