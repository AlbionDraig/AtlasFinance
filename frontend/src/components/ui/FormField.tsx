// FormField — wrapper unificado de label + control + mensaje de error.
// Centralizar el chrome del campo evita duplicar markup en cada formulario
// y garantiza accesibilidad/consistencia visual en toda la app.
import { useId, type ReactNode, type InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  /** Render custom content (e.g. a Select) instead of a plain input */
  children?: ReactNode
}

export default function FormField({ label, error, children, className = '', ...inputProps }: FormFieldProps) {
  const generatedId = useId()
  const inputId = inputProps.id ?? generatedId
  const labelFor = children ? inputProps.id : inputId
  const describedByProp = inputProps['aria-describedby']
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [describedByProp, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={labelFor} className="block text-sm font-medium mb-1 app-subtitle">
        {label}
      </label>
      {/* `children` permite usar Select/DatePicker dentro del mismo FormField; si no se pasa, cae a un input nativo. */}
      {children ?? (
        <input
          id={inputId}
          className={`app-control ${className}`}
          aria-invalid={error ? true : inputProps['aria-invalid']}
          aria-describedby={describedBy}
          {...inputProps}
        />
      )}
      {/* El mensaje de error solo aparece si existe; mantener el espacio reservado provoca saltos al validar. */}
      {error && (
        <p id={errorId} className="mt-1 text-xs tone-negative">
          {error}
        </p>
      )}
    </div>
  )
}
