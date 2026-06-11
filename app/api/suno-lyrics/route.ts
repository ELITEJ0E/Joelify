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
    
      // Scrape the payload safely using JSON array extraction
      // This perfectly unescapes all characters (including \n, \', unicode) that Next.js added.
      const chunks: string[] = [];
      const searchStr = 'self.__next_f.push(';
      let pos = 0;
      while ((pos = html.indexOf(searchStr, pos)) !== -1) {
          pos += searchStr.length;
          const endPos = html.indexOf(')</script>', pos);
          if (endPos !== -1) {
              const jsonStr = html.substring(pos, endPos);
              try {
                  const arr = JSON.parse(jsonStr);
                  if (Array.isArray(arr) && arr[0] === 1 && typeof arr[1] === 'string') {
                      chunks.push(arr[1]);
                  }
              } catch(e) {}
              pos = endPos;
          }
      }
      
      const fullStr = chunks.join('');
      const startIdx = fullStr.indexOf('{"clip":');
      
      if (startIdx !== -1) {
          let braceCount = 0;
          for (let i = startIdx; i < fullStr.length; i++) {
              if (fullStr[i] === '{') braceCount++;
              else if (fullStr[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                      try {
                         const json = JSON.parse(fullStr.substring(startIdx, i + 1));
                         const clip = json.clip;
                         if (clip?.metadata) {
                             let lyrics = clip.metadata.prompt || "";
                             
                             // Resolve Next.js Flight references for large text chunks
                             if (typeof lyrics === 'string' && lyrics.startsWith('$')) {
                                 const refId = lyrics.slice(1);
                                 
                                 // Look for the literal Flight text chunk format -> "id:T[length],[text]"
                                 const textChunkRegex = new RegExp(`(?:^|\\n)${refId}:T([0-9a-fA-F]+),`);
                                 const match = fullStr.match(textChunkRegex);
                                 if (match) {
                                     const lengthInBytes = parseInt(match[1], 16);
                                     const textStart = match.index! + match[0].length;
                                     // The text length might be slightly off if there are multi-byte unicode chars, but we can fall back to reasonable assumptions,
                                     // or just slice it and trim it.
                                     // Let's accurately decode by taking the slice. Hex length represents bytes in UTF-8, but in JS it's UTF-16 characters.
                                     // Safest way is to just find the chunk boundaries. Often the next chunk starts with a newline and an ID (like \n5e:).
                                     let text = fullStr.substring(textStart);
                                     
                                     try {
                                         // Next.js text chunk length is in bytes
                                         const buf = Buffer.from(text, 'utf8');
                                         if (lengthInBytes <= buf.length) {
                                            text = buf.subarray(0, lengthInBytes).toString('utf8');
                                         }
                                     } catch (e) {
                                         // Fallback if Buffer is not available for some reason
                                         const nextRefMatch = text.match(/\n[0-9a-f]+:/);
                                         if (nextRefMatch) {
                                             text = text.substring(0, nextRefMatch.index);
                                         } else if (text.length > lengthInBytes + 50) {
                                             text = text.slice(0, lengthInBytes); 
                                         }
                                     }
                                     lyrics = text;
                                 } else {
                                     // Look for a quoted string reference like 'id:"text"'
                                     const stringRefRegex = new RegExp(`(?:^|\\n)${refId}:("(?:\\\\.|[^"\\\\])*")`);
                                     const strMatch = fullStr.match(stringRefRegex);
                                     if (strMatch) {
                                         try { lyrics = JSON.parse(strMatch[1]); } catch(e){}
                                     }
                                 }
                             }
                             
                             return NextResponse.json({ 
                               id, 
                               lyrics: lyrics,
                               title: clip.title,
                               artist: clip.display_name
                             });
                         }
                      } catch(e) {}
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
