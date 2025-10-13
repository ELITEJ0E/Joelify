const YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

function getRandomKey() {
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

export interface YouTubeVideo {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration: string
  channelId: string
}

export interface YouTubeSearchResult {
  items: YouTubeVideo[]
  error?: string
}

export async function searchYouTube(query: string): Promise<YouTubeSearchResult> {
  const apiKey = getRandomKey()
  try {
    const searchRes = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${apiKey}`
    )

    if (!searchRes.ok) {
      if (searchRes.status === 403) return { items: [], error: "API quota exceeded. Try again later." }
      throw new Error("Search failed")
    }

    const searchData = await searchRes.json()
    const videoIds = searchData.items.map((i: any) => i.id.videoId).filter(Boolean).join(",")

    if (!videoIds) return { items: [] }

    const detailsRes = await fetch(`${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`)
    const detailsData = await detailsRes.json()

    const videos: YouTubeVideo[] = searchData.items.map((item: any, index: number) => {
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

    return { items: videos }
  } catch (err) {
    console.error("[YouTube] search error:", err)
    return { items: [], error: "Failed to fetch from YouTube." }
  }
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return "0:00"

  const hours = (match[1] || "").replace("H", "")
  const minutes = (match[2] || "").replace("M", "")
  const seconds = (match[3] || "").replace("S", "")

  return hours
    ? `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
    : `${minutes || "0"}:${seconds.padStart(2, "0")}`
}
