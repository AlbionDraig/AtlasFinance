/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// Configuración separada para Vitest. Usamos un archivo dedicado para evitar
// conflictos de tipos entre el plugin de Tailwind y la API de Vitest.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/test/**',
        'src/**/*.stories.tsx',
        'src/i18n/**',
        'src/types/**',
      ],
      thresholds: {
        // Umbrales por módulo utilitario con cobertura real demostrada.
        // Aumentar progresivamente conforme crecen los tests.
        'src/lib/utils.ts': { lines: 90, functions: 90, branches: 80, statements: 90 },
        'src/lib/passwordStrength.ts': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },
})
