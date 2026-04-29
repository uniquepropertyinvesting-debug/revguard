'use client'

import { useEffect } from 'react'

export default function ErrorReporter() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const post = (payload: Record<string, unknown>) => {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }

    const onError = (event: ErrorEvent) => {
      post({
        message: event.message || 'window.onerror',
        stack: event.error?.stack,
        name: event.error?.name || 'WindowError',
        url: window.location.href,
        context: { source: event.filename, line: event.lineno, col: event.colno },
      })
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const isErr = reason instanceof Error
      post({
        message: isErr ? reason.message : String(reason),
        stack: isErr ? reason.stack : undefined,
        name: isErr ? reason.name : 'UnhandledRejection',
        url: window.location.href,
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
