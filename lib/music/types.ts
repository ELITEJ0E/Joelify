// Unified Joelify search result model.
// All providers (YouTube Music / InnerTube, YouTube Data API) normalize into this shape.

export type SearchResultType = "song" | "video" | "album" | "artist" | "playlist"

export interface SearchResult {
  /** Stable unique id (videoId for songs/videos, browseId for albums/artists/playlists) */
  id: string
  type: SearchResultType
  title: string
  /** Primary artist display string */
  artist: string
  /** All credited artists */
  artists: string[]
  album?: string
  duration: string
  thumbnail: string
  channel?: string
  year?: string
  videoId?: string
  playlistId?: string
  artistId?: string
  /** Internal provenance - never surfaced in the UI */
  source: "ytmusic" | "youtube"
}

export interface MusicSearchResponse {
  results: SearchResult[]
  /** Opaque continuation token for /api/music/continuation, or null when exhausted */
  continuation: string | null
  query: string
}

export interface MusicSuggestionsResponse {
  suggestions: string[]
}
