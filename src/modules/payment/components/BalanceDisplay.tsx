"use client"

/**
 * Balance Display Component
 *
 * Shows user's current balance with top-up button. Add your own styling.
 */

import { useState, useEffect } from 'react'
import { usePayment } from '../hooks/usePayment'

interface BalanceDisplayProps {
  /** Show top-up button */
  showTopUp?: boolean
  /** Class name for styling */
  className?: string
}

export function BalanceDisplay({ showTopUp = true, className }: BalanceDisplayProps) {
  const { getBalance, topUp } = usePayment()
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const bal = await getBalance()
        setBalance(bal)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load balance')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()
  }, [getBalance])

  const formatBalance = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  if (isLoading) {
    return <div className={className}>Loading balance...</div>
  }

  if (error) {
    return <div className={className} data-error>{error}</div>
  }

  return (
    <div className={className} data-balance-display>
      <div data-balance>
        <span data-label>Balance: </span>
        <span data-value>{balance !== null ? formatBalance(balance) : '--'}</span>
      </div>

      {showTopUp && (
        <button onClick={topUp} data-topup-button>
          Top Up
        </button>
      )}
    </div>
  )
}
