import { NextRequest } from "next/server";
import { handleSunoAudioStreamRequest } from "@/lib/suno/streamResolver";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  const { clipId } = await params;
  return handleSunoAudioStreamRequest(req, clipId);
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ clipId: string }> }
) {
  const { clipId } = await params;
  return handleSunoAudioStreamRequest(req, clipId);
}

