import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const lang = i18n.language.split('-')[0]
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0]

  function handleSelect(code: string) {
    void i18n.changeLanguage(code)
    localStorage.setItem('atlas-lang', code)
    setOpen(false)
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-400 hover:text-neutral-50 hover:bg-white/10 transition-colors text-sm font-medium"
      >
        {/* Globe icon */}
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        <span className="flex-1 text-left text-xs">{current.label}</span>
        {/* Chevron */}
        <svg
          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-neutral-900 border border-white/10 rounded-lg overflow-hidden shadow-lg z-50">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                code === lang
                  ? 'bg-brand text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-50 hover:bg-white/10'
              }`}
            >
              <span>{label}</span>
              {code === lang && (
                <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
