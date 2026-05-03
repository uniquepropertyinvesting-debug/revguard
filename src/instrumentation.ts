export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/validateEnv')
    validateEnv()

    // Hydrate observability secrets from Supabase so they sync across deploys.
    // The logger reads these from process.env synchronously, so we mutate it
    // here before any request handlers run.
    try {
      const { getAppSecret } = await import('./lib/db')
      const map: Array<[string, string]> = [
        ['SENTRY_DSN', 'sentry_dsn'],
        ['LOG_WEBHOOK_URL', 'log_webhook_url'],
      ]
      for (const [envName, secretKey] of map) {
        if (!process.env[envName]) {
          const v = await getAppSecret(secretKey)
          if (v) process.env[envName] = v
        }
      }
    } catch { /* best-effort; logger falls back to env-only */ }
  }
}
