import { describe, it, expect } from 'vitest'
import { escapeHtml } from './alertEmail'

describe('escapeHtml', () => {
  it('escapes script tags', () => {
    const out = escapeHtml('<script>alert(1)</script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })

  it('escapes attribute-breaking quotes', () => {
    const out = escapeHtml(`" onerror="alert(1)`)
    expect(out).not.toContain('"')
    expect(out).toContain('&quot;')
  })

  it('escapes ampersands first to avoid double-encoding bypass', () => {
    const out = escapeHtml('&lt;script&gt;')
    // Original literal "&lt;" should become "&amp;lt;" — never collapse to "<"
    expect(out).toContain('&amp;lt;')
    expect(out).not.toContain('<script>')
  })

  it('passes through plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })
})
