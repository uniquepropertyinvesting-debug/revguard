import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifySignature } from './route'

const SECRET = 'test-secret-12345'

function hmac(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex')
}

describe('BetterStack verifySignature', () => {
  it('accepts a valid HMAC signature', () => {
    const body = JSON.stringify({ event: 'incident.created', data: { id: 'abc' } })
    const headers = new Headers({ 'x-webhook-signature': hmac(body) })
    expect(verifySignature(body, headers, SECRET)).toBe(true)
  })

  it('accepts the sha256= prefix variant', () => {
    const body = JSON.stringify({ id: 1 })
    const headers = new Headers({ 'x-webhook-signature': `sha256=${hmac(body)}` })
    expect(verifySignature(body, headers, SECRET)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const body = JSON.stringify({ id: 1 })
    const headers = new Headers({ 'x-webhook-signature': hmac(body) })
    expect(verifySignature(body + '!', headers, SECRET)).toBe(false)
  })

  it('rejects when signature is wrong', () => {
    const body = JSON.stringify({ id: 1 })
    const headers = new Headers({ 'x-webhook-signature': '0'.repeat(64) })
    expect(verifySignature(body, headers, SECRET)).toBe(false)
  })

  it('rejects when no signature or static secret header is present', () => {
    expect(verifySignature('any', new Headers(), SECRET)).toBe(false)
  })

  it('falls back to a constant-time string compare for static-secret deploys', () => {
    const headers = new Headers({ 'x-webhook-secret': SECRET })
    expect(verifySignature('any', headers, SECRET)).toBe(true)
  })

  it('rejects a wrong static secret', () => {
    const headers = new Headers({ 'x-webhook-secret': 'wrong' })
    expect(verifySignature('any', headers, SECRET)).toBe(false)
  })
})
