// Fallback provider: official YouTube Data API v3.
// Used when the primary InnerTube / YouTube Music provider fails or
// returns weak results. Normalizes into the unified SearchResult model.

import type { SearchResult } from "./types"

const YOUTUBE_API_KEYS =
  process.env.YOUTUBE_API_KEYS?.split(",") ||
  (process.env.YOUTUBE_API_KEY ? [process.env.YOUTUBE_API_KEY] : [])
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

function getRandomYouTubeKey(): string | undefined {
  if (YOUTUBE_API_KEYS.length === 0) return undefined
  return YOUTUBE_API_KEYS[Math.floor(Math.random() * YOUTUBE_API_KEYS.length)]
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return "0:00"
  const [, hours, minutes, seconds] = match.map((x) => Number.parseInt(x || "0", 10))
  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function hasDataApiKeys(): boolean {
  return YOUTUBE_API_KEYS.length > 0
}

export async function searchYouTubeDataApi(query: string): Promise<SearchResult[]> {
  let apiKey = getRandomYouTubeKey()
  if (!apiKey) return []

  const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(
    query,
  )}&type=video&videoCategoryId=10&maxResults=20&key=${apiKey}`

  let searchRes = await fetch(searchUrl)
  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}))
    if (err?.error?.errors?.[0]?.reason === "quotaExceeded") {
      apiKey = getRandomYouTubeKey()
      searchRes = await fetch(searchUrl.replace(/key=[^&]+/, `key=${apiKey}`))
    }
    if (!searchRes.ok) throw new Error("YouTube Data API search failed after retry.")
  }

  const searchData = await searchRes.json()
  const items: any[] = searchData?.items ?? []
  const videoIds = items.map((item) => item?.id?.videoId).filter(Boolean)
  if (videoIds.length === 0) return []

  const durations = new Map<string, string>()
  try {
    const detailsRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds.join(",")}&key=${apiKey}`,
    )
    if (detailsRes.ok) {
      const detailsData = await detailsRes.json()
      for (const d of detailsData?.items ?? []) {
        durations.set(d.id, formatDuration(d?.contentDetails?.duration || "PT0S"))
      }
    }
  } catch {
    // Durations are best-effort
  }

  return items
    .filter((item) => item?.id?.videoId)
    .map((item): SearchResult => {
      const videoId = item.id.videoId
      const channel = item.snippet?.channelTitle ?? ""
      return {
        id: videoId,
        type: "video",
        title: item.snippet?.title ?? "",
        artist: channel,
        artists: channel ? [channel] : [],
        duration: durations.get(videoId) ?? "",
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
        channel,
        videoId,
        source: "youtube",
      }
    })
}
