'use client'

import { useState } from 'react'
import Link from 'next/link'

const steps = [
  {
    number: '01',
    icon: '🔗',
    title: 'Connect Your Stripe Account',
    section: 'Integrations',
    sectionIcon: '🔗',
    color: '#3b82f6',
    colorBg: 'rgba(59,130,246,0.1)',
    colorBorder: 'rgba(59,130,246,0.25)',
    summary: 'Paste your Stripe API key and RevGuard instantly syncs your customers, subscriptions, invoices, and full payment history.',
    details: [
      'Navigate to Integrations in the sidebar',
      'Enter your Stripe secret key (sk_live_... or sk_test_...)',
      'RevGuard encrypts and stores your key securely',
      'Your data syncs in real-time — no engineers needed',
    ],
    tip: 'Find your API key at dashboard.stripe.com → Developers → API keys. Setup takes under 60 seconds.',
    tipIcon: '💡',
  },
  {
    number: '02',
    icon: '⚡',
    title: 'Review Your Command Center',
    section: 'Command Center',
    sectionIcon: '⚡',
    color: '#06b6d4',
    colorBg: 'rgba(6,182,212,0.1)',
    colorBorder: 'rgba(6,182,212,0.25)',
    summary: 'Your Command Center gives you a real-time overview of MRR, failed payments, churn risk, and revenue recovered — all in one place.',
    details: [
      'See live MRR, ARR, and revenue trend at a glance',
      'Spot failed payments and at-risk customers instantly',
      'Track recovery rate and ROI from day one',
      'AI-powered priority alerts surface what needs attention first',
    ],
    tip: 'The Command Center updates in real-time as Stripe events come in. Bookmark it as your daily revenue health check.',
    tipIcon: '📌',
  },
  {
    number: '03',
    icon: '💳',
    title: 'Recover Failed Payments',
    section: 'Failed Payments + Automated Dunning',
    sectionIcon: '📬',
    color: '#ef4444',
    colorBg: 'rgba(239,68,68,0.1)',
    colorBorder: 'rgba(239,68,68,0.25)',
    summary: 'RevGuard detects every failed charge and automatically retries with smart timing. Set up a 3-step dunning email sequence to recover revenue on autopilot.',
    details: [
      'Go to Failed Payments to see all declined charges',
      'One-click retry any payment or let auto-recovery handle it',
      'Enable Automated Dunning for a 3-email recovery sequence',
      'Track recovery rate and total revenue recaptured',
    ],
    tip: 'Customers with expired cards are the easiest wins. RevGuard retries at optimal times to maximize recovery — averaging 68% success rate.',
    tipIcon: '🎯',
  },
  {
    number: '04',
    icon: '⚠️',
    title: 'Monitor Churn Risk & Intervene',
    section: 'Churn Risk + Churn Intervention',
    sectionIcon: '🛡️',
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.1)',
    colorBorder: 'rgba(245,158,11,0.25)',
    summary: 'ML-powered churn scoring identifies at-risk customers up to 30 days before they cancel. Churn Intervention auto-triggers personalized retention playbooks.',
    details: [
      'Open Churn Risk to see every customer scored by risk level',
      'Filter by High / Medium / Low risk to prioritize outreach',
      'Go to Churn Intervention to configure automated playbooks',
      'Set win-back offers, pause options, or personal outreach triggers',
    ],
    tip: 'High-risk customers flagged early are 3× more likely to be retained. Act within 48 hours of a risk signal for best results.',
    tipIcon: '⏱️',
  },
  {
    number: '05',
    icon: '🔔',
    title: 'Enable Alerts & Automated Dunning',
    section: 'Alert Settings + Automated Dunning',
    sectionIcon: '📧',
    color: '#8b5cf6',
    colorBg: 'rgba(139,92,246,0.1)',
    colorBorder: 'rgba(139,92,246,0.25)',
    summary: 'Configure real-time email alerts for every revenue event — failed payments, churn signals, billing errors, and usage spikes — so nothing slips through.',
    details: [
      'Go to Alert Settings and enter your notification email',
      'Toggle alerts for failed payments, churn risk, and billing errors',
      'Set thresholds (e.g. alert when failed amount exceeds $500)',
      'Enable Automated Dunning to send recovery emails automatically',
    ],
    tip: 'Alerts are powered by Resend and typically arrive within 60 seconds of a Stripe event. You can also configure webhook endpoints for your own systems.',
    tipIcon: '⚡',
  },
  {
    number: '06',
    icon: '📈',
    title: 'Track ROI & Revenue Recovered',
    section: 'ROI Engine',
    sectionIcon: '📈',
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.1)',
    colorBorder: 'rgba(16,185,129,0.25)',
    summary: 'The ROI Engine shows exactly how much revenue RevGuard has recovered, protected, and saved — broken down by shield, time period, and customer.',
    details: [
      'Open ROI Engine to see your total revenue recovered',
      'View breakdown by failed payment recovery, churn prevention, and billing errors',
      'Compare monthly vs. annual impact against your platform cost',
      'Export reports to share with your finance team or board',
    ],
    tip: 'Most customers see positive ROI within their first week. The ROI Engine makes it easy to justify RevGuard to stakeholders with real numbers.',
    tipIcon: '💰',
  },
]

const faqs = [
  {
    q: 'How long does setup take?',
    a: 'Under 2 minutes. Paste your Stripe API key, and RevGuard immediately syncs your data. No engineers, no webhooks to configure manually.',
  },
  {
    q: 'Is my Stripe API key safe?',
    a: 'Yes. Your key is AES-256 encrypted at rest and never exposed in logs or responses. RevGuard uses read + limited write access only — we cannot move funds.',
  },
  {
    q: 'Do I need to change anything in Stripe?',
    a: 'No. RevGuard works alongside your existing Stripe setup. We read your data and trigger retries via the Stripe API — nothing in your Stripe dashboard changes.',
  },
  {
    q: 'What if I have no failed payments yet?',
    a: 'RevGuard still monitors in real-time and will alert you the moment a payment fails. You can also explore Churn Risk and Billing Errors right away — these work from your existing subscription data.',
  },
  {
    q: 'Can I use RevGuard with a Stripe test account?',
    a: 'Absolutely. Use a sk_test_... key to explore the platform with test data before going live. All features work identically in test mode.',
  },
  {
    q: 'How does Automated Dunning work?',
    a: 'When a payment fails, RevGuard sends a 3-step email sequence to your customer over 7 days — a friendly reminder, an urgency nudge, and a final notice. Each email is customizable and sent via Resend.',
  },
]

const quickLinks = [
  { label: 'Command Center', icon: '⚡', desc: 'Revenue overview', color: '#06b6d4' },
  { label: 'Failed Payments', icon: '💳', desc: 'Recover declined charges', color: '#ef4444' },
  { label: 'Churn Risk', icon: '⚠️', desc: 'At-risk customers', color: '#f59e0b' },
  { label: 'ROI Engine', icon: '📈', desc: 'Measure your impact', color: '#10b981' },
  { label: 'Integrations', icon: '🔗', desc: 'Connect Stripe', color: '#3b82f6' },
  { label: 'Alert Settings', icon: '📧', desc: 'Configure notifications', color: '#8b5cf6' },
]

export default function HowItWorksPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState<number | null>(null)

  const handleLogin = () => {
    // @ts-ignore
    window.Nxcode?.auth?.login()
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px', borderBottom: '1px solid var(--border)',
        background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>RevGuard</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600 }}>6 REVENUE SHIELDS</div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link href="/#shields" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none' }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
            onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-secondary)'}
          >Shields</Link>
          <Link href="/#pricing" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none' }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
            onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-secondary)'}
          >Pricing</Link>
          <span style={{ fontSize: '14px', color: '#3b82f6', fontWeight: 600 }}>How It Works</span>
          <button className="btn-secondary" onClick={handleLogin} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Sign In
          </button>
          <button className="btn-primary" onClick={handleLogin} style={{ padding: '8px 20px' }}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: 'center', padding: '72px 24px 56px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '20px',
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
          marginBottom: '28px',
        }}>
          <span style={{ fontSize: '14px' }}>📖</span>
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.08em' }}>PLATFORM GUIDE</span>
        </div>

        <h1 style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.02em' }}>
          How RevGuard Works
        </h1>
        <p style={{ fontSize: '19px', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '620px', margin: '0 auto 16px' }}>
          From connecting Stripe to recovering your first payment — here's exactly how to get the most out of RevGuard in 6 simple steps.
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '40px' }}>
          ⚡ Average setup time: <strong style={{ color: 'var(--text-secondary)' }}>under 2 minutes</strong>
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={handleLogin}
            style={{ fontSize: '15px', padding: '13px 32px', borderRadius: '10px' }}
          >
            🚀 Get Started Free
          </button>
          <a
            href="#steps"
            className="btn-secondary"
            style={{ fontSize: '15px', padding: '13px 32px', borderRadius: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            See the Steps ↓
          </a>
        </div>
      </section>

      {/* ── Step progress bar ── */}
      <div style={{
        maxWidth: '900px', margin: '0 auto 64px', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0',
        overflowX: 'auto',
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={() => {
                setActiveStep(i)
                document.getElementById(`step-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: activeStep === i ? step.colorBg : 'var(--bg-card)',
                border: `2px solid ${activeStep === i ? step.color : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', transition: 'all 0.2s', flexShrink: 0,
              }}>
                {step.icon}
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 700,
                color: activeStep === i ? step.color : 'var(--text-muted)',
                letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>
                {step.number}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div style={{
                width: '48px', height: '2px', flexShrink: 0,
                background: `linear-gradient(90deg, ${steps[i].color}40, ${steps[i + 1].color}20)`,
                margin: '0 2px 16px',
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Steps ── */}
      <section id="steps" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {steps.map((step, i) => (
            <div
              key={i}
              id={`step-${i}`}
              className="slide-in"
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${activeStep === i ? step.color + '60' : 'var(--border)'}`,
                borderRadius: '20px',
                overflow: 'hidden',
                transition: 'border-color 0.3s, box-shadow 0.3s',
                boxShadow: activeStep === i ? `0 0 32px ${step.color}18` : 'none',
              }}
              onMouseEnter={() => setActiveStep(i)}
              onMouseLeave={() => setActiveStep(null)}
            >
              {/* Step header */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '20px',
                padding: '28px 32px 24px',
                borderBottom: '1px solid var(--border)',
              }}>
                {/* Step number + icon */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '18px',
                    background: step.colorBg,
                    border: `1px solid ${step.colorBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '28px',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{
                    fontSize: '10px', fontWeight: 800, color: step.color,
                    letterSpacing: '0.1em',
                  }}>
                    STEP {step.number}
                  </div>
                </div>

                {/* Title + summary */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {step.title}
                    </h2>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                      background: step.colorBg, border: `1px solid ${step.colorBorder}`,
                      color: step.color, whiteSpace: 'nowrap',
                    }}>
                      {step.sectionIcon} {step.section}
                    </span>
                  </div>
                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    {step.summary}
                  </p>
                </div>
              </div>

              {/* Step body */}
              <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Checklist */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '14px' }}>
                    HOW TO DO IT
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {step.details.map((detail, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: step.colorBg, border: `1px solid ${step.colorBorder}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800, color: step.color, marginTop: '1px',
                        }}>
                          {j + 1}
                        </div>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro tip */}
                <div style={{
                  padding: '20px', borderRadius: '14px',
                  background: `${step.color}08`,
                  border: `1px solid ${step.color}25`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>{step.tipIcon}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: step.color, letterSpacing: '0.08em', marginBottom: '8px' }}>
                    PRO TIP
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    {step.tip}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Links ── */}
      <section style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '10px' }}>Jump to any section</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Once you're in the dashboard, use the sidebar to navigate between all RevGuard features.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {quickLinks.map((link, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '18px 20px', borderRadius: '14px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = link.color + '60'
                  ;(e.currentTarget as HTMLElement).style.background = link.color + '08'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                }}
                onClick={handleLogin}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  background: link.color + '15',
                  border: `1px solid ${link.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>
                  {link.icon}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {link.label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{link.desc}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '14px' }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ maxWidth: '720px', margin: '0 auto', padding: '72px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '10px' }}>Common questions</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Everything you need to know before getting started.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s',
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', gap: '16px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {faq.q}
                </span>
                <span style={{
                  fontSize: '18px', color: 'var(--text-muted)', flexShrink: 0,
                  transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s', display: 'inline-block',
                }}>
                  +
                </span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 24px 20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        textAlign: 'center', padding: '64px 24px 80px',
        background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.05))',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
          borderRadius: '20px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
          marginBottom: '24px',
        }}>
          <div className="pulse-dot" style={{ background: '#10b981' }} />
          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>Ready to protect your revenue?</span>
        </div>

        <h2 style={{ fontSize: '42px', fontWeight: 900, marginBottom: '16px', letterSpacing: '-0.02em' }}>
          Start recovering revenue<br />
          <span className="gradient-text">in under 2 minutes.</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', marginBottom: '40px', maxWidth: '520px', margin: '0 auto 40px' }}>
          Connect Stripe, see your dashboard, and watch RevGuard go to work — no engineers, no long setup, no risk.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            className="btn-primary"
            onClick={handleLogin}
            style={{ fontSize: '16px', padding: '14px 36px', borderRadius: '12px' }}
          >
            🛡️ Get Started Free
          </button>
          <Link
            href="/"
            className="btn-secondary"
            style={{ fontSize: '16px', padding: '14px 36px', borderRadius: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            ← Back to Home
          </Link>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          No credit card required · 14-day free trial · Cancel anytime
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 48px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap', gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: 32, height: 32, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>RevGuard</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>6 Revenue Shields Platform</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {[
              { label: 'Home', href: '/' },
              { label: 'How It Works', href: '/how-it-works' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'Privacy', href: '#' },
              { label: 'Terms', href: '#' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--text-primary)'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-muted)'}
              >{l.label}</Link>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2025 RevGuard. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
