import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

interface ClientErrorReport {
  message?: string
  stack?: string
  name?: string
  url?: string
  digest?: string
  context?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  // Anonymous endpoint — rate-limit by IP to prevent abuse.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit('client_error', ip, { max: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 })

  let body: ClientErrorReport
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, 1000) : 'unknown'
  const stack = typeof body.stack === 'string' ? body.stack.slice(0, 8000) : undefined
  const name = typeof body.name === 'string' ? body.name.slice(0, 200) : 'ClientError'
  const url = typeof body.url === 'string' ? body.url.slice(0, 500) : undefined

  const err = new Error(message)
  err.name = name
  if (stack) err.stack = stack

  logError('client_error', { url, digest: body.digest, ...(body.context || {}) }, err)

  return NextResponse.json({ ok: true })
}
