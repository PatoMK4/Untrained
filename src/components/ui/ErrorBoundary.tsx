import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { hasError: true, message }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-8">
          <div className="text-center">
            <p className="text-4xl font-black text-text-primary mb-2">
              UNTR<span className="text-accent">A</span>INED
            </p>
            <p className="text-text-secondary text-sm">Something went wrong.</p>
          </div>
          <div className="bg-surface rounded-card p-4 w-full max-w-sm">
            <p className="text-text-disabled text-xs font-mono break-all">{this.state.message}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="h-12 px-8 bg-accent text-navbar font-black rounded-pill text-sm tracking-widest"
          >
            RELOAD
          </button>
        </div>
      )
    }
    return this.props.children
  }
}