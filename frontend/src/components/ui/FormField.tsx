// FormField — wrapper unificado de label + control + mensaje de error.
// Centralizar el chrome del campo evita duplicar markup en cada formulario
// y garantiza accesibilidad/consistencia visual en toda la app.
import type { ReactNode, InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  /** Render custom content (e.g. a Select) instead of a plain input */
  children?: ReactNode
}

export default function FormField({ label, error, children, className = '', ...inputProps }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 app-subtitle">
        {label}
      </label>
      {/* `children` permite usar Select/DatePicker dentro del mismo FormField; si no se pasa, cae a un input nativo. */}
      {children ?? (
        <input className={`app-control ${className}`} {...inputProps} />
      )}
      {/* El mensaje de error solo aparece si existe; mantener el espacio reservado provoca saltos al validar. */}
      {error && <p className="mt-1 text-xs tone-negative">{error}</p>}
    </div>
  )
}
