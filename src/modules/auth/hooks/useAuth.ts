'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  signup: (email: string, password: string, name?: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function mapUser(u: SupabaseUser): AuthUser {
  return {
    id: u.id,
    email: u.email || '',
    name: u.user_metadata?.name || u.user_metadata?.full_name,
    avatar: u.user_metadata?.avatar_url,
  }
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let settled = false

    const finish = (u: SupabaseUser | null) => {
      settled = true
      setUser(u ? mapUser(u) : null)
      setIsLoading(false)
    }

    supabase.auth.getUser()
      .then(({ data: { user: u } }) => { if (!settled) finish(u) })
      .catch(() => { if (!settled) finish(null) })

    const timeout = setTimeout(() => { if (!settled) finish(null) }, 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? mapUser(session.user) : null)
      setIsLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    const mapped = mapUser(data.user)
    setUser(mapped)
    return mapped
  }, [])

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    if (!data.user) throw new Error('Signup failed')

    await supabase.from('users').upsert({
      id: data.user.id,
      email,
      name: name || null,
    }, { onConflict: 'id' })

    const mapped = mapUser(data.user)
    setUser(mapped)
    return mapped
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
  }
}

export { AuthContext }
