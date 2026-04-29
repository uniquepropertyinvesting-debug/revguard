import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

interface GuardOptions {
  scope: string
  max?: number
  windowMs?: number
  requireAuth?: boolean
  /** Enforce same-origin for state-changing methods. Defaults to true. */
  csrf?: boolean
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const source = origin || referer
  if (!source) return false

  const allowed: string[] = []
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) allowed.push(appUrl.replace(/\/$/, ''))
  const host = req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  if (host) allowed.push(`${proto}://${host}`)

  try {
    const sourceOrigin = new URL(source).origin
    return allowed.some((a) => {
      try { return new URL(a).origin === sourceOrigin } catch { return false }
    })
  } catch {
    return false
  }
}

interface GuardSuccess {
  ok: true
  userId: string | null
  rateHeaders: Record<string, string>
}

interface GuardFailure {
  ok: false
  response: NextResponse
}

export async function apiGuard(
  req: NextRequest,
  { scope, max = 60, windowMs = 60_000, requireAuth = false, csrf = true }: GuardOptions,
): Promise<GuardSuccess | GuardFailure> {
  if (csrf && STATE_CHANGING.has(req.method) && !isSameOrigin(req)) {
    logError('csrf_origin_mismatch', { scope, method: req.method })
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const userId = await getVerifiedUserId(req)

  if (requireAuth && !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  const identifier = userId || ip
  const result = rateLimit(scope, identifier, { max, windowMs })
  const headers = rateLimitHeaders(result)

  if (!result.ok) {
    logError('rate_limit_exceeded', { scope, identifier })
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers },
      ),
    }
  }

  return { ok: true, userId, rateHeaders: headers }
}
