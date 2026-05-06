const DEFAULT_TOAST_DURATION_MS = 8000

function parseDuration(raw: unknown): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TOAST_DURATION_MS
  return Math.round(parsed)
}

// Parametric duration for all app toasts. Configure with VITE_TOAST_DURATION_MS.
export const TOAST_DURATION_MS = parseDuration(import.meta.env.VITE_TOAST_DURATION_MS)
