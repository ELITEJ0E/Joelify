// Tiny in-memory TTL cache for the music API routes (per server instance).

interface Entry<T> {
  value: T
  expires: number
}

const store = new Map<string, Entry<unknown>>()
const MAX_ENTRIES = 500

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest entry
    const oldest = store.keys().next().value
    if (oldest !== undefined) store.delete(oldest)
  }
  store.set(key, { value, expires: Date.now() + ttlMs })
}
