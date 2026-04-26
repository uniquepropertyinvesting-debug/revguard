'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

function useStripeData(url: string, dataKey: string, refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch(url)
        const d = await r.json()
        if (d.error) setError(d.error)
        else setData(d)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [])

  return { data, loading, error }
}

export function useStripeROI(refreshInterval = 5000) {
  return useStripeData('/api/stripe/roi', '', refreshInterval)
}

export function useStripeOverview(refreshInterval = 5000) {
  return useStripeData('/api/stripe/overview', '', refreshInterval)
}

export function useStripeFailedPayments(refreshInterval = 5000) {
  const { data, loading, error } = useStripeData('/api/stripe/failed-payments', '', refreshInterval)
  return { data: data?.failed || [], loading, error }
}

export function useStripeChurnRisk(refreshInterval = 5000) {
  return useStripeData('/api/stripe/churn-risk', '', refreshInterval)
}

export function useStripeBillingErrors(refreshInterval = 5000) {
  return useStripeData('/api/stripe/billing-errors', '', refreshInterval)
}

export function useStripeUsageMismatch(refreshInterval = 5000) {
  return useStripeData('/api/stripe/usage-mismatch', '', refreshInterval)
}

export function useStripeRecovery(refreshInterval = 5000) {
  return useStripeData('/api/stripe/recovery', '', refreshInterval)
}

export function useStripeCustomers(refreshInterval = 5000) {
  const { data, loading, error } = useStripeData('/api/stripe/customers', '', refreshInterval)
  return { data: data?.customers || [], loading, error }
}
