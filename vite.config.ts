import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Generate service worker and manifest
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    // Enable HTTPS for PWA testing in development
    https: true,
    host: true, // Allow external connections for mobile testing
  }
})