"use client"

/**
 * Pay Button Component
 *
 * One-click payment button using Nxcode Payment. Add your own styling.
 */

import { useState } from 'react'
import { usePayment } from '../hooks/usePayment'

interface PayButtonProps {
  /** Amount in cents (e.g., 100 = $1.00) */
  amount: number
  /** Description shown to user */
  description: string
  /** Button text */
  label?: string
  /** Called after successful payment */
  onSuccess?: (transactionId: string) => void
  /** Called on payment failure */
  onError?: (error: string) => void
  /** Class name for styling */
  className?: string
  /** Disable button */
  disabled?: boolean
}

export function PayButton({
  amount,
  description,
  label,
  onSuccess,
  onError,
  className,
  disabled
}: PayButtonProps) {
  const { charge, isLoading, error } = usePayment()
  const [success, setSuccess] = useState(false)

  const handleClick = async () => {
    setSuccess(false)

    const result = await charge({
      amount,
      description
    })

    if (result.success && result.transactionId) {
      setSuccess(true)
      onSuccess?.(result.transactionId)
    } else {
      onError?.(result.error || 'Payment failed')
    }
  }

  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const buttonText = label || `Pay ${formatAmount(amount)}`

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        data-pay-button
        data-loading={isLoading}
        data-success={success}
      >
        {isLoading ? 'Processing...' : success ? 'Paid!' : buttonText}
      </button>

      {error && <p data-error>{error}</p>}
    </div>
  )
}
