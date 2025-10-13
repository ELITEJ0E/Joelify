import { type NextRequest, NextResponse } from "next/server"

const API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []
let currentKeyIndex = 0

function getNextKey() {
  if (API_KEYS.length === 0) throw new Error("No YouTube API keys configured")
  const key = API_KEYS[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length
  return key
}

function parseVideos(data: any, excludeId?: string) {
  return (
    data.items
      ?.filter((item: any) => item.id?.videoId && item.id.videoId !== excludeId)
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet?.title || "Unknown Title",
        artist: item.snippet?.channelTitle || "Unknown Artist",
        thumbnail:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
      }))
      .filter((v: any) => v.id && v.thumbnail) || []
  )
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const title = searchParams.get("title")
  const artist = searchParams.get("artist")

  try {
    if (API_KEYS.length === 0) {
      return NextResponse.json(
        { error: "No YouTube API keys configured." },
        { status: 500 }
      )
    }

    let searchQuery = title || artist ? `${title || ""} ${artist || ""}`.trim() : "popular music 2024"
    console.log(`[Discover API] Searching for: ${searchQuery}`)

    let YOUTUBE_API_KEY = getNextKey()
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      searchQuery
    )}&type=video&videoCategoryId=10&maxResults=8&key=${YOUTUBE_API_KEY}`

    let response = await fetch(url)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn("[Discover API] YouTube error:", response.status, errorData)

      // Rotate to next API key if quota exceeded
      if (response.status === 403 && API_KEYS.length > 1) {
        console.log("[Discover API] Quota exceeded, rotating key...")
        YOUTUBE_API_KEY = getNextKey()
        const retryUrl = url.replace(/key=[^&]+/, `key=${YOUTUBE_API_KEY}`)
        response = await fetch(retryUrl)
      }
    }

    if (!response.ok) {
      console.warn("[Discover API] YouTube quota fully used. Falling back to Piped API...")
      const pipedResponse = await fetch(
        `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(searchQuery)}`
      )
      const pipedData = await pipedResponse.json()
      const videos =
        pipedData?.items?.slice(0, 8).map((item: any) => ({
          id: item.url?.split("v=")[1],
          title: item.title,
          artist: item.uploaderName,
          thumbnail: item.thumbnail,
        })) || []
      return NextResponse.json({ videos })
    }

    const data = await response.json()
    const videos = parseVideos(data, videoId)
    console.log(`[Discover API] Successfully fetched ${videos.length} results`)
    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error("[Discover API] Error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to load recommendations" },
      { status: 500 }
    )
  }
}
