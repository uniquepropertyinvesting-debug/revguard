import { describe, it, expect } from 'vitest'
import { validateBody, isString, isEmail, isOneOf, isNumber, isStringMax } from './validate'

describe('validateBody', () => {
  it('accepts a body matching the schema', () => {
    const result = validateBody({ name: 'Alex', email: 'a@b.co' }, { name: isString, email: isEmail })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Alex')
      expect(result.value.email).toBe('a@b.co')
    }
  })

  it('rejects missing required fields', () => {
    const result = validateBody({ name: 'Alex' }, { name: isString, email: isEmail })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/email/)
  })

  it('rejects when body is not an object', () => {
    expect(validateBody(null, { x: isString }).ok).toBe(false)
    expect(validateBody('hi', { x: isString }).ok).toBe(false)
    expect(validateBody(42, { x: isString }).ok).toBe(false)
  })

  it('isOneOf rejects unknown values', () => {
    const v = isOneOf(['critical', 'warning', 'success'] as const)
    expect(v('critical')).toBe(true)
    expect(v('exotic')).toBe(false)
  })

  it('isStringMax respects max length', () => {
    const v = isStringMax(5)
    expect(v('hi')).toBe(true)
    expect(v('toolong')).toBe(false)
    expect(v('')).toBe(false)
  })

  it('isNumber rejects NaN and infinity', () => {
    expect(isNumber(1)).toBe(true)
    expect(isNumber(NaN)).toBe(false)
    expect(isNumber(Infinity)).toBe(false)
    expect(isNumber('1')).toBe(false)
  })
})
