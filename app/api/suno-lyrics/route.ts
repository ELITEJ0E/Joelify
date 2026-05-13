import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing song ID" }, { status: 400 });
  }

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "DNT": "1"
    };

    const response = await fetch(`https://suno.com/song/${id}`, { 
      headers,
      cache: "no-store" 
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch song page: HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Scrape the payload
    for (const match of html.matchAll(/self\.__next_f\.push\(\[1,\"(.*?)\"\]\)/g)) {
      let str = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      const startIdx = str.indexOf('{"clip":');
      if (startIdx !== -1) {
          let braceCount = 0;
          for (let i = startIdx; i < str.length; i++) {
              if (str[i] === '{') braceCount++;
              else if (str[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                      try {
                         const json = JSON.parse(str.substring(startIdx, i + 1));
                         const clip = json.clip;
                         if (clip?.metadata?.prompt) {
                             return NextResponse.json({ 
                               id, 
                               lyrics: clip.metadata.prompt,
                               title: clip.title,
                               artist: clip.display_name
                             });
                         }
                      } catch(e) {}
                  }
              }
          }
      }
    }

    return NextResponse.json({ error: "Lyrics not found" }, { status: 404 });
  } catch (error) {
    console.error("Suno lyrics fetch error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
