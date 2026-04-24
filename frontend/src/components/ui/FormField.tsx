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
      {children ?? (
        <input className={`app-control ${className}`} {...inputProps} />
      )}
      {error && <p className="mt-1 text-xs tone-negative">{error}</p>}
    </div>
  )
}
