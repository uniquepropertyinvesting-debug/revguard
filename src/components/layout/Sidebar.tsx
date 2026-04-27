'use client'

import { useEffect, useState } from 'react'
import { Section } from '@/app/page'
import { authFetch } from '@/lib/auth'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface SidebarProps {
  activeSection: Section
  setActiveSection: (s: Section) => void
  isOpen: boolean
  onToggle: () => void
}

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

const NAV_GROUPS_BASE = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'command-center', label: 'Command Center', icon: '⚡', badge: 'LIVE' },
      { id: 'live-feed', label: 'Live Feed', icon: '📡', badge: 'LIVE' },
    ]
  },
  {
    label: 'REVENUE INTELLIGENCE',
    items: [
      { id: 'revenue-loss-intel', label: 'Revenue Loss Intel', icon: '🔍' },
      { id: 'revenue-analyzer', label: 'AI Analyzer', icon: '✦', badge: 'AI' },
      { id: 'roi-engine', label: 'ROI Engine', icon: '📈' },
    ]
  },
  {
    label: 'RECOVERY & PREVENTION',
    items: [
      { id: 'failed-payments', label: 'Failed Payments', icon: '💳', alertKey: 'failedCount' },
      { id: 'revenue-recovery', label: 'Automated Recovery', icon: '🔄' },
      { id: 'automated-dunning', label: 'Automated Dunning', icon: '📬', badge: 'NEW' },
      { id: 'churn-risk', label: 'Churn Risk', icon: '⚠️', alertKey: 'churnHighRisk' },
      { id: 'churn-intervention', label: 'Churn Intervention', icon: '🛡️' },
    ]
  },
  {
    label: 'BILLING & USAGE',
    items: [
      { id: 'billing-errors', label: 'Billing Errors', icon: '🧾', alertKey: 'billingErrors' },
      { id: 'usage-mismatch', label: 'Usage Mismatch', icon: '📊' },
    ]
  },
  {
    label: 'AUTOMATION & PLATFORM',
    items: [
      { id: 'n8n-automation', label: 'n8n Automation', icon: '🤖', badge: 'NEW' },
      { id: 'ai-assistant', label: 'AI Revenue Assistant', icon: '💬', badge: 'AI' },
      { id: 'integrations', label: 'Integrations', icon: '🔗' },
      { id: 'data-protection', label: 'Data Protection', icon: '🔒' },
      { id: 'alert-settings', label: 'Alert Settings', icon: '📧' },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { id: 'pricing', label: 'Plans & Pricing', icon: '💎', badge: 'NEW' },
    ]
  }
]

export default function Sidebar({ activeSection, setActiveSection, isOpen }: SidebarProps) {
  const { user: authUser, logout } = useAuth()
  const user: User | null = authUser ? { id: authUser.id, email: authUser.email, name: authUser.name || null, avatar: authUser.avatar || null } : null
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({})
  const [lastSync, setLastSync] = useState<string>('')

  // Fetch live alert badge counts from overview + billing-errors + churn-risk APIs
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const safeJson = (r: Response) => r.ok ? r.json() : Promise.resolve({})
        const [overview, billing, churn] = await Promise.all([
          authFetch('/api/stripe/overview').then(safeJson).catch(() => ({})),
          authFetch('/api/stripe/billing-errors').then(safeJson).catch(() => ({})),
          authFetch('/api/stripe/churn-risk').then(safeJson).catch(() => ({})),
        ])
        setAlertCounts({
          failedCount: overview.failedCount || 0,
          billingErrors: billing.summary?.open || 0,
          churnHighRisk: churn.summary?.highRisk || 0,
        })
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      } catch {}
    }
    // Slight delay so auth is ready
    const t = setTimeout(fetchCounts, 1500)
    return () => clearTimeout(t)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?'

  return (
    <aside style={{
      width: isOpen ? '260px' : '0',
      minWidth: isOpen ? '260px' : '0',
      overflow: 'hidden',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      zIndex: 10
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0
          }}>🛡️</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>RevGuard</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>REVENUE PROTECTION</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '12px 10px' }}>
        {NAV_GROUPS_BASE.map(group => (
          <div key={group.label} style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
              letterSpacing: '0.08em', padding: '0 12px 6px'
            }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const liveCount = 'alertKey' in item && item.alertKey ? alertCounts[item.alertKey] : 0
              return (
                <button
                  key={item.id}
                  className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.id as Section)}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className={item.badge === 'AI' ? 'badge-purple' : 'badge-green'} style={{ fontSize: '9px' }}>
                      {item.badge}
                    </span>
                  )}
                  {liveCount > 0 && (
                    <span
                      aria-label={`${liveCount} alerts`}
                      style={{
                        background: '#ef4444', color: 'white',
                        borderRadius: '10px', padding: '1px 6px',
                        fontSize: '10px', fontWeight: 700
                      }}
                    >{liveCount}</span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Status Bar */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <div className="pulse-dot" style={{ background: '#10b981' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>All systems operational</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Live Stripe monitoring{lastSync ? ` · Synced ${lastSync}` : ''}
        </div>
      </div>

      {/* User Profile */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', position: 'relative' }}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
            background: showUserMenu ? 'var(--bg-card-hover)' : 'none',
            border: '1px solid transparent', transition: 'all 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
          onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.background = 'none' }}
        >
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: 'white'
          }}>
            {user?.avatar
              ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email || ''}
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>⋮</span>
        </button>

        {/* User dropdown */}
        {showUserMenu && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '10px', right: '10px',
            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
            borderRadius: '10px', overflow: 'hidden', boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
            zIndex: 100
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Signed in as</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{user?.email}</div>
            </div>
            {[
              { icon: '👤', label: 'My Account' },
              { icon: '🏢', label: 'Company Settings' },
              { icon: '🔗', label: 'Manage Integrations', action: () => setActiveSection('integrations') },
              { icon: '💳', label: 'Billing & Plan' },
            ].map((item, i) => (
              <button key={i} onClick={() => { item.action?.(); setShowUserMenu(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'left', transition: 'background 0.15s'
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', padding: '6px' }}>
              <button onClick={handleLogout} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 10px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', color: '#ef4444', borderRadius: '6px', transition: 'background 0.15s'
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
