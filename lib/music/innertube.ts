// Server-only YouTube Music (InnerTube) adapter built on youtubei.js.
// Isolates the library's response format from the rest of Joelify -
// everything leaving this module is a normalized SearchResult.

import type { SearchResult } from "./types"

// youtubei.js is ESM/Node-only; keep the import dynamic so it never gets
// pulled into a client bundle and so a parse failure can't crash module init.
let innertubePromise: Promise<any> | null = null

async function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = (async () => {
      const { Innertube, UniversalCache } = await import("youtubei.js")
      return Innertube.create({
        retrieve_player: false,
        cache: new UniversalCache(false),
        generate_session_locally: true,
      })
    })().catch((err) => {
      innertubePromise = null
      throw err
    })
  }
  return innertubePromise
}

function bestThumbnail(item: any): string {
  const thumbs =
    item?.thumbnail?.contents ??
    item?.thumbnails ??
    item?.thumbnail ??
    []
  if (Array.isArray(thumbs) && thumbs.length > 0) {
    // Prefer the largest available thumbnail
    const sorted = [...thumbs].sort((a, b) => (b?.width ?? 0) - (a?.width ?? 0))
    return sorted[0]?.url ?? ""
  }
  return ""
}

function textOf(v: any): string {
  if (!v) return ""
  if (typeof v === "string") return v
  if (typeof v.text === "string") return v.text
  if (typeof v.toString === "function") {
    const s = v.toString()
    return s === "[object Object]" ? "" : s
  }
  return ""
}

function artistsOf(item: any): string[] {
  const list = item?.artists ?? item?.authors ?? []
  if (!Array.isArray(list)) return []
  return list.map((a: any) => textOf(a?.name ?? a)).filter(Boolean)
}

const DURATION_RE = /^\d+:\d{2}(?::\d{2})?$/
const TYPE_LABELS = new Set(["song", "video", "album", "artist", "playlist", "single", "ep", "曲", "動画"])

function looksLikeMeta(s: string): boolean {
  return (
    DURATION_RE.test(s) ||
    /^\d{4}$/.test(s) ||
    /^[\d,.KMB]+\s*(views|plays|likes|subscribers|再生|回視聴|回)/i.test(s) ||
    TYPE_LABELS.has(s.toLowerCase())
  )
}

/** Split a subtitle like "Song • Meiko Nakahara • 4:24" into artist names, duration and year. */
function parseSubtitle(item: any): { artists: string[]; duration: string; year?: string } {
  const raw = textOf(item?.subtitle)
  const parts = raw
    .split(/[•·]/)
    .flatMap((p) => p.split(","))
    .map((s) => s.trim())
    .filter(Boolean)

  const artists: string[] = []
  let duration = ""
  let year: string | undefined

  for (const part of parts) {
    if (DURATION_RE.test(part)) duration = part
    else if (/^\d{4}$/.test(part)) year = part
    else if (!looksLikeMeta(part)) artists.push(part)
  }
  return { artists, duration, year }
}

/** Normalize a youtubei.js MusicResponsiveListItem (or similar) into a SearchResult. */
export function normalizeMusicItem(item: any): SearchResult | null {
  try {
    const itemType: string | undefined = item?.item_type
    const title = textOf(item?.title) || textOf(item?.name)
    if (!title) return null

    const subtitle = parseSubtitle(item)
    const artists = artistsOf(item).length > 0 ? artistsOf(item) : subtitle.artists
    const artist = artists.join(", ") || textOf(item?.author?.name) || ""
    const duration = textOf(item?.duration?.text) || subtitle.duration || ""
    const thumbnail = bestThumbnail(item)
    const year = textOf(item?.year) || subtitle.year || undefined
    const album = textOf(item?.album?.name) || undefined

    switch (itemType) {
      case "song":
      case "non_music_track":
      case "video": {
        const videoId = item?.id
        if (!videoId || typeof videoId !== "string") return null
        return {
          id: videoId,
          type: itemType === "video" ? "video" : "song",
          title,
          artist,
          artists,
          album,
          duration,
          thumbnail,
          channel: artist,
          year,
          videoId,
          source: "ytmusic",
        }
      }
      case "album": {
        const browseId = item?.id ?? item?.album?.id
        if (!browseId) return null
        return {
          id: browseId,
          type: "album",
          title,
          artist,
          artists,
          album: title,
          duration: "",
          thumbnail,
          year,
          playlistId: browseId,
          source: "ytmusic",
        }
      }
      case "artist":
      case "library_artist": {
        const browseId = item?.id
        if (!browseId) return null
        return {
          id: browseId,
          type: "artist",
          title,
          artist: title,
          artists: [title],
          duration: "",
          thumbnail,
          artistId: browseId,
          source: "ytmusic",
        }
      }
      case "playlist": {
        const browseId = item?.id
        if (!browseId) return null
        return {
          id: browseId,
          type: "playlist",
          title,
          artist,
          artists,
          duration: "",
          thumbnail,
          playlistId: browseId,
          source: "ytmusic",
        }
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

/** Normalize a MusicCardShelf ("Top result" card) into a SearchResult. */
function normalizeCardShelf(card: any): SearchResult | null {
  try {
    const title = textOf(card?.title)
    if (!title) return null
    const onTap = card?.on_tap?.payload ?? {}
    const videoId = onTap?.videoId
    const browseId = onTap?.browseId
    const subtitle = textOf(card?.subtitle)
    const thumbnail = bestThumbnail(card)

    if (videoId) {
      const parsed = parseSubtitle(card)
      return {
        id: videoId,
        type: "song",
        title,
        artist: parsed.artists.join(", ") || subtitle,
        artists: parsed.artists,
        duration: parsed.duration,
        year: parsed.year,
        thumbnail,
        videoId,
        source: "ytmusic",
      }
    }
    if (browseId) {
      const isArtist = String(browseId).startsWith("UC")
      return {
        id: browseId,
        type: isArtist ? "artist" : subtitle.toLowerCase().includes("album") ? "album" : "playlist",
        title,
        artist: isArtist ? title : subtitle,
        artists: isArtist ? [title] : [],
        duration: "",
        thumbnail,
        artistId: isArtist ? browseId : undefined,
        playlistId: isArtist ? undefined : browseId,
        source: "ytmusic",
      }
    }
    return null
  } catch {
    return null
  }
}

function collectShelfResults(contents: any[] | undefined): { results: SearchResult[]; continuation: string | null } {
  const results: SearchResult[] = []
  let continuation: string | null = null

  for (const shelf of contents ?? []) {
    const shelfType = shelf?.type
    if (shelfType === "MusicCardShelf") {
      const top = normalizeCardShelf(shelf)
      if (top) results.push(top)
      // Cards can carry attached contents (e.g. top songs under the top result)
      for (const item of shelf?.contents ?? []) {
        const r = normalizeMusicItem(item)
        if (r) results.push(r)
      }
    } else if (shelfType === "MusicShelf") {
      for (const item of shelf?.contents ?? []) {
        const r = normalizeMusicItem(item)
        if (r) results.push(r)
      }
      if (!continuation && typeof shelf?.continuation === "string") {
        continuation = shelf.continuation
      }
    } else if (shelfType === "ItemSection") {
      for (const item of shelf?.contents ?? []) {
        const r = normalizeMusicItem(item)
        if (r) results.push(r)
      }
    }
  }

  return { results, continuation }
}

/**
 * Primary YouTube Music search.
 * Runs a general (all-shelves) search plus a filtered songs search in parallel:
 * the general search yields songs/videos/albums/artists/playlists, the filtered
 * one yields deeper song coverage and a continuation token for pagination.
 */
export async function searchMusic(query: string): Promise<{ results: SearchResult[]; continuation: string | null }> {
  const yt = await getInnertube()

  const [general, songs] = await Promise.allSettled([
    yt.music.search(query),
    yt.music.search(query, { type: "song" }),
  ])

  const results: SearchResult[] = []
  let continuation: string | null = null

  if (general.status === "fulfilled") {
    const { results: r } = collectShelfResults(general.value?.contents as any[])
    results.push(...r)
  }
  if (songs.status === "fulfilled") {
    const { results: r, continuation: c } = collectShelfResults(songs.value?.contents as any[])
    results.push(...r)
    continuation = c
  }

  if (general.status === "rejected" && songs.status === "rejected") {
    throw general.reason instanceof Error ? general.reason : new Error("InnerTube search failed")
  }

  return { results, continuation }
}

/** Fetch the next page of a filtered song search using an opaque continuation token. */
export async function continueSearch(token: string): Promise<{ results: SearchResult[]; continuation: string | null }> {
  const yt = await getInnertube()
  const page: any = await yt.actions.execute("/search", {
    continuation: token,
    client: "YTMUSIC",
    parse: true,
  })

  const shelf: any = page?.continuation_contents
  const results: SearchResult[] = []
  for (const item of shelf?.contents ?? []) {
    const r = normalizeMusicItem(item)
    if (r) results.push(r)
  }
  const next = typeof shelf?.continuation === "string" ? shelf.continuation : null
  return { results, continuation: next }
}

/** YouTube Music search suggestions (typeahead). */
export async function getSuggestions(query: string): Promise<string[]> {
  const yt = await getInnertube()
  const sections = await yt.music.getSearchSuggestions(query)
  const suggestions: string[] = []
  for (const section of sections ?? []) {
    for (const item of (section as any)?.contents ?? []) {
      const text = textOf(item?.suggestion) || textOf(item?.title)
      if (text && !suggestions.includes(text)) suggestions.push(text)
    }
  }
  return suggestions.slice(0, 10)
}
