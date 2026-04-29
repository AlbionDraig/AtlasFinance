interface BadgeProps {
  variant?: 'neutral' | 'positive' | 'negative' | 'warning'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const variantClass = {
    neutral: 'bg-tone-neutral',
    positive: 'bg-tone-positive',
    negative: 'bg-tone-negative',
    warning: 'bg-warning-bg text-warning-text',
  }[variant]

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${variantClass} ${className}`}>
      {children}
    </span>
  )
}
