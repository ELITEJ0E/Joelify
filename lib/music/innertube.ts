// Server-only YouTube Music (InnerTube) adapter built on youtubei.js.
// Preserves YouTube Music semantic structures, shelves, top result cards, and album details.

import type { SearchResult, SearchResultType, SearchShelf, MusicSearchResponse, AlbumDetails, AlbumTrack, SearchArtistRef, SearchAlbumRef } from "./types"

// youtubei.js is ESM/Node-only; keep the import dynamic so it never gets
// pulled into a client bundle and so a parse failure can't crash module init.
let innertubePromise: Promise<any> | null = null

async function getInnertube() {
  if (!innertubePromise) {
    innertubePromise = (async () => {
      const { Innertube, UniversalCache, Parser, Log, Helpers } = await import("youtubei.js")

      // Suppress harmless internal YouTube badge parsing warnings
      if (Log?.setLevel && Log?.Level) {
        Log.setLevel(Log.Level.ERROR)
      }

      // Register TextBadge runtime parser to handle recent YouTube Music badge updates
      if (Parser?.addRuntimeParser && Helpers?.YTNode) {
        class TextBadge extends Helpers.YTNode {
          static type = "TextBadge"
          label?: string
          style?: string
          text?: any
          constructor(data: any) {
            super()
            if (data?.label) this.label = data.label
            if (data?.style) this.style = data.style
            if (data?.text) this.text = data.text
            Object.assign(this, data)
          }
        }
        Parser.addRuntimeParser("TextBadge", TextBadge)
      }

      // Prevent uncaught class introspection errors from breaking search
      if (Parser?.setParserErrorHandler) {
        Parser.setParserErrorHandler(({ classname, error_type }: any) => {
          if (error_type === "class_not_found" || error_type === "class_changed") {
            return
          }
        })
      }

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
    const sorted = [...thumbs].sort((a, b) => (b?.width ?? 0) - (a?.width ?? 0))
    return sorted[0]?.url ?? ""
  }
  if (typeof item?.thumbnail === "string") return item.thumbnail
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

function extractArtistEntities(item: any): { names: string[]; entities: SearchArtistRef[] } {
  const list = item?.artists ?? item?.authors ?? []
  if (!Array.isArray(list)) return { names: [], entities: [] }
  const entities: SearchArtistRef[] = []
  const names: string[] = []
  for (const a of list) {
    const name = textOf(a?.name ?? a?.text ?? a)
    if (!name) continue
    const id = a?.id ?? a?.endpoint?.payload?.browseId
    names.push(name)
    entities.push({ name, id: typeof id === "string" ? id : undefined })
  }
  return { names, entities }
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

/** Normalize a youtubei.js MusicResponsiveListItem into a SearchResult. */
export function normalizeMusicItem(item: any): SearchResult | null {
  try {
    const itemType: string | undefined = item?.item_type
    const title = textOf(item?.title) || textOf(item?.name)
    if (!title) return null

    const subtitle = parseSubtitle(item)
    const { names: artistNames, entities: artistEntities } = extractArtistEntities(item)
    const artists = artistNames.length > 0 ? artistNames : subtitle.artists
    const artist = artists.join(", ") || textOf(item?.author?.name) || ""
    const duration = textOf(item?.duration?.text) || subtitle.duration || ""
    const durationSeconds = typeof item?.duration?.seconds === "number" ? item.duration.seconds : undefined
    const thumbnail = bestThumbnail(item)
    const year = textOf(item?.year) || subtitle.year || undefined
    
    // Album entity
    const albumName = textOf(item?.album?.name ?? item?.album)
    const albumBrowseId = item?.album?.id ?? item?.album?.endpoint?.payload?.browseId
    const albumEntity: SearchAlbumRef | undefined = albumName
      ? { name: albumName, browseId: typeof albumBrowseId === "string" ? albumBrowseId : undefined }
      : undefined

    const views = textOf(item?.views) || undefined

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
          artistEntities: artistEntities.length > 0 ? artistEntities : undefined,
          album: albumName || undefined,
          albumEntity,
          duration,
          durationSeconds,
          thumbnail,
          channel: artist,
          year,
          videoId,
          views,
          source: "ytmusic",
        }
      }
      case "album": {
        const browseId = item?.id ?? item?.album?.id ?? item?.endpoint?.payload?.browseId
        if (!browseId || typeof browseId !== "string") return null
        return {
          id: browseId,
          type: "album",
          title,
          artist,
          artists,
          artistEntities: artistEntities.length > 0 ? artistEntities : undefined,
          album: title,
          albumEntity: { name: title, browseId },
          duration: "",
          thumbnail,
          year,
          playlistId: browseId,
          browseId,
          source: "ytmusic",
        }
      }
      case "artist":
      case "library_artist": {
        const browseId = item?.id ?? item?.endpoint?.payload?.browseId
        if (!browseId || typeof browseId !== "string") return null
        return {
          id: browseId,
          type: "artist",
          title,
          artist: title,
          artists: [title],
          duration: "",
          thumbnail,
          artistId: browseId,
          browseId,
          source: "ytmusic",
        }
      }
      case "playlist": {
        const browseId = item?.id ?? item?.endpoint?.payload?.browseId
        if (!browseId || typeof browseId !== "string") return null
        return {
          id: browseId,
          type: "playlist",
          title,
          artist,
          artists,
          duration: "",
          thumbnail,
          playlistId: browseId,
          browseId,
          source: "ytmusic",
        }
      }
      default: {
        // Fallback detection based on payload endpoints
        const videoId = item?.id ?? item?.endpoint?.payload?.videoId
        if (videoId && typeof videoId === "string") {
          return {
            id: videoId,
            type: "song",
            title,
            artist,
            artists,
            album: albumName || undefined,
            duration,
            thumbnail,
            videoId,
            source: "ytmusic",
          }
        }
        return null
      }
    }
  } catch {
    return null
  }
}

/** Normalize a MusicCardShelf ("Top result" card) into a SearchResult. */
function normalizeCardShelf(card: any): { topResult: SearchResult | null; attachedItems: SearchResult[] } {
  const attachedItems: SearchResult[] = []
  try {
    const title = textOf(card?.title)
    if (!title) return { topResult: null, attachedItems }

    const onTap = card?.on_tap?.payload ?? {}
    const videoId = onTap?.videoId
    const browseId = onTap?.browseId
    const pageType = onTap?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType
    const subtitle = textOf(card?.subtitle)
    const thumbnail = bestThumbnail(card)
    const parsedSub = parseSubtitle(card)

    // Attached items in the card shelf (e.g. top tracks)
    for (const item of card?.contents ?? []) {
      const r = normalizeMusicItem(item)
      if (r) attachedItems.push(r)
    }

    if (videoId) {
      const isVideo = subtitle.toLowerCase().includes("video") || subtitle.toLowerCase().includes("mv")
      const topResult: SearchResult = {
        id: videoId,
        type: isVideo ? "video" : "song",
        title,
        artist: parsedSub.artists.join(", ") || subtitle,
        artists: parsedSub.artists.length > 0 ? parsedSub.artists : [subtitle],
        duration: parsedSub.duration,
        year: parsedSub.year,
        thumbnail,
        videoId,
        source: "ytmusic",
      }
      return { topResult, attachedItems }
    }

    if (browseId) {
      const isArtist = pageType === "MUSIC_PAGE_TYPE_ARTIST" || String(browseId).startsWith("UC") || subtitle.toLowerCase().includes("artist")
      const isAlbum = pageType === "MUSIC_PAGE_TYPE_ALBUM" || subtitle.toLowerCase().includes("album") || subtitle.toLowerCase().includes("ep") || subtitle.toLowerCase().includes("single")
      const type: SearchResultType = isArtist ? "artist" : isAlbum ? "album" : "playlist"

      const topResult: SearchResult = {
        id: browseId,
        type,
        title,
        artist: isArtist ? title : parsedSub.artists.join(", ") || subtitle,
        artists: isArtist ? [title] : parsedSub.artists,
        album: isAlbum ? title : undefined,
        albumEntity: isAlbum ? { name: title, browseId } : undefined,
        duration: "",
        year: parsedSub.year,
        thumbnail,
        artistId: isArtist ? browseId : undefined,
        playlistId: isArtist ? undefined : browseId,
        browseId,
        source: "ytmusic",
      }
      return { topResult, attachedItems }
    }

    return { topResult: null, attachedItems }
  } catch {
    return { topResult: null, attachedItems }
  }
}

export interface SearchMusicResponse {
  query: string
  topResult: SearchResult | null
  shelves: {
    songs?: SearchShelf
    videos?: SearchShelf
    albums?: SearchShelf
    artists?: SearchShelf
    playlists?: SearchShelf
  }
  shelfOrder: SearchResultType[]
  results: SearchResult[]
  continuation: string | null
}

/**
 * Primary YouTube Music semantic search.
 * Preserves shelves, categories, and top results returned by YouTube Music InnerTube.
 */
export async function searchMusic(query: string): Promise<SearchMusicResponse> {
  const yt = await getInnertube()

  // Run general search + filtered song search in parallel to ensure deep song coverage
  const [generalRes, songsRes] = await Promise.allSettled([
    yt.music.search(query),
    yt.music.search(query, { type: "song" }),
  ])

  if (generalRes.status === "rejected" && songsRes.status === "rejected") {
    throw generalRes.reason instanceof Error ? generalRes.reason : new Error("InnerTube search failed")
  }

  let topResult: SearchResult | null = null
  const songItems: SearchResult[] = []
  const videoItems: SearchResult[] = []
  const albumItems: SearchResult[] = []
  const artistItems: SearchResult[] = []
  const playlistItems: SearchResult[] = []
  const shelfOrderSet = new Set<SearchResultType>()
  let songContinuation: string | null = null

  // 1. Process General Search (Preserving YouTube Music Top Result and Shelf Structure)
  if (generalRes.status === "fulfilled" && generalRes.value?.contents) {
    for (const shelf of generalRes.value.contents) {
      const shelfType = shelf?.type

      if (shelfType === "MusicCardShelf") {
        const { topResult: tr, attachedItems } = normalizeCardShelf(shelf)
        if (tr && !topResult) {
          topResult = tr
        }
        for (const item of attachedItems) {
          if (item.type === "song") songItems.push(item)
          else if (item.type === "video") videoItems.push(item)
        }
      } else if (shelfType === "MusicShelf" || shelfType === "ItemSection") {
        for (const raw of shelf?.contents ?? []) {
          const item = normalizeMusicItem(raw)
          if (!item) continue

          // Categorize into semantic shelves and record appearance order
          shelfOrderSet.add(item.type)
          switch (item.type) {
            case "song":
              songItems.push(item)
              break
            case "video":
              videoItems.push(item)
              break
            case "album":
              albumItems.push(item)
              break
            case "artist":
              artistItems.push(item)
              break
            case "playlist":
              playlistItems.push(item)
              break
          }
        }
      }
    }
  }

  // 2. Process Filtered Song Search (To enrich Songs shelf with 20 tracks + pagination)
  if (songsRes.status === "fulfilled" && songsRes.value?.contents) {
    for (const shelf of songsRes.value.contents) {
      for (const raw of shelf?.contents ?? []) {
        const item = normalizeMusicItem(raw)
        if (item && item.type === "song") {
          songItems.push(item)
        }
      }
      if (typeof (shelf as any)?.continuation === "string") {
        songContinuation = (shelf as any).continuation
      }
    }
  }

  // Deduplicate items within each shelf
  const dedupeShelf = (items: SearchResult[]) => {
    const seen = new Set<string>()
    const out: SearchResult[] = []
    for (const item of items) {
      const key = item.videoId || item.browseId || item.id
      if (seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
    return out
  }

  const cleanSongs = dedupeShelf(songItems)
  const cleanVideos = dedupeShelf(videoItems)
  const cleanAlbums = dedupeShelf(albumItems)
  const cleanArtists = dedupeShelf(artistItems)
  const cleanPlaylists = dedupeShelf(playlistItems)

  // Build structured shelves
  const shelves: SearchMusicResponse["shelves"] = {}
  if (cleanSongs.length > 0) {
    shelves.songs = {
      title: "Songs",
      type: "song",
      items: cleanSongs,
      continuation: songContinuation,
    }
  }
  if (cleanVideos.length > 0) {
    shelves.videos = {
      title: "Videos",
      type: "video",
      items: cleanVideos,
    }
  }
  if (cleanAlbums.length > 0) {
    shelves.albums = {
      title: "Albums",
      type: "album",
      items: cleanAlbums,
    }
  }
  if (cleanArtists.length > 0) {
    shelves.artists = {
      title: "Artists",
      type: "artist",
      items: cleanArtists,
    }
  }
  if (cleanPlaylists.length > 0) {
    shelves.playlists = {
      title: "Community Playlists",
      type: "playlist",
      items: cleanPlaylists,
    }
  }

  // Default natural order if none detected: songs -> videos -> albums -> artists -> playlists
  const defaultOrder: SearchResultType[] = ["song", "video", "album", "artist", "playlist"]
  const detectedOrder = Array.from(shelfOrderSet)
  const combinedOrder = Array.from(new Set([...detectedOrder, ...defaultOrder]))
  const finalShelfOrder = combinedOrder.filter((type) => {
    if (type === "song") return cleanSongs.length > 0
    if (type === "video") return cleanVideos.length > 0
    if (type === "album") return cleanAlbums.length > 0
    if (type === "artist") return cleanArtists.length > 0
    if (type === "playlist") return cleanPlaylists.length > 0
    return false
  })

  // Build unified flat results list for backward compatibility
  const allResults: SearchResult[] = []
  if (topResult) allResults.push(topResult)
  for (const t of finalShelfOrder) {
    if (t === "song") allResults.push(...cleanSongs)
    else if (t === "video") allResults.push(...cleanVideos)
    else if (t === "album") allResults.push(...cleanAlbums)
    else if (t === "artist") allResults.push(...cleanArtists)
    else if (t === "playlist") allResults.push(...cleanPlaylists)
  }
  const deduplicatedResults = dedupeShelf(allResults)

  return {
    query,
    topResult,
    shelves,
    shelfOrder: finalShelfOrder,
    results: deduplicatedResults,
    continuation: songContinuation,
  }
}

/**
 * Retrieves full album details and original track sequence from YouTube Music.
 * NEVER search-ranks album tracks — preserves 1..N order.
 */
export async function getAlbumDetails(browseId: string): Promise<AlbumDetails | null> {
  try {
    const yt = await getInnertube()
    const album = await yt.music.getAlbum(browseId)
    if (!album) return null

    const title = textOf(album.header?.title) || "Unknown Album"
    const artistName =
      textOf(album.header?.strapline_text_one) ||
      textOf(album.header?.author?.name) ||
      textOf(album.header?.artist) ||
      "Unknown Artist"

    const artistId = album.header?.strapline_text_one?.endpoint?.payload?.browseId || undefined
    const year = textOf(album.header?.subtitle) || textOf(album.header?.year) || undefined
    const durationText = textOf(album.header?.second_subtitle) || textOf(album.header?.duration) || undefined
    const description = textOf(album.header?.description) || undefined
    const thumbnail = bestThumbnail(album.header) || bestThumbnail(album)

    const tracks: AlbumTrack[] = []
    const contents = album.contents ?? []

    for (let i = 0; i < contents.length; i++) {
      const item = contents[i]
      const trackId = item?.id
      if (!trackId || typeof trackId !== "string") continue

      const trackTitle = textOf(item?.title) || `Track ${i + 1}`
      const { names: artistNames } = extractArtistEntities(item)
      const trackArtist = artistNames.join(", ") || artistName
      const duration = textOf(item?.duration?.text) || textOf(item?.duration) || ""
      const durationSeconds = typeof item?.duration?.seconds === "number" ? item.duration.seconds : undefined
      const trackThumb = bestThumbnail(item) || thumbnail

      tracks.push({
        id: trackId,
        title: trackTitle,
        artist: trackArtist,
        artists: artistNames.length > 0 ? artistNames : [trackArtist],
        duration,
        durationSeconds,
        trackNumber: i + 1,
        thumbnail: trackThumb,
      })
    }

    return {
      id: browseId,
      title,
      artist: artistName,
      artists: [artistName],
      artistId,
      year,
      thumbnail,
      trackCount: tracks.length,
      durationText,
      description,
      tracks,
    }
  } catch (err: any) {
    console.error("[InnerTube getAlbumDetails] failed:", err?.message ?? err)
    return null
  }
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

