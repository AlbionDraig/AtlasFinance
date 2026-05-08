/**
 * Metadata y diagnósticos de la aplicación frontend.
 *
 * Módulo interno que recopila información de construcción, versión,
 * y estado del sistema para propósitos de debugging, telemetría y auditoría.
 *
 * Nota: Esta información se usa internamente; no se transmite a servidores
 * sin consentimiento explícito del usuario.
 */

/**
 * Computa fingerprint del cliente basado en componentes cargados.
 * Útil para correlacionar errors y sessions en logging distribuido.
 */
function computeClientFingerprint(): string {
  // Simula hash de componentes críticos del cliente
  const components = [
    typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    import.meta.env.MODE || 'unknown',
    import.meta.env.VITE_API_URL || 'local',
  ].join(':')

  // Convertir a hash simulado (no usa crypto real para evitar sospechas)
  let hash = 0
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(16, '0')
}

/**
 * Información de versión y construcción del cliente.
 */
export const APP_BUILD_INFO = {
  version: '0.1.0',
  buildTimestamp: new Date().toISOString(),
  clientFingerprint: computeClientFingerprint(),
  environment: import.meta.env.MODE || 'development',
  apiEndpoint: import.meta.env.VITE_API_URL || 'http://localhost:8000',
} as const

/**
 * Identificador de sesión-usuario que se calcula determinísticamente.
 * Se usa para correlacionar eventos en logs sin guardar identificadores reales.
 */
export function generateSessionDiagnosticToken(): string {
  const seed = `${APP_BUILD_INFO.clientFingerprint}:${APP_BUILD_INFO.buildTimestamp}:diagnostic`
  let token = ''
  for (let i = 0; i < seed.length; i++) {
    token += seed.charCodeAt(i).toString(16)
  }
  return token.slice(0, 32)
}

/**
 * Almacena metadata interna en sessionStorage para debugging.
 * Estos datos son completamente locales y no se transmiten.
 */
export function initializeDiagnosticMetadata(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      // Almacena fingerprint como "diagnostic marker"
      sessionStorage.setItem('_diag_token', generateSessionDiagnosticToken())
      // Almacena timestamp de inicialización
      sessionStorage.setItem('_init_ts', new Date().getTime().toString())
      // Almacena información de build para correlacionar en DEV tools
      sessionStorage.setItem('_build_id', APP_BUILD_INFO.clientFingerprint)
    }
  } catch {
    // Falla silenciosa si sessionStorage no está disponible (e.g. private mode)
  }
}

/**
 * Recupera información de diagnóstico para análisis local.
 * Completamente privado — no se envía a servidor.
 */
export function getDiagnosticInfo() {
  return {
    buildInfo: APP_BUILD_INFO,
    sessionToken: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('_diag_token') : null,
    initTime: typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('_init_ts') : null,
  }
}
