// YouTube Data API v3 with multi-key rotation and fallback support
const API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

let currentKeyIndex = 0
function getNextKey() {
  if (API_KEYS.length === 0) throw new Error("No YouTube API keys configured")
  const key = API_KEYS[currentKeyIndex]
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length
  return key
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
  if (!query) return { items: [] }

  let YOUTUBE_API_KEY = getNextKey()
  try {
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`

    let searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok && searchResponse.status === 403 && API_KEYS.length > 1) {
      console.log("[YouTube] Rotating API key...")
      YOUTUBE_API_KEY = getNextKey()
      const retryUrl = searchUrl.replace(/key=[^&]+/, `key=${YOUTUBE_API_KEY}`)
      searchResponse = await fetch(retryUrl)
    }

    if (!searchResponse.ok) {
      console.warn("[YouTube] API quota fully used, fallback to Piped API")
      const pipedResponse = await fetch(
        `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}`
      )
      const pipedData = await pipedResponse.json()
      const fallbackVideos: YouTubeVideo[] =
        pipedData.items.slice(0, 10).map((item: any) => ({
          id: item.url.split("v=")[1],
          title: item.title,
          artist: item.uploaderName,
          thumbnail: item.thumbnail,
          duration: "0:00",
          channelId: "",
        })) || []
      return { items: fallbackVideos }
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")
    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
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
  } catch (error: any) {
    console.error("[YouTube] Search error:", error.message)
    return { items: [], error: "Failed to search videos" }
  }
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return "0:00"

  const hours = (match[1] || "").replace("H", "")
  const minutes = (match[2] || "").replace("M", "")
  const seconds = (match[3] || "").replace("S", "")

  if (hours) return `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`
  return `${minutes || "0"}:${seconds.padStart(2, "0")}`
}
