import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const YOUTUBE_API_KEYS =
  process.env.YOUTUBE_API_KEYS?.split(",") ||
  (process.env.YOUTUBE_API_KEY ? [process.env.YOUTUBE_API_KEY] : [])

function getRandomYouTubeKey() {
  if (YOUTUBE_API_KEYS.length === 0) return undefined
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

export async function GET(request: NextRequest) {
  let YOUTUBE_API_KEY = getRandomYouTubeKey()

  if (!YOUTUBE_API_KEY) {
    console.error("[Explore API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEYS to environment variables." },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const regionCode = searchParams.get("regionCode") || "US"
  const genre = searchParams.get("genre")

  try {
    if (genre) {
      // Fetch genre specific videos
      const genreUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        `${genre} music`
      )}&type=video&videoCategoryId=10&order=viewCount&maxResults=20&regionCode=${encodeURIComponent(
        regionCode
      )}&key=${YOUTUBE_API_KEY}`

      let response = await fetch(genreUrl)
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        if (err?.error?.errors?.[0]?.reason === "quotaExceeded") {
          const nextKey = getRandomYouTubeKey()
          if (nextKey && nextKey !== YOUTUBE_API_KEY) {
            response = await fetch(genreUrl.replace(YOUTUBE_API_KEY, nextKey))
          }
        }
        if (!response.ok) {
          return NextResponse.json({ error: "Failed to load genre songs" }, { status: 403 })
        }
      }

      const data = await response.json()
      const videos = (data.items || []).map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || "Unknown Title",
        artist: item.snippet?.channelTitle || "Unknown Artist",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
      }))

      return NextResponse.json({ genre, videos })
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
      const nextKey = getRandomYouTubeKey()
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

    return NextResponse.json({
      hero: heroVideos,
      trending: trendingVideos,
      regionCode,
    })
  } catch (error: any) {
    console.error("[Explore API] Error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to load explore content" },
      { status: 500 }
    )
  }
}
