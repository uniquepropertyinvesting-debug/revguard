'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/components/AuthProvider'
import { ThemeProvider } from '@/context/ThemeContext'
import CookieBanner from '@/components/CookieBanner'
import ErrorReporter from '@/components/ErrorReporter'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorReporter />
        {children}
        <CookieBanner />
      </AuthProvider>
    </ThemeProvider>
  )
}
