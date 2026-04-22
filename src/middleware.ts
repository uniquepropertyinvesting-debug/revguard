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
    // Token present — verify it against NxCode auth.
    // NOTE: studio-api.nxcode.io is currently unavailable; token verification will
    // fail until a replacement endpoint is wired up. Requests with a Bearer token
    // that cannot be verified fall through to the userId query-param fallback below.
    const token = authHeader!.slice(7)
    try {
      const verifyRes = await fetch('https://studio-api.nxcode.io/api/sdk/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      if (verifyRes.ok) {
        const user = await verifyRes.json()
        if (user?.id) {
          // Inject verified userId as a trusted header for downstream route handlers
          const requestHeaders = new Headers(req.headers)
          requestHeaders.set('x-verified-user-id', user.id)
          return NextResponse.next({ request: { headers: requestHeaders } })
        }
      }
      // Auth endpoint returned an error — fall through to userId query-param fallback
    } catch {
      // Auth endpoint unreachable — fall through to userId query-param fallback
    }
  }

  // Fallback: accept userId from query param or x-user-id header.
  // The nxcode.io auth endpoint is unavailable, so this is the active auth
  // path for all environments until a replacement is wired up (mirrors the
  // fallback logic in getVerifiedUserId() in serverAuth.ts).
  const userIdFromQuery = req.nextUrl.searchParams.get('userId')
  const userIdFromHeader = req.headers.get('x-user-id')

  if (userIdFromQuery || userIdFromHeader) {
    console.log('[middleware] auth via userId fallback:', userIdFromQuery || userIdFromHeader)
    return NextResponse.next()
  }

  // No auth credentials at all — reject
  return NextResponse.json(
    { error: 'Authentication required — provide a Bearer token or userId query param' },
    { status: 401 }
  )
}

export const config = {
  matcher: ['/api/:path*'],
}
