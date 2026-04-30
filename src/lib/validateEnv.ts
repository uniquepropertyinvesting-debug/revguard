/**
 * Validates required environment variables at server boot. In production,
 * missing required vars throw immediately so the deployment fails loudly
 * instead of crashing later on the first request that needs them.
 *
 * Recommended (but not required) vars produce a single warning line so
 * operators notice missing observability config without breaking the boot.
 */

type EnvCheck = {
  name: string
  hint?: string
  validate?: (value: string) => string | null
}

const REQUIRED: EnvCheck[] = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', validate: (v) => (v.startsWith('https://') ? null : 'must start with https://') },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY' },
  {
    name: 'REVGUARD_ENCRYPTION_KEY',
    hint: 'generate with: openssl rand -hex 32',
    validate: (v) => (v.length >= 32 ? null : 'must be at least 32 characters'),
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    validate: (v) => (/^https?:\/\//.test(v) ? null : 'must be an absolute URL'),
  },
]

const RECOMMENDED: EnvCheck[] = [
  { name: 'SENTRY_DSN', hint: 'error monitoring' },
  { name: 'LOG_WEBHOOK_URL', hint: 'log forwarding' },
  { name: 'BETTERSTACK_WEBHOOK_SECRET', hint: 'incident webhook' },
]

let didRun = false

export function validateEnv(): void {
  if (didRun) return
  didRun = true

  const isProd = process.env.NODE_ENV === 'production'
  const missing: string[] = []
  const invalid: string[] = []

  for (const check of REQUIRED) {
    const value = process.env[check.name]
    if (!value || value.trim() === '') {
      missing.push(check.hint ? `${check.name} (${check.hint})` : check.name)
      continue
    }
    if (check.validate) {
      const err = check.validate(value)
      if (err) invalid.push(`${check.name}: ${err}`)
    }
  }

  if (missing.length || invalid.length) {
    const lines = [
      '[RevGuard] Environment validation failed:',
      ...missing.map((m) => `  - missing: ${m}`),
      ...invalid.map((m) => `  - invalid: ${m}`),
    ]
    const msg = lines.join('\n')
    if (isProd) {
      throw new Error(msg)
    }
    console.warn(msg)
  }

  const skippedRecommended = RECOMMENDED.filter((c) => !process.env[c.name]).map(
    (c) => (c.hint ? `${c.name} (${c.hint})` : c.name),
  )
  if (isProd && skippedRecommended.length) {
    console.warn(
      `[RevGuard] Recommended env vars not set: ${skippedRecommended.join(', ')}`,
    )
  }
}
