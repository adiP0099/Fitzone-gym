import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const moduleId = id.replaceAll('\\', '/')
          if (moduleId.includes('/node_modules/@firebase/auth')) return 'firebase-auth'
          if (moduleId.includes('/node_modules/@firebase/firestore')) return 'firebase-firestore'
          if (moduleId.includes('/node_modules/@firebase/storage')) return 'firebase-storage'
          if (moduleId.includes('/node_modules/@firebase/')) return 'firebase-core'
        },
      },
    },
  },
})
