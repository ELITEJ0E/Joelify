// Spotify Web API wrapper with quota tracking

import { getValidAccessToken } from "./spotifyAuth"

let apiCallCount = 0
let lastResetTime = Date.now()
const RATE_LIMIT_WINDOW = 30 * 1000 // 30 seconds
const MAX_CALLS_PER_WINDOW = 100

export interface SpotifyApiQuota {
  requestsUsed: number
  requestsRemaining: number
  resetTime: number
  lastCallTime: number
}

// Get current quota status
export function getQuotaStatus(): SpotifyApiQuota {
  const now = Date.now()

  // Reset counter if window has passed
  if (now - lastResetTime > RATE_LIMIT_WINDOW) {
    apiCallCount = 0
    lastResetTime = now
  }

  return {
    requestsUsed: apiCallCount,
    requestsRemaining: Math.max(0, MAX_CALLS_PER_WINDOW - apiCallCount),
    resetTime: lastResetTime + RATE_LIMIT_WINDOW,
    lastCallTime: now,
  }
}

// Wrapper for Spotify API calls with quota tracking
export async function fetchSpotify(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getValidAccessToken()

  // Increment call counter
  apiCallCount++
  console.log(`[SpotifyQuota] API call #${apiCallCount} to ${endpoint}`)

  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  // Check for rate limit headers
  const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining")
  const rateLimitReset = response.headers.get("X-RateLimit-Reset")

  if (rateLimitRemaining) {
    console.log(`[SpotifyQuota] Rate limit remaining: ${rateLimitRemaining}`)
  }

  if (rateLimitReset) {
    console.log(
      `[SpotifyQuota] Rate limit resets at: ${new Date(Number.parseInt(rateLimitReset) * 1000).toISOString()}`,
    )
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After")
    console.error(`[SpotifyQuota] Rate limited! Retry after ${retryAfter} seconds`)
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Search for tracks
export async function searchTracks(query: string, limit = 20): Promise<any> {
  console.log(`[Spotify] Searching for: ${query}`)
  return fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`)
}

// Get user's playlists
export async function getUserPlaylists(limit = 50): Promise<any> {
  console.log("[Spotify] Fetching user playlists")
  return fetchSpotify(`/me/playlists?limit=${limit}`)
}

// Get playlist tracks
export async function getPlaylistTracks(playlistId: string): Promise<any> {
  console.log(`[Spotify] Fetching playlist tracks: ${playlistId}`)
  return fetchSpotify(`/playlists/${playlistId}/tracks`)
}

// Get user's saved tracks
export async function getSavedTracks(limit = 50, offset = 0): Promise<any> {
  console.log("[Spotify] Fetching saved tracks")
  return fetchSpotify(`/me/tracks?limit=${limit}&offset=${offset}`)
}

// Get currently playing track
export async function getCurrentlyPlaying(): Promise<any> {
  console.log("[Spotify] Fetching currently playing")
  return fetchSpotify("/me/player/currently-playing")
}

// Get playback state
export async function getPlaybackState(): Promise<any> {
  console.log("[Spotify] Fetching playback state")
  return fetchSpotify("/me/player")
}
