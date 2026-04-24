interface LoadingSpinnerProps {
  /** Size in tailwind units (default: 5 → h-5 w-5) */
  size?: number
  text?: string
  className?: string
}

export default function LoadingSpinner({ size = 5, text, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center gap-3 app-subtitle ${className}`}>
      <span
        className={`h-${size} w-${size} animate-spin rounded-full border-2 border-[var(--af-border)] border-t-[var(--af-accent)]`}
      />
      {text && <span>{text}</span>}
    </div>
  )
}
