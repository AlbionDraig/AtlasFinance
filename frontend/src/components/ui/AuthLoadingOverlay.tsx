interface AuthLoadingOverlayProps {
  title: string
  subtitle: string
}

export default function AuthLoadingOverlay({ title, subtitle }: AuthLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-950/35 backdrop-blur-[1px] flex items-center justify-center px-4">
      <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl p-5">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded-full border-2 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
