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
 * NOTE: studio-api.nxcode.io is currently unavailable. This function is kept
 * for when a replacement auth endpoint is in place, but is not called by
 * getVerifiedUserId() until then.
 */
export async function verifyToken(token: string): Promise<NxCodeUser | null> {
  // TODO: replace with the new auth endpoint once available.
  // try {
  //   const res = await fetch('https://studio-api.nxcode.io/api/sdk/auth/me', {
  //     headers: { Authorization: `Bearer ${token}` },
  //     signal: AbortSignal.timeout(5000),
  //   })
  //   if (!res.ok) return null
  //   const user = await res.json()
  //   if (!user?.id) return null
  //   return user as NxCodeUser
  // } catch {
  //   return null
  // }
  return null
}

/**
 * Gets the verified userId from a request.
 *
 * Priority order:
 * 1. x-verified-user-id header — injected by middleware after token verification (fastest)
 * 2. Bearer token in Authorization header — verified against NxCode auth endpoint
 * 3. userId query param or x-user-id header (all environments, until a new auth
 *    endpoint is available to replace the defunct nxcode.io verification)
 *
 * Use this function in all API routes to obtain the caller's userId.
 */
export async function getVerifiedUserId(req: NextRequest): Promise<string | null> {
  // Fast path: middleware already verified the token and injected the userId
  const injected = req.headers.get('x-verified-user-id')
  if (injected) return injected

  // Token path: verify against an auth endpoint (currently disabled — see verifyToken)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const user = await verifyToken(token)
    if (user) return user.id
  }

  // Fallback: accept userId from query param or x-user-id header.
  // The nxcode.io auth endpoint is unavailable, so this is the active auth
  // path for all environments until a replacement is wired up.
  return (
    req.nextUrl.searchParams.get('userId') ||
    req.headers.get('x-user-id') ||
    null
  )
}
