'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import LandingPage from '@/components/auth/LandingPage'
import OnboardingFlow from '@/components/auth/OnboardingFlow'

interface AuthGateProps {
  children: React.ReactNode
}

type AppState = 'loading' | 'landing' | 'onboarding' | 'app'

export default function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [state, setState] = useState<AppState>('loading')

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      setState('landing')
      return
    }

    const checkOnboarded = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('users')
          .select('onboarded')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Failed to check onboarding status:', error.message)
          setState('onboarding')
          return
        }

        if (!data) {
          await supabase.from('users').upsert({
            id: user.id,
            email: user.email,
            name: user.name || null,
          }, { onConflict: 'id' })
          setState('onboarding')
          return
        }

        setState(data.onboarded ? 'app' : 'onboarding')
      } catch (err) {
        console.error('Onboarding check failed:', err)
        setState('onboarding')
      }
    }

    checkOnboarded()
  }, [isLoading, isAuthenticated, user])

  const handleOnboardingComplete = async () => {
    if (user) {
      const supabase = createClient()
      await supabase.from('users').update({ onboarded: true }).eq('id', user.id)
    }
    setState('app')
  }

  if (state === 'loading') {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: 52, height: 52,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', animation: 'pulse 1.5s infinite'
        }}>🛡️</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading RevGuard...</div>
      </div>
    )
  }

  if (state === 'landing') return <LandingPage />
  if (state === 'onboarding') return <OnboardingFlow user={user ? { id: user.id, email: user.email, name: user.name || null, avatar: user.avatar || null, balance: 0 } : null} onComplete={handleOnboardingComplete} />
  return <>{children}</>
}
