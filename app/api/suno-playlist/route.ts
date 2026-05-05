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
      let lastError: any = null;
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, { 
            cache: "no-store", 
            headers,
          });
          
          if (response.status === 200) {
            const text = await response.text();
            if (asJson) {
              try {
                return JSON.parse(text);
              } catch (err) {
                if (text.trim().startsWith('<')) {
                  throw new Error(`Received HTML instead of JSON from ${url}`);
                }
                throw err;
              }
            }
            return text;
          }
          
          console.warn(`Suno API [${response.status}] retry ${i+1}/${retries}: ${url}`);
          
          if (response.status === 404) {
            throw new Error("Playlist not found. Ensure it is set to 'Public' on Suno.");
          }
          
          throw new Error(`HTTP ${response.status}`);
        } catch (e: any) {
          lastError = e;
          if (e.message?.includes("Public")) throw e;
          if (i === retries - 1) break;
          const delay = (i + 1) * 2000 + Math.random() * 1000; 
          await new Promise(r => setTimeout(r, delay));
        }
      }
      throw lastError || new Error(`Failed to fetch ${url}`);
    };

    let clipsToUse = [];

    // TRY 1: HTML SCAPE FIRST (more reliable against Cloudflare)
    try {
      const html = await fetchWithRetry(`https://suno.com/playlist/${id}`, 2, false);
      
      for (const match of html.matchAll(/self\.__next_f\.push\(\[1,\"(.*?)\"\]\)/g)) {
        let str = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const startIdx = str.indexOf('{"playlist":');
        if (startIdx !== -1) {
            let braceCount = 0;
            for (let i = startIdx; i < str.length; i++) {
                if (str[i] === '{') braceCount++;
                else if (str[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        try {
                           const json = JSON.parse(str.substring(startIdx, i + 1));
                           if (json?.playlist?.playlist_clips?.length > 0) {
                               clipsToUse = json.playlist.playlist_clips.map((pc: any) => pc.clip).filter(Boolean);
                               playlistName = json.playlist.name || playlistName;
                               hasMore = false;
                               page = 10;
                               console.log("Successfully scraped from HTML:", clipsToUse.length);
                               break;
                           }
                        } catch(e) {}
                    }
                }
            }
        }
        if (clipsToUse.length > 0) break;
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
