import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids") || "";

  if (!ids) {
    return NextResponse.json({ clips: [] });
  }

  try {
    const timestamp = Date.now();
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
      "Sec-Fetch-Site": "same-site"
    };

    const fetchWithRetry = async (url: string, retries = 5) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, { cache: "no-store", headers });
          if (response.status === 200) return response;
          const delay = (i + 1) * 1000 + Math.random() * 500;
          await new Promise(r => setTimeout(r, delay));
        } catch (e) {
          if (i === retries - 1) throw e;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      return fetch(url, { cache: "no-store", headers });
    };

    const res = await fetchWithRetry(`https://studio-api.suno.ai/api/clips/?ids=${ids}&_t=${timestamp}`);

    if (!res.ok) {
      if (res.status === 503 || res.status === 403) {
        return NextResponse.json({ 
          clips: [], 
          error: "Suno API is currently restricted or rate-limited. Using fallback names.",
          isRestricted: true 
        }, { status: 200 }); // Return 200 so frontend doesn't catch it as a fetch error
      }
      const errorText = await res.text();
      console.error(`Suno API error (${res.status}): ${errorText.substring(0, 500)}`);
      throw new Error(`Failed to fetch clips metadata: ${res.status}`);
    }

    const clips = await res.json();
    
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
