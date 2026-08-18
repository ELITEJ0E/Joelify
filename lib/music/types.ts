// Unified Joelify search and music model.
// Preserves YouTube Music semantic structures, shelves, and entity relationships.

export type SearchResultType = "song" | "video" | "album" | "artist" | "playlist"

export interface SearchArtistRef {
  name: string
  id?: string
}

export interface SearchAlbumRef {
  name: string
  browseId?: string
}

export interface SearchResult {
  /** Stable unique id (videoId for songs/videos, browseId for albums/artists/playlists) */
  id: string
  type: SearchResultType
  title: string
  /** Primary artist display string */
  artist: string
  /** All credited artists */
  artists: string[]
  artistEntities?: SearchArtistRef[]
  album?: string
  albumEntity?: SearchAlbumRef
  duration: string
  durationSeconds?: number
  thumbnail: string
  channel?: string
  year?: string
  videoId?: string
  playlistId?: string
  artistId?: string
  browseId?: string
  views?: string
  badges?: string[]
  /** Internal provenance - never surfaced in the UI */
  source: "ytmusic" | "youtube"
}

export interface SearchShelf {
  title: string
  type: SearchResultType
  items: SearchResult[]
  continuation?: string | null
}

export interface MusicSearchResponse {
  query: string
  topResult?: SearchResult | null
  shelves: {
    songs?: SearchShelf
    videos?: SearchShelf
    albums?: SearchShelf
    artists?: SearchShelf
    playlists?: SearchShelf
  }
  shelfOrder?: SearchResultType[]
  /** Flat results array preserved for backward compatibility */
  results: SearchResult[]
  /** Opaque continuation token for /api/music/continuation, or null when exhausted */
  continuation: string | null
  error?: string
}

export interface MusicSuggestionsResponse {
  suggestions: string[]
}

export interface AlbumTrack {
  id: string // videoId
  title: string
  artist: string
  artists: string[]
  duration: string
  durationSeconds?: number
  trackNumber: number
  thumbnail?: string
}

export interface AlbumDetails {
  id: string // browseId (e.g. MPREb_...)
  title: string
  artist: string
  artists: string[]
  artistId?: string
  year?: string
  thumbnail: string
  trackCount: number
  durationText?: string
  description?: string
  tracks: AlbumTrack[]
}
