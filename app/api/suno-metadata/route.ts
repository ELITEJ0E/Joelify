import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Memory cache to prevent duplicate outbound scrapes across requests
const scrapeCache = new Map<string, any>();

async function fetchSongMetadata(id: string): Promise<any> {
  const cleanId = id.trim();
  if (!cleanId) return null;
  
  if (scrapeCache.has(cleanId)) {
    return scrapeCache.get(cleanId);
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
      if (isProxy && u === 1) { // allorigins returns JSON wrapper
        try {
          const parsed = JSON.parse(html);
          html = parsed.contents || html;
        } catch (e) {}
      }

      if (!html || typeof html !== "string" || !html.includes("Suno")) continue;

      // Extract RSC stream payloads
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
      
      // Attempt 1: Parse complete clip JSON object from RSC stream
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
                    scrapeCache.set(cleanId, clipObj);
                    return clipObj;
                  }
                } catch (e) {}
                break;
              }
            }
          }
        }
      }

      // Attempt 2: Extract attributes directly from the decoded RSC string using regular expressions
      const titleMatch = combinedDecodedText.match(/"title"\s*:\s*"([^"]+)"/);
      const artistMatch = combinedDecodedText.match(/"display_name"\s*:\s*"([^"]+)"/) || combinedDecodedText.match(/"handle"\s*:\s*"([^"]+)"/);
      const imageMatch = combinedDecodedText.match(/"image_url"\s*:\s*"([^"]+)"/) || combinedDecodedText.match(/"image_large_url"\s*:\s*"([^"]+)"/);
      const audioMatch = combinedDecodedText.match(/"audio_url"\s*:\s*"([^"]+)"/);
      
      if (titleMatch || artistMatch || imageMatch || audioMatch) {
        const clipObj = {
          id: cleanId,
          title: titleMatch ? titleMatch[1] : "Unknown Title",
          display_name: artistMatch ? artistMatch[1] : "ELITEJOE",
          audio_url: audioMatch ? audioMatch[1] : `https://cdn1.suno.ai/${cleanId}.mp3`,
          image_url: imageMatch ? imageMatch[1] : `https://cdn2.suno.ai/image_${cleanId}.jpeg`,
          cover_url: imageMatch ? imageMatch[1] : `https://cdn2.suno.ai/image_${cleanId}.jpeg`,
          metadata: {
            prompt: "",
            tags: ""
          }
        };
        scrapeCache.set(cleanId, clipObj);
        return clipObj;
      }

      // Attempt 3: Fallback web crawlers meta tag extraction (guaranteed fallback)
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
        scrapeCache.set(cleanId, clipObj);
        return clipObj;
      }
    } catch (e) {
      console.warn(`Scrape crawl for ID ${cleanId} from ${url} failed:`, e);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsStr = searchParams.get("ids") || "";

  if (!idsStr) {
    return NextResponse.json({ clips: [] });
  }

  const ids = idsStr.split(",").map(id => id.trim()).filter(Boolean);

  try {
    const timestamp = Date.now();
    const headers = {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://suno.com/",
      "Origin": "https://suno.com"
    };

    // First, let's TRY to query official API to see if it responds (non-suspended periods)
    let ok = false;
    let fallbackClips: any[] = [];
    
    try {
      const res = await fetch(`https://studio-api.suno.ai/api/clips/?ids=${idsStr}&_t=${timestamp}`, {
        cache: "no-store",
        headers
      });
      if (res.status === 200) {
        const clips = await res.json();
        if (Array.isArray(clips) && clips.length > 0) {
          return NextResponse.json({ clips }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            }
          });
        }
      }
    } catch (e) {
      console.warn("Suno direct clips API failed, proceeding to fallback crawlers");
    }

    // fallback metadata crawlers (parallel resolve)
    const clipPromises = ids.map(id => fetchSongMetadata(id));
    const resolved = await Promise.all(clipPromises);
    const clips = resolved.filter(Boolean);

    return NextResponse.json({ clips }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Suno metadata error", error);
    return NextResponse.json({ clips: [], error: String(error) }, { status: 500 });
  }
}
