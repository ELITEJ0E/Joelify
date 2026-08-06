"use client";

import { useEffect, useState } from "react";
import { getOfflineAudioBlobUrl } from "@/lib/sunoOffline";

export function SunoPlayer({ songId, isVisible = true }: { songId: string | null; isVisible?: boolean }) {
  const [offlineUrl, setOfflineUrl] = useState<string | null>(null);

  useEffect(() => {
    if (songId) {
      getOfflineAudioBlobUrl(songId).then((url) => {
        setOfflineUrl(url);
      });
    }
  }, [songId]);

  if (!songId || !isVisible) return null;

  if (offlineUrl) {
    return (
      <div className="w-full h-[152px] bg-zinc-900 rounded-md flex items-center justify-center">
        <audio controls src={offlineUrl} className="w-full max-w-sm" />
      </div>
    );
  }

  return (
    <iframe
      src={`https://suno.com/embed/${songId}`}
      width="100%"
      height="152"
      frameBorder="0"
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function parseSunoId(input: string): string | null {
  if (!input) return null;
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match = input.match(uuidRegex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}
