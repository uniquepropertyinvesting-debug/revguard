'use client'

import { createClient } from '@/lib/supabase/client'

export async function getAuthUserIdAsync(): Promise<string | undefined> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export async function getAuthToken(): Promise<string | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = await getAuthToken()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(url, { ...init, headers })
}
