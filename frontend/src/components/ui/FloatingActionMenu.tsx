import { useState, type ReactNode } from 'react'

interface FloatingActionItem {
  key: string
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
}

interface FloatingActionMenuProps {
  items: FloatingActionItem[]
  hidden?: boolean
  ariaLabel?: string
}

export default function FloatingActionMenu({
  items,
  hidden = false,
  ariaLabel = 'Abrir acciones rapidas',
}: FloatingActionMenuProps) {
  const [open, setOpen] = useState(false)

  if (hidden || items.length === 0) return null

  function handleItemClick(action: FloatingActionItem) {
    if (action.disabled) return
    setOpen(false)
    action.onClick()
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-16 right-0 z-10 flex flex-col items-end gap-2 pb-1">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className="flex items-center gap-2 bg-white border border-neutral-100 hover:border-brand hover:text-brand text-neutral-700 text-sm font-medium px-4 py-2.5 rounded-full shadow-md transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-100 disabled:hover:text-neutral-700"
              >
                {item.icon && <span className="flex h-4 w-4 shrink-0 items-center justify-center">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-14 w-14 items-center justify-center text-white rounded-full shadow-lg transition-colors ${
          open ? 'bg-brand-hover' : 'bg-brand hover:bg-brand-hover'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
