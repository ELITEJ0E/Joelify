import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const YOUTUBE_API_KEYS =
  process.env.YOUTUBE_API_KEYS?.split(",") ||
  (process.env.YOUTUBE_API_KEY ? [process.env.YOUTUBE_API_KEY] : [])

// Quota management: Track exhausted keys until midnight Pacific Time (00:00 PST/PDT)
const exhaustedKeys = new Set<string>()
let nextQuotaResetTime = getNextMidnightPacific()

function getNextMidnightPacific(): number {
  const now = new Date()
  const ptString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  const ptDate = new Date(ptString)
  ptDate.setDate(ptDate.getDate() + 1)
  ptDate.setHours(0, 0, 0, 0)
  const diffMs = ptDate.getTime() - new Date(ptString).getTime()
  return Date.now() + Math.max(diffMs, 60000)
}

function checkAndResetExhaustedKeys() {
  if (Date.now() >= nextQuotaResetTime) {
    exhaustedKeys.clear()
    nextQuotaResetTime = getNextMidnightPacific()
  }
}

function getAvailableYouTubeKey(): string | undefined {
  if (YOUTUBE_API_KEYS.length === 0) return undefined
  checkAndResetExhaustedKeys()
  const available = YOUTUBE_API_KEYS.filter((k) => !exhaustedKeys.has(k))
  if (available.length === 0) {
    return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}

function markKeyExhausted(key: string | undefined) {
  if (key) {
    exhaustedKeys.add(key)
    console.warn(`[Discover API] Key exhausted: ...${key.slice(-4)} (${exhaustedKeys.size}/${YOUTUBE_API_KEYS.length} keys blocked)`)
  }
}

// ── In-Memory Server Cache (30-min TTL) ───────────────────────────────────────
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes
const memoryCache = new Map<string, CacheEntry<any>>()

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key)
    return null
  }
  return entry.data as T
}

function setToCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId") || ""
  const title = searchParams.get("title") || ""
  const artist = searchParams.get("artist") || ""

  const cacheKey = `discover:${videoId}:${title.toLowerCase().trim()}:${artist.toLowerCase().trim()}`
  const cachedResult = getFromCache<any>(cacheKey)
  if (cachedResult) {
    return NextResponse.json(cachedResult)
  }

  let YOUTUBE_API_KEY = getAvailableYouTubeKey()

  if (!YOUTUBE_API_KEY) {
    console.error("[Discover API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEYS to environment variables." },
      { status: 500 }
    )
  }

  try {
    const searchQuery = title || artist ? `${title} ${artist}`.trim() : "popular music 2026"
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      searchQuery
    )}&type=video&videoCategoryId=10&maxResults=8&key=${YOUTUBE_API_KEY}`

    let response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Discover API] YouTube API error:", JSON.stringify(errorData))
      const reason = errorData?.error?.errors?.[0]?.reason
      if (reason === "quotaExceeded") {
        markKeyExhausted(YOUTUBE_API_KEY)
        const nextKey = getAvailableYouTubeKey()
        if (nextKey && nextKey !== YOUTUBE_API_KEY) {
          console.warn(`[Discover API] Retrying with backup key`)
          response = await fetch(url.replace(YOUTUBE_API_KEY, nextKey))
        }
      }
      if (!response.ok) {
        return NextResponse.json(
          { error: "YouTube API quota exceeded. Please try again later." },
          { status: 403 }
        )
      }
    }

    const data = await response.json()
    const videos =
      data.items
        ?.filter((item: any) => item.id?.videoId && item.id.videoId !== videoId)
        .map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet?.title || "Unknown Title",
          artist: item.snippet?.channelTitle || "Unknown Artist",
          thumbnail:
            item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        })) || []

    const result = { videos }
    setToCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Discover API] Error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to load recommendations" },
      { status: 500 }
    )
  }
}
