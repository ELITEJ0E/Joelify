import { useState, useEffect } from 'react';

export interface LyricLine {
  time: number;
  text: string;
}

export function useLyrics(trackName?: string, artistName?: string, trackId?: string) {
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackName || !artistName) {
      setLyrics(null);
      return;
    }

    let isMounted = true;

    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try Suno Lyrics API first if we have a trackId (likely a Suno ID due to format)
        if (trackId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trackId)) {
          const sunoRes = await fetch(`/api/suno-lyrics?id=${trackId}`);
          if (sunoRes.ok) {
            const sunoData = await sunoRes.json();
            if (sunoData.lyrics && isMounted) {
               // Suno lyrics might contain timestamps now, so let's parse them properly
               const parsedLyrics = parseLrc(sunoData.lyrics);
               
               // But wait! If the parsed lyrics still end up mainly with time: -1 but they actually have timestamps without brackets?
               // Wait, parseLrc handles falling back to time: -1 per line if there are no timestamps.
               setLyrics(parsedLyrics);
               return;
            }
          }
        }

        // Try exact match on lrclib
        const url = new URL('https://lrclib.net/api/get');
        url.searchParams.append('track_name', trackName);
        url.searchParams.append('artist_name', artistName);

        let res = await fetch(url.toString());
        let data = await res.json();

        if (!res.ok || !data.syncedLyrics) {
          // Try search
          const searchUrl = new URL('https://lrclib.net/api/search');
          searchUrl.searchParams.append('q', `${trackName} ${artistName}`);
          res = await fetch(searchUrl.toString());
          const searchData = await res.json();
          if (searchData && searchData.length > 0 && searchData[0].syncedLyrics) {
            data = searchData[0];
          } else {
            throw new Error('No synced lyrics found');
          }
        }

        if (isMounted && data.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          setLyrics(parsed);
        } else if (isMounted) {
          throw new Error('No synced lyrics found');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch lyrics');
          setLyrics(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchLyrics, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [trackName, artistName, trackId]);

  return { lyrics, isLoading, error };
}

export function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split(/\r?\n/);
  const parsed: LyricLine[] = [];
  
  // Super permissive regex to find any timestamp anywhere in the line
  const regex = /\[\s*(\d{1,3})\s*[:：]\s*(\d{1,2})(?:[.,](\d{1,3}))?\s*\](.*)/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      parsed.push({ time: -1, text: '' });
      continue;
    }

    const match = trimmedLine.match(regex);
    if (match) {
      // Remove the full matched timestamp string from the text, returning just the rest
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3];
      const millis = millisStr ? parseFloat('0.' + millisStr) : 0;
      const text = match[4].trim();
      
      parsed.push({
        time: minutes * 60 + seconds + millis,
        text: text,
      });
    } else {
      parsed.push({
        time: -1,
        text: trimmedLine,
      });
    }
  }

  // To determine if entirely unsynced, check if ALL non-empty lines have time -1
  const hasSyncedLine = parsed.some(line => line.time !== -1 && line.text !== '');
  if (!hasSyncedLine) {
     return lines.map(l => ({ time: -1, text: l.trim() }));
  }

  // Sort lyrics by time, leaving time=-1 lines at the beginning or assigning them sensible times
  return parsed;
}
