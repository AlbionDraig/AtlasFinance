interface ErrorAlertProps {
  message: string | null | undefined
  className?: string
}

export default function ErrorAlert({ message, className = '' }: ErrorAlertProps) {
  if (!message) return null
  return <p className={`alert-error ${className}`}>{message}</p>
}
