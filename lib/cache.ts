interface CacheData<T> {
  data: T
  timestamp: number
}

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds

export function getCachedData<T>(key: string, storage: Storage = localStorage): T | null {
  try {
    const cached = storage.getItem(key)
    if (!cached) return null

    const parsed: CacheData<T> = JSON.parse(cached)
    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION

    if (isExpired) {
      storage.removeItem(key)
      return null
    }

    return parsed.data
  } catch (error) {
    console.error(`[Cache] Error reading cache for key "${key}":`, error)
    return null
  }
}

export function setCachedData<T>(key: string, data: T, storage: Storage = localStorage): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
    }
    storage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.error(`[Cache] Error writing cache for key "${key}":`, error)
  }
}

export function getCacheAge(key: string, storage: Storage = localStorage): number | null {
  try {
    const cached = storage.getItem(key)
    if (!cached) return null

    const parsed: CacheData<any> = JSON.parse(cached)
    return Date.now() - parsed.timestamp
  } catch (error) {
    return null
  }
}

export function formatCacheAge(ageMs: number | null): string {
  if (ageMs === null) return "Never"

  const minutes = Math.floor(ageMs / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "Just now"
}
