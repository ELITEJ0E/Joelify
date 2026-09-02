import { NextRequest, NextResponse } from "next/server";

// =========================================================================
// SUNO AUDIO STREAM RESOLVER & STREAMING PROXY
// =========================================================================
export interface CachedAudio {
  buffer: Buffer;
  mimeType: string;
  timestamp: number;
}

const audioBufferCache = new Map<string, CachedAudio>();
const pendingFetches = new Map<string, Promise<CachedAudio | null>>();
const MAX_CACHE_ENTRIES = 50;

/**
 * Resolves encrypted Suno audio streams via Mango rights API and AES-CTR decryption,
 * with fallback to legacy CDN endpoints.
 */
export async function resolveSunoAudioStream(clipId: string): Promise<CachedAudio | null> {
  if (!clipId) return null;

  const cached = audioBufferCache.get(clipId);
  if (cached && Date.now() - cached.timestamp < 4 * 3600 * 1000) {
    return cached;
  }

  if (pendingFetches.has(clipId)) {
    return pendingFetches.get(clipId)!;
  }

  const fetchPromise = (async (): Promise<CachedAudio | null> => {
    try {
      // 1. Fetch rights metadata from Suno Mango API
      const rightsEndpoints = [
        "https://studio-api-prod.suno.com/api/mango/rights",
        "https://studio-api.suno.ai/api/mango/rights",
      ];

      let rightsData: { key: string; iv: string; glt: string } | null = null;

      for (const endpoint of rightsEndpoints) {
        try {
          const rightsRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Origin: "https://suno.com",
              Referer: `https://suno.com/song/${clipId}`,
            },
            body: JSON.stringify({
              content_params: { content_id: clipId, content_type: "clip" },
            }),
            cache: "no-store",
          });

          if (rightsRes.ok) {
            const json = await rightsRes.json();
            if (json.key && json.iv && json.glt) {
              rightsData = json;
              break;
            }
          }
        } catch (e) {
          // Try next rights endpoint
        }
      }

      if (rightsData) {
        // 2. Unpack key parameters
        const { key: encKeyB64, iv: encIvB64, glt } = rightsData;
        const userKeyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(glt));
        const userKey = await crypto.subtle.importKey("raw", userKeyHash, { name: "AES-GCM" }, false, ["decrypt"]);

        const wrappedKey = Uint8Array.from(Buffer.from(encKeyB64, "base64"));
        const wrappedIv = Uint8Array.from(Buffer.from(encIvB64, "base64"));
        const additionalData = new TextEncoder().encode(clipId);

        const rawKey = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: wrappedKey.slice(0, 12), additionalData },
          userKey,
          wrappedKey.slice(12)
        );
        const contentKey = await crypto.subtle.importKey("raw", rawKey, { name: "AES-CTR" }, false, ["decrypt"]);

        const rawIv = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: wrappedIv.slice(0, 12), additionalData },
          userKey,
          wrappedIv.slice(12)
        );
        const contentIv = new Uint8Array(rawIv);

        // 3. Download encrypted audio stream
        const mediaUrls = [
          `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${clipId}.m4a`,
          `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${clipId}.mp3`,
        ];

        for (const mediaUrl of mediaUrls) {
          try {
            const mediaRes = await fetch(mediaUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                Referer: "https://suno.com/",
              },
              cache: "no-store",
            });

            if (mediaRes.ok) {
              const rawBuffer = Buffer.from(await mediaRes.arrayBuffer());

              // 4. Transform audio stream (AES-CTR Decryption)
              const decBuf = await crypto.subtle.decrypt(
                { name: "AES-CTR", counter: contentIv, length: 128 },
                contentKey,
                rawBuffer
              );

              const decryptedBuffer = Buffer.from(decBuf);
              let mimeType = "audio/mp4";
              if (
                decryptedBuffer.length >= 4 &&
                decryptedBuffer[0] === 0x1a &&
                decryptedBuffer[1] === 0x45 &&
                decryptedBuffer[2] === 0xdf &&
                decryptedBuffer[3] === 0xa3
              ) {
                mimeType = "audio/webm";
              } else if (
                (decryptedBuffer.length >= 3 &&
                  decryptedBuffer[0] === 0x49 &&
                  decryptedBuffer[1] === 0x44 &&
                  decryptedBuffer[2] === 0x33) ||
                (decryptedBuffer.length >= 2 &&
                  decryptedBuffer[0] === 0xff &&
                  (decryptedBuffer[1] & 0xe0) === 0xe0)
              ) {
                mimeType = "audio/mpeg";
              }

              const result: CachedAudio = {
                buffer: decryptedBuffer,
                mimeType,
                timestamp: Date.now(),
              };

              // Enforce memory cache eviction policy
              if (audioBufferCache.size >= MAX_CACHE_ENTRIES) {
                const oldestKey = audioBufferCache.keys().next().value;
                if (oldestKey) audioBufferCache.delete(oldestKey);
              }

              audioBufferCache.set(clipId, result);
              return result;
            }
          } catch (err) {
            console.warn(`[Audio Engine] Failed to fetch media from ${mediaUrl}:`, err);
          }
        }
      }

      // 5. Fallback: Direct legacy CDN endpoints
      const directUrls = [
        `https://cdn1.suno.ai/${clipId}.mp3`,
        `https://cdn.suno.com/${clipId}.mp3`,
        `https://audiopipe.suno.ai/?item_id=${clipId}`,
      ];

      for (const url of directUrls) {
        try {
          const directRes = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Referer: "https://suno.com/",
              Origin: "https://suno.com",
            },
            cache: "no-store",
          });

          if (directRes.ok) {
            const buf = Buffer.from(await directRes.arrayBuffer());
            const mimeType = directRes.headers.get("content-type") || "audio/mpeg";
            const result: CachedAudio = {
              buffer: buf,
              mimeType,
              timestamp: Date.now(),
            };

            if (audioBufferCache.size >= MAX_CACHE_ENTRIES) {
              const oldestKey = audioBufferCache.keys().next().value;
              if (oldestKey) audioBufferCache.delete(oldestKey);
            }

            audioBufferCache.set(clipId, result);
            return result;
          }
        } catch (e) {
          // ignore fallback error
        }
      }

      return null;
    } catch (err) {
      console.error("[Audio Engine] Suno stream resolution error:", err);
      return null;
    } finally {
      pendingFetches.delete(clipId);
    }
  })();

  pendingFetches.set(clipId, fetchPromise);
  return fetchPromise;
}

/**
 * Common request handler for Suno audio streaming with full HTTP 206 Partial Content support.
 */
export async function handleSunoAudioStreamRequest(
  req: NextRequest,
  clipId: string
): Promise<NextResponse> {
  const cleanId = clipId?.trim();
  if (!cleanId) {
    return new NextResponse("Missing clip ID", { status: 400 });
  }

  const audioData = await resolveSunoAudioStream(cleanId);
  if (!audioData) {
    return new NextResponse(JSON.stringify({ error: "Track not available" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const { buffer, mimeType } = audioData;
  const totalLength = buffer.length;
  const rangeHeader = req.headers.get("range");

  const commonHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Accept-Ranges": "bytes",
    "Content-Type": mimeType,
    "Cache-Control": "public, max-age=86400, immutable",
  };

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (!match) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...commonHeaders,
          "Content-Range": `bytes */${totalLength}`,
        },
      });
    }

    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : totalLength - 1;

    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= totalLength) end = totalLength - 1;

    if (start >= totalLength || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...commonHeaders,
          "Content-Range": `bytes */${totalLength}`,
        },
      });
    }

    const chunk = buffer.subarray(start, end + 1);
    const contentLength = end - start + 1;

    return new NextResponse(chunk, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Range": `bytes ${start}-${end}/${totalLength}`,
        "Content-Length": contentLength.toString(),
      },
    });
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": totalLength.toString(),
    },
  });
}
