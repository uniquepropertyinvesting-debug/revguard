'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[client_error]', error)
    if (typeof window === 'undefined') return
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        name: error.name,
        digest: error.digest,
        url: window.location.href,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0e1a',
        color: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Something went wrong</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          An unexpected error occurred. We&rsquo;ve been notified and are looking into it.
          {error.digest && (
            <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#475569' }}>
              Reference: {error.digest}
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              color: '#cbd5e1',
              border: '1px solid #1e2d4a',
            }}
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
