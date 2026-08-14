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
    console.error("[Charts API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEYS to environment variables." },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const regionCode = searchParams.get("regionCode") || "US"

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&videoCategoryId=10&regionCode=${encodeURIComponent(
      regionCode
    )}&maxResults=25&key=${YOUTUBE_API_KEY}`

    let response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Charts API] YouTube API error:", JSON.stringify(errorData))
      const reason = errorData?.error?.errors?.[0]?.reason
      if (reason === "quotaExceeded") {
        const nextKey = getRandomYouTubeKey()
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

    return NextResponse.json({ videos, regionCode })
  } catch (error: any) {
    console.error("[Charts API] Error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to load top charts" },
      { status: 500 }
    )
  }
}
