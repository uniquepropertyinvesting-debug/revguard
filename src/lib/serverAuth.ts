import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function getVerifiedUserId(req: NextRequest): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return user.id
  return null
}
