import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Limpia el DOM tras cada test para evitar fugas de estado entre suites.
afterEach(() => {
  cleanup()
})
