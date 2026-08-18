import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const YOUTUBE_API_KEYS =
  process.env.YOUTUBE_API_KEYS?.split(",") ||
  (process.env.YOUTUBE_API_KEY ? [process.env.YOUTUBE_API_KEY] : [])

const exhaustedKeys = new Set<string>()
let nextQuotaResetTime = Date.now() + 60 * 60 * 1000

function checkAndResetExhaustedKeys() {
  if (Date.now() >= nextQuotaResetTime) {
    exhaustedKeys.clear()
    nextQuotaResetTime = Date.now() + 60 * 60 * 1000
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
    console.warn(`[Charts API] Key exhausted: ...${key.slice(-4)}`)
  }
}

// In-memory cache for 30 minutes
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  let regionCode = (searchParams.get("regionCode") || "MY").toUpperCase()
  if (regionCode === "GLOBAL") regionCode = "US"

  const cacheKey = `charts_${regionCode}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  let YOUTUBE_API_KEY = getAvailableYouTubeKey()

  if (!YOUTUBE_API_KEY) {
    console.error("[Charts API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEYS to environment variables." },
      { status: 500 }
    )
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=10&regionCode=${encodeURIComponent(
      regionCode
    )}&maxResults=30&key=${YOUTUBE_API_KEY}`

    let response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Charts API] YouTube API error:", JSON.stringify(errorData))
      const reason = errorData?.error?.errors?.[0]?.reason
      if (reason === "quotaExceeded") {
        markKeyExhausted(YOUTUBE_API_KEY)
        const nextKey = getAvailableYouTubeKey()
        if (nextKey && nextKey !== YOUTUBE_API_KEY) {
          console.warn(`[Charts API] Retrying with backup key`)
          response = await fetch(url.replace(YOUTUBE_API_KEY, nextKey))
        }
      }
      if (!response.ok) {
        return NextResponse.json(
          { error: "YouTube API quota exceeded or request failed. Please try again later." },
          { status: 403 }
        )
      }
    }

    const data = await response.json()
    const videos =
      data.items?.map((item: any) => ({
        id: item.id,
        title: item.snippet?.title || "Unknown Title",
        artist: item.snippet?.channelTitle || "Unknown Artist",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        viewCount: item.statistics?.viewCount || "0",
      })) || []

    const result = { videos, regionCode }
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Charts API] Error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to load top charts" },
      { status: 500 }
    )
  }
}
