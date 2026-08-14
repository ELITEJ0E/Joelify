import { type NextRequest, NextResponse } from "next/server"
import { searchMusic } from "@/lib/music/innertube"
import { searchYouTubeDataApi, hasDataApiKeys } from "@/lib/music/youtube-data-api"
import { mergeAndRank, rankResults, resultsAreWeak } from "@/lib/music/rank"
import { cacheGet, cacheSet } from "@/lib/music/server-cache"
import type { MusicSearchResponse, SearchResult } from "@/lib/music/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_RESULTS = 50

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json({ results: [], continuation: null, query: "", error: "Missing search query." }, { status: 400 })
  }

  const cacheKey = `search:${query.toLowerCase()}`
  const cached = cacheGet<MusicSearchResponse>(cacheKey)
  if (cached) return NextResponse.json(cached)

  let primary: SearchResult[] = []
  let continuation: string | null = null
  let primaryFailed = false

  // PRIMARY: YouTube Music (InnerTube)
  try {
    const res = await searchMusic(query)
    primary = res.results
    continuation = res.continuation
  } catch (err: any) {
    primaryFailed = true
    console.error("[Music Search] InnerTube provider failed:", err?.message ?? err)
  }

  let results: SearchResult[]

  // FALLBACK: official YouTube Data API when primary fails or is weak
  if ((primaryFailed || resultsAreWeak(primary, query)) && hasDataApiKeys()) {
    try {
      const fallback = await searchYouTubeDataApi(query)
      results = mergeAndRank(primary, fallback, query)
    } catch (err: any) {
      console.error("[Music Search] Data API fallback failed:", err?.message ?? err)
      results = rankResults(primary, query)
    }
  } else {
    results = rankResults(primary, query)
  }

  if (results.length === 0 && primaryFailed) {
    return NextResponse.json(
      { results: [], continuation: null, query, error: "Search is temporarily unavailable. Please try again." },
      { status: 502 },
    )
  }

  const payload: MusicSearchResponse = {
    results: results.slice(0, MAX_RESULTS),
    continuation,
    query,
  }
  cacheSet(cacheKey, payload, CACHE_TTL)
  return NextResponse.json(payload)
}
