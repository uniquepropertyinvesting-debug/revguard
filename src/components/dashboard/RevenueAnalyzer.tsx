'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/lib/auth'
import AiExplainButton from '@/components/ai/AiExplainButton'

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
  'Excellent': '#10b981', 'Good': '#3b82f6', 'Needs Attention': '#f59e0b', 'Critical': '#ef4444',
}

const CATEGORY_ICON: Record<string, string> = {
  revenue: '💰', churn: '📉', billing: '🧾', recovery: '🔄', growth: '📈',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export default function RevenueAnalyzer() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Follow-up Q&A
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'analyze' }),
      })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.analysis) setAnalysis(data.analysis)
      else throw new Error('Could not parse analysis')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI analysis unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runAnalysis() }, [runAnalysis])

  const askFollowUp = async () => {
    if (!question.trim() || asking) return
    const q = question.trim()
    setQuestion('')
    setAsking(true)
    try {
      const res = await authFetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...answers.flatMap(a => [
              { role: 'user' as const, content: a.q },
              { role: 'assistant' as const, content: a.a },
            ]),
            { role: 'user' as const, content: q },
          ],
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAnswers(prev => [...prev, { q, a: data.content || data.error || 'No response' }])
    } catch {
      setAnswers(prev => [...prev, { q, a: 'AI unavailable right now. Try again shortly.' }])
    } finally {
      setAsking(false)
    }
  }

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g)
      return (
        <div key={i} style={{ marginBottom: line === '' ? '8px' : '2px' }}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
          )}
        </div>
      )
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(6,182,212,0.08))',
        border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
          }}>&#9733;</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800 }}>AI Revenue Analyzer</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Deep analysis of your Stripe data -- findings, risks, and actions
            </div>
          </div>
        </div>
        <button onClick={runAnalysis} disabled={loading} className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
          {loading ? 'Analyzing...' : 'Re-Analyze'}
        </button>
      </div>

      {loading && !analysis && (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#9733;</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            AI is analyzing your revenue data...
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Fetching live Stripe metrics and running deep analysis with GPT-4o
          </div>
        </div>
      )}

      {error && !analysis && (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#ef4444', marginBottom: '12px' }}>{error}</div>
          <button onClick={runAnalysis} className="btn-primary" style={{ fontSize: '13px' }}>Try Again</button>
        </div>
      )}

      {analysis && (
        <>
          {/* Health Score hero */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                border: `4px solid ${HEALTH_COLOR[analysis.healthLabel] || '#3b82f6'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                marginBottom: '12px',
              }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: HEALTH_COLOR[analysis.healthLabel] || '#3b82f6', lineHeight: 1 }}>
                  {analysis.healthScore}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 100</div>
              </div>
              <div style={{
                fontSize: '14px', fontWeight: 700,
                color: HEALTH_COLOR[analysis.healthLabel] || '#3b82f6',
              }}>{analysis.healthLabel}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Revenue Health Score
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Summary */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Executive Summary
                  <AiExplainButton topic="Give me a more detailed breakdown of my overall revenue health situation. What should my top 3 priorities be this week?" label="Deep Dive" />
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {analysis.summary}
                </div>
              </div>

              {/* Key metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Projected Monthly Loss</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444' }}>{fmt(analysis.metrics.projectedMonthlyLoss)}</div>
                  <AiExplainButton
                    topic={`Break down my projected monthly loss of ${fmt(analysis.metrics.projectedMonthlyLoss)}. Where is the money going and what can I do about each bucket?`}
                    style={{ marginTop: '6px' }}
                  />
                </div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Recovery Potential</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>{fmt(analysis.metrics.recoveryPotential)}</div>
                  <AiExplainButton
                    topic={`I have ${fmt(analysis.metrics.recoveryPotential)} in recovery potential. What specific actions should I take to capture this, in priority order?`}
                    style={{ marginTop: '6px' }}
                  />
                </div>
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>Annual Revenue Impact</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>{fmt(analysis.metrics.projectedAnnualLoss)}</div>
                  <AiExplainButton
                    topic={`My projected annual revenue loss is ${fmt(analysis.metrics.projectedAnnualLoss)}. How does this compare to SaaS benchmarks and what recovery rate should I be targeting?`}
                    style={{ marginTop: '6px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Biggest risk + Quick win */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.05em' }}>BIGGEST RISK</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                {analysis.metrics.biggestRisk}
              </div>
              <div style={{ marginTop: '10px' }}>
                <AiExplainButton topic={`Explain in detail: "${analysis.metrics.biggestRisk}". What's the root cause and what's the step-by-step plan to fix it?`} label="What should I do?" />
              </div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '6px', letterSpacing: '0.05em' }}>QUICK WIN</div>
              <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                {analysis.metrics.quickWin}
              </div>
              <div style={{ marginTop: '10px' }}>
                <AiExplainButton topic={`Tell me exactly how to execute this quick win: "${analysis.metrics.quickWin}". Step by step, how long will it take, and what revenue impact should I expect?`} label="How do I do this?" />
              </div>
            </div>
          </div>

          {/* Findings */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI Findings
              <span className="badge-blue" style={{ fontSize: '10px' }}>{analysis.findings.length} FINDINGS</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {analysis.findings.map((f, i) => {
                const s = SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.info
                return (
                  <div key={i} className="card" style={{
                    padding: '18px', borderLeft: `3px solid ${s.color}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{CATEGORY_ICON[f.category] || '📋'}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{f.title}</span>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        textTransform: 'uppercase',
                      }}>{f.severity}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
                      {f.explanation}
                    </div>
                    <div style={{
                      fontSize: '12px', color: s.color, fontWeight: 600,
                      padding: '8px 10px', background: s.bg, borderRadius: '6px',
                      display: 'flex', alignItems: 'flex-start', gap: '6px'
                    }}>
                      <span style={{ flexShrink: 0, marginTop: '1px' }}>-&gt;</span>
                      <span>{f.action}</span>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <AiExplainButton topic={`Regarding "${f.title}": ${f.explanation}. The recommended action is "${f.action}". Give me more details on how to implement this action and what results I should expect.`} label="More Details" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Follow-up Q&A */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Ask Follow-Up Questions
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>AI has full context of your analysis</span>
            </div>

            {answers.map((a, i) => (
              <div key={i} style={{ marginBottom: '16px' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '8px', marginBottom: '8px',
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
                  fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600,
                }}>
                  {a.q}
                </div>
                <div style={{
                  padding: '12px 14px', borderRadius: '8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
                }}>
                  {renderMarkdown(a.a)}
                </div>
              </div>
            ))}

            {asking && (
              <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                AI is thinking...
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askFollowUp()}
                placeholder="Ask about your analysis results, specific metrics, or next steps..."
                disabled={asking}
                style={{ flex: 1, fontSize: '13px', padding: '10px 14px' }}
              />
              <button
                onClick={askFollowUp}
                disabled={asking || !question.trim()}
                className="btn-primary"
                style={{ fontSize: '13px', padding: '10px 18px' }}
              >
                {asking ? '...' : 'Ask'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
