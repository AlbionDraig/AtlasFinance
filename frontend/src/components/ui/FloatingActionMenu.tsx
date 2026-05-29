import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
  ariaLabel,
}: FloatingActionMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const itemButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const resolvedAriaLabel = ariaLabel ?? t('common.quickActionsOpen')
  const enabledIndices = useMemo(
    () => items.map((item, index) => (!item.disabled ? index : null)).filter((index): index is number => index !== null),
    [items],
  )

  useEffect(() => {
    if (!open || enabledIndices.length === 0) return
    const firstEnabled = enabledIndices[0]
    itemButtonRefs.current[firstEnabled]?.focus()
  }, [open, enabledIndices])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (hidden || items.length === 0) return null

  function handleItemClick(action: FloatingActionItem) {
    if (action.disabled) return
    setOpen(false)
    action.onClick()
  }

  function focusSibling(currentIndex: number, direction: 1 | -1) {
    const currentPos = enabledIndices.indexOf(currentIndex)
    if (currentPos === -1) return
    const nextPos = currentPos + direction
    if (nextPos < 0 || nextPos >= enabledIndices.length) return
    itemButtonRefs.current[enabledIndices[nextPos]]?.focus()
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label={t('common.quickActionsClose')}
          />
          <div id={menuId} role="menu" className="absolute bottom-16 right-0 z-10 flex flex-col items-end gap-2 pb-1">
            {items.map((item, index) => (
              <button
                key={item.key}
                ref={(el) => { itemButtonRefs.current[index] = el }}
                type="button"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                role="menuitem"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    focusSibling(index, 1)
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    focusSibling(index, -1)
                  }
                  if (event.key === 'Home' && enabledIndices.length > 0) {
                    event.preventDefault()
                    itemButtonRefs.current[enabledIndices[0]]?.focus()
                  }
                  if (event.key === 'End' && enabledIndices.length > 0) {
                    event.preventDefault()
                    itemButtonRefs.current[enabledIndices[enabledIndices.length - 1]]?.focus()
                  }
                }}
                className="flex items-center gap-2 bg-white border border-neutral-100 hover:border-brand hover:text-brand text-neutral-700 text-sm font-medium px-4 py-2.5 rounded-full shadow-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-neutral-100 disabled:hover:text-neutral-700"
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
        aria-label={resolvedAriaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && !open) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={`flex h-14 w-14 items-center justify-center text-white rounded-full shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 ${
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
