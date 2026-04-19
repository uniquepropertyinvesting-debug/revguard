export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#f1f5f9', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '48px' }}>🛡️</div>
      <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Page Not Found</h1>
      <a href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px' }}>← Back to RevGuard</a>
    </div>
  )
}
