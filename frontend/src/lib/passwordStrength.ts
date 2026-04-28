export interface PasswordChecks {
  minLength: boolean
  hasUpper: boolean
  hasNumber: boolean
  hasSymbol: boolean
}

export interface PasswordStrength {
  score: number
  label: string
  color: string
}

/** Evaluate password against minimum policy checks shown in auth UI. */
export function getPasswordChecks(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  }
}

/** Convert check pass-rate into score and semantic label/color for feedback bar. */
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = getPasswordChecks(password)
  const passed = Object.values(checks).filter(Boolean).length
  const score = Math.round((passed / 4) * 100)

  if (score <= 25) return { score, label: 'Débil',  color: 'var(--af-negative)' }
  if (score <= 75) return { score, label: 'Media',  color: 'var(--af-warning)'  }
  return              { score, label: 'Fuerte', color: 'var(--af-positive)' }
}
