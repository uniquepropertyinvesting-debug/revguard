import { NextResponse } from 'next/server'
import { encrypt, decrypt } from '@/lib/crypto'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Confirms that REVGUARD_ENCRYPTION_KEY on this deployment can decrypt values
 * already stored in app_secrets. If dev and production have different keys, one
 * side will fail here, which is the single most likely cause of "secrets are
 * configured but features still don't work" in production.
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // 1. Local round-trip — proves the env var is set and the cipher works.
  try {
    const sample = `probe-${Date.now()}`
    if (decrypt(encrypt(sample)) !== sample) throw new Error('roundtrip mismatch')
    checks.localRoundTrip = { ok: true }
  } catch (e: unknown) {
    checks.localRoundTrip = { ok: false, detail: e instanceof Error ? e.message : 'failed' }
  }

  // 2. Decrypt one stored secret. If a row exists but decrypt throws, it means
  //    the key on this deploy doesn't match the key that wrote the row.
  try {
    const db = createServiceClient()
    const { data, error } = await db
      .from('app_secrets')
      .select('key, value')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      checks.storedDecrypt = { ok: true, detail: 'no secrets stored yet' }
    } else {
      decrypt(data.value)
      checks.storedDecrypt = { ok: true, detail: `decrypted ${data.key}` }
    }
  } catch (e: unknown) {
    checks.storedDecrypt = {
      ok: false,
      detail: e instanceof Error ? e.message : 'decrypt failed — encryption key mismatch?',
    }
  }

  const ok = Object.values(checks).every(c => c.ok)
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 })
}
