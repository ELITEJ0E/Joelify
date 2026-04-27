import { useState, useEffect } from 'react';

export interface LyricLine {
  time: number;
  text: string;
}

export function useLyrics(trackName?: string, artistName?: string) {
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
        // First try exact match
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
  }, [trackName, artistName]);

  return { lyrics, isLoading, error };
}

function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split('\n');
  const parsed: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      parsed.push({
        time: minutes * 60 + seconds,
        text: text || '♪',
      });
    }
  }

  return parsed;
}
