'use client'

import { useEffect, useState } from 'react'

interface HealthCheck {
  ok: boolean
  latencyMs?: number
  error?: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded'
  version: string
  environment: string
  timestamp: string
  uptimeMs: number
  checks: Record<string, HealthCheck>
}

interface Incident {
  id: string
  monitor_name: string
  status: string
  severity: string
  started_at: string
  resolved_at: string | null
  summary: string
}

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [healthRes, incidentsRes] = await Promise.all([
          fetch('/api/health', { cache: 'no-store' }),
          fetch('/api/incidents', { cache: 'no-store' }),
        ])
        const health = (await healthRes.json()) as HealthResponse
        const incidentsJson = (await incidentsRes.json()) as { incidents?: Incident[] }
        if (!cancelled) {
          setData(health)
          setIncidents(incidentsJson.incidents || [])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const id = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const allOk = data?.status === 'healthy'

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0a0e1a',
        color: '#f1f5f9',
        padding: '48px 24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>RevGuard Status</h1>
          <a href="/" style={{ color: '#06b6d4', textDecoration: 'none', fontSize: 14 }}>
            Back to app
          </a>
        </div>

        <div
          style={{
            background: '#141b2d',
            border: `1px solid ${allOk ? '#10b981' : '#ef4444'}`,
            borderRadius: 12,
            padding: '24px 28px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: loading ? '#64748b' : allOk ? '#10b981' : '#ef4444',
              boxShadow: loading ? 'none' : `0 0 12px ${allOk ? '#10b981' : '#ef4444'}`,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {loading ? 'Checking systems…' : allOk ? 'All systems operational' : 'Degraded service'}
            </div>
            {data && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Last checked {new Date(data.timestamp).toLocaleTimeString()} · v{data.version}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#1f1014',
              border: '1px solid #ef4444',
              borderRadius: 12,
              padding: 16,
              fontSize: 13,
              color: '#fca5a5',
              marginBottom: 24,
            }}
          >
            Status check failed: {error}
          </div>
        )}

        {data && (
          <div
            style={{
              background: '#141b2d',
              border: '1px solid #1e2d4a',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {Object.entries(data.checks).map(([name, check], i, arr) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: i < arr.length - 1 ? '1px solid #1e2d4a' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: check.ok ? '#10b981' : '#ef4444',
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{name}</span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {check.ok
                    ? check.latencyMs !== undefined
                      ? `Operational · ${check.latencyMs}ms`
                      : 'Operational'
                    : `Down${check.error ? ` · ${check.error}` : ''}`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Recent incidents (30 days)
          </h2>
          {incidents.length === 0 ? (
            <div
              style={{
                background: '#141b2d',
                border: '1px solid #1e2d4a',
                borderRadius: 12,
                padding: 20,
                fontSize: 13,
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              No incidents reported.
            </div>
          ) : (
            <div
              style={{
                background: '#141b2d',
                border: '1px solid #1e2d4a',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {incidents.map((inc, i) => {
                const resolved = Boolean(inc.resolved_at)
                return (
                  <div
                    key={inc.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: i < incidents.length - 1 ? '1px solid #1e2d4a' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: resolved ? '#10b981' : '#f59e0b',
                          }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{inc.monitor_name}</span>
                      </div>
                      <span style={{ fontSize: 11, color: resolved ? '#10b981' : '#f59e0b', textTransform: 'uppercase', fontWeight: 600 }}>
                        {resolved ? 'Resolved' : inc.status}
                      </span>
                    </div>
                    {inc.summary && (
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{inc.summary}</div>
                    )}
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Started {new Date(inc.started_at).toLocaleString()}
                      {inc.resolved_at && ` · Resolved ${new Date(inc.resolved_at).toLocaleString()}`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 32, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
          Page refreshes every 30 seconds.
        </div>
      </div>
    </main>
  )
}
