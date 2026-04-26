import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Revenue Loss Prevention | Enterprise Revenue Intelligence Platform',
  description: 'The most powerful Revenue Loss Prevention platform for SaaS companies. Recover failed payments, prevent churn, detect billing errors, and protect your revenue.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
