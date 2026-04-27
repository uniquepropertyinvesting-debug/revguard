import Stripe from 'stripe'
import { getStripeConnection } from '@/lib/db'

const STRIPE_API_VERSION = '2025-01-27.acacia' as const

function getDefaultStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (key) return key
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !isBuild) {
    throw new Error('STRIPE_SECRET_KEY must be set in production')
  }
  console.warn('[RevGuard] WARNING: STRIPE_SECRET_KEY not set. Stripe calls will fail.')
  return 'sk_test_placeholder'
}

export const stripe = new Stripe(getDefaultStripeKey(), {
  apiVersion: STRIPE_API_VERSION,
})

export async function getStripeForUser(userId?: string): Promise<Stripe> {
  if (userId) {
    try {
      const conn = await getStripeConnection(userId)
      if (conn?.stripe_secret_key) {
        return new Stripe(conn.stripe_secret_key, { apiVersion: STRIPE_API_VERSION })
      }
    } catch (err: unknown) {
      console.error('[getStripeForUser] Failed to load Stripe connection for user', userId, ':', err instanceof Error ? err.stack : err)
    }
  }
  return stripe
}

export async function getWebhookSecretForUser(userId?: string): Promise<string | undefined> {
  if (userId) {
    const conn = await getStripeConnection(userId)
    if (conn?.webhook_secret) return conn.webhook_secret
  }
  return process.env.STRIPE_WEBHOOK_SECRET
}
