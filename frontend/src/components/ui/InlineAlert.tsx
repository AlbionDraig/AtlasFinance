type AlertVariant = 'warning' | 'success' | 'info'

interface InlineAlertProps {
  message: React.ReactNode
  variant?: AlertVariant
  className?: string
}

const VARIANT_STYLES: Record<AlertVariant, { wrapper: string; iconColor: string; icon: string; text: string }> = {
  warning: {
    wrapper: 'bg-warning-bg border border-warning',
    iconColor: 'text-warning',
    icon: '⚠',
    text: 'text-warning-text',
  },
  success: {
    wrapper: 'bg-success-bg border border-success',
    iconColor: 'text-success',
    icon: '✓',
    text: 'text-success-text',
  },
  info: {
    wrapper: 'bg-neutral-100 border border-neutral-400',
    iconColor: 'text-neutral-400',
    icon: 'ℹ',
    text: 'text-neutral-700',
  },
}

export default function InlineAlert({ message, variant = 'warning', className = '' }: InlineAlertProps) {
  const styles = VARIANT_STYLES[variant]
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${styles.wrapper} ${className}`}>
      <span className={`mt-0.5 text-sm leading-none ${styles.iconColor}`}>{styles.icon}</span>
      <p className={`text-xs ${styles.text}`}>{message}</p>
    </div>
  )
}
