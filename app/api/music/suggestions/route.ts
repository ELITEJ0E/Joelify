import { type NextRequest, NextResponse } from "next/server"
import { getSuggestions } from "@/lib/music/innertube"
import { cacheGet, cacheSet } from "@/lib/music/server-cache"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim()
  if (!query) return NextResponse.json({ suggestions: [] })

  const cacheKey = `suggest:${query.toLowerCase()}`
  const cached = cacheGet<string[]>(cacheKey)
  if (cached) return NextResponse.json({ suggestions: cached })

  try {
    const suggestions = await getSuggestions(query)
    cacheSet(cacheKey, suggestions, CACHE_TTL)
    return NextResponse.json({ suggestions })
  } catch (err: any) {
    // Suggestions are best-effort; never surface an error to the search UI
    console.error("[Music Suggestions] Failed:", err?.message ?? err)
    return NextResponse.json({ suggestions: [] })
  }
}
