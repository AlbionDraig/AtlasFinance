interface AuthLoadingOverlayProps {
  title: string
  subtitle: string
}

export default function AuthLoadingOverlay({ title, subtitle }: AuthLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--af-text)_28%,transparent)] backdrop-blur-[1px] flex items-center justify-center px-4">
      <div className="w-full max-w-xs app-panel p-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded-full border-2 border-[var(--af-border)] border-t-[var(--af-accent)] animate-spin" />
          <div>
            <p className="text-sm font-semibold text-[var(--af-text)]">{title}</p>
            <p className="text-xs app-subtitle">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
