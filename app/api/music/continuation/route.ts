import { type NextRequest, NextResponse } from "next/server"
import { continueSearch } from "@/lib/music/innertube"
import { dedupeResults } from "@/lib/music/rank"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim()
  if (!token) {
    return NextResponse.json({ results: [], continuation: null, error: "Missing continuation token." }, { status: 400 })
  }

  try {
    const { results, continuation } = await continueSearch(token)
    return NextResponse.json({ results: dedupeResults(results), continuation })
  } catch (err: any) {
    console.error("[Music Continuation] Failed:", err?.message ?? err)
    return NextResponse.json({ results: [], continuation: null, error: "Could not load more results." }, { status: 502 })
  }
}
