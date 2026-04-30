import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * ErrorBoundary — captura errores de render/lifecycle en el subárbol y muestra
 * una pantalla de fallback en lugar de dejar la app en blanco.
 *
 * Uso: envolver el árbol de rutas en App.tsx.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Error inesperado'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    // En producción se podría enviar a Sentry / DataDog aquí.
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
    // Navegar al dashboard limpia el árbol de componentes comprometido.
    window.location.href = '/dashboard'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-white border border-neutral-100 rounded-xl max-w-md w-full overflow-hidden">
          <div className="h-1.5 bg-brand w-full" />
          <div className="px-8 py-10 text-center space-y-4">
            {/* Icon */}
            <div className="mx-auto w-14 h-14 rounded-full bg-brand-light flex items-center justify-center">
              <svg
                className="w-7 h-7 text-brand"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h1 className="text-base font-medium text-neutral-900">
                Algo salió mal
              </h1>
              <p className="text-sm text-neutral-700">
                La página encontró un error inesperado. Tu sesión y datos están
                seguros.
              </p>
            </div>

            {this.state.message && (
              <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2 font-mono break-all">
                {this.state.message}
              </p>
            )}

            <button
              onClick={this.handleReset}
              className="mt-2 inline-flex items-center gap-2 bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-brand-hover transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }
}
