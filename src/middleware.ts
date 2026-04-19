import { NextRequest, NextResponse } from 'next/server'

// Routes that bypass auth entirely (Stripe signs these with HMAC)
const PUBLIC_API_ROUTES = [
  '/api/webhooks/stripe',
]

// Internal server-to-server routes (webhook handler → send-email, no user token)
const INTERNAL_API_ROUTES = [
  '/api/alerts/send-email',
]

// GET routes that work with the environment-level Stripe key (no per-tenant auth)
const OPEN_GET_ROUTES = [
  '/api/stripe/roi',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // Always allow Stripe webhooks (authenticated by Stripe HMAC signature)
  if (PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()

  // Allow internal server calls
  if (INTERNAL_API_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()

  // Open GET routes (env-level Stripe key, no per-tenant auth needed)
  if (OPEN_GET_ROUTES.some(r => pathname.startsWith(r))) return NextResponse.next()

  // --- Auth check ---
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const hasToken = authHeader?.startsWith('Bearer ')

  if (hasToken) {
    // Token present — verify it against NxCode auth
    const token = authHeader!.slice(7)
    try {
      const verifyRes = await fetch('https://studio-api.nxcode.io/api/sdk/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      if (!verifyRes.ok) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
      const user = await verifyRes.json()
      if (!user?.id) {
        return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })
      }
      // Inject verified userId as a trusted header for downstream route handlers
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-verified-user-id', user.id)
      return NextResponse.next({ request: { headers: requestHeaders } })
    } catch {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
    }
  }

  // No token — allow in dev (query-param userId fallback), block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Dev: require at least a userId param so routes don't silently use wrong data
  const userIdFromQuery = req.nextUrl.searchParams.get('userId')
  const userIdFromHeader = req.headers.get('x-user-id')
  if (!userIdFromQuery && !userIdFromHeader && req.method === 'GET') {
    return NextResponse.json({ error: 'Authentication required (dev: provide userId param or Bearer token)' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
