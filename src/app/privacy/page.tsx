import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — RevGuard' }

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e5e7eb', padding: '64px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#06b6d4', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back to home
        </Link>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 32 }}>Last updated: April 29, 2026</p>

        <Section title="1. Information We Collect">
          We collect information you provide directly: name, email, company details, and Stripe API credentials. We
          also collect data via your connected Stripe account (customer records, payment events, invoices) solely to
          power the analytics and recovery features you use.
        </Section>

        <Section title="2. How We Use Your Information">
          To operate RevGuard: detect failed payments and churn risk, run automated dunning, send alerts you
          configure, and provide AI insights. We do not sell your data. We do not use your data to train third-party
          AI models.
        </Section>

        <Section title="3. Data Storage and Security">
          Data is hosted on Supabase (PostgreSQL) with Row Level Security policies enforcing per-user isolation.
          Sensitive credentials (Stripe keys, webhook secrets, API keys) are encrypted at rest. All traffic is
          encrypted in transit via TLS.
        </Section>

        <Section title="4. Third Parties">
          We share data only with the providers required to operate the service: Supabase (database/auth), Stripe
          (payment processor — only your own Stripe account), Resend (transactional email if you enable alerts), and
          OpenAI (for the AI assistant — prompts contain a summary of your Stripe data; conversations are not used
          for model training per OpenAI&rsquo;s API policy).
        </Section>

        <Section title="5. Your Rights (GDPR & CCPA)">
          You may export all your data at any time from Settings, or request deletion of your account and all
          associated data. Deletion is permanent and immediate. You may also contact us at privacy@revguard.io.
        </Section>

        <Section title="6. Cookies">
          We use only essential cookies required for authentication. We do not use tracking, advertising, or
          analytics cookies.
        </Section>

        <Section title="7. Data Retention">
          Account data is retained while your account is active. Deleting your account removes all personal data
          immediately. Webhook event logs may be retained for up to 90 days for debugging and abuse prevention.
        </Section>

        <Section title="8. Changes">
          We may update this policy. Material changes will be communicated via email at least 14 days before taking
          effect.
        </Section>

        <Section title="9. Contact">
          Questions: <a href="mailto:privacy@revguard.io" style={{ color: '#06b6d4' }}>privacy@revguard.io</a>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 10 }}>{title}</h2>
      <p style={{ lineHeight: 1.6, color: '#cbd5e1' }}>{children}</p>
    </section>
  )
}
