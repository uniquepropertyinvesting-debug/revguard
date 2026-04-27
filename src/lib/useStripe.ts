'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

async function safeFetch(url: string) {
  const r = await authFetch(url)
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    let msg = `Request failed (${r.status})`
    try { const parsed = JSON.parse(text); if (parsed.error) msg = parsed.error } catch {}
    throw new Error(msg)
  }
  return r.json()
}

function useStripeFetch<T>(url: string, defaultValue: T, extract?: (d: any) => T, refreshInterval = 30000) {
  const [data, setData] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const d = await safeFetch(url)
        if (!mounted) return
        if (d.error) { setError(d.error); return }
        setData(extract ? extract(d) : d)
        setError(null)
      } catch (e: any) {
        if (mounted) setError(e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => { mounted = false; clearInterval(interval) }
  }, [url, refreshInterval])

  return { data, loading, error }
}

export function useStripeROI(refreshInterval = 30000) {
  return useStripeFetch<any>('/api/stripe/roi', null, undefined, refreshInterval)
}

export function useStripeOverview(refreshInterval = 30000) {
  return useStripeFetch<any>('/api/stripe/overview', null, undefined, refreshInterval)
}

export function useStripeFailedPayments(refreshInterval = 30000) {
  return useStripeFetch<any[]>('/api/stripe/failed-payments', [], (d) => d.failed || [], refreshInterval)
}

export function useStripeChurnRisk(refreshInterval = 30000) {
  return useStripeFetch<any>('/api/stripe/churn-risk', null, undefined, refreshInterval)
}

export function useStripeBillingErrors(refreshInterval = 30000) {
  return useStripeFetch<any>('/api/stripe/billing-errors', null, undefined, refreshInterval)
}

export function useStripeUsageMismatch(refreshInterval = 30000) {
  return useStripeFetch<any>('/api/stripe/usage-mismatch', null, undefined, refreshInterval)
}

export function useStripeRecovery(refreshInterval = 30000) {
  return useStripeFetch<any>('/api/stripe/recovery', null, undefined, refreshInterval)
}

export function useStripeCustomers(refreshInterval = 30000) {
  return useStripeFetch<any[]>('/api/stripe/customers', [], (d) => d.customers || [], refreshInterval)
}
