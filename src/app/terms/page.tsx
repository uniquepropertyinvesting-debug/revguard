import Link from 'next/link'

export const metadata = { title: 'Terms of Service — RevGuard' }

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e5e7eb', padding: '64px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#06b6d4', textDecoration: 'none', fontSize: 14 }}>
          &larr; Back to home
        </Link>
        <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 24, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 32 }}>Last updated: April 29, 2026</p>

        <Section title="1. Acceptance">
          By creating an account or using RevGuard (&ldquo;the Service&rdquo;), you agree to these Terms. If you do
          not agree, do not use the Service.
        </Section>

        <Section title="2. The Service">
          RevGuard provides analytics, alerts, automated dunning, and AI insights for SaaS businesses based on data
          you connect from Stripe. You are responsible for the accuracy and lawful use of any data you connect.
        </Section>

        <Section title="3. Your Account">
          You must be at least 18 and able to enter binding contracts. You are responsible for keeping your
          credentials secure and for all activity under your account. Notify us promptly of unauthorized use.
        </Section>

        <Section title="4. Acceptable Use">
          You agree not to: (a) use the Service for unlawful purposes; (b) attempt to disrupt or reverse-engineer the
          Service; (c) abuse the AI or alert features (rate limits apply); (d) connect Stripe accounts you do not own
          or are not authorized to access.
        </Section>

        <Section title="5. Stripe Integration">
          You authorize us to read your Stripe data via the API key you provide. We do not initiate charges, refunds,
          or transfers without an explicit action you take in the Service. Manual retry of failed invoices is
          performed only when you click the retry action.
        </Section>

        <Section title="6. Fees">
          Pricing is shown in-app and may change with 30 days&rsquo; notice. Subscriptions renew automatically until
          canceled. No refunds for partial periods unless required by law.
        </Section>

        <Section title="7. Termination">
          You may delete your account at any time from Settings. We may suspend or terminate accounts that violate
          these Terms or that pose a security or abuse risk. Upon termination, your data is deleted per our Privacy
          Policy.
        </Section>

        <Section title="8. Disclaimer">
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee specific
          recovery rates or revenue outcomes. Recommendations from the AI assistant are informational, not financial
          advice.
        </Section>

        <Section title="9. Limitation of Liability">
          To the maximum extent permitted by law, our total liability for any claim arising from the Service is
          limited to the fees you paid in the 12 months preceding the claim.
        </Section>

        <Section title="10. Governing Law">
          These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law
          rules.
        </Section>

        <Section title="11. Changes">
          We may update these Terms. Continued use after changes constitutes acceptance.
        </Section>

        <Section title="12. Contact">
          Questions: <a href="mailto:legal@rev-guard.com" style={{ color: '#06b6d4' }}>legal@rev-guard.com</a>
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
