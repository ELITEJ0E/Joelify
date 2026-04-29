import { sleep, getRandomUserAgent, getRandomDelay, getJitter } from "./utils";
import { SunoCreditResponse } from "./types";

const SUNO_BASE_URL = "https://studio-api.suno.ai";

interface RequestOptions extends RequestInit {
  retries?: number;
}

/**
 * Reusable wrapper for making requests to the Suno API.
 * Includes exponential backoff with jitter, handling for 429/430 rate limits,
 * and random delays between successful requests to mimic human behavior.
 */
export async function sunoRequest<T>(
  endpoint: string,
  token: string,
  options: RequestOptions = {}
): Promise<T> {
  const { retries = 0, ...fetchOptions } = options;
  const url = endpoint.startsWith("http") ? endpoint : `${SUNO_BASE_URL}${endpoint}`;

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", getRandomUserAgent());
  }
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // Realistic browser-like headers
  headers.set("Accept", "application/json, text/plain, */*");
  headers.set("Accept-Language", "en-US,en;q=0.9");
  headers.set("Referer", "https://suno.com/");
  headers.set("Origin", "https://suno.com");

  const MAX_RETRIES = 7;
  const BASE_BACKOFF = 3000; // Base delay of 3 seconds

  try {
    const res = await fetch(url, { ...fetchOptions, headers });

    // Handle rate limits (429 Too Many Requests, 430 Request Header Fields Too Large/Internal Rate Limit)
    if (res.status === 429 || res.status === 430) {
      if (retries >= MAX_RETRIES) {
        throw new Error(`Suno rate limit exceeded after ${MAX_RETRIES} retries (Status: ${res.status})`);
      }

      // Respect Retry-After header if Suno provides it
      const retryAfter = res.headers.get("Retry-After");
      let waitTime = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : getJitter(BASE_BACKOFF * Math.pow(2, retries), 0.3);

      console.warn(`[SunoClient] Rate limited (${res.status}). Waiting ${waitTime}ms before retry ${retries + 1}...`);
      await sleep(waitTime);

      return sunoRequest<T>(endpoint, token, { ...options, retries: retries + 1 });
    }

    if (res.status === 402) {
      throw new Error("Insufficient Suno credits (402). Cannot perform operation.");
    }

    if (!res.ok) {
      let msg = `Suno API Error: ${res.status} ${res.statusText}`;
      try {
        const errData = await res.json();
        if (errData.detail) msg += ` - ${JSON.stringify(errData.detail)}`;
      } catch (e) {
        // parsing failed, use fallback
      }
      throw new Error(msg);
    }

    // Heuristic evasion: Wait 1.5 - 4 seconds after a successful mutated request before returning.
    // This slows down the script naturally so sequential operations have human-like gaps.
    if (fetchOptions.method && fetchOptions.method !== "GET") {
      const waitTime = getRandomDelay(1500, 4000);
      await sleep(waitTime);
    }

    // Attempt to parse json
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return (await res.json()) as T;
    }
    
    return (await res.text()) as any as T;
  } catch (error) {
    // Handle transient network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      if (retries < MAX_RETRIES) {
        const waitTime = getJitter(BASE_BACKOFF * Math.pow(2, retries), 0.3);
        console.warn(`[SunoClient] Network/fetch error. Waiting ${waitTime}ms before retry ${retries + 1}...`);
        await sleep(waitTime);
        return sunoRequest<T>(endpoint, token, { ...options, retries: retries + 1 });
      }
    }
    throw error;
  }
}

/**
 * Check credits before performing batch operations.
 */
export async function checkSunoCredits(token: string): Promise<SunoCreditResponse> {
  // Common unofficial endpoint is /api/billing/info. User mentioned /api/get_limit
  // We'll wrap both or just use billing/info as typical.
  try {
    return await sunoRequest<SunoCreditResponse>("/api/billing/info", token, {
      method: "GET",
    });
  } catch (error: any) {
    // Fallback if the first endpoint doesn't exist
    if (error.message && error.message.includes("404")) {
      return await sunoRequest<SunoCreditResponse>("/api/get_limit", token, {
        method: "GET",
      });
    }
    throw error;
  }
}

/**
 * Add tracks to a playlist.
 * @param playlistId The ID of the Suno playlist.
 * @param trackIds An array of clip IDs to add.
 * @param token Suno auth token.
 */
export async function addTracksToSunoPlaylist(
  playlistId: string,
  trackIds: string[],
  token: string
) {
  // Suno adds clips via /api/playlists/{playlist_id}/add_clips or /add-clips
  return sunoRequest<any>(`/api/playlists/${playlistId}/add_clips`, token, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clip_ids: trackIds, 
    }),
  });
}
