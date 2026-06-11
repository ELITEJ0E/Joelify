import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_JOELS_SONGS } from "@/lib/constants";

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

    const extractClips = (html: string) => {
      let foundClips: any[] = [];
      let foundName = playlistName;
      for (const match of html.matchAll(/self\.__next_f\.push\((\[1,"(?:\\.|[^"\\])*"\])\)/g)) {
        try {
          const arr = JSON.parse(match[1]);
          const str = arr[1];
          if (typeof str !== 'string') continue;

          let startIdx = str.indexOf('"playlist_clips":');
          if (startIdx !== -1) {
              const objStart = str.lastIndexOf('{', startIdx);
              if (objStart !== -1) {
                  let braceCount = 0;
                  for (let i = objStart; i < str.length; i++) {
                      if (str[i] === '{') braceCount++;
                      else if (str[i] === '}') {
                          braceCount--;
                          if (braceCount === 0) {
                              try {
                                 const json = JSON.parse(str.substring(objStart, i + 1));
                                 if (json?.playlist_clips?.length > 0) {
                                     foundClips = json.playlist_clips.map((pc: any) => pc.clip).filter(Boolean);
                                     foundName = json.name || foundName;
                                     break;
                                 }
                              } catch(e) {}
                          }
                      }
                  }
              }
          }
          if (foundClips.length > 0) break;
        } catch (e) {}
      }
      return { foundClips, foundName };
    };

    const tryScrapeUrl = async (urlStr: string, isJsonHtml = false) => {
      try {
        const response = await fetch(urlStr, { 
          cache: "no-store", 
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          }
        });
        if (response.ok) {
          let html = await response.text();
          if (isJsonHtml) {
             try { html = JSON.parse(html).contents || html; } catch(e){}
          }
          const { foundClips, foundName } = extractClips(html);
          if (foundClips.length > 0) {
             clipsToUse = foundClips;
             playlistName = foundName;
             hasMore = false;
             page = 10;
             console.log("Successfully scraped from:", urlStr.substring(0, 50));
             return true;
          }
        }
      } catch (err) {
        console.warn("Scrape failed for:", urlStr.substring(0, 50), err);
      }
      return false;
    };

    // TRY 1: Direct HTML SCAPE FIRST (more reliable against Cloudflare locally, avoids 503 from old API)
    let ok = await tryScrapeUrl(`https://suno.com/playlist/${id}`);
    
    // TRY 2: Codetabs proxy
    if (!ok) ok = await tryScrapeUrl("https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(`https://suno.com/playlist/${id}`));
    
    // TRY 3: allorigins proxy
    if (!ok) ok = await tryScrapeUrl("https://api.allorigins.win/get?url=" + encodeURIComponent(`https://suno.com/playlist/${id}`), true);

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
      const fallbackTrack = FALLBACK_JOELS_SONGS.find(t => t.id === clip.id);
      
      let sunoProvidedMp4 = null;
      if (clip.video_cover_url?.includes('.mp4') || clip.video_cover_url?.includes('video_upload')) {
        sunoProvidedMp4 = clip.video_cover_url;
      } else if (clip.video_url?.includes('video_upload')) {
        sunoProvidedMp4 = clip.video_url;
      }

      let latestImg = sunoProvidedMp4 || clip.custom_image_url || clip.image_url || clip.cover_url || clip.artwork_url || `https://cdn2.suno.ai/image_${clip.id}.jpeg`;
      
      // If Suno didn't provide a custom MP4 but the static fallback has one, use the fallback
      if (!sunoProvidedMp4 && (fallbackTrack?.thumbnail?.includes('.mp4') || fallbackTrack?.thumbnail?.includes('video_upload'))) {
        latestImg = fallbackTrack.thumbnail;
      }

      let rawLyrics = clip.metadata?.prompt || "";
      if (typeof rawLyrics === 'string' && rawLyrics.startsWith('$') && rawLyrics.length < 15) {
        rawLyrics = "";
      }

      return {
        id: clip.id,
        title: clip.title || "Untitled",
        artist: clip.display_name || "Suno AI",
        thumbnail: latestImg.includes('.mp4') ? latestImg : latestImg + (latestImg.includes('?') ? `&updated=${timestamp}` : `?updated=${timestamp}`),
        tags: clip.metadata?.tags || "",
        lyrics: rawLyrics,
        createdAt: clip.created_at || ""
      };
    }).reverse();

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
