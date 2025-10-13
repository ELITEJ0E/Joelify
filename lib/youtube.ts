const YOUTUBE_API_KEYS = process.env.YOUTUBE_API_KEYS?.split(",") || []
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

function getRandomYouTubeKey() {
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

export async function searchYouTube(query: string) {
  let YOUTUBE_API_KEY = getRandomYouTubeKey()
  if (!YOUTUBE_API_KEY) {
    console.error("[YouTube] API key is not configured.")
    return { items: [], error: "Server configuration missing API key." }
  }

  try {
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&videoCategoryId=10&maxResults=20&key=${YOUTUBE_API_KEY}`

    let searchResponse = await fetch(searchUrl)

    if (!searchResponse.ok) {
      const err = await searchResponse.json().catch(() => ({}))
      if (err?.error?.errors?.[0]?.reason === "quotaExceeded") {
        console.warn("[YouTube] Key quota exceeded, rotating key...")
        YOUTUBE_API_KEY = getRandomYouTubeKey()
        searchResponse = await fetch(searchUrl.replace(/key=[^&]+/, `key=${YOUTUBE_API_KEY}`))
      }
      if (!searchResponse.ok) throw new Error("Search failed")
    }

    const searchData = await searchResponse.json()
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")
    if (!videoIds) return { items: [] }

    const detailsResponse = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    )
    const detailsData = await detailsResponse.json()

    const videos = searchData.items.map((item: any, index: number) => {
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
    console.error("[YouTube] Search error:", error)
    return { items: [], error: "Failed to search. Please try again." }
  }
}
