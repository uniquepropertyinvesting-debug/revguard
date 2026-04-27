'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth'

interface Finding {
  category: string
  severity: string
  title: string
  explanation: string
  action: string
}

interface Analysis {
  healthScore: number
  healthLabel: string
  summary: string
  findings: Finding[]
  metrics: {
    mrrTrend: string
    biggestRisk: string
    quickWin: string
    projectedMonthlyLoss: number
    projectedAnnualLoss: number
    recoveryPotential: number
  }
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#ef4444', icon: '!!' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b', icon: '!' },
  positive: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', color: '#10b981', icon: '+' },
  info: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', color: '#3b82f6', icon: 'i' },
}

const HEALTH_COLOR: Record<string, string> = {
  'Excellent': '#10b981',
  'Good': '#3b82f6',
  'Needs Attention': '#f59e0b',
  'Critical': '#ef4444',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function AiInsightsPanel() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze' }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.analysis) setAnalysis(data.analysis)
      else throw new Error('Could not parse analysis')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI analysis unavailable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { runAnalysis() }, [])

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="btn-secondary"
        style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <span style={{ fontSize: '14px' }}>&#9733;</span> Show AI Analysis
      </button>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--bg-card), rgba(59,130,246,0.04))',
      border: '1px solid var(--border)',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: 'white', fontWeight: 700,
          }}>&#9733;</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>AI Revenue Analysis</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Powered by GPT-4o with live Stripe data</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="btn-secondary"
            style={{ fontSize: '11px', padding: '5px 12px' }}
          >
            {loading ? 'Analyzing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', padding: '4px' }}
          >
            x
          </button>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {loading && !analysis && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ marginBottom: '8px', fontSize: '24px' }}>&#9733;</div>
            Analyzing your revenue data with AI...
          </div>
        )}

        {error && !analysis && (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '13px', color: '#ef4444', marginBottom: '8px' }}>{error}</div>
            <button onClick={runAnalysis} className="btn-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
              Try Again
            </button>
          </div>
        )}

        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Health Score + Summary */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  border: `3px solid ${HEALTH_COLOR[analysis.healthLabel] || '#3b82f6'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: HEALTH_COLOR[analysis.healthLabel] || '#3b82f6', lineHeight: 1 }}>
                    {analysis.healthScore}
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</div>
                </div>
                <div style={{
                  fontSize: '10px', fontWeight: 700, marginTop: '6px',
                  color: HEALTH_COLOR[analysis.healthLabel] || '#3b82f6',
                }}>{analysis.healthLabel}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
                  {analysis.summary}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Projected Monthly Loss</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{fmt(analysis.metrics.projectedMonthlyLoss)}</div>
                  </div>
                  <div style={{ background: 'rgba(16,185,129,0.06)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Recovery Potential</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>{fmt(analysis.metrics.recoveryPotential)}</div>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.06)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Annual Impact</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{fmt(analysis.metrics.projectedAnnualLoss)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick insights row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, marginBottom: '4px' }}>BIGGEST RISK</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{analysis.metrics.biggestRisk}</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, marginBottom: '4px' }}>QUICK WIN</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{analysis.metrics.quickWin}</div>
              </div>
            </div>

            {/* Findings */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.05em' }}>
                FINDINGS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analysis.findings.map((f, i) => {
                  const s = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.info
                  return (
                    <div key={i} style={{
                      background: s.bg, border: `1px solid ${s.border}`,
                      borderRadius: '8px', padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '9px', fontWeight: 800, width: 18, height: 18, borderRadius: '4px',
                          background: s.color, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                          background: `${s.color}20`, color: s.color, marginLeft: 'auto',
                        }}>{f.category}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>
                        {f.explanation}
                      </div>
                      <div style={{ fontSize: '11px', color: s.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px' }}>-&gt;</span> {f.action}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
