import { describe, it, expect } from 'vitest'
import { rateLimit } from './rateLimit'

describe('rateLimit', () => {
  it('allows up to max requests within the window', () => {
    const id = 'user-' + Math.random()
    const r1 = rateLimit('test', id, { max: 3, windowMs: 60_000 })
    const r2 = rateLimit('test', id, { max: 3, windowMs: 60_000 })
    const r3 = rateLimit('test', id, { max: 3, windowMs: 60_000 })
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    expect(r3.ok).toBe(true)
  })

  it('rejects after max requests in the window', () => {
    const id = 'user-' + Math.random()
    rateLimit('test', id, { max: 2, windowMs: 60_000 })
    rateLimit('test', id, { max: 2, windowMs: 60_000 })
    const blocked = rateLimit('test', id, { max: 2, windowMs: 60_000 })
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('isolates buckets by scope', () => {
    const id = 'user-' + Math.random()
    rateLimit('a', id, { max: 1, windowMs: 60_000 })
    const blockedA = rateLimit('a', id, { max: 1, windowMs: 60_000 })
    const allowedB = rateLimit('b', id, { max: 1, windowMs: 60_000 })
    expect(blockedA.ok).toBe(false)
    expect(allowedB.ok).toBe(true)
  })

  it('isolates buckets by identifier', () => {
    rateLimit('s', 'u1', { max: 1, windowMs: 60_000 })
    const blocked = rateLimit('s', 'u1', { max: 1, windowMs: 60_000 })
    const other = rateLimit('s', 'u2', { max: 1, windowMs: 60_000 })
    expect(blocked.ok).toBe(false)
    expect(other.ok).toBe(true)
  })
})
