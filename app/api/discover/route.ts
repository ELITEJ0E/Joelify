import { type NextRequest, NextResponse } from "next/server"

const YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []

function getRandomYouTubeKey() {
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

export async function GET(request: NextRequest) {
  const YOUTUBE_API_KEY = getRandomYouTubeKey()

  if (!YOUTUBE_API_KEY) {
    console.error("[Discover API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEYS to environment variables." },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const title = searchParams.get("title")
  const artist = searchParams.get("artist")

  try {
    const searchQuery = title || artist ? `${title || ""} ${artist || ""}`.trim() : "popular music 2024"
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=8&key=${YOUTUBE_API_KEY}`

    const response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Discover API] YouTube API error:", JSON.stringify(errorData))
      const reason = errorData?.error?.errors?.[0]?.reason
      if (reason === "quotaExceeded") {
        // Retry with next key if available
        const nextKey = getRandomYouTubeKey()
        if (nextKey !== YOUTUBE_API_KEY) {
          console.warn(`[Discover API] Retrying with backup key`)
          const retryRes = await fetch(url.replace(YOUTUBE_API_KEY, nextKey))
          if (retryRes.ok) return NextResponse.json({ videos: (await retryRes.json()).items || [] })
        }
      }
      return NextResponse.json({ error: "YouTube API quota exceeded. Please try again later." }, { status: 403 })
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

    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error("[Discover API] Error:", error.message)
    return NextResponse.json({ error: error.message || "Failed to load recommendations" }, { status: 500 })
  }
}
