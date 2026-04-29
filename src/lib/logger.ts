/**
 * Structured logger.
 *
 * Outputs JSON lines to stdout/stderr (always) and forwards to Sentry and/or
 * a generic webhook when configured. No SDK install required — uses Sentry's
 * public ingest HTTP API, so flipping the SENTRY_DSN env var is enough to
 * activate full error monitoring.
 *
 * Activation:
 *   - SENTRY_DSN: forwards errors to Sentry
 *   - LOG_WEBHOOK_URL: forwards all events to a generic webhook (Logtail, etc.)
 *   - Neither: stdout/stderr only (always works)
 */

type Level = 'info' | 'warn' | 'error'

interface LogPayload {
  level: Level
  event: string
  timestamp: string
  context?: Record<string, unknown>
  error?: { message: string; stack?: string; name?: string }
}

interface ParsedDsn {
  storeUrl: string
  publicKey: string
}

let cachedDsn: ParsedDsn | null | undefined

function parseSentryDsn(): ParsedDsn | null {
  if (cachedDsn !== undefined) return cachedDsn
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    cachedDsn = null
    return null
  }
  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/^\//, '')
    if (!projectId || !url.username) {
      cachedDsn = null
      return null
    }
    cachedDsn = {
      publicKey: url.username,
      storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
    }
    return cachedDsn
  } catch {
    cachedDsn = null
    return null
  }
}

function forwardToSentry(payload: LogPayload) {
  const dsn = parseSentryDsn()
  if (!dsn) return
  // Only forward warnings and errors to keep ingest cost predictable.
  if (payload.level === 'info') return

  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: payload.timestamp,
    level: payload.level === 'warn' ? 'warning' : 'error',
    logger: 'revguard',
    platform: 'javascript',
    environment: process.env.NODE_ENV || 'production',
    release: process.env.RELEASE_VERSION || undefined,
    message: { formatted: payload.event },
    tags: { event: payload.event },
    extra: payload.context || {},
    exception: payload.error
      ? {
          values: [
            {
              type: payload.error.name || 'Error',
              value: payload.error.message,
              stacktrace: payload.error.stack ? { frames: parseStack(payload.error.stack) } : undefined,
            },
          ],
        }
      : undefined,
  }

  const auth = [
    'Sentry sentry_version=7',
    `sentry_key=${dsn.publicKey}`,
    'sentry_client=revguard/1.0',
  ].join(', ')

  fetch(dsn.storeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Sentry-Auth': auth },
    body: JSON.stringify(event),
  }).catch(() => { /* logging must not throw */ })
}

function parseStack(stack: string): Array<{ filename: string; function: string; lineno?: number; colno?: number }> {
  return stack
    .split('\n')
    .slice(1, 30)
    .map((line) => {
      const m = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) || line.match(/at\s+(.+?):(\d+):(\d+)/)
      if (!m) return null
      if (m.length === 5) {
        return { function: m[1], filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) }
      }
      return { function: '<anonymous>', filename: m[1], lineno: Number(m[2]), colno: Number(m[3]) }
    })
    .filter(Boolean) as Array<{ filename: string; function: string; lineno?: number; colno?: number }>
}

function emit(payload: LogPayload) {
  const line = JSON.stringify(payload)
  if (payload.level === 'error') console.error(line)
  else if (payload.level === 'warn') console.warn(line)
  else console.log(line)

  forwardToSentry(payload)

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
