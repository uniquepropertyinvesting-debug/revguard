/**
 * Tiny dependency-free body validator. Predicate per field; rejects missing
 * or wrong-type values without leaking field internals to the caller.
 */

export type Validator<T> = (v: unknown) => v is T

export const isString: Validator<string> = (v): v is string => typeof v === 'string' && v.length > 0
export const isOptionalString: Validator<string | undefined> = (v): v is string | undefined =>
  v === undefined || v === null || typeof v === 'string'
export const isNumber: Validator<number> = (v): v is number => typeof v === 'number' && Number.isFinite(v)
export const isBoolean: Validator<boolean> = (v): v is boolean => typeof v === 'boolean'
export const isEmail: Validator<string> = (v): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254
export const isStringMax = (max: number): Validator<string> =>
  ((v): v is string => typeof v === 'string' && v.length > 0 && v.length <= max)
export const isOneOf = <T extends string>(values: readonly T[]): Validator<T> =>
  ((v): v is T => typeof v === 'string' && (values as readonly string[]).includes(v))

type Schema = Record<string, Validator<unknown>>
type Inferred<S extends Schema> = { [K in keyof S]: S[K] extends Validator<infer T> ? T : never }

interface Ok<T> { ok: true; value: T }
interface Err { ok: false; error: string }

export function validateBody<S extends Schema>(body: unknown, schema: S): Ok<Inferred<S>> | Err {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request body' }
  }
  const out: Record<string, unknown> = {}
  for (const [key, check] of Object.entries(schema)) {
    const val = (body as Record<string, unknown>)[key]
    if (!check(val)) {
      return { ok: false, error: `Invalid or missing field: ${key}` }
    }
    out[key] = val
  }
  return { ok: true, value: out as Inferred<S> }
}
