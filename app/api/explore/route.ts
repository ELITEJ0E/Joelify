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
    // If all keys exhausted, fallback to random key
    return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}

function markKeyExhausted(key: string | undefined) {
  if (key) {
    exhaustedKeys.add(key)
    console.warn(`[Explore API] Key exhausted: ...${key.slice(-4)} (${exhaustedKeys.size}/${YOUTUBE_API_KEYS.length} keys blocked)`)
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

// NOTE: Hardcoded curated YouTube Playlist IDs per genre (1 quota unit via playlistItems vs 100 via search.list).
// These should be swapped for Joel's own curated playlist IDs later.
const GENRE_PLAYLISTS: Record<string, string> = {
  pop: "PLMC9KNkIncKtPzgY-5fcdc8y7TDklChxn",
  hiphop: "PLDcnymzs18LUXw8951CwnPZX244bon8PB",
  rap: "PLDcnymzs18LUXw8951CwnPZX244bon8PB",
  rnb: "PLDcnymzs18LVXfO_x0Ei0P24iDbVqqSTs",
  edm: "PLw-VjHDlEOgvWXXblit68JzYAWp9U2yF9",
  dance: "PLw-VjHDlEOgvWXXblit68JzYAWp9U2yF9",
  indie: "PLDcnymzs18LU_91_i7o1CkyD9yC_r1rN9",
  rock: "PLDcnymzs18LVZz8w_p9M6k7tP_R2X7n5Y",
  kpop: "PL4fGSI1pDJn6jXS_PEoNsn_46Y15SbbCA",
  latin: "PLDcnymzs18LVjK7uE9f0v8xW0FqM_2lqM",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const regionCode = searchParams.get("regionCode") || "US"
  const genre = searchParams.get("genre")

  // Check In-Memory Cache first
  const cacheKey = genre
    ? `genre:${genre.toLowerCase().trim()}:${regionCode}`
    : `explore_feed:${regionCode}`

  const cachedResult = getFromCache<any>(cacheKey)
  if (cachedResult) {
    return NextResponse.json(cachedResult)
  }

  let YOUTUBE_API_KEY = getAvailableYouTubeKey()

  if (!YOUTUBE_API_KEY) {
    console.error("[Explore API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEYS to environment variables." },
      { status: 500 }
    )
  }

  try {
    if (genre) {
      // Quota-cheap genre lookup using playlistItems.list (1 quota unit)
      const normalizedGenre = genre.toLowerCase().replace(/[^a-z]/g, "")
      const playlistId = GENRE_PLAYLISTS[normalizedGenre] || GENRE_PLAYLISTS.pop

      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=20&key=${YOUTUBE_API_KEY}`

      let response = await fetch(playlistUrl)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (err?.error?.errors?.[0]?.reason === "quotaExceeded") {
          markKeyExhausted(YOUTUBE_API_KEY)
          const nextKey = getAvailableYouTubeKey()
          if (nextKey && nextKey !== YOUTUBE_API_KEY) {
            response = await fetch(playlistUrl.replace(YOUTUBE_API_KEY, nextKey))
          }
        }
        if (!response.ok) {
          return NextResponse.json({ error: "Failed to load genre songs" }, { status: 403 })
        }
      }

      const data = await response.json()
      const videos = (data.items || [])
        .filter((item: any) => {
          const title = item.snippet?.title || ""
          return (
            item.snippet?.resourceId?.videoId &&
            title !== "Private video" &&
            title !== "Deleted video"
          )
        })
        .map((item: any) => ({
          id: item.snippet?.resourceId?.videoId,
          title: item.snippet?.title || "Unknown Title",
          artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "Unknown Artist",
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            "",
        }))

      const result = { genre, videos }
      setToCache(cacheKey, result)
      return NextResponse.json(result)
    }

    // Default Explore feeds (Hero items + Top Charts cards)
    const heroUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      "official music video 2026"
    )}&type=video&videoCategoryId=10&order=viewCount&maxResults=6&regionCode=${encodeURIComponent(
      regionCode
    )}&key=${YOUTUBE_API_KEY}`

    const chartsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=10&regionCode=${encodeURIComponent(
      regionCode
    )}&maxResults=10&key=${YOUTUBE_API_KEY}`

    let [heroRes, chartsRes] = await Promise.all([fetch(heroUrl), fetch(chartsUrl)])

    if (!heroRes.ok || !chartsRes.ok) {
      if (!heroRes.ok) {
        const err = await heroRes.clone().json().catch(() => ({}))
        if (err?.error?.errors?.[0]?.reason === "quotaExceeded") markKeyExhausted(YOUTUBE_API_KEY)
      }
      const nextKey = getAvailableYouTubeKey()
      if (nextKey && nextKey !== YOUTUBE_API_KEY) {
        ;[heroRes, chartsRes] = await Promise.all([
          fetch(heroUrl.replace(YOUTUBE_API_KEY, nextKey)),
          fetch(chartsUrl.replace(YOUTUBE_API_KEY, nextKey)),
        ])
      }
    }

    let heroVideos: any[] = []
    if (heroRes.ok) {
      const heroData = await heroRes.json()
      heroVideos = (heroData.items || []).map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || "Unknown Title",
        artist: item.snippet?.channelTitle || "Unknown Artist",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          "",
      }))
    }

    let trendingVideos: any[] = []
    if (chartsRes.ok) {
      const chartsData = await chartsRes.json()
      trendingVideos = (chartsData.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet?.title || "Unknown Title",
        artist: item.snippet?.channelTitle || "Unknown Artist",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          "",
        viewCount: item.statistics?.viewCount || "0",
      }))
    }

    const result = {
      hero: heroVideos,
      trending: trendingVideos,
      regionCode,
    }
    setToCache(cacheKey, result)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Explore API] Error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to load explore content" },
      { status: 500 }
    )
  }
}
