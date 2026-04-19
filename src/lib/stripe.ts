import Stripe from 'stripe'
import { getStripeConnection } from '@/lib/db'

const STRIPE_API_VERSION = '2025-01-27.acacia' as const

// Fallback global instance — used only when no userId is provided (e.g. dev/testing)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: STRIPE_API_VERSION,
})

// Per-tenant Stripe instance — looks up the user's secret key from DB first,
// falls back to env key if no connection is stored yet.
export function getStripeForUser(userId?: string): Stripe {
  if (userId) {
    const conn = getStripeConnection(userId)
    if (conn?.stripe_secret_key) {
      return new Stripe(conn.stripe_secret_key, { apiVersion: STRIPE_API_VERSION })
    }
  }
  // Fallback to env key (for dev / before user connects their account)
  return stripe
}

// Get the webhook secret for a specific user (falls back to env)
export function getWebhookSecretForUser(userId?: string): string | undefined {
  if (userId) {
    const conn = getStripeConnection(userId)
    if (conn?.webhook_secret) return conn.webhook_secret
  }
  return process.env.STRIPE_WEBHOOK_SECRET
}
