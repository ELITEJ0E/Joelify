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

export function sanitizeLyric(text: string): string {
  if (typeof text !== 'string') return '';
  
  // 1. Normalize Unicode (e.g. combine accented characters)
  let clean = text.normalize("NFC");

  // 2. Remove invisible/invalid characters: BOM, null bytes, and replacement chars
  clean = clean.replace(/[\u0000\uFEFF\uFFFD]/g, '');
  
  // 3. Prevent legacy artifacts ($5c, $5d, $5e) from previous double-encoding issues
  clean = clean.replace(/\$5c/gi, '').replace(/\$5d/gi, '').replace(/\$5e/gi, '');
  
  // 4. Trim whitespace safely
  return clean.trim();
}

export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc || typeof lrc !== 'string') return [];
  
  // Normalize line breaks safely
  const normalized = lrc.replace(/\r\n|\r/g, '\n');
  const lines = normalized.split('\n');
  const parsed: LyricLine[] = [];
  
  // Robust regex: ^\[\s*(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\s*\](.*)$
  const timeRegex = /^\[\s*(\d{2,}):(\d{2})(?:\.(\d{1,3}))?\s*\](.*)$/;

  for (let i = 0; i < lines.length; i++) {
    try {
      const line = lines[i];
      const sanitizedLine = sanitizeLyric(line);

      // Preserve empty lines to maintain vertical structure
      if (!sanitizedLine) {
        parsed.push({ time: -1, text: '' });
        continue;
      }

      const match = sanitizedLine.match(timeRegex);

      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3] || '00';
        
        let centiseconds = parseInt(fractionStr, 10);
        let fraction = 0;
        if (fractionStr.length === 2) {
           fraction = centiseconds / 100;
        } else if (fractionStr.length === 3) {
           fraction = centiseconds / 1000;
        }

        const exactTime = minutes * 60 + seconds + fraction;
        const textContent = sanitizeLyric(match[4]);

        parsed.push({
          time: isNaN(exactTime) ? -1 : exactTime,
          text: textContent
        });
      } else {
        // Unsynchronized line (e.g. untimestamped section headers)
        parsed.push({
          time: -1,
          text: sanitizedLine
        });
      }
    } catch (e) {
      // Prevent crash propagation: One bad lyric line must NOT break the entire file
      console.warn("Failed to parse lyric line", e);
    }
  }

  return parsed;
}
