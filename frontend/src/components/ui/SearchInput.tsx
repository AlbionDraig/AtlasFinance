interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function SearchInput({ value, onChange, placeholder = 'Buscar…', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="app-control app-control-icon-left w-full pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md text-brand hover:bg-brand-light hover:text-brand-text transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
