import { type NextRequest, NextResponse } from "next/server"

const YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []

function getRandomKey() {
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

export async function GET(request: NextRequest) {
  const apiKey = getRandomKey()

  if (!apiKey) {
    console.error("[Discover API] YouTube API key is missing.")
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
  }

  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const title = searchParams.get("title")
  const artist = searchParams.get("artist")

  try {
    const searchQuery = title || artist ? `${title || ""} ${artist || ""}`.trim() : "popular music 2024"
    console.log(`[Discover API] Searching: ${searchQuery}`)

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      searchQuery
    )}&type=video&videoCategoryId=10&maxResults=8&key=${apiKey}`

    const response = await fetch(searchUrl)
    if (!response.ok) {
      const err = await response.json()
      console.error("[Discover API] YouTube API error:", err)
      return NextResponse.json({ error: err?.error?.message || "YouTube API failed" }, { status: response.status })
    }

    const data = await response.json()
    const videos =
      data.items
        ?.filter((item: any) => item.id?.videoId && item.id.videoId !== videoId)
        .map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet?.title || "Unknown Title",
          artist: item.snippet?.channelTitle || "Unknown Artist",
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        })) || []

    console.log(`[Discover API] ${videos.length} recommendations found`)
    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error("[Discover API] Error:", error.message)
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 })
  }
}
