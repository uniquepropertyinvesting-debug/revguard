'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
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
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Application error</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              A critical error occurred. Please reload the page.
              {error.digest && (
                <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#475569' }}>
                  Reference: {error.digest}
                </span>
              )}
            </p>
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
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
