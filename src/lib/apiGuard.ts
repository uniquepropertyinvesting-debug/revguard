import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'
import { getVerifiedUserId } from '@/lib/serverAuth'
import { logError } from '@/lib/logger'

interface GuardOptions {
  scope: string
  max?: number
  windowMs?: number
  requireAuth?: boolean
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
  { scope, max = 60, windowMs = 60_000, requireAuth = false }: GuardOptions,
): Promise<GuardSuccess | GuardFailure> {
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
