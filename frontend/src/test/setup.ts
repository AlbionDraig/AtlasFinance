import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// Side-effect import: bootstraps i18next so components calling useTranslation
// inside tests get real translations instead of raw keys.
import '@/i18n'

// Limpia el DOM tras cada test para evitar fugas de estado entre suites.
afterEach(() => {
  cleanup()
})
