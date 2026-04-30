import { Component, type ReactNode } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'

interface InnerProps {
  children: ReactNode
  pageLabel?: string
  onRetry: () => void
}

interface InnerState {
  hasError: boolean
  message: string
}

/**
 * PageErrorBoundaryInner — captura errores de render dentro de una página y
 * permite reintentar sin recargar la app entera. Se usa a través del wrapper
 * `PageErrorBoundary` que inyecta el `QueryClient`.
 */
class PageErrorBoundaryInner extends Component<InnerProps, InnerState> {
  constructor(props: InnerProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): InnerState {
    const message = error instanceof Error ? error.message : 'Error inesperado'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error('[PageErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' })
    this.props.onRetry()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const label = this.props.pageLabel ?? 'esta página'
    return (
      <div className="bg-white border border-neutral-100 rounded-xl overflow-hidden">
        <div className="h-1.5 bg-brand w-full" />
        <div className="px-8 py-10 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-light flex items-center justify-center">
            <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-medium text-neutral-900">No pudimos cargar {label}</h2>
            <p className="text-sm text-neutral-700">Ocurrió un error inesperado. Tus datos están seguros; intenta nuevamente.</p>
          </div>
          {this.state.message && (
            <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2 font-mono break-all">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-brand-hover transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }
}

interface PageErrorBoundaryProps {
  children: ReactNode
  pageLabel?: string
  /** Query keys to invalidate when the user clicks "Reintentar". */
  invalidateKeys?: QueryKey[]
}

/**
 * Boundary por página: al pulsar "Reintentar" invalida las queries indicadas
 * para forzar un refetch antes de volver a renderizar el subárbol.
 */
export default function PageErrorBoundary({ children, pageLabel, invalidateKeys = [] }: PageErrorBoundaryProps) {
  const queryClient = useQueryClient()

  const handleRetry = () => {
    invalidateKeys.forEach((key) => {
      void queryClient.invalidateQueries({ queryKey: key })
    })
  }

  return (
    <PageErrorBoundaryInner pageLabel={pageLabel} onRetry={handleRetry}>
      {children}
    </PageErrorBoundaryInner>
  )
}
