'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'revguard.cookieConsent.v1'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // localStorage may be blocked; default to hidden to avoid noise
    }
  }, [])

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, 'accepted') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 640,
        margin: '0 auto',
        background: '#141b2d',
        border: '1px solid #1e2d4a',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        zIndex: 9999,
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 280px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
        We use only essential cookies to keep you signed in and secure. No tracking or advertising
        cookies. See our{' '}
        <Link href="/privacy" style={{ color: '#06b6d4' }}>
          Privacy Policy
        </Link>
        .
      </div>
      <button
        onClick={accept}
        style={{
          padding: '9px 18px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          flexShrink: 0,
        }}
      >
        Got it
      </button>
    </div>
  )
}
