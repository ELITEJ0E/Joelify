import { type NextRequest, NextResponse } from "next/server"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export async function GET(request: NextRequest) {
  if (!YOUTUBE_API_KEY) {
    console.error("[Discover API] YouTube API key is not configured")
    return NextResponse.json(
      { error: "YouTube API key is not configured. Please add YOUTUBE_API_KEY to environment variables." },
      { status: 500 },
    )
  }

  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const title = searchParams.get("title")
  const artist = searchParams.get("artist")

  try {
    let url = ""
    let searchQuery = ""

    if (title || artist) {
      // When a track is playing, search for similar content using title and artist
      searchQuery = `${title || ""} ${artist || ""}`.trim()
      console.log(`[Discover API] Searching for similar to: ${searchQuery}`)
    } else {
      // When no track is playing, show popular music
      searchQuery = "popular music 2024"
      console.log("[Discover API] Fetching trending music")
    }

    url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=8&key=${YOUTUBE_API_KEY}`

    console.log(`[Discover API] Fetching from YouTube API...`)
    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[Discover API] YouTube API error:", JSON.stringify(errorData))

      if (response.status === 403) {
        return NextResponse.json({ error: "YouTube API quota exceeded. Please try again later." }, { status: 403 })
      }
      if (response.status === 400) {
        return NextResponse.json(
          { error: "Invalid request to YouTube API. Please check your search parameters." },
          { status: 400 },
        )
      }
      throw new Error(`YouTube API returned ${response.status}`)
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
        }))
        .filter((video: any) => video.id && video.thumbnail) || []

    console.log(`[Discover API] Successfully fetched ${videos.length} recommendations`)
    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error("[Discover API] Error:", error.message)
    return NextResponse.json({ error: error.message || "Failed to load recommendations" }, { status: 500 })
  }
}
