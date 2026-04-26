'use client'

import { useState, useEffect } from 'react'
import LandingPage from '@/components/auth/LandingPage'
import OnboardingFlow from '@/components/auth/OnboardingFlow'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  balance: number
}

interface AuthGateProps {
  children: React.ReactNode
}

type AppState = 'loading' | 'landing' | 'onboarding' | 'app'

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<AppState>('loading')

  useEffect(() => {
    const checkAuth = () => {
      // @ts-ignore
      const sdk = window.Nxcode
      if (!sdk?.auth) {
        setTimeout(checkAuth, 300)
        return
      }

      // Listen for auth changes
      sdk.auth.onAuthStateChange((u: User | null) => {
        setUser(u)
        if (!u) {
          setState('landing')
        } else {
          // Check if onboarding completed
          const onboarded = localStorage.getItem(`revguard_onboarded_${u.id}`)
          setState(onboarded ? 'app' : 'onboarding')
        }
      })

      // Check current state
      if (sdk.auth.isLoggedIn()) {
        const u = sdk.auth.getUser()
        setUser(u)
        const onboarded = localStorage.getItem(`revguard_onboarded_${u?.id}`)
        setState(onboarded ? 'app' : 'onboarding')
      } else {
        setState('landing')
      }
    }

    checkAuth()
  }, [])

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`revguard_onboarded_${user.id}`, 'true')
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
  if (state === 'onboarding') return <OnboardingFlow user={user} onComplete={handleOnboardingComplete} />
  return <>{children}</>
}
