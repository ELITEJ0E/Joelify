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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Referer": "https://suno.com/",
      "Origin": "https://suno.com",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "DNT": "1"
    };

    const fetchWithRetry = async (url: string, retries = 5, asJson = true) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, { 
            cache: "no-store", 
            headers,
          });
          
          if (response.status === 200) {
            if (asJson) return await response.json();
            return await response.text();
          }
          
          console.warn(`Suno API [${response.status}] retry ${i+1}/${retries}: ${url}`);
          
          if (response.status === 404) {
            throw new Error("Playlist not found. Ensure it is set to 'Public' on Suno.");
          }
          
          const delay = (i + 1) * 2000 + Math.random() * 1000; 
          await new Promise(r => setTimeout(r, delay));
        } catch (e: any) {
          if (e.message?.includes("Public")) throw e;
          if (i === retries - 1) throw e;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      const response = await fetch(url, { cache: "no-store", headers });
      if (asJson) return response.json();
      return response.text();
    };

    let clipsToUse = [];

    // TRY 1: HTML SCAPE FIRST (more reliable against Cloudflare)
    try {
      const html = await fetchWithRetry(`https://suno.com/playlist/${id}`, 2, false);
      
      // Look for the JSON part: {"playlist":{"entity_type":"playlist_schema"
      // It is usually embedded as escaped string or raw JSON in __next_f
      // Since it's inside RSC payloads, it is usually like {\"playlist\":{\"entity_type\":\"playlist_schema\"
      const pattern = /\{\\"playlist\\":\\{.*?\\"name\\":\\"(.*?)\\".*?\\"playlist_clips\\":(\[.*?\])\}\}\}/s;
      const match = html.match(pattern);
      if (match) {
        playlistName = match[1].replace(/\\\\/g, "\\");
        
        // The array is stringified JSON, but with escaped quotes
        try {
          // unescape the JSON string
          const rawClips = JSON.parse(match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
          if (Array.isArray(rawClips) && rawClips.length > 0) {
            const parsedClips = rawClips.map((pc: any) => pc.clip).filter(Boolean);
            if (parsedClips.length > 0) {
              clipsToUse = parsedClips;
              hasMore = false; // We got them all from SSR
              page = 10;
              console.log("Successfully scraped", clipsToUse.length, "clips from HTML");
            }
          }
        } catch (e) {
          console.warn("Failed to parse clips from HTML", String(e).substring(0, 50));
        }
      } else {
         // Alternative regex search if unescaped
         const patternUnescaped = /\{"playlist":\{.*?"name":"(.*?)".*?"playlist_clips":(\[.*?\])\}\}\}/s;
         const matchUnescaped = html.match(patternUnescaped);
         if (matchUnescaped) {
             playlistName = matchUnescaped[1];
             try {
                 const rawClips = JSON.parse(matchUnescaped[2]);
                 const parsedClips = rawClips.map((pc: any) => pc.clip).filter(Boolean);
                 if (parsedClips.length > 0) {
                     clipsToUse = parsedClips;
                     hasMore = false;
                     page = 10;
                     console.log("Successfully scraped (unescaped) from HTML:", clipsToUse.length);
                 }
             } catch (e) { console.warn("Failed unescaped parse"); }
         }
      }
    } catch (err) {
      console.warn("HTML Scrape failed:", err);
    }

    if (clipsToUse.length > 0) {
       allClips = clipsToUse;
    } else {
      while (hasMore && page < 10) { 
        let data: any;
        try {
           data = await fetchWithRetry(`https://studio-api.suno.ai/api/playlist/${id}/?page=${page}&_t=${timestamp}`, 3, true);
        } catch (e: any) {
           console.warn("API Fetch error:", e);
           if (page === 0) {
             return NextResponse.json({ 
               error: "Suno API is currently restricted. Please try again later.",
               isRestricted: true 
             }, { status: 200 });
           }
           break;
        }

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
