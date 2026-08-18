import { type NextRequest, NextResponse } from "next/server"
import { getAlbumDetails } from "@/lib/music/innertube"
import { cacheGet, cacheSet } from "@/lib/music/server-cache"
import type { AlbumDetails } from "@/lib/music/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALBUM_CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim() || req.nextUrl.searchParams.get("browseId")?.trim()
  if (!id) {
    return NextResponse.json({ error: "Missing album ID." }, { status: 400 })
  }

  const cacheKey = `album:${id}`
  const cached = cacheGet<AlbumDetails>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const album = await getAlbumDetails(id)
    if (!album) {
      return NextResponse.json({ error: "Album not found or unavailable." }, { status: 404 })
    }

    cacheSet(cacheKey, album, ALBUM_CACHE_TTL)
    return NextResponse.json(album)
  } catch (err: any) {
    console.error("[Album Route] Error fetching album:", err?.message ?? err)
    return NextResponse.json({ error: "Failed to load album." }, { status: 500 })
  }
}
