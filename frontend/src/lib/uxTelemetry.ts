export type UxEventPayload = Record<string, string | number | boolean | null>

export interface UxEventEntry {
  event: string
  path: string
  timestamp: string
  payload: UxEventPayload
}

const MAX_BUFFER = 100

function sanitizePayload(payload: UxEventPayload): UxEventPayload {
  const safe: UxEventPayload = {}
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) {
      safe[key] = null
      return
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value
    }
  })
  return safe
}

/**
 * Tracks low-cost UX events for exploratory analysis.
 * This buffer is intentionally local and provider-agnostic.
 */
export function trackUxEvent(event: string, payload: UxEventPayload = {}): void {
  if (typeof window === 'undefined') return

  const entry: UxEventEntry = {
    event,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
    payload: sanitizePayload(payload),
  }

  const bucket = (window as Window & { __atlasUxEvents?: UxEventEntry[] }).__atlasUxEvents ?? []
  bucket.push(entry)
  if (bucket.length > MAX_BUFFER) bucket.shift()
  ;(window as Window & { __atlasUxEvents?: UxEventEntry[] }).__atlasUxEvents = bucket

  window.dispatchEvent(new CustomEvent<UxEventEntry>('atlas:ux-event', { detail: entry }))

  if (import.meta.env.DEV) {
    // Keep local diagnostics visible during exploratory UX testing.
    console.info('[ux-event]', entry)
  }
}
