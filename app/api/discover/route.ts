import { type NextRequest, NextResponse } from "next/server"

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyAGvx3r4Cw9RwPTUog1j2908nVOHfkzz14"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const videoId = searchParams.get("videoId")
  const title = searchParams.get("title")
  const artist = searchParams.get("artist")

  try {
    let url = ""

    if (videoId && (title || artist)) {
      const searchQuery = encodeURIComponent(`${title || ""} ${artist || ""}`.trim())
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&videoCategoryId=10&maxResults=8&key=${YOUTUBE_API_KEY}`
    } else {
      // Fetch trending music
      url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=trending music 2024&type=video&videoCategoryId=10&maxResults=8&key=${YOUTUBE_API_KEY}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] YouTube API error:", errorData)

      if (response.status === 403) {
        return NextResponse.json({ error: "API quota exceeded. Please try again later." }, { status: 403 })
      }
      throw new Error("Failed to fetch recommendations")
    }

    const data = await response.json()

    const videos = data.items
      .filter((item: any) => item.id.videoId !== videoId)
      .map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
      }))

    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error("[v0] Discover API error:", error)
    return NextResponse.json({ error: error.message || "Failed to load recommendations" }, { status: 500 })
  }
}
