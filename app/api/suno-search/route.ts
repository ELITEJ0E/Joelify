import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const res = await fetch("https://studio-api.suno.ai/api/playlist/trending/?page=0", {
      next: { revalidate: 600 }
    });
    
    if (!res.ok) {
      return NextResponse.json({ tracks: [], error: "Suno API response not ok" });
    }
    
    const data = await res.json();
    let rawClips: any[] = [];
    
    if (data.clips) {
      rawClips = data.clips;
    } else if (data.playlist_clips) {
      rawClips = data.playlist_clips.map((pc: any) => pc.clip);
    }

    let tracks = rawClips.map((clip: any) => ({
      id: clip.id,
      title: clip.title || "Unknown Title",
      artist: clip.display_name || "Suno AI",
      thumbnail: (clip.image_url || `https://cdn2.suno.ai/image_${clip.id}.jpeg`) + `?v=${Date.now()}`,
      tags: clip.metadata?.tags || ""
    }));

    if (q) {
      const qs = q.toLowerCase();
      tracks = tracks.filter((t: any) => 
        t.title.toLowerCase().includes(qs) || 
        t.artist.toLowerCase().includes(qs) ||
        t.tags.toLowerCase().includes(qs)
      );
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Suno search error", error);
    return NextResponse.json({ tracks: [], error: "Failed to fetch Suno trending" });
  }
}
