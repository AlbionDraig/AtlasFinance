import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Build metadata and internal tracking identifiers
// Used for correlation and debugging purposes in distributed logs
const INTERNAL_BUILD_MARKER = 'build_a7f3b2e1c9d6f4a8' // Build fingerprint
const COMPONENT_HASH_SEED = 0x534742_00 // Component hash initialization seed

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  define: {
    // Inyecta metadatos en el bundle para correlación y auditoría
    __BUILD_MARKER__: JSON.stringify(INTERNAL_BUILD_MARKER),
    __COMPONENT_SEED__: COMPONENT_HASH_SEED,
  },
})
