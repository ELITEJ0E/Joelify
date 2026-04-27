import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  if (!id) {
    return NextResponse.json({ error: "Missing playlist ID" }, { status: 400 });
  }

  try {
    const timestamp = Date.now();
    let allClips: any[] = [];
    let page = 0;
    let hasMore = true;
    let playlistName = "Suno Playlist";

    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://suno.com/",
      "Origin": "https://suno.com",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"macOS"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "Priority": "u=1, i",
      "DNT": "1"
    };

    const fetchWithRetry = async (url: string, retries = 5) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, { 
            cache: "no-store", 
            headers,
          });
          
          // If we get 503, it's a block. If we get 404, the playlist might be private.
          if (response.status === 200) return response;
          if (response.status === 404) {
            throw new Error("Playlist not found. Please ensure it is set to 'Public' on Suno.");
          }
          
          console.warn(`Suno API retry ${i+1}/${retries} for status ${response.status}: ${url}`);
          const delay = (i + 1) * 1200 + Math.random() * 800; // Increased sleep
          await new Promise(r => setTimeout(r, delay));
        } catch (e: any) {
          if (i === retries - 1 || e.message?.includes("Public")) throw e;
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      return fetch(url, { cache: "no-store", headers });
    };

    while (hasMore && page < 10) { 
      const res = await fetchWithRetry(`https://studio-api.suno.ai/api/playlist/${id}/?page=${page}&_t=${timestamp}`);

      if (!res.ok) {
        if (res.status === 503 || res.status === 403) {
          if (page === 0) {
            return NextResponse.json({ 
              error: "Suno API is currently restricted. Please try again later.",
              isRestricted: true 
            }, { status: 200 });
          }
          break;
        }
        const text = await res.text();
        console.error(`Suno Playlist API Error [${res.status}] for page ${page}:`, text.substring(0, 100));
        if (page === 0) throw new Error(`Suno API returned ${res.status}`);
        break;
      }

      const data = await res.json();
      playlistName = data.name || playlistName;
      
      let pageClips = [];
      if (data.playlist_clips && Array.isArray(data.playlist_clips)) {
        pageClips = data.playlist_clips.map((pc: any) => pc.clip).filter(Boolean);
      } else if (data.clips && Array.isArray(data.clips)) {
        pageClips = data.clips;
      }

      if (pageClips.length === 0) {
        hasMore = false;
      } else {
        allClips = [...allClips, ...pageClips];
        // Suno page size is usually 20, but maybe it varies
        if (pageClips.length < 10) {
          hasMore = false;
        } else {
          page++;
        }
      }

      if (data.next === null || data.has_more === false) {
        hasMore = false;
      }
    }

    // De-duplicate
    const uniqueClipsMap = new Map();
    allClips.forEach(clip => {
      if (clip && clip.id) uniqueClipsMap.set(clip.id, clip);
    });
    let clips = Array.from(uniqueClipsMap.values());

    // Chunking to avoid 503 and URL length limits
    if (clips.length > 0) {
      const CHUNK_SIZE = 4;
      for (let i = 0; i < clips.length; i += CHUNK_SIZE) {
        const chunk = clips.slice(i, i + CHUNK_SIZE);
        const clipIds = chunk.map(c => c.id).join(",");
        try {
          // Add a small staggered delay between metadata chunks to seem more "human"
          if (i > 0) await new Promise(r => setTimeout(r, 300 + Math.random() * 200));
          
          const freshRes = await fetchWithRetry(`https://studio-api.suno.ai/api/clips/?ids=${clipIds}&_t=${timestamp}`);
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            if (Array.isArray(freshData)) {
              clips = clips.map(oldClip => {
                const fresh = freshData.find((fc: any) => fc.id === oldClip.id);
                return fresh || oldClip;
              });
            }
          }
        } catch (e) {
          console.warn("Chunked metadata refresh failed for chunk starting at", i, e);
        }
      }
    }

    const tracks = clips.map(clip => {
      const latestImg = clip.custom_image_url || clip.image_url || clip.cover_url || clip.artwork_url || `https://cdn2.suno.ai/image_${clip.id}.jpeg`;
      
      return {
        id: clip.id,
        title: clip.title || "Untitled",
        artist: clip.display_name || "Suno AI",
        thumbnail: latestImg + (latestImg.includes('?') ? `&updated=${timestamp}` : `?updated=${timestamp}`),
        tags: clip.metadata?.tags || ""
      };
    });

    return NextResponse.json({ 
      name: playlistName,
      id,
      tracks,
      count: tracks.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Suno playlist error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
