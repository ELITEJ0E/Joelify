// YouTube Data API v3 integration
const YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []
const YOUTUBE_API_KEY = YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

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
  try {
    const searchResponse = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`,
    )

    if (!searchResponse.ok) {
      if (searchResponse.status === 403) {
        return { items: [], error: "API quota exceeded. Please try again later." }
      }
      throw new Error("Search failed")
    }

    const searchData = await searchResponse.json()

    // Get video details for duration
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`,
    )

    const detailsData = await detailsResponse.json()

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
  } catch (error) {
    console.error("[v0] YouTube search error:", error)
    return { items: [], error: "Failed to search. Please try again." }
  }
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return "0:00"

  const hours = (match[1] || "").replace("H", "")
  const minutes = (match[2] || "").replace("M", "")
  const seconds = (match[3] || "").replace("S", "")

  if (hours) {
    return `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
  }
  return `${minutes || "0"}:${seconds.padStart(2, "0")}`
}
