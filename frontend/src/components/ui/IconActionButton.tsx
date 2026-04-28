import type { ReactNode } from 'react'

interface IconActionButtonProps {
  onClick: () => void
  label: string
  icon: ReactNode
  disabled?: boolean
  variant?: 'edit' | 'delete'
}

export default function IconActionButton({
  onClick,
  label,
  icon,
  disabled = false,
  variant = 'edit',
}: IconActionButtonProps) {
  const variantClasses = variant === 'delete'
    ? 'hover:border-brand hover:bg-brand hover:text-white'
    : 'hover:border-brand hover:bg-brand-light hover:text-brand-text'

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 text-neutral-700 transition-colors ${variantClasses} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon}
    </button>
  )
}