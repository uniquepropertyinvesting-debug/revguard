'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/components/AuthProvider'
import { ThemeProvider } from '@/context/ThemeContext'
import CookieBanner from '@/components/CookieBanner'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <CookieBanner />
      </AuthProvider>
    </ThemeProvider>
  )
}
