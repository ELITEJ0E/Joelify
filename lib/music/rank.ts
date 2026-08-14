// Local ranking, deduplication and merging of search results.
// Ranks exact title/artist matches first, boosts YT Music song results and
// official audio/video, but does NOT filter out remixes, live, OST, acoustic
// or instrumental versions - they simply rank by relevance.

import type { SearchResult } from "./types"

/** Unicode-aware normalization: lowercases, folds width/compat forms (CJK friendly), strips punctuation. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[「」『』【】()()\[\]{}"'"'!!??..,,、。・:;/\\|~\-_—–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(input: string): string[] {
  return normalizeText(input).split(" ").filter(Boolean)
}

function tokenOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  let hits = 0
  for (const t of a) if (setB.has(t)) hits++
  return hits / a.length
}

const TYPE_BOOST: Record<SearchResult["type"], number> = {
  song: 18,
  video: 4,
  album: 8,
  artist: 8,
  playlist: 2,
}

export function scoreResult(result: SearchResult, query: string): number {
  const q = normalizeText(query)
  const qTokens = tokenize(query)
  const title = normalizeText(result.title)
  const artistText = normalizeText([result.artist, ...result.artists].join(" "))
  const albumText = result.album ? normalizeText(result.album) : ""

  let score = 0

  // Artist results only rank on exact/near-exact name matches so that
  // coincidentally-named "artists" can't outrank actual songs.
  if (result.type === "artist") {
    if (title === q) score += 70
    else if (q.includes(title) && title.length > 2) score += qTokens.length <= 3 ? 30 : 15
    score += TYPE_BOOST[result.type]
    if (result.source === "ytmusic") score += 8
    return score
  }

  // Exact matches first (songs get the strongest exact-title bonus,
  // playlists the weakest so title-squatting playlists don't win)
  const exactBonus = result.type === "song" ? 60 : result.type === "album" ? 50 : result.type === "video" ? 45 : 25
  if (title === q) score += exactBonus
  else if (q.includes(title) && title.length > 2) score += 25
  else if (title.includes(q) && q.length > 2) score += 20

  // Artist match (handles "artist + title" queries)
  if (artistText && q === artistText) score += 40
  if (artistText) {
    const artistTokens = tokenize(artistText)
    score += tokenOverlap(artistTokens, qTokens) * 22
  }

  // Album match
  if (albumText && (q.includes(albumText) || albumText.includes(q))) score += 10

  // Combined token coverage: how much of the query is satisfied by title+artist+album
  const haystack = tokenize(`${title} ${artistText} ${albumText}`)
  score += tokenOverlap(qTokens, haystack) * 30

  // Type and provenance boosts
  score += TYPE_BOOST[result.type]
  if (result.source === "ytmusic") score += 8

  // Official content boosts (never used as a filter)
  const rawTitle = result.title.toLowerCase()
  if (/official audio/.test(rawTitle)) score += 6
  else if (/official (music )?video/.test(rawTitle)) score += 5
  if (/official artist channel|- topic$/.test((result.channel ?? "").toLowerCase())) score += 5

  // Mild penalty ONLY when the variant keyword is clearly not part of the query
  const variantWords = ["remix", "live", "acoustic", "instrumental", "cover", "karaoke", "nightcore", "sped up", "slowed"]
  for (const w of variantWords) {
    if (rawTitle.includes(w) && !q.includes(w)) score -= 3
  }

  return score
}

export function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const out: SearchResult[] = []
  for (const r of results) {
    const key = r.videoId ?? r.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

export function rankResults(results: SearchResult[], query: string): SearchResult[] {
  return dedupeResults(results)
    .map((r) => ({ r, s: scoreResult(r, query) }))
    .sort((a, b) => b.s - a.s)
    .map(({ r }) => r)
}

/** Heuristic: are the primary provider's results too weak to stand alone? */
export function resultsAreWeak(results: SearchResult[], query: string): boolean {
  const playable = results.filter((r) => r.type === "song" || r.type === "video")
  if (playable.length < 3) return true
  const topScore = Math.max(...results.map((r) => scoreResult(r, query)))
  return topScore < 30
}

export function mergeAndRank(primary: SearchResult[], fallback: SearchResult[], query: string): SearchResult[] {
  return rankResults([...primary, ...fallback], query)
}
