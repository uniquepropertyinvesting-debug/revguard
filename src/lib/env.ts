function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: typeof window === 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY || '' : '',
  OPENAI_API_KEY: typeof window === 'undefined' ? process.env.OPENAI_API_KEY || '' : '',
  OPENAI_MODEL: optionalEnv('OPENAI_MODEL', 'gpt-4o'),
  NEXT_PUBLIC_APP_URL: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:5173'),
}

let serverEnvValidated = false

export function validateServerEnv() {
  if (serverEnvValidated) return
  serverEnvValidated = true

  const missing: string[] = []

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY')

  if (missing.length > 0) {
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
    if (process.env.NODE_ENV === 'production' && !isBuild) {
      throw new Error(`Missing required server environment variables: ${missing.join(', ')}`)
    }
    console.warn(`[RevGuard] WARNING: Missing server env vars: ${missing.join(', ')}. Some features will be unavailable.`)
  }
}
