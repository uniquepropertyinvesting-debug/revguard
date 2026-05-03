import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getAppSecret } from '@/lib/db'

export async function getVerifiedUserId(req: NextRequest): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user.id
  return null
}

/**
 * Returns the user's id only if their email matches the configured operator
 * email (`alert_email` in app_secrets, or `OPERATOR_EMAIL` env). Used to gate
 * the admin secrets console.
 */
export async function getOperatorUserId(_req: NextRequest): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const operatorEmail =
    process.env.OPERATOR_EMAIL ||
    (await getAppSecret('operator_email')) ||
    (await getAppSecret('alert_email'))
  if (!operatorEmail) return null
  if (user.email.toLowerCase() !== operatorEmail.toLowerCase()) return null
  return user.id
}
