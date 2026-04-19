"use client"

/**
 * Payment hook wrapping Nxcode SDK
 *
 * Usage:
 *   const { charge, getBalance, topUp } = usePayment()
 */

import { useState, useCallback } from 'react'

// Nxcode SDK types
interface ChargeOptions {
  /** Amount in cents (e.g., 100 = $1.00) */
  amount: number
  /** Description shown to user */
  description: string
  /** Optional metadata */
  metadata?: Record<string, string>
}

interface ChargeResult {
  success: boolean
  transactionId?: string
  error?: string
}

interface Transaction {
  id: string
  amount: number
  description: string
  createdAt: string
  type: 'charge' | 'topup' | 'refund'
}

interface NxcodeSDK {
  payment: {
    charge(options: ChargeOptions): Promise<ChargeResult>
    getTransactions(limit?: number, offset?: number): Promise<Transaction[]>
  }
  billing: {
    getBalance(): Promise<number>
    topUp(): void
  }
  ready(): Promise<void>
}

declare const Nxcode: NxcodeSDK

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Charge user's balance
   */
  const charge = useCallback(async (options: ChargeOptions): Promise<ChargeResult> => {
    setIsLoading(true)
    setError(null)
    try {
      await Nxcode.ready()
      const result = await Nxcode.payment.charge(options)
      if (!result.success) {
        setError(result.error || 'Payment failed')
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get user's current balance
   */
  const getBalance = useCallback(async (): Promise<number> => {
    await Nxcode.ready()
    return Nxcode.billing.getBalance()
  }, [])

  /**
   * Open top-up page
   */
  const topUp = useCallback(() => {
    Nxcode.billing.topUp()
  }, [])

  /**
   * Get transaction history
   */
  const getTransactions = useCallback(async (limit = 50, offset = 0): Promise<Transaction[]> => {
    await Nxcode.ready()
    return Nxcode.payment.getTransactions(limit, offset)
  }, [])

  return {
    charge,
    getBalance,
    topUp,
    getTransactions,
    isLoading,
    error
  }
}

export type { ChargeOptions, ChargeResult, Transaction }
