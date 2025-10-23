// Spotify OAuth 2.0 with PKCE implementation

const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
const REDIRECT_URI = typeof window !== "undefined" 
  ? window.location.origin 
  : process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "https://joelify.vercel.app"
  
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ")

interface SpotifyTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

interface SpotifyProfile {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
}

// Generate random string for PKCE
function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], "")
}

// Generate code challenge for PKCE
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

// Start Spotify OAuth flow
export async function loginWithSpotify(): Promise<void> {
  const codeVerifier = generateRandomString(64)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Store code verifier for later use
  localStorage.setItem("spotify_code_verifier", codeVerifier)

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const codeVerifier = localStorage.getItem("spotify_code_verifier")
  if (!codeVerifier) {
    throw new Error("Code verifier not found")
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens")
  }

  const data = await response.json()
  const tokens: SpotifyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }

  // Store tokens
  saveTokens(tokens)
  localStorage.removeItem("spotify_code_verifier")

  return tokens
}

// Refresh access token
export async function refreshAccessToken(): Promise<SpotifyTokens> {
  const tokens = getTokens()
  if (!tokens?.refresh_token) {
    throw new Error("No refresh token available")
  }

  console.log("[Spotify] Refreshing access token")

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh token")
  }

  const data = await response.json()
  const newTokens: SpotifyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }

  saveTokens(newTokens)
  return newTokens
}

// Get current tokens
export function getTokens(): SpotifyTokens | null {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("spotify_tokens")
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

// Save tokens to localStorage
function saveTokens(tokens: SpotifyTokens): void {
  localStorage.setItem("spotify_tokens", JSON.stringify(tokens))
}

// Check if token is expired or about to expire (within 5 minutes)
export function isTokenExpired(tokens: SpotifyTokens | null): boolean {
  if (!tokens) return true
  return Date.now() >= tokens.expires_at - 5 * 60 * 1000
}

// Get valid access token (refresh if needed)
export async function getValidAccessToken(): Promise<string> {
  let tokens = getTokens()

  if (!tokens) {
    throw new Error("Not authenticated")
  }

  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken()
  }

  return tokens.access_token
}

// Fetch Spotify profile
export async function getSpotifyProfile(): Promise<SpotifyProfile> {
  const accessToken = await getValidAccessToken()

  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch profile")
  }

  return response.json()
}

// Logout
export function logout(): void {
  localStorage.removeItem("spotify_tokens")
  localStorage.removeItem("spotify_code_verifier")
  console.log("[Spotify] Logged out")
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const tokens = getTokens()
  return tokens !== null && !isTokenExpired(tokens)
}
