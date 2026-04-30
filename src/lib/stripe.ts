import Stripe from 'stripe'
import { getStripeConnection } from '@/lib/db'

const STRIPE_API_VERSION = '2026-04-22.dahlia' as const

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
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

/**
 * Returns a client-safe error message. Stripe API errors are designed to be
 * shown to merchants (and the user owns the keys), so their `message` is
 * surfaced. All other errors are masked to avoid leaking internals.
 */
export function safeStripeError(err: unknown, fallback = 'Stripe request failed'): string {
  if (err instanceof Stripe.errors.StripeError) {
    return err.message || fallback
  }
  return fallback
}
