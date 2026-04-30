'use client'

import { useState } from 'react'
import AuthGate from '@/components/auth/AuthGate'
import CommandCenter from '@/components/dashboard/CommandCenter'
import FailedPayments from '@/components/dashboard/FailedPayments'
import ChurnRisk from '@/components/dashboard/ChurnRisk'
import BillingErrors from '@/components/dashboard/BillingErrors'
import UsageMismatch from '@/components/dashboard/UsageMismatch'
import RevenueRecovery from '@/components/dashboard/RevenueRecovery'
import ROIEngine from '@/components/dashboard/ROIEngine'
import Integrations from '@/components/dashboard/Integrations'
import AIAssistant from '@/components/dashboard/AIAssistant'
import SupportAgent from '@/components/dashboard/SupportAgent'
import DataProtection from '@/components/dashboard/DataProtection'
import RevenueLossIntel from '@/components/dashboard/RevenueLossIntel'
import ChurnIntervention from '@/components/dashboard/ChurnIntervention'
import AlertSettings from '@/components/dashboard/AlertSettings'
import AutomatedDunning from '@/components/dashboard/AutomatedDunning'
import Pricing from '@/components/dashboard/Pricing'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import HelpCenter from '@/components/help/HelpCenter'
import GettingStartedChecklist from '@/components/help/GettingStartedChecklist'

export type Section =
  | 'command-center'
  | 'failed-payments'
  | 'churn-risk'
  | 'billing-errors'
  | 'usage-mismatch'
  | 'revenue-recovery'
  | 'roi-engine'
  | 'integrations'
  | 'ai-assistant'
  | 'data-protection'
  | 'revenue-loss-intel'
  | 'churn-intervention'
  | 'alert-settings'
  | 'automated-dunning'
  | 'pricing'
  | 'support-agent'

function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>('command-center')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)
  const [helpSection, setHelpSection] = useState('getting-started')

  const openHelp = (section?: string) => {
    if (section) setHelpSection(section)
    setHelpOpen(true)
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'command-center':    return <CommandCenter />
      case 'failed-payments':   return <FailedPayments />
      case 'churn-risk':        return <ChurnRisk />
      case 'billing-errors':    return <BillingErrors />
      case 'usage-mismatch':    return <UsageMismatch />
      case 'revenue-recovery':  return <RevenueRecovery />
      case 'roi-engine':        return <ROIEngine />
      case 'integrations':      return <Integrations />
      case 'ai-assistant':      return <AIAssistant />
      case 'data-protection':   return <DataProtection />
      case 'revenue-loss-intel':return <RevenueLossIntel />
      case 'churn-intervention':return <ChurnIntervention />
      case 'alert-settings':    return <AlertSettings />
      case 'automated-dunning': return <AutomatedDunning />
      case 'pricing':           return <Pricing />
      case 'support-agent':     return <SupportAgent />
      default:                  return <CommandCenter />
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          activeSection={activeSection}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          onHelpOpen={() => openHelp()}
        />
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <div className="slide-in">
            {renderSection()}
          </div>
        </main>
      </div>

      {/* Help Center Modal */}
      {helpOpen && (
        <HelpCenter
          onClose={() => setHelpOpen(false)}
          initialSection={helpSection}
        />
      )}

      {/* Getting Started Checklist */}
      {checklistOpen && (
        <GettingStartedChecklist
          onNavigate={(section) => setActiveSection(section as Section)}
          onClose={() => setChecklistOpen(false)}
        />
      )}
    </div>
  )
}

export default function Home() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  )
}
