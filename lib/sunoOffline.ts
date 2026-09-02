export async function downloadSunoTrack(
  songId: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const primaryUrl = `/api/suno-stream/${songId}`;
  const cdnUrl = `https://cdn1.suno.ai/${songId}.mp3`;
  try {
    const cache = await caches.open("joelify-suno-offline-v1");
    const existing = await cache.match(cdnUrl) || await cache.match(primaryUrl);
    if (existing) {
      onProgress(100);
      return;
    }

    let response = await fetch(primaryUrl);
    if (!response.ok) {
      response = await fetch(cdnUrl);
    }
    if (!response.ok) throw new Error("Failed to fetch track");
    if (!response.body) throw new Error("No response body");

    const contentLength = response.headers.get("content-length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    let loaded = 0;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        if (total) {
          onProgress(Math.round((loaded / total) * 100));
        }
      }
    }

    const contentType = response.headers.get("content-type") || "audio/mp4";
    const blob = new Blob(chunks as BlobPart[], { type: contentType });
    const cachedResponse = new Response(blob, {
      headers: { "Content-Type": contentType },
    });

    await cache.put(cdnUrl, cachedResponse);
    onProgress(100);
  } catch (error) {
    console.error("Error downloading track:", error);
    throw error;
  }
}

export async function isSunoDownloaded(songId: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const cache = await caches.open("joelify-suno-offline-v1");
    const response = await cache.match(`https://cdn1.suno.ai/${songId}.mp3`);
    return !!response;
  } catch (error) {
    return false;
  }
}

export async function getOfflineAudioBlobUrl(songId: string): Promise<string | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open("joelify-suno-offline-v1");
    const response = await cache.match(`https://cdn1.suno.ai/${songId}.mp3`);
    if (!response) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Failed to get offline blob url", error);
    return null;
  }
}

export async function deleteSunoDownload(songId: string): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open("joelify-suno-offline-v1");
    await cache.delete(`https://cdn1.suno.ai/${songId}.mp3`);
  } catch (error) {
    console.error("Failed to delete track", error);
  }
}

export async function listDownloadedSunoIds(): Promise<string[]> {
  if (typeof caches === "undefined") return [];
  try {
    const cache = await caches.open("joelify-suno-offline-v1");
    const keys = await cache.keys();
    return keys
      .map((req) => {
        const match = req.url.match(/cdn1\.suno\.ai\/(.+)\.mp3$/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];
  } catch (error) {
    return [];
  }
}
