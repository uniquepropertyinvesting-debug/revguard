'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

export function useStripeROI(refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/roi')
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

export function useStripeOverview(refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/overview')
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

export function useStripeFailedPayments(refreshInterval = 5000) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/failed-payments')
        const d = await r.json()
        if (d.error) setError(d.error)
        else setData(d.failed || [])
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

export function useStripeChurnRisk(refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/churn-risk')
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

export function useStripeBillingErrors(refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/billing-errors')
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

export function useStripeUsageMismatch(refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/usage-mismatch')
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

export function useStripeRecovery(refreshInterval = 5000) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/recovery')
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

export function useStripeCustomers(refreshInterval = 5000) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await authFetch('/api/stripe/customers')
        const d = await r.json()
        if (d.error) setError(d.error)
        else setData(d.customers || [])
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
