import { NextResponse } from "next/server";
import { SyncRequest } from "@/lib/suno/types";
import { checkSunoCredits, addTracksToSunoPlaylist } from "@/lib/suno/client";
import { sleep, getRandomDelay } from "@/lib/suno/utils";

const BATCH_SIZE = 5; // Process in small batches of 5 to avoid triggering heuristic rate limits
const BATCH_DELAY_MIN = 3500; // Minimum delay between batches in ms
const BATCH_DELAY_MAX = 7000; // Maximum delay between batches in ms

export async function POST(req: Request) {
  try {
    // 1. Get Authentication Token
    // We expect the auth token to be passed from the client, usually as a Bearer token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header (Bearer token required)." },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    // 2. Parse Request Body
    const body: SyncRequest = await req.json();
    const { playlistId, tracks } = body;

    if (!playlistId || !tracks || !Array.isArray(tracks)) {
      return NextResponse.json(
        { success: false, error: "Invalid request body. 'playlistId' and 'tracks' array are required." },
        { status: 400 }
      );
    }

    if (tracks.length === 0) {
      return NextResponse.json({ success: true, message: "No tracks to sync.", syncedCount: 0 });
    }

    // Extract raw IDs to add
    const trackIds = tracks.map((t) => t.id).filter(Boolean);

    // 3. Pre-flight Check: Verify Credits
    try {
      console.log(`[SunoSync] Checking credits for user to avoid 402...`);
      const creditInfo = await checkSunoCredits(token);
      
      // If we got valid credit info and the credits are critically low, block the operation.
      // (Depends on if playlist adding takes credits. Often it doesn't, but prompt asked to protect against 402 out of credits)
      if (creditInfo && creditInfo.credits_left !== undefined && creditInfo.credits_left <= 0) {
        console.warn("[SunoSync] No credits left.");
        return NextResponse.json(
          { success: false, error: "Insufficient Suno credits. Please top up your account." },
          { status: 402 }
        );
      }
    } catch (err: any) {
      console.error("[SunoSync] Failed to verify credits:", err.message);
      if (err.message.includes("402") || err.message.includes("Insufficient")) {
        return NextResponse.json(
          { success: false, error: "Insufficient Suno credits. Please top up your account." },
          { status: 402 }
        );
      }
      // If billing endpoint fails for another reason, we can still attempt the playlist sync 
      // rather than hard-failing, in case the billing API endpoints changed.
    }

    // 4. Process Upload in Wait-Paced Batches
    let syncedCount = 0;
    
    for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
      const batch = trackIds.slice(i, i + BATCH_SIZE);
      console.log(`[SunoSync] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(trackIds.length / BATCH_SIZE)} (Items: ${batch.length})`);
      
      try {
        await addTracksToSunoPlaylist(playlistId, batch, token);
        syncedCount += batch.length;
      } catch (err: any) {
        console.error(`[SunoSync] Error syncing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
        // Abort to prevent spamming Suno API once a persistent error happens
        return NextResponse.json(
          {
            success: false,
            error: err.message || "Failed to add tracks to Suno playlist.",
            syncedCount,
            totalCount: trackIds.length,
          },
          { status: err.message.includes("402") ? 402 : 500 }
        );
      }

      // 5. Inter-batch Delay
      // Natural pausing between operations is key to avoiding 429/430 locks.
      if (i + BATCH_SIZE < trackIds.length) {
         const pause = getRandomDelay(BATCH_DELAY_MIN, BATCH_DELAY_MAX);
         console.log(`[SunoSync] Batch complete. Pausing ${pause}ms to prevent heuristic blocks...`);
         await sleep(pause);
      }
    }

    // 6. Return Success
    console.log(`[SunoSync] Successfully synced ${syncedCount} tracks to playlist ${playlistId}.`);
    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${syncedCount} tracks to the Suno playlist.`,
        syncedCount,
        totalCount: trackIds.length,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("[SunoSync] Unexpected handler error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during sync.", details: error.message },
      { status: 500 }
    );
  }
}
