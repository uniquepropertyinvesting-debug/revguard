import { NextRequest } from 'next/server'

interface NxCodeUser {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

/**
 * Verifies the Bearer token from the Authorization header against the NxCode
 * platform auth endpoint. Returns the verified user, or null if invalid/missing.
 *
 * This is the ONLY trusted source of userId on the server — never trust a
 * client-supplied userId query param or body field directly.
 */
export async function verifyToken(token: string): Promise<NxCodeUser | null> {
  try {
    const res = await fetch('https://studio-api.nxcode.io/api/sdk/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const user = await res.json()
    if (!user?.id) return null
    return user as NxCodeUser
  } catch {
    return null
  }
}

/**
 * Gets the verified userId from a request.
 *
 * Priority order:
 * 1. x-verified-user-id header — injected by middleware after token verification (fastest)
 * 2. Bearer token in Authorization header — verified against NxCode auth endpoint
 * 3. Dev fallback: userId query param or x-user-id header (non-production only)
 *
 * NEVER use the raw userId query param in production — always use this function.
 */
export async function getVerifiedUserId(req: NextRequest): Promise<string | null> {
  // Fast path: middleware already verified the token and injected the userId
  const injected = req.headers.get('x-verified-user-id')
  if (injected) return injected

  // Slow path: verify token directly (e.g., if middleware didn't run for some reason)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const user = await verifyToken(token)
    if (user) return user.id
  }

  // Dev fallback: allow explicit userId param/header when no token is present
  if (process.env.NODE_ENV !== 'production') {
    return (
      req.nextUrl.searchParams.get('userId') ||
      req.headers.get('x-user-id') ||
      null
    )
  }

  return null
}
