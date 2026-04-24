interface BadgeProps {
  variant?: 'neutral' | 'positive' | 'negative'
  children: React.ReactNode
  className?: string
}

export default function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  const variantClass = {
    neutral: 'bg-tone-neutral',
    positive: 'bg-tone-positive',
    negative: 'bg-tone-negative',
  }[variant]

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${variantClass} ${className}`}>
      {children}
    </span>
  )
}
