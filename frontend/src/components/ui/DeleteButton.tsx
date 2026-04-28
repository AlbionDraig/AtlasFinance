import IconActionButton from './IconActionButton'

interface DeleteButtonProps {
  onClick: () => void
  loading?: boolean
  label?: string
}

export default function DeleteButton({ onClick, loading = false, label = 'Eliminar' }: DeleteButtonProps) {
  return (
    <IconActionButton
      onClick={onClick}
      label={label}
      disabled={loading}
      variant="delete"
      icon={loading ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    />
  )
}
