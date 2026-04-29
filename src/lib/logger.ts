/**
 * Structured logger that outputs JSON lines to stdout/stderr.
 * Drop-in target for Sentry/Datadog/Logtail by setting LOG_WEBHOOK_URL,
 * or wire SENTRY_DSN later without changing call sites.
 */

type Level = 'info' | 'warn' | 'error'

interface LogPayload {
  level: Level
  event: string
  timestamp: string
  context?: Record<string, unknown>
  error?: { message: string; stack?: string; name?: string }
}

function emit(payload: LogPayload) {
  const line = JSON.stringify(payload)
  if (payload.level === 'error') console.error(line)
  else if (payload.level === 'warn') console.warn(line)
  else console.log(line)

  const url = process.env.LOG_WEBHOOK_URL
  if (url) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: line,
    }).catch(() => { /* logging must not throw */ })
  }
}

export function logInfo(event: string, context?: Record<string, unknown>) {
  emit({ level: 'info', event, timestamp: new Date().toISOString(), context })
}

export function logWarn(event: string, context?: Record<string, unknown>) {
  emit({ level: 'warn', event, timestamp: new Date().toISOString(), context })
}

export function logError(event: string, contextOrError?: Record<string, unknown> | unknown, maybeError?: unknown) {
  const isErrLike = (v: unknown): v is Error =>
    v instanceof Error || (typeof v === 'object' && v !== null && 'message' in v)

  let context: Record<string, unknown> | undefined
  let err: unknown

  if (isErrLike(contextOrError) && !maybeError) {
    err = contextOrError
  } else {
    context = contextOrError as Record<string, unknown> | undefined
    err = maybeError
  }

  const payload: LogPayload = {
    level: 'error',
    event,
    timestamp: new Date().toISOString(),
    context,
  }

  if (isErrLike(err)) {
    const e = err as Error
    payload.error = { message: e.message, stack: e.stack, name: e.name }
  }

  emit(payload)
}
