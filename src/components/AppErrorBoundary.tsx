import { Component, type ErrorInfo, type ReactNode } from 'react'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ui] error boundary caught an application error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell app-shell--error" role="alert" aria-live="assertive">
          <div className="app-crash-panel">
            <p className="app-crash-panel__title">Interface fault detected.</p>
            <p className="app-crash-panel__body">Reload the page to restore the console.</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
