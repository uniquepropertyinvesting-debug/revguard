'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0f1a', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            maxWidth: '480px', width: '100%', padding: '40px',
            background: '#111827', border: '1px solid #1f2937', borderRadius: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
            }}>!</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#f1f5f9' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
              An unexpected error occurred. Your data is safe. Please reload the page to continue.
            </p>
            {this.state.error && (
              <div style={{
                padding: '12px', borderRadius: '8px', marginBottom: '20px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '12px', color: '#ef4444', fontFamily: 'monospace',
                textAlign: 'left', wordBreak: 'break-word', maxHeight: '100px', overflow: 'auto',
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
