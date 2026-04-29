'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/modules/auth/components/AuthProvider'
import { ThemeProvider } from '@/context/ThemeContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
