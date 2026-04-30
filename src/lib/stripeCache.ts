type Entry<T> = { value: T; expiresAt: number }

const store = new Map<string, Entry<unknown>>()

const DEFAULT_TTL_MS = 30_000

function pruneExpired(now: number) {
  if (store.size < 256) return
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k)
  }
}

export async function getOrSetCached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.expiresAt > now) {
    return hit.value as T
  }

  const value = await loader()
  store.set(key, { value, expiresAt: now + ttlMs })
  pruneExpired(now)
  return value
}

export function invalidateStripeCache(userIdPrefix?: string) {
  if (!userIdPrefix) {
    store.clear()
    return
  }
  for (const k of store.keys()) {
    if (k.startsWith(userIdPrefix)) store.delete(k)
  }
}
