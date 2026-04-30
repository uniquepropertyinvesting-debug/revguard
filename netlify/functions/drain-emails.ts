import type { Config } from '@netlify/functions'

export default async () => {
  const secret = process.env.CRON_SECRET
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL
  if (!secret || !siteUrl) {
    return new Response(JSON.stringify({ ok: false, error: 'missing CRON_SECRET or URL' }), { status: 503 })
  }

  const res = await fetch(`${siteUrl}/api/cron/drain-emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
  })

  const body = await res.text()
  return new Response(body, { status: res.status })
}

export const config: Config = {
  schedule: '*/5 * * * *',
}
