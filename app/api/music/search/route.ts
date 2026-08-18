import { type NextRequest, NextResponse } from "next/server"
import { searchMusic } from "@/lib/music/innertube"
import { searchYouTubeDataApi, hasDataApiKeys } from "@/lib/music/youtube-data-api"
import { mergeAndRank, rankResults, rankShelf, resultsAreWeak } from "@/lib/music/rank"
import { cacheGet, cacheSet } from "@/lib/music/server-cache"
import type { MusicSearchResponse, SearchResult, SearchShelf, SearchResultType } from "@/lib/music/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_RESULTS = 50

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json(
      {
        query: "",
        results: [],
        shelves: {},
        topResult: null,
        continuation: null,
        error: "Missing search query.",
      },
      { status: 400 },
    )
  }

  const cacheKey = `search:v2:${query.toLowerCase()}`
  const cached = cacheGet<MusicSearchResponse>(cacheKey)
  if (cached) return NextResponse.json(cached)

  let topResult: SearchResult | null = null
  let shelves: MusicSearchResponse["shelves"] = {}
  let shelfOrder: SearchResultType[] = []
  let primaryResults: SearchResult[] = []
  let continuation: string | null = null
  let primaryFailed = false

  // PRIMARY: YouTube Music (InnerTube) with rich semantic structure
  try {
    const res = await searchMusic(query)
    topResult = res.topResult
    shelves = res.shelves
    shelfOrder = res.shelfOrder
    primaryResults = res.results
    continuation = res.continuation
  } catch (err: any) {
    primaryFailed = true
    console.error("[Music Search] InnerTube provider failed:", err?.message ?? err)
  }

  // FALLBACK: official YouTube Data API when primary fails or is weak
  if ((primaryFailed || resultsAreWeak(primaryResults, query)) && hasDataApiKeys()) {
    try {
      const fallback = await searchYouTubeDataApi(query)
      if (primaryFailed || primaryResults.length === 0) {
        const rankedFallback = rankResults(fallback, query)
        const songs = rankedFallback.filter((r) => r.type === "song")
        const videos = rankedFallback.filter((r) => r.type === "video")

        shelves = {}
        if (songs.length > 0) {
          shelves.songs = { title: "Songs", type: "song", items: songs }
        }
        if (videos.length > 0) {
          shelves.videos = { title: "Videos", type: "video", items: videos }
        }
        shelfOrder = ["song", "video"]
        primaryResults = rankedFallback
      } else {
        // Supplement the existing song shelf with fallback items
        const existingSongs = shelves.songs?.items ?? []
        const fallbackSongs = fallback.filter((r) => r.type === "song")
        const mergedSongs = rankShelf([...existingSongs, ...fallbackSongs], query)
        if (shelves.songs) {
          shelves.songs.items = mergedSongs
        }
        primaryResults = mergeAndRank(primaryResults, fallback, query)
      }
    } catch (err: any) {
      console.error("[Music Search] Data API fallback failed:", err?.message ?? err)
    }
  }

  if (primaryResults.length === 0 && primaryFailed) {
    return NextResponse.json(
      {
        query,
        results: [],
        shelves: {},
        topResult: null,
        continuation: null,
        error: "Search is temporarily unavailable. Please try again.",
      },
      { status: 502 },
    )
  }

  const payload: MusicSearchResponse = {
    query,
    topResult,
    shelves,
    shelfOrder,
    results: primaryResults.slice(0, MAX_RESULTS),
    continuation,
  }

  cacheSet(cacheKey, payload, CACHE_TTL)
  return NextResponse.json(payload)
}

