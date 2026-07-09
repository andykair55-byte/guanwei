import { Component, type ReactNode } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      showDetails: false,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRefresh = (): void => {
    window.location.reload()
  }

  handleGoHome = (): void => {
    window.location.href = '/community'
  }

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-warm relative overflow-hidden">
        <div className="absolute inset-0 noise-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-md">
          <div className="w-full max-w-xs mb-8">
            <div className="brush-divider" />
          </div>

          <div className="w-16 h-16 rounded-full bg-seal/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-seal" />
          </div>

          <h1 className="brand-serif font-bold text-ink-900 text-2xl mb-2">
            出了点小问题
          </h1>

          <p className="text-ink-500 text-sm mb-8">
            页面渲染时遇到了错误，别担心，试试刷新
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full mb-6">
            <button
              onClick={this.handleRefresh}
              className="w-full sm:w-auto flex-1 sm:flex-none px-6 py-3 bg-seal text-white rounded-xl font-semibold shadow-seal-glow hover:bg-seal-dark active:scale-95 transition-all press-pop flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              刷新页面
            </button>
            <button
              onClick={this.handleGoHome}
              className="w-full sm:w-auto flex-1 sm:flex-none px-6 py-3 border-2 border-ink-200 text-ink-700 rounded-xl font-semibold hover:border-seal hover:text-seal active:scale-95 transition-all press-pop flex items-center justify-center gap-2 text-sm"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>

          <button
            onClick={this.toggleDetails}
            className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition-colors"
          >
            {this.state.showDetails ? (
              <>
                收起错误详情
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                查看错误详情
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {this.state.showDetails && this.state.error && (
            <div className="w-full mt-4 text-left animate-fade-in">
              <pre className="bg-paper-dark rounded-xl p-4 overflow-auto text-xs text-ink-500 font-mono max-h-64">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack || '无堆栈信息'}
              </pre>
            </div>
          )}

          <div className="w-full max-w-xs mt-10">
            <div className="brush-divider" style={{ flexDirection: 'row-reverse' }} />
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
