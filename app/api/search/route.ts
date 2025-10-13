import { NextRequest, NextResponse } from "next/server"

const YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

function getRandomYouTubeKey() {
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return "0:00"
  const [, hours, minutes, seconds] = match.map((x) => parseInt(x || "0", 10))
  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")
  if (!query) return NextResponse.json({ items: [], error: "Missing search query." }, { status: 400 })

  let apiKey = getRandomYouTubeKey()
  if (!apiKey) {
    console.error("[YouTube Search API] Missing API key.")
    return NextResponse.json({ items: [], error: "Server not configured with API keys." }, { status: 500 })
  }

  try {
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&videoCategoryId=10&maxResults=20&key=${apiKey}`

    let searchRes = await fetch(searchUrl)
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}))
      if (err?.error?.errors?.[0]?.reason === "quotaExceeded") {
        console.warn("[YouTube Search API] Key quota exceeded. Rotating key...")
        apiKey = getRandomYouTubeKey()
        searchRes = await fetch(searchUrl.replace(/key=[^&]+/, `key=${apiKey}`))
      }
      if (!searchRes.ok) throw new Error("Search failed after retry.")
    }

    const searchData = await searchRes.json()
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")
    if (!videoIds) return NextResponse.json({ items: [] })

    const detailsRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
    )
    const detailsData = await detailsRes.json()

    const items = searchData.items.map((item: any, index: number) => {
      const duration = detailsData.items[index]?.contentDetails?.duration || "PT0S"
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: formatDuration(duration),
        channelId: item.snippet.channelId,
      }
    })

    return NextResponse.json({ items })
  } catch (err: any) {
    console.error("[YouTube Search API] Error:", err.message)
    return NextResponse.json({ items: [], error: "Failed to fetch YouTube data." }, { status: 500 })
  }
}
