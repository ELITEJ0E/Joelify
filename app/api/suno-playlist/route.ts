import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_JOELS_SONGS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const playlistScrapeCache = new Map<string, any>();

async function fetchSongMetadata(id: string): Promise<any> {
  const cleanId = id.trim();
  if (!cleanId) return null;
  
  if (playlistScrapeCache.has(cleanId)) {
    return playlistScrapeCache.get(cleanId);
  }

  const urlsToTry = [
    `https://suno.com/song/${cleanId}`,
    "https://api.allorigins.win/get?url=" + encodeURIComponent(`https://suno.com/song/${cleanId}`),
    "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(`https://suno.com/song/${cleanId}`),
    "https://corsproxy.io/?url=" + encodeURIComponent(`https://suno.com/song/${cleanId}`)
  ];

  for (let u = 0; u < urlsToTry.length; u++) {
    const url = urlsToTry[u];
    try {
      const isProxy = u > 0;
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5"
        }
      });
      if (!response.ok) continue;

      let html = await response.text();
      if (isProxy && u === 1) {
        try {
          const parsed = JSON.parse(html);
          html = parsed.contents || html;
        } catch (e) {}
      }

      if (!html || typeof html !== "string" || !html.includes("Suno")) continue;

      const payloads: string[] = [];
      let index = 0;
      while (true) {
        const pushIdx = html.indexOf('__next_f.push(', index);
        if (pushIdx === -1) break;
        
        const startIdx = pushIdx + '__next_f.push('.length; 
        let parenCount = 1;
        let inString = false;
        let stringChar = '';
        let isEscaped = false;
        let foundEnd = -1;
        
        for (let i = startIdx; i < html.length; i++) {
          const char = html[i];
          if (inString) {
            if (isEscaped) {
              isEscaped = false;
            } else if (char === '\\') {
              isEscaped = true;
            } else if (char === stringChar) {
              inString = false;
            }
          } else {
            if (char === '"' || char === "'") {
              inString = true;
              stringChar = char;
              isEscaped = false;
            } else if (char === '(') {
              parenCount++;
            } else if (char === ')') {
              parenCount--;
              if (parenCount === 0) {
                foundEnd = i;
                break;
              }
            }
          }
        }
        
        if (foundEnd !== -1) {
          const argumentStr = html.substring(startIdx, foundEnd).trim();
          try {
            const arr = JSON.parse(argumentStr);
            if (Array.isArray(arr) && typeof arr[1] === 'string') {
              payloads.push(arr[1]);
            }
          } catch (e) {
            const strMatch = argumentStr.match(/^\[\s*\d+\s*,\s*"([\s\S]*)"\s*\]$/);
            if (strMatch) {
              try {
                const decoded = JSON.parse(`"${strMatch[1]}"`);
                payloads.push(decoded);
              } catch (err) {
                let s = strMatch[1]
                  .replace(/\\"/g, '"')
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\\\/g, '\\');
                payloads.push(s);
              }
            }
          }
          index = foundEnd + 1;
        } else {
          index = pushIdx + 1;
        }
      }

      const combinedDecodedText = payloads.join("");
      
      const clipIdx = combinedDecodedText.indexOf('"clip":');
      if (clipIdx !== -1) {
        let braceCount = 0;
        let objStart = combinedDecodedText.indexOf('{', clipIdx);
        if (objStart !== -1) {
          for (let i = objStart; i < combinedDecodedText.length; i++) {
            if (combinedDecodedText[i] === '{') braceCount++;
            else if (combinedDecodedText[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                const objStr = combinedDecodedText.substring(objStart, i + 1);
                try {
                  const parsed = JSON.parse(objStr);
                  const clipObj = parsed.clip || parsed;
                  if (clipObj && clipObj.id === cleanId) {
                    playlistScrapeCache.set(cleanId, clipObj);
                    return clipObj;
                  }
                } catch (e) {}
                break;
              }
            }
          }
        }
      }

      const titleMatch = combinedDecodedText.match(/"title"\s*:\s*"([^"]+)"/);
      const artistMatch = combinedDecodedText.match(/"display_name"\s*:\s*"([^"]+)"/) || combinedDecodedText.match(/"handle"\s*:\s*"([^"]+)"/);
      const imageMatch = combinedDecodedText.match(/"image_url"\s*:\s*"([^"]+)"/) || combinedDecodedText.match(/"image_large_url"\s*:\s*"([^"]+)"/);
      const audioMatch = combinedDecodedText.match(/"audio_url"\s*:\s*"([^"]+)"/);
      
      if (titleMatch || artistMatch || imageMatch || audioMatch) {
        const clipObj = {
          id: cleanId,
          title: titleMatch ? titleMatch[1] : `Track ${cleanId.substring(0, 5)}`,
          display_name: artistMatch ? artistMatch[1] : "ELITEJOE",
          audio_url: audioMatch ? audioMatch[1] : `https://cdn1.suno.ai/${cleanId}.mp3`,
          image_url: imageMatch ? imageMatch[1] : `https://cdn2.suno.ai/image_${cleanId}.jpeg`,
          cover_url: imageMatch ? imageMatch[1] : `https://cdn2.suno.ai/image_${cleanId}.jpeg`,
          metadata: {
            prompt: "",
            tags: ""
          }
        };
        playlistScrapeCache.set(cleanId, clipObj);
        return clipObj;
      }

      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      
      if (ogTitleMatch) {
        let artist = "ELITEJOE";
        if (descMatch) {
          const byMatch = descMatch[1].match(/(.*?)\s+by\s+(.*?)\s+\(/);
          if (byMatch && byMatch[2]) {
            artist = byMatch[2];
          }
        }
        const clipObj = {
          id: cleanId,
          title: ogTitleMatch[1],
          display_name: artist,
          audio_url: `https://cdn1.suno.ai/${cleanId}.mp3`,
          image_url: ogImageMatch ? ogImageMatch[1] : `https://cdn2.suno.ai/image_${cleanId}.jpeg`,
          cover_url: ogImageMatch ? ogImageMatch[1] : `https://cdn2.suno.ai/image_${cleanId}.jpeg`,
          metadata: {
            prompt: "",
            tags: ""
          }
        };
        playlistScrapeCache.set(cleanId, clipObj);
        return clipObj;
      }
    } catch (e) {
      console.warn(`Parallel playlist sync crawl failed for ID ${cleanId}:`, e);
    }
  }
  return null;
}

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

    let clipsToUse: any[] = [];

    const extractClips = (html: string) => {
      let foundClips: any[] = [];
      let foundName = playlistName;

      // Tier 1: Next.js __next_f.push extraction and reassembly
      const payloads: string[] = [];
      let index = 0;
      while (true) {
        const pushIdx = html.indexOf('__next_f.push(', index);
        if (pushIdx === -1) break;
        
        const startIdx = pushIdx + '__next_f.push('.length; 
        let parenCount = 1;
        let inString = false;
        let stringChar = '';
        let isEscaped = false;
        let foundEnd = -1;
        
        for (let i = startIdx; i < html.length; i++) {
          const char = html[i];
          
          if (inString) {
            if (isEscaped) {
              isEscaped = false;
            } else if (char === '\\') {
              isEscaped = true;
            } else if (char === stringChar) {
              inString = false;
            }
          } else {
            if (char === '"' || char === "'") {
              inString = true;
              stringChar = char;
              isEscaped = false;
            } else if (char === '(') {
              parenCount++;
            } else if (char === ')') {
              parenCount--;
              if (parenCount === 0) {
                foundEnd = i;
                break;
              }
            }
          }
        }
        
        if (foundEnd !== -1) {
            const argumentStr = html.substring(startIdx, foundEnd).trim();
            try {
                const arr = JSON.parse(argumentStr);
                if (Array.isArray(arr) && typeof arr[1] === 'string') {
                    payloads.push(arr[1]);
                }
            } catch (e) {
                // regex match on literal string
                const strMatch = argumentStr.match(/^\[\s*\d+\s*,\s*"([\s\S]*)"\s*\]$/);
                if (strMatch) {
                    try {
                        const decoded = JSON.parse(`"${strMatch[1]}"`);
                        payloads.push(decoded);
                    } catch (err) {
                        let s = strMatch[1]
                            .replace(/\\"/g, '"')
                            .replace(/\\n/g, '\n')
                            .replace(/\\r/g, '\r')
                            .replace(/\\t/g, '\t')
                            .replace(/\\\\/g, '\\');
                        payloads.push(s);
                    }
                }
            }
            index = foundEnd + 1;
        } else {
            index = pushIdx + 1;
        }
      }

      const combinedDecodedText = payloads.join("");

      if (combinedDecodedText) {
         // Tier 1a: Try to extract as structured array from playlist_clips
         const playlistClipsIdx = combinedDecodedText.indexOf('"playlist_clips":');
         if (playlistClipsIdx !== -1) {
             const startArrIdx = combinedDecodedText.indexOf('[', playlistClipsIdx);
             if (startArrIdx !== -1) {
                 let bracketCount = 0;
                 for (let i = startArrIdx; i < combinedDecodedText.length; i++) {
                     if (combinedDecodedText[i] === '[') bracketCount++;
                     else if (combinedDecodedText[i] === ']') {
                         bracketCount--;
                         if (bracketCount === 0) {
                             const arrayStr = combinedDecodedText.substring(startArrIdx, i + 1);
                             try {
                                 const arr = JSON.parse(arrayStr);
                                 if (Array.isArray(arr) && arr.length > 0) {
                                     foundClips = arr.map((item: any) => item.clip || item).filter(Boolean);
                                 }
                             } catch (e) {
                                 console.warn("Failed to parse extracted playlist_clips array", e);
                             }
                             break;
                         }
                     }
                 }
             }
         }

         // Try clips array directly if playlist_clips is missing or empty
         if (foundClips.length === 0) {
             const clipsIdx = combinedDecodedText.indexOf('"clips":');
             if (clipsIdx !== -1) {
                 const startArrIdx = combinedDecodedText.indexOf('[', clipsIdx);
                 if (startArrIdx !== -1) {
                     let bracketCount = 0;
                     for (let i = startArrIdx; i < combinedDecodedText.length; i++) {
                         if (combinedDecodedText[i] === '[') bracketCount++;
                         else if (combinedDecodedText[i] === ']') {
                             bracketCount--;
                             if (bracketCount === 0) {
                                 const arrayStr = combinedDecodedText.substring(startArrIdx, i + 1);
                                 try {
                                     const arr = JSON.parse(arrayStr);
                                     if (Array.isArray(arr) && arr.length > 0) {
                                         foundClips = arr.map((item: any) => item.clip || item).filter(Boolean);
                                     }
                                 } catch (e) {
                                     console.warn("Failed to parse extracted clips array", e);
                                 }
                                 break;
                             }
                         }
                     }
                 }
             }
         }

         // Tier 1b: Extract individual clips by sweeping all UUIDs in the RSC string
         if (foundClips.length === 0) {
             console.log("No contiguous arrays found. Parsing individual clip objects from RSC...");
             const uuidRegex = /"id"\s*:\s*"([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})"/gi;
             let match;
             const seenIds = new Set<string>();
             while ((match = uuidRegex.exec(combinedDecodedText)) !== null) {
                 const id = match[1];
                 if (seenIds.has(id)) continue;
                 const matchIndex = match.index;
                 
                 let braceCount = 0;
                 let objStart = -1;
                 for (let i = matchIndex; i >= 0; i--) {
                     if (combinedDecodedText[i] === '}') braceCount++;
                     else if (combinedDecodedText[i] === '{') {
                         if (braceCount === 0) {
                             objStart = i;
                             break;
                         } else {
                             braceCount--;
                         }
                     }
                 }
                 
                 if (objStart !== -1) {
                     braceCount = 0;
                     let objEnd = -1;
                     for (let i = objStart; i < combinedDecodedText.length; i++) {
                         if (combinedDecodedText[i] === '{') braceCount++;
                         else if (combinedDecodedText[i] === '}') {
                             braceCount--;
                             if (braceCount === 0) {
                                 objEnd = i;
                                 break;
                             }
                         }
                     }
                     
                     if (objEnd !== -1) {
                         const objectStr = combinedDecodedText.substring(objStart, objEnd + 1);
                         try {
                             const parsed = JSON.parse(objectStr);
                             const clip = parsed.clip || parsed;
                             if (clip && typeof clip === 'object' && clip.id === id && (clip.audio_url || clip.video_url || clip.title)) {
                                 foundClips.push(clip);
                                 seenIds.add(id);
                             }
                         } catch (e) {
                             // Substring was not standalone valid JSON
                         }
                     }
                 }
             }
         }

         // Try to find playlist/page name in reconstituted text
         const nameRegexes = [
             /"name"\s*:\s*"([^"]+)"/,
             /"title"\s*:\s*"([^"]+)"/
         ];
         for (const r of nameRegexes) {
             const m = combinedDecodedText.match(r);
             if (m && m[1] && m[1] !== "Suno Playlist" && m[1].length > 2 && m[1].length < 100) {
                 if (!["chirp", "v4", "v3", "Suno", "Suno AI"].includes(m[1])) {
                     foundName = m[1];
                     break;
                 }
             }
         }
      }

      // Tier 2: Absolute worst-case scenario. Extract any Suno audio links from raw HTML
      if (foundClips.length === 0) {
         console.warn("RSC extraction yielded nothing. Running regex fallbacks direct from raw HTML...");
         // Match cdn1.suno.ai paths
         const audioUrlRegex = /https:\/\/cdn1\.suno\.ai\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.mp3/gi;
         let match;
         const seenIds = new Set<string>();
         while ((match = audioUrlRegex.exec(html)) !== null) {
             const id = match[1];
             if (seenIds.has(id)) continue;
             seenIds.add(id);
             
             let trackTitle = "Track " + id.substring(0, 5);
             foundClips.push({
                 id,
                 title: trackTitle,
                 display_name: "Suno AI",
                 audio_url: `https://cdn1.suno.ai/${id}.mp3`,
                 image_url: `https://cdn2.suno.ai/image_${id}.jpeg`,
                 metadata: {
                     tags: "scraped-fallback"
                 }
             });
         }
      }

      // Legacy pattern search as a final safety check
      if (foundClips.length === 0) {
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
            } catch (e) {}
          }
      }

      return { foundClips, foundName };
    };

    const tryScrapeUrl = async (urlStr: string, isJsonHtml = false) => {
      try {
        const response = await fetch(urlStr, { 
          cache: "no-store", 
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
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

    const tracksPromises = clips.map(async (clip) => {
      const fallbackTrack = FALLBACK_JOELS_SONGS.find(t => t.id === clip.id);
      
      let title = clip.title || "Untitled";
      let artist = clip.display_name || "Suno AI";
      let latestImg = clip.image_url || clip.cover_url || clip.artwork_url || `https://cdn2.suno.ai/image_${clip.id}.jpeg`;
      let rawLyrics = clip.metadata?.prompt || "";
      let tags = clip.metadata?.tags || "";
      
      // If it has fallen back to a generic name and is not in hardcoded fallbacks, perform parallel crawl resolve
      if (!fallbackTrack && (title === "Untitled" || title.startsWith("Track "))) {
        try {
          const resolved = await fetchSongMetadata(clip.id);
          if (resolved) {
            title = resolved.title || title;
            artist = resolved.display_name || resolved.artist || artist;
            latestImg = resolved.image_url || resolved.cover_url || latestImg;
            rawLyrics = resolved.metadata?.prompt || rawLyrics;
            tags = resolved.metadata?.tags || tags;
          }
        } catch (e) {
          console.warn("Could not resolve individual clip metadata inside playlist sync", clip.id);
        }
      }

      let sunoProvidedMp4 = null;
      if (clip.video_cover_url?.includes('.mp4') || clip.video_cover_url?.includes('video_upload')) {
        sunoProvidedMp4 = clip.video_cover_url;
      } else if (clip.video_url?.includes('video_upload')) {
        sunoProvidedMp4 = clip.video_url;
      }

      if (!sunoProvidedMp4 && (fallbackTrack?.thumbnail?.includes('.mp4') || fallbackTrack?.thumbnail?.includes('video_upload'))) {
        latestImg = fallbackTrack.thumbnail;
      }

      if (fallbackTrack) {
        title = fallbackTrack.title;
        artist = fallbackTrack.artist;
        latestImg = fallbackTrack.thumbnail;
      }

      const isVideo = latestImg.includes('.mp4') || latestImg.includes('video_upload');
      let buster = latestImg.includes('?') ? `&updated=${timestamp}` : `?updated=${timestamp}`;
      if (isVideo) {
        buster = "";
      }

      if (typeof rawLyrics === 'string' && rawLyrics.startsWith('$') && rawLyrics.length < 15) {
        rawLyrics = "";
      }

      return {
        id: clip.id,
        title,
        artist,
        thumbnail: isVideo ? latestImg : latestImg + buster,
        tags,
        lyrics: rawLyrics,
        createdAt: clip.created_at || ""
      };
    });

    const resolvedTracks = await Promise.all(tracksPromises);
    const tracks = resolvedTracks.reverse();

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
