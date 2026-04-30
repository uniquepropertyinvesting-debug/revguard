import { ReactNode } from 'react'

const BOLD_COLOR = 'var(--text-primary)'

function renderBold(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={`${keyPrefix}-b-${i}`} style={{ color: BOLD_COLOR }}>{part}</strong>
      : <span key={`${keyPrefix}-t-${i}`}>{part}</span>
  )
}

export function renderMarkdownInline(text: string, keyPrefix = 'i'): ReactNode {
  return <>{renderBold(text, keyPrefix)}</>
}

export function renderMarkdownBlock(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => (
    <div key={`l-${i}`} style={{ marginBottom: line === '' ? '8px' : '2px' }}>
      {renderBold(line, `l${i}`)}
    </div>
  ))
}

export function renderHelpArticle(text: string): ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('- ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', paddingLeft: '8px' }}>
          <span style={{ color: '#3b82f6', fontSize: '12px', marginTop: '2px', flexShrink: 0 }}>•</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {renderBold(line.slice(2), `b${i}`)}
          </span>
        </div>
      )
    }

    if (line.startsWith('| ') && line.includes(' | ')) {
      if (line.includes('---|')) return null
      const cells = line
        .split(' | ')
        .map(c => c.replace(/^\| /, '').replace(/ \|$/, '').replace(/\|$/, '').trim())
      return (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
          {cells.map((cell, j) => (
            <span key={j} style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingRight: '8px' }}>
              {renderBold(cell, `c${i}-${j}`)}
            </span>
          ))}
        </div>
      )
    }

    if (/^\d+\./.test(line)) {
      const num = line.match(/^\d+/)?.[0] || ''
      const rest = line.replace(/^\d+\.\s*/, '')
      return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', paddingLeft: '8px' }}>
          <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '13px', flexShrink: 0, minWidth: '16px' }}>{num}.</span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {renderBold(rest, `n${i}`)}
          </span>
        </div>
      )
    }

    return (
      <p key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}>
        {renderBold(line, `p${i}`)}
      </p>
    )
  })
}
