'use client'

import { useState } from 'react'

interface HelpCenterProps {
  onClose: () => void
  initialSection?: string
}

const helpSections = [
  {
    id: 'getting-started',
    icon: '🚀',
    label: 'Getting Started',
    articles: [
      {
        title: 'Welcome to RevGuard',
        content: `RevGuard is your all-in-one Revenue Loss Prevention platform. It monitors your billing, payments, and customer health 24/7 — and takes action automatically before revenue is lost.

**Here's how it works in 3 steps:**

1. **Connect your tools** — Link Stripe, QuickBooks, Salesforce, or any of our 6 integrations with one click. RevGuard starts monitoring immediately.

2. **Set your priorities** — Tell us what matters most: recovering failed payments, reducing churn, fixing billing errors, or all of the above.

3. **Let RevGuard work** — Our AI watches your revenue in real-time, alerts you to risks, and triggers automated recovery actions — so you recover money without lifting a finger.

**Your dashboard has 12 sections.** Each one focuses on a specific revenue risk. Use the left sidebar to navigate between them.`
      },
      {
        title: 'Navigating the Dashboard',
        content: `The sidebar on the left is your main navigation. Here's what each section does:

**Overview**
- ⚡ **Command Center** — Your real-time revenue health overview. Start here every day.

**Revenue Intelligence**
- 🔍 **Revenue Loss Intel** — AI-powered predictions of future revenue risk
- 📈 **ROI Engine** — Calculate exactly how much RevGuard is saving you

**Recovery & Prevention**
- 💳 **Failed Payments** — See every failed payment and retry with one click
- 🔄 **Automated Recovery** — Configure workflows that recover money automatically
- ⚠️ **Churn Risk** — Accounts most likely to cancel, ranked by risk
- 🛡️ **Churn Intervention** — Automated actions that trigger when churn risk spikes

**Billing & Usage**
- 🧾 **Billing Errors** — Overcharges, duplicates, and tax errors found automatically
- 📊 **Usage Mismatch** — Accounts using more than their plan allows

**Platform**
- 🤖 **AI Revenue Assistant** — Ask any revenue question in plain English
- 🔗 **Integrations** — Manage your connected tools
- 🔒 **Data Protection** — Security and compliance settings

**Tip:** The red numbers on sidebar items show how many issues need your attention right now.`
      },
      {
        title: 'Setting Up Integrations',
        content: `Integrations are the engine of RevGuard. The more you connect, the more revenue we can protect.

**To connect an integration:**
1. Click **Integrations** in the left sidebar
2. Find the tool you want to connect in the "Available" section
3. Click the **⚡ Connect** button — that's it

**What each integration does:**

| Integration | What RevGuard gets |
|---|---|
| **Stripe** | Failed payments, card declines, webhook events, subscription status |
| **PayPal** | Transaction failures, disputes, refund tracking |
| **QuickBooks** | Invoice status, billing errors, accounts receivable aging |
| **Salesforce** | Customer health scores, contract renewal dates, account activity |
| **HubSpot** | Deal pipeline, contact engagement, email activity |
| **Snowflake** | Product usage data, feature adoption, custom metrics |

**Already connected:** Stripe, PayPal, and QuickBooks are active. Salesforce, HubSpot, and Snowflake are ready to connect.

**Important:** RevGuard only reads your data — it never modifies anything in your connected tools unless you explicitly approve an action (like retrying a payment).`
      },
    ]
  },
  {
    id: 'failed-payments',
    icon: '💳',
    label: 'Failed Payments',
    articles: [
      {
        title: 'Understanding Failed Payments',
        content: `The Failed Payments section shows every payment that didn't go through — pulled directly from Stripe and PayPal in real-time.

**What you'll see:**
- **Company name and email** — who the payment is from
- **Amount** — how much revenue is at risk
- **Attempts** — how many times the payment has been tried (max 3)
- **Failure reason** — why it failed (expired card, insufficient funds, etc.)
- **Risk level** — Critical, High, Medium, or Low based on amount and retry history

**Risk levels explained:**
- 🔴 **Critical** — 3 attempts made, payment is about to be written off
- 🟡 **High** — 2 attempts, time-sensitive
- 🔵 **Medium** — 1 attempt, still recoverable
- 🟢 **Low** — Just failed, easy to recover

**The numbers at the top:**
- **Total At Risk** — combined value of all open failed payments
- **Failed Payments** — total count
- **Avg Recovery Time** — how long it typically takes to recover a payment
- **Auto-Recovery Rate** — percentage recovered without manual action`
      },
      {
        title: 'How to Retry a Failed Payment',
        content: `RevGuard gives you two ways to retry failed payments:

**Option 1 — Retry a single payment:**
1. Find the payment in the table
2. Click the blue **Retry** button on that row
3. RevGuard sends a new charge attempt to Stripe immediately
4. You'll see the status update in real-time

**Option 2 — Retry multiple payments at once:**
1. Check the boxes next to the payments you want to retry
2. Click **↻ Retry Selected (X)** at the top
3. All selected payments are retried in one action

**Option 3 — Smart Retry All:**
- Click **+ Smart Retry All** to let our AI retry everything
- Our ML model picks the best time to retry based on bank patterns, time zones, and card type — this gets significantly higher success rates than retrying immediately

**Option 4 — Send a recovery email:**
1. Select one or more payments
2. Click **📧 Send Recovery Email**
3. A personalized email goes to the customer asking them to update their payment method

**When should I use each?**
- Use **Smart Retry** for expired cards or bank declines — the timing matters
- Use **Recovery Email** for "card declined" or "do not honor" — the customer needs to take action
- Use **Manual Retry** when you've just spoken to the customer and they've updated their card`
      },
      {
        title: 'Filtering and Finding Payments',
        content: `Use the filter buttons at the top of the Failed Payments table to focus on what matters most.

**Filter by risk level:**
- **All** — shows everything
- **Critical** — only payments on their 3rd attempt (most urgent)
- **High** — 2nd attempt payments
- **Medium** — 1st attempt, moderate urgency
- **Low** — just failed, low urgency

**Sorting:** Click any column header to sort by that field.

**What to do first:** Always start with **Critical** filter. These are payments about to be permanently lost — act on them within 24 hours.

**Pro tip:** Sort by **Amount** descending to focus on the highest-value recoveries first. Recovering one $14,000 payment is worth more than recovering ten $100 payments.`
      },
    ]
  },
  {
    id: 'churn-risk',
    icon: '⚠️',
    label: 'Churn Risk',
    articles: [
      {
        title: 'Understanding Churn Risk Scores',
        content: `The Churn Risk section shows your customers ranked by how likely they are to cancel, scored 0–100.

**How the score is calculated:**
RevGuard analyzes dozens of signals to build each customer's score:

- **Login frequency** — customers who stop logging in are 4x more likely to churn
- **Feature usage** — dropping usage is a leading churn indicator
- **Support tickets** — a spike in support activity often precedes cancellation
- **Payment history** — payment issues correlate strongly with churn
- **Contract proximity** — renewal dates within 30 days increase risk
- **NPS and sentiment** — where available from your CRM

**Score ranges:**
- 🔴 **75–100 (High Risk)** — Immediate action required. These customers have multiple churn signals active.
- 🟡 **50–74 (Medium Risk)** — Monitor closely and begin outreach within 7 days.
- 🟢 **0–49 (Low Risk)** — Healthy. Keep an eye on trend direction.

**The trend arrow** next to the score shows if risk is increasing (↑), stable (→), or decreasing (↓).

**MRR At Risk** shows how much monthly recurring revenue you'd lose if that customer churned.`
      },
      {
        title: 'What to Do with At-Risk Accounts',
        content: `When you see a high-risk account, here's exactly what to do:

**Step 1 — Review the signals**
Each account card shows the specific reasons for the high score (e.g. "No login 14d", "Usage drop 60%"). Read these carefully — they tell you what conversation to have.

**Step 2 — Intervene Now (automated)**
Click **Intervene Now** on any account to trigger a full intervention sequence:
- Assigns a CSM automatically
- Sends a personalized outreach email
- Schedules a follow-up
- Logs everything in your CRM

**Step 3 — View Profile**
Click **View Profile** to see the full account history, all communications, and usage trends.

**Step 4 — Auto-Intervene All High Risk**
Click the blue button at the top to trigger interventions on every high-risk account at once. Best used at the start of the week.

**Sort tip:** Use **Sort by MRR** to tackle the highest-value accounts first. Saving a $7,600/month account is your top priority over a $900/month account.

**When to escalate:** If a score is above 85 and MRR is above $5,000 — escalate to an executive or the CEO. These need a personal touch, not an automated email.`
      },
    ]
  },
  {
    id: 'billing-errors',
    icon: '🧾',
    label: 'Billing Errors',
    articles: [
      {
        title: 'Types of Billing Errors RevGuard Detects',
        content: `RevGuard automatically scans every invoice, subscription, and payment record across your connected tools to find billing errors you'd never catch manually.

**Types of errors detected:**

🔴 **Overcharge** — You charged a customer more than they should have paid. Common causes: promo code not applied at renewal, plan changed but billing not updated.
*Action: Issue a credit or refund immediately.*

🟡 **Undercharge** — You charged less than the contracted amount. Common causes: expired discount still active, wrong plan tier billed.
*Action: Correct the next invoice and notify the customer.*

🔴 **Duplicate Invoice** — The same invoice was generated twice in one billing period. Common cause: sync errors between Stripe and QuickBooks.
*Action: Void the duplicate and refund if already charged.*

🟡 **Tax Error** — Sales tax applied to a tax-exempt entity, or wrong tax rate applied.
*Action: Issue a corrected invoice and refund the difference.*

🔵 **Plan Mismatch** — Customer is being billed for a plan they're no longer on (e.g. billing on old plan after upgrade).
*Action: Update the subscription in Stripe and adjust the invoice.*`
      },
      {
        title: 'How to Fix a Billing Error',
        content: `When a billing error is detected, here's how to resolve it:

**Step 1 — Understand the error**
Read the description carefully. It tells you exactly what went wrong, which system it came from, and the financial impact.

**Step 2 — Click "Fix Now"**
For open errors, click the green **Fix Now** button. This opens a guided resolution flow that:
- Shows the exact discrepancy
- Suggests the correction
- Lets you approve and apply the fix

**Step 3 — Click "Review"**
If you're not sure about a fix, click **Review** to investigate further before making changes.

**Step 4 — Resolved errors**
Once fixed, click **View Log** to see the full audit trail of what changed and when.

**Running a manual audit:**
Click **🔍 Run Billing Audit** at the top to trigger an immediate scan across all connected systems. Useful after a pricing change, promotion, or plan migration.

**Tip:** Filter by **Open** first. These are unresolved errors actively costing you money. Resolved errors are for record-keeping only.`
      },
    ]
  },
  {
    id: 'ai-assistant',
    icon: '🤖',
    label: 'AI Revenue Assistant',
    articles: [
      {
        title: 'What the AI Assistant Can Do',
        content: `The AI Revenue Assistant is your always-on revenue analyst. Ask it anything about your revenue health in plain English — no reports, no spreadsheets.

**What you can ask:**

📊 **Data questions**
- "Which accounts are most at risk this month?"
- "Show me failed payments from the last 7 days"
- "What's our current recovery rate?"
- "How much revenue did we recover this quarter?"

🔍 **Analysis questions**
- "Why is our churn rate increasing?"
- "Which billing errors are costing us the most?"
- "What patterns do you see in our failed payments?"

🎯 **Action questions**
- "What should I focus on today?"
- "Which accounts need immediate intervention?"
- "How can we improve our recovery rate?"

💡 **Strategy questions**
- "How do we compare to industry benchmarks?"
- "What's the ROI of our current recovery workflows?"
- "Which integration would give us the most value to add next?"

**The AI has full context** of your revenue data, all alerts, churn scores, billing errors, and recovery history. It gives specific, actionable answers — not generic advice.`
      },
      {
        title: 'Getting the Best Answers',
        content: `Tips for getting the most useful responses from your AI Revenue Assistant:

**Be specific about time periods**
✅ "Show me failed payments from the last 30 days"
❌ "Show me failed payments"

**Ask for action recommendations**
✅ "What should I do about TechFlow Inc's churn risk?"
❌ "Tell me about TechFlow Inc"

**Use the Quick Insight buttons**
The pre-built prompts at the top are designed to give you the most useful daily insights. Click them instead of typing for faster results.

**Ask follow-up questions**
The AI remembers the conversation. If it gives you a summary, follow up with:
- "Which of those is most urgent?"
- "What would you recommend first?"
- "Can you break that down by month?"

**Ask for explanations**
If you don't understand why something is happening, ask:
- "Why did our recovery rate drop last week?"
- "What's causing the spike in billing errors?"
- "Explain the churn signals for Acme Corp"

**The AI is honest** — if it doesn't have enough data to give a confident answer, it will tell you rather than guess.`
      },
    ]
  },
  {
    id: 'roi-engine',
    icon: '📈',
    label: 'ROI Engine',
    articles: [
      {
        title: 'How to Use the ROI Calculator',
        content: `The ROI Engine shows you exactly how much money RevGuard is protecting — and how that compares to what you pay for the platform.

**To calculate your ROI:**

1. Enter your **Monthly Recurring Revenue (MRR)** — your total monthly subscription revenue
2. Enter your **Monthly Churn Rate** — the percentage of customers who cancel each month (e.g. 3.5)
3. Enter your **Failed Payment Rate** — the percentage of payments that fail each month (industry average is 2–5%)
4. Enter your **Billing Error Rate** — percentage of invoices with errors (industry average is 0.5–2%)

**What the numbers mean:**

- **Monthly Revenue Recovered** — how much RevGuard recovers for you each month based on our 68% average recovery rate
- **Annual Revenue Protected** — the monthly number multiplied by 12
- **Platform ROI** — how many times over RevGuard pays for itself

**Understanding the breakdown:**
The right panel shows how your revenue loss breaks down across churn, failed payments, and billing errors — so you can see where the biggest opportunities are.

**Industry benchmarks:**
- Churn rate: 3–7% is typical for SaaS
- Failed payment rate: 2–5% monthly
- Billing error rate: 0.5–2% of invoices

If your numbers are higher than these, RevGuard will make an especially big difference.`
      },
    ]
  },
  {
    id: 'revenue-recovery',
    icon: '🔄',
    label: 'Automated Recovery',
    articles: [
      {
        title: 'How Automated Recovery Works',
        content: `The Automated Recovery section lets you configure workflows that run 24/7 — recovering revenue without any manual work.

**The 6 recovery workflows:**

⚡ **Smart Retry Engine**
Uses machine learning to pick the optimal time to retry a failed payment. Instead of retrying immediately (which usually fails again), it waits for the right moment based on the customer's bank, time zone, and card type. 72% success rate.

📧 **Dunning Email Sequence**
A 5-email automated series sent over 21 days to customers with failed payments. Each email is personalized and progressively more urgent. 58% success rate.

🔗 **Card Update Campaign**
When a card expires or is declined, this workflow automatically sends the customer a secure link to update their payment method. 81% success rate.

👤 **CSM Escalation**
For accounts over $5,000 MRR, automatically assigns the account to a Customer Success Manager and creates a task in your CRM. 91% success rate.

⏸️ **Pause & Negotiate**
For high-churn-risk customers, offers a temporary subscription pause or plan adjustment as an alternative to cancellation. 67% success rate.

🔙 **Win-Back Automation**
For customers who have already churned, sends a targeted re-engagement sequence 30 days post-churn with a special offer. 43% success rate.`
      },
      {
        title: 'Activating and Configuring Workflows',
        content: `**To activate a workflow:**
1. Find the workflow in the list
2. If it shows "Paused", click **Activate**
3. It will start running immediately on matching accounts

**To pause a workflow:**
1. Find the active workflow
2. Click **Pause**
3. It stops immediately — no in-progress sequences are interrupted

**To configure a workflow:**
1. Click **Configure** on any workflow
2. Set the trigger conditions (e.g. which accounts, which amount thresholds)
3. Customize the email templates or timing
4. Save — changes apply to new instances immediately

**Reading the metrics:**
- **Recovered** — total revenue this workflow has brought back
- **Success Rate** — percentage of attempts that resulted in recovery
- **Attempts** — total number of times this workflow has run

**Which workflows should I have active?**
We recommend keeping all workflows except "Pause & Negotiate" active by default. That one should only be used for specific high-value accounts where you've decided retention is worth a discount.

**Creating a new workflow:**
Click **+ Create New Workflow** at the bottom of the list. You can build custom trigger conditions, email sequences, and escalation paths tailored to your business.`
      },
    ]
  },
  {
    id: 'churn-intervention',
    icon: '🛡️',
    label: 'Churn Intervention',
    articles: [
      {
        title: 'Understanding Active Interventions',
        content: `The Churn Intervention section shows you every automated action currently running to prevent a customer from leaving.

**What an intervention looks like:**
Each card shows one at-risk account and the sequence of actions being taken:

- ✓ **Done** (green) — this step has been completed
- ↻ **In Progress** (blue) — this step is currently running
- ○ **Pending** (grey) — this step is scheduled to run next

**Intervention steps may include:**
- Executive outreach email sent
- CSM assigned
- Retention offer created (e.g. 20% off next quarter)
- EBR (Executive Business Review) scheduled
- Feature training session offered
- Health check email sent

**The trigger** shown on each card tells you what caused RevGuard to start the intervention — for example "Score exceeded 80 threshold" or "Contract renewal in 14 days + low engagement."

**What the numbers mean at the top:**
- **Active Interventions** — how many accounts currently have an intervention running
- **MRR Defended** — total monthly revenue being actively protected
- **Avg Response Time** — how quickly RevGuard triggered the intervention after the risk signal appeared`
      },
      {
        title: 'Using Intervention Playbooks',
        content: `Playbooks are pre-built intervention sequences that automatically trigger based on rules you set.

**The 5 default playbooks:**

📋 **High Risk Outreach** (trigger: score > 75)
4-step sequence: email → CSM assignment → retention offer → EBR scheduling. 71% success rate.

📚 **Feature Adoption** (trigger: low feature usage)
6-step sequence that re-engages customers who aren't using key features. Includes personalized training offers. 64% success rate.

📄 **Renewal Defense** (trigger: 30 days before renewal)
8-step sequence starting 30 days before contract renewal. The most comprehensive playbook with the highest success rate (83%).

💳 **Payment Failure CSM** (trigger: 2+ failed payments)
3-step sequence that immediately loops in a CSM for high-value accounts experiencing payment issues. 89% success rate.

⬇️ **Downgrade Prevention** (trigger: downgrade request received)
5-step sequence that offers alternatives to downgrading — such as a temporary discount or feature adjustment. 52% success rate.

**To create a new playbook:**
1. Click **+ Create Playbook**
2. Set the trigger condition
3. Add steps in order (email, call, offer, etc.)
4. Set timing between steps
5. Activate

**Tip:** The Renewal Defense playbook has the highest success rate (83%). Make sure it's always active — it will protect more ARR than any other single feature in RevGuard.`
      },
    ]
  },
  {
    id: 'data-protection',
    icon: '🔒',
    label: 'Data Protection',
    articles: [
      {
        title: 'How RevGuard Protects Your Data',
        content: `RevGuard is built with enterprise-grade security. Here's exactly how your data is protected:

**Encryption**
- All data is encrypted at rest using **AES-256** — the same standard used by banks and governments
- All data in transit uses **TLS 1.3** — the latest and most secure transport protocol
- Encryption keys are rotated regularly and stored in a separate, hardened system

**Access Control**
- **Role-Based Access Control (RBAC)** — every team member only sees what they need to
- **Multi-Factor Authentication (MFA)** — required for all admin accounts
- **Audit logging** — every action in RevGuard is logged with a timestamp, user ID, and IP address
- **IP allowlisting** — restrict access to specific office or VPN IP addresses

**Compliance certifications:**
- ✅ **SOC 2 Type II** — annual audit by independent third party
- ✅ **GDPR** — full compliance for EU customer data
- ✅ **PCI DSS** — required for handling payment data
- ✅ **ISO 27001** — international information security standard
- ✅ **CCPA** — California Consumer Privacy Act compliant

**What RevGuard can and cannot do:**
- ✅ Read your payment, billing, and CRM data
- ✅ Trigger retries and send emails you approve
- ❌ Never stores raw payment card numbers
- ❌ Never shares your data with third parties
- ❌ Never modifies data in connected systems without your explicit approval

**Data deletion:**
If you ever want to delete your data, contact support. All data is permanently deleted within 30 days.`
      },
    ]
  },
]

export default function HelpCenter({ onClose, initialSection = 'getting-started' }: HelpCenterProps) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [activeArticle, setActiveArticle] = useState(0)
  const [search, setSearch] = useState('')

  const currentSection = helpSections.find(s => s.id === activeSection) || helpSections[0]
  const currentArticle = currentSection.articles[activeArticle]

  const filteredSections = search
    ? helpSections.map(s => ({
        ...s,
        articles: s.articles.filter(a =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.content.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(s => s.articles.length > 0)
    : helpSections

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
        return <div key={i} style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '16px', marginBottom: '4px', fontSize: '14px' }}>{line.slice(2, -2)}</div>
      }
      if (line.startsWith('- ')) {
        const text = line.slice(2)
        return (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', paddingLeft: '8px' }}>
            <span style={{ color: '#3b82f6', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }} />
          </div>
        )
      }
      if (line.startsWith('| ') && line.includes(' | ')) {
        if (line.includes('---|')) return null
        const cells = line.split(' | ').map(c => c.replace(/^\| /, '').replace(/ \|$/, '').replace(/\|$/, '').trim())
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
            {cells.map((cell, j) => (
              <span key={j} style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingRight: '8px' }}
                dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }}
              />
            ))}
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />
      if (/^\d+\./.test(line)) {
        return (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', paddingLeft: '8px' }}>
            <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '13px', flexShrink: 0, minWidth: '16px' }}>{line.match(/^\d+/)?.[0]}.</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }}
            />
          </div>
        )
      }
      return (
        <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }}
        />
      )
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: '1000px', height: '85vh',
        background: 'var(--bg-secondary)', borderRadius: '16px',
        border: '1px solid var(--border-light)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}>
          <div style={{
            width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>📖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '16px' }}>RevGuard Help Center</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Simple guides for every feature</div>
          </div>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveArticle(0) }}
            placeholder="Search guides..."
            style={{ width: '220px', padding: '8px 12px', fontSize: '13px' }}
          />
          <button onClick={onClose} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', width: 32, height: 32, borderRadius: '8px',
            cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left sidebar — sections */}
          <div style={{
            width: '220px', borderRight: '1px solid var(--border)',
            overflow: 'auto', padding: '12px', flexShrink: 0
          }}>
            {filteredSections.map(section => (
              <div key={section.id} style={{ marginBottom: '4px' }}>
                <button
                  onClick={() => { setActiveSection(section.id); setActiveArticle(0); setSearch('') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
                    background: activeSection === section.id ? 'rgba(59,130,246,0.15)' : 'none',
                    color: activeSection === section.id ? '#3b82f6' : 'var(--text-secondary)',
                    fontWeight: activeSection === section.id ? 700 : 500,
                    fontSize: '13px', textAlign: 'left', transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{section.icon}</span>
                  <span style={{ flex: 1 }}>{section.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-primary)', borderRadius: '10px', padding: '1px 5px' }}>
                    {section.articles.length}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Middle — article list */}
          <div style={{
            width: '240px', borderRight: '1px solid var(--border)',
            overflow: 'auto', padding: '12px', flexShrink: 0
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', padding: '4px 8px 10px' }}>
              {currentSection.label.toUpperCase()}
            </div>
            {(search ? filteredSections.find(s => s.id === activeSection)?.articles || currentSection.articles : currentSection.articles).map((article, i) => (
              <button
                key={i}
                onClick={() => setActiveArticle(i)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: activeArticle === i ? 'rgba(59,130,246,0.1)' : 'none',
                  color: activeArticle === i ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: activeArticle === i ? 600 : 400,
                  lineHeight: 1.4, marginBottom: '2px', transition: 'all 0.15s'
                }}
              >
                {article.title}
              </button>
            ))}
          </div>

          {/* Right — article content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px', lineHeight: 1.3 }}>
              {currentArticle?.title}
            </h2>
            <div>{currentArticle && renderContent(currentArticle.content)}</div>

            {/* Footer nav */}
            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Was this helpful?</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ padding: '6px 14px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '13px', cursor: 'pointer' }}>
                  👍 Yes
                </button>
                <button style={{ padding: '6px 14px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}>
                  👎 No
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
