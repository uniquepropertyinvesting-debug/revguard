'use client'

import { Section } from '@/app/page'
import NotificationBell from '@/components/layout/NotificationBell'

interface TopBarProps {
  activeSection: Section
  onMenuToggle: () => void
  onHelpOpen: () => void
}

const sectionTitles: Record<Section, { title: string; subtitle: string; helpSection: string }> = {
  'command-center':    { title: 'Command Center',            subtitle: 'Real-time revenue intelligence overview',      helpSection: 'getting-started' },
  'failed-payments':  { title: 'Failed Payments',           subtitle: 'Detect and recover failed transactions',        helpSection: 'failed-payments' },
  'churn-risk':       { title: 'Churn Risk Analysis',       subtitle: 'Identify at-risk customers before they leave',  helpSection: 'churn-risk' },
  'billing-errors':   { title: 'Billing Errors',            subtitle: 'Detect and correct billing discrepancies',      helpSection: 'billing-errors' },
  'usage-mismatch':   { title: 'Usage Mismatch',            subtitle: 'Identify gaps between usage and billing',       helpSection: 'getting-started' },
  'revenue-recovery': { title: 'Automated Revenue Recovery',subtitle: 'AI-powered recovery workflows',                 helpSection: 'revenue-recovery' },
  'roi-engine':       { title: 'ROI Engine',                subtitle: 'Measure and maximize revenue protection ROI',   helpSection: 'roi-engine' },
  'integrations':     { title: 'Integrations',              subtitle: 'Connect your revenue stack with one click',     helpSection: 'getting-started' },
  'ai-assistant':     { title: 'AI Revenue Assistant',      subtitle: 'Powered by NxCode AI',                         helpSection: 'ai-assistant' },
  'data-protection':  { title: 'Data Protection',           subtitle: 'Enterprise-grade security and compliance',      helpSection: 'data-protection' },
  'revenue-loss-intel':{ title: 'Revenue Loss Intelligence',subtitle: 'Predictive analytics and leakage detection',   helpSection: 'getting-started' },
  'churn-intervention':{ title: 'Churn Intervention',       subtitle: 'Auto-trigger retention actions',                helpSection: 'churn-intervention' },
  'alert-settings':    { title: 'Alert Settings',            subtitle: 'Configure email alerts powered by Resend',      helpSection: 'getting-started' },
  'automated-dunning': { title: 'Automated Dunning',          subtitle: '3-step email recovery sequence for failed invoices', helpSection: 'getting-started' },
  'live-feed':         { title: 'Live Feed',                subtitle: 'Real-time event stream from Stripe',             helpSection: 'getting-started' },
  'n8n-automation':    { title: 'n8n Automation',            subtitle: 'Connect n8n workflows for advanced automation',   helpSection: 'getting-started' },
  'revenue-analyzer':  { title: 'AI Revenue Analyzer',      subtitle: 'Deep AI-powered analysis of your Stripe data',   helpSection: 'getting-started' },
  'user-settings':     { title: 'Account Settings',          subtitle: 'Manage your profile and security',               helpSection: 'getting-started' },
  'pricing':           { title: 'Plans & Pricing',           subtitle: 'Choose the right plan for your business',        helpSection: 'getting-started' },
}

export default function TopBar({ activeSection, onMenuToggle, onHelpOpen }: TopBarProps) {
  const { title, subtitle } = sectionTitles[activeSection]

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: '56px',
      background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <button onClick={onMenuToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px', padding: '4px', flexShrink: 0 }}>
          ☰
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
          <p className="hide-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px' }}>
          <div className="pulse-dot" style={{ background: '#10b981' }} />
          <span className="hide-mobile" style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>LIVE</span>
        </div>

        {/* Notification bell */}
        <NotificationBell />

        {/* Help button */}
        <button
          onClick={onHelpOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
            color: '#3b82f6', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
        >
          <span>📖</span> <span className="hide-mobile">Help</span>
        </button>

        {/* Date range - hidden on mobile */}
        <div className="hide-mobile">
          <select style={{ fontSize: '13px', padding: '6px 10px', cursor: 'pointer' }}>
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
        </div>

        {/* User avatar */}
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 700, cursor: 'pointer'
        }}>A</div>
      </div>
    </header>
  )
}
