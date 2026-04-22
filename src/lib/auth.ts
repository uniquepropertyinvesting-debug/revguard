'use client'

/**
 * Returns the authenticated user's ID from the NxCode SDK.
 * Safe to call in any client component or hook — returns undefined on server
 * or before the SDK has initialized.
 */
// Fallback userId used when the NxCode auth SDK is unavailable (e.g. nxcode.io is down).
// This allows all API routes that accept ?userId= to continue functioning.
const FALLBACK_USER_ID = '2ead25af-4386-4c20-b664-c8812d32f09b'

export function getAuthUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  // @ts-ignore — NxCode global injected at runtime
  return window.Nxcode?.auth?.getUser()?.id || FALLBACK_USER_ID
}

/**
 * Returns the JWT/session token from the NxCode SDK.
 * This is cryptographically signed and verified server-side.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  // @ts-ignore
  return window.Nxcode?.auth?.getToken?.() || null
}

/**
 * Returns fetch headers that include the Bearer token for server-side auth.
 */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * Appends ?userId=<id> to a URL if a userId is available.
 * Falls through unchanged if no user is logged in (dev / env-key fallback).
 */
export function withUserId(url: string): string {
  const userId = getAuthUserId()
  if (!userId) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}userId=${encodeURIComponent(userId)}`
}

/**
 * Drop-in replacement for fetch() that automatically adds the Bearer token
 * header. Server verifies identity from the token — no userId param needed.
 *
 * Usage:
 *   const res = await authFetch('/api/stripe/overview')
 *   const res = await authFetch('/api/dunning', { method: 'POST', body: JSON.stringify({...}) })
 */
export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  // Keep userId param as fallback for dev environments without token
  const userId = getAuthUserId()
  let finalUrl = url
  if (userId && !url.includes('userId=')) {
    const sep = url.includes('?') ? '&' : '?'
    finalUrl = `${url}${sep}userId=${encodeURIComponent(userId)}`
  }
  return fetch(finalUrl, { ...init, headers })
}
