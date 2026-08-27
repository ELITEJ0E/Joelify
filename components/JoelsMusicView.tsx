"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useTransition, memo } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Trash2, 
  PlusSquare, 
  Music2, 
  GripVertical, 
  Play, 
  Heart, 
  RefreshCw, 
  Lock, 
  Download, 
  X, 
  Search, 
  Share2, 
  Shuffle,
  Clock,
  ListMusic
} from "lucide-react";
import { CustomToast } from "./CustomToast";
import { Input } from "@/components/ui/input";
import { TrackImage as Image } from "./TrackImage";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { FALLBACK_JOELS_SONGS as FALLBACK_SONGS, JOEL_PLAYLIST_ID } from "@/lib/constants";
import { downloadSunoTrack, deleteSunoDownload, listDownloadedSunoIds } from "@/lib/sunoOffline";

export const cleanSunoText = (val: string): string => {
  if (!val) return "";
  let text = val
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x22;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+by\s+@[A-Za-z0-9_.-]+/i, "")
    .replace(/\s*\|\s*Suno.*$/i, "")
    .replace(/\s*-\s*Suno.*$/i, "")
    .replace(/\s*-\s*Playlist by.*$/i, "")
    .replace(/on Suno$/i, "")
    .trim();
  return text;
};

export const PLAYLISTS = [
  { 
    id: JOEL_PLAYLIST_ID, 
    name: "Originals", 
    tag: "ORIGINAL",
    defaultTitle: "Joel's Originals",
    defaultDesc: "",
    type: "public",
    artist: "ELITEJOE"
  },
  { 
    id: "627c2d15-0cca-4c07-91b3-5f203c981e6e", 
    name: "Worship", 
    tag: "WORSHIP",
    defaultTitle: "Private Worship Sanctuary",
    defaultDesc: "",
    type: "password", 
    password: "joelify", 
    storageKey: "joelify_worship_unlocked", 
    label: "Private Worship Sanctuary",
    artist: "ELITEJOE"
  },
  { 
    id: "34ac065b-e68e-4dfa-9780-00c49bae047a", 
    name: "Upcoming", 
    tag: "UPCOMING",
    defaultTitle: "Upcoming Releases",
    defaultDesc: "",
    type: "password", 
    password: "joelify", 
    storageKey: "joelify_special_unlocked", 
    label: "Upcoming Releases",
    artist: "ELITEJOE"
  }
];

interface SortableTrackItemProps {
  track: any;
  index: number;
  isPlayingThis: boolean;
  isCurrentInPlayer: boolean;
  isDownloaded: boolean;
  playSunoTrack: (id: string, title?: string, artist?: string, thumbnail?: string, lyrics?: string) => void;
  toggleLikedSong: (track: any) => void;
  isTrackLiked: (id: string) => boolean;
  addToQueue: (track: any) => void;
  removeSong: (id: string) => void;
  onDownloadToggle: (trackId: string, currentlyDownloaded: boolean) => Promise<void>;
}

const SortableTrackItem = memo(function SortableTrackItem({ 
  track, 
  isPlayingThis,
  isCurrentInPlayer,
  isDownloaded,
  playSunoTrack, 
  toggleLikedSong, 
  isTrackLiked, 
  addToQueue, 
  removeSong,
  onDownloadToggle
}: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track.id });

  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!isDownloaded) {
        setDownloadProgress(1);
        await downloadSunoTrack(track.id, setDownloadProgress);
        await onDownloadToggle(track.id, false);
        setDownloadProgress(0);
        toast.success("Saved for offline playback");
      } else {
        await deleteSunoDownload(track.id);
        await onDownloadToggle(track.id, true);
        toast.success("Removed from offline storage");
      }
    } catch (err) {
      setDownloadProgress(0);
      toast.error("Download failed");
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.6 : 1
  };

  const isFallback = FALLBACK_SONGS.some(s => s.id === track.id);
  const liked = isTrackLiked(track.id);

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group relative rounded-xl px-2.5 py-2 transition-all duration-150 flex items-center justify-between gap-3 ${
        isCurrentInPlayer 
          ? "bg-primary/15 text-white"
          : "hover:bg-white/[0.05] text-zinc-300"
      } ${isDragging ? "bg-zinc-900 shadow-xl opacity-80" : ""}`}
    >
      {/* Left Side: Drag Handle, Thumbnail, Title & Artist */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 text-zinc-600 hover:text-zinc-300 transition-colors touch-none shrink-0"
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </div>

        {/* Thumbnail + Play Hover Overlay */}
        <div 
          className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-800/80 shrink-0 cursor-pointer shadow-sm group/thumb"
          onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail, track.lyrics)}
        >
          <Image 
            src={track.thumbnail || `https://cdn2.suno.ai/image_${track.id}.jpeg`} 
            alt={track.title || "Track"} 
            fill
            className="object-cover transition-transform group-hover/thumb:scale-105 duration-200" 
            referrerPolicy="no-referrer"
          />
          
          <div className={`absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center transition-opacity ${
            isPlayingThis ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
            <Play size={16} fill="white" className="text-white translate-x-0.5" />
          </div>
        </div>

        {/* Title & Artist */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail, track.lyrics)}
        >
          <h3 className={`font-semibold text-sm truncate leading-snug ${
            isCurrentInPlayer ? "text-primary font-bold" : "text-white group-hover:text-primary transition-colors"
          }`}>
            {track.title || "Untitled Track"}
          </h3>
          <p className="text-xs text-zinc-400 truncate mt-0.5 font-mono">
            {track.artist || "ELITEJOE"}
          </p>
        </div>
      </div>

      {/* Right Side: Actions (Download, Like, Add to Queue, Delete) */}
      <div className="flex items-center gap-1 shrink-0">
        
        {/* Offline Download Button */}
        <Button 
          size="icon" 
          variant="ghost" 
          className={`h-8 w-8 rounded-lg ${
            isDownloaded 
              ? "text-primary hover:text-primary hover:bg-primary/10" 
              : "text-zinc-500 hover:text-white hover:bg-white/10"
          }`} 
          onClick={handleDownloadClick}
          title={isDownloaded ? "Downloaded offline" : "Download offline"}
        >
          {downloadProgress > 0 && downloadProgress < 100 ? (
            <span className="text-[10px] font-mono font-bold text-primary animate-pulse">{downloadProgress}%</span>
          ) : isDownloaded ? (
            <Check size={15} />
          ) : (
            <Download size={15} />
          )}
        </Button>

        {/* Like Button */}
        <Button 
          size="icon" 
          variant="ghost" 
          className={`h-8 w-8 rounded-lg ${
            liked 
              ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" 
              : "text-zinc-400 hover:text-red-400 hover:bg-white/10"
          }`} 
          onClick={() => toggleLikedSong(track)}
          title="Like song"
        >
          <Heart size={15} fill={liked ? "currentColor" : "none"} />
        </Button>

        {/* Add to Queue */}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg" 
          onClick={() => {
            addToQueue({ ...track, duration: track.duration || "3:24" });
            toast.custom((t) => (
              <CustomToast 
                t={t} 
                title="Added to queue" 
                Icon={PlusSquare} 
              />
            ))
          }}
          title="Add to queue"
        >
          <PlusSquare size={15} />
        </Button>
        
        {/* Delete Track (Custom Tracks Only) */}
        {!isFallback && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-zinc-500 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-60 hover:opacity-100 transition-opacity" 
            onClick={() => removeSong(track.id)}
            title="Remove song"
          >
            <Trash2 size={15} />
          </Button>
        )}
      </div>
    </div>
  );
});

export function JoelsMusicView() {
  const { 
    setPlaybackSource, 
    setCurrentTrack, 
    currentTrack,
    playbackSource,
    toggleLikedSong, 
    isTrackLiked, 
    addToQueue, 
    setQueue,
    joelsSongs,
    setJoelsSongs,
    setCurrentPlaylistId,
    toggleShuffle,
    shuffle
  } = useApp();

  const [syncPlaylistId, setSyncPlaylistId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // In-memory caches to make tab switches 0ms instant without disk blocking
  const memoryCacheRef = useRef<Record<string, any[]>>({});
  const metaMemoryCacheRef = useRef<Record<string, { title: string; desc: string; image?: string }>>({});

  // Metadata cache per playlist (title, description, and cover image from playlist)
  const [playlistMetaMap, setPlaylistMetaMap] = useState<Record<string, { title: string; desc: string; image?: string }>>({});

  // Password / Lock settings map for private playlists
  const [unlockedPlaylists, setUnlockedPlaylists] = useState<Record<string, boolean>>({});
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Downloaded track IDs Set for instantaneous O(1) checks across all list items
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  // Keep track of which playlist IDs have been synced during this mount session
  const [syncedPlaylistsThisSession, setSyncedPlaylistsThisSession] = useState<Record<string, boolean>>({});

  // Initialize downloaded track IDs once on mount
  useEffect(() => {
    listDownloadedSunoIds().then((ids) => {
      setDownloadedIds(new Set(ids));
    });
  }, []);

  const handleDownloadToggle = useCallback(async (trackId: string, currentlyDownloaded: boolean) => {
    setDownloadedIds(prev => {
      const next = new Set(prev);
      if (currentlyDownloaded) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const loadPlaylistLocalCache = useCallback((playlistId: string) => {
    // 1. Check in-memory cache first (0ms instant)
    if (memoryCacheRef.current[playlistId]) {
      setJoelsSongs(memoryCacheRef.current[playlistId]);
    } else {
      // 2. Fallback to localStorage
      const cachedKey = `joely_tracks_${playlistId}`;
      const cachedStr = typeof window !== "undefined" ? localStorage.getItem(cachedKey) : null;
      if (cachedStr) {
        try {
          const parsed = JSON.parse(cachedStr);
          memoryCacheRef.current[playlistId] = parsed;
          setJoelsSongs(parsed);
        } catch (e) {
          console.warn("Error parsing cache", e);
        }
      } else {
        // Fallback if no cache found
        if (playlistId === JOEL_PLAYLIST_ID) {
          const fb = [...FALLBACK_SONGS].reverse();
          memoryCacheRef.current[playlistId] = fb;
          setJoelsSongs(fb);
        } else {
          setJoelsSongs([]);
        }
      }
    }

    // Load meta
    if (metaMemoryCacheRef.current[playlistId]) {
      setPlaylistMetaMap(prev => ({
        ...prev,
        [playlistId]: metaMemoryCacheRef.current[playlistId]
      }));
    } else {
      const metaKey = `joely_meta_${playlistId}`;
      const metaStr = typeof window !== "undefined" ? localStorage.getItem(metaKey) : null;
      if (metaStr) {
        try {
          const parsed = JSON.parse(metaStr);
          if (parsed.title || parsed.desc !== undefined || parsed.image) {
            const metaObj = {
              title: parsed.title || "",
              desc: parsed.desc || "",
              image: parsed.image || ""
            };
            metaMemoryCacheRef.current[playlistId] = metaObj;
            setPlaylistMetaMap(prev => ({
              ...prev,
              [playlistId]: metaObj
            }));
          }
        } catch (e) {}
      }
    }
  }, [setJoelsSongs]);

  useEffect(() => {
    // Check unlocked state for password-locked playlists
    const unlockedMap: Record<string, boolean> = {};
    PLAYLISTS.forEach(p => {
      if (p.type === "password" && p.storageKey) {
        unlockedMap[p.id] = localStorage.getItem(p.storageKey) === 'true';
      }
    });
    setUnlockedPlaylists(unlockedMap);

    // Default to Originals playlist upon initial load
    const savedId = JOEL_PLAYLIST_ID;
    setSyncPlaylistId(savedId);
  }, []);

  const syncPlaylist = async (id: string, isRetry = false) => {
    if (!isRetry) {
      setIsSyncing(true);
    }
    
    let serverData: any = null;
    let didServerSucceed = false;

    // 1. Try server proxy
    try {
      const res = await fetch(`/api/suno-playlist?id=${id}&_t=${Date.now()}`);
      const text = await res.text();
      try { serverData = JSON.parse(text); } catch (e) { console.warn("Invalid server JSON"); }
      if (res.ok && serverData?.tracks && serverData.tracks.length > 0) {
        didServerSucceed = true;
      }
    } catch (e) {
      console.warn("Server route failed, trying client proxies.");
    }

    // 2. Client-side fallback proxies
    if (!didServerSucceed) {
      const clientProxies = [
        {
          name: "AllOrigins",
          url: (uid: string) => "https://api.allorigins.win/get?url=" + encodeURIComponent(`https://suno.com/playlist/${uid}`),
          parse: (data: any) => data?.contents
        },
        {
          name: "CodeTabs",
          url: (uid: string) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(`https://suno.com/playlist/${uid}`),
          parse: (data: any) => typeof data === "string" ? data : JSON.stringify(data)
        },
        {
          name: "CorsProxyIO",
          url: (uid: string) => "https://corsproxy.io/?url=" + encodeURIComponent(`https://suno.com/playlist/${uid}`),
          parse: (data: any) => typeof data === "string" ? data : JSON.stringify(data)
        }
      ];

      for (const proxy of clientProxies) {
        try {
          const fetchUrl = proxy.url(id);
          const res = await fetch(fetchUrl);
          if (!res.ok) continue;

          let rawData;
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            rawData = await res.json();
          } else {
            rawData = await res.text();
          }

          const html = proxy.parse(rawData);
          if (!html || typeof html !== "string") continue;
          
          let foundClips: any[] = [];
          let foundTitle = "";
          let foundDescription = "";

          // HTML meta tags extraction
          const titleTagMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                                html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
                                html.match(/<title>([^<]+)<\/title>/i);
          if (titleTagMatch && titleTagMatch[1]) {
            const cleaned = titleTagMatch[1]
              .replace(/\s*\|\s*Suno.*$/i, '')
              .replace(/\s*-\s*Suno.*$/i, '')
              .replace(/\s*-\s*Playlist by.*$/i, '')
              .replace(/on Suno$/i, '')
              .trim();
            if (cleaned && !["Suno", "Suno AI", "Listen on Suno", "Explore"].includes(cleaned)) {
              foundTitle = cleaned;
            }
          }

          const descTagMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                               html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
          if (descTagMatch && descTagMatch[1]) {
            const cleaned = descTagMatch[1].trim();
            if (cleaned && 
                !cleaned.toLowerCase().includes("listen to songs by") && 
                !cleaned.toLowerCase().includes("listen to this playlist") && 
                !cleaned.toLowerCase().includes("suno is building")) {
              foundDescription = cleaned;
            }
          }

          let foundImage = "";
          const imgTagMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                              html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                              html.match(/<meta\s+name=["']image["']\s+content=["']([^"']+)["']/i);
          if (imgTagMatch && imgTagMatch[1]) {
            const im = imgTagMatch[1].trim();
            if (im && !im.includes("suno.com/favicon") && !im.endsWith(".ico") && !im.includes("1x1")) {
              foundImage = im;
            }
          }

          let idx = 0;
          while (true) {
            const pushIdx = html.indexOf('__next_f.push(', idx);
            if (pushIdx === -1) break;
            
            const startIdx = pushIdx + '__next_f.push('.length; 
            let inString = false;
            let stringChar = '';
            let isEscaped = false;
            let foundEnd = -1;
            
            for (let i = startIdx; i < html.length; i++) {
              const char = html[i];
              if (inString) {
                if (isEscaped) isEscaped = false;
                else if (char === '\\') isEscaped = true;
                else if (char === stringChar) inString = false;
              } else {
                if (char === '"' || char === "'") {
                  inString = true;
                  stringChar = char;
                } else if (char === ')') {
                  foundEnd = i;
                  break;
                }
              }
            }
            if (foundEnd !== -1) {
              const payload = html.substring(startIdx, foundEnd);
              const playlistClipRegex = /"clip":\s*(\{[^}]+\})/g;
              let match;
              while ((match = playlistClipRegex.exec(payload)) !== null) {
                try {
                  const clipObj = JSON.parse(match[1]);
                  if (clipObj && clipObj.id && clipObj.audio_url) {
                    foundClips.push(clipObj);
                  }
                } catch {}
              }
              const titleM = payload.match(/"name"\s*:\s*"([^"]+)"/);
              if (titleM && titleM[1] && !["chirp", "v4", "v3", "Suno"].includes(titleM[1])) {
                foundTitle = titleM[1];
              }
              const descM = payload.match(/"description"\s*:\s*"([^"]+)"/);
              if (descM && descM[1]) {
                foundDescription = descM[1];
              }
              const imgM = payload.match(/"image_url"\s*:\s*"([^"]+)"/);
              if (imgM && imgM[1] && !foundImage) {
                foundImage = imgM[1];
              }

              idx = foundEnd + 1;
            } else {
              idx = pushIdx + 1;
            }
          }

          if (foundClips.length > 0) {
            const clientTracks = foundClips.map((c: any) => ({
              id: c.id,
              title: c.title || "Untitled",
              artist: c.display_name || "ELITEJOE",
              thumbnail: c.image_url || `https://cdn2.suno.ai/image_${c.id}.jpeg`,
              lyrics: c.metadata?.prompt || ""
            })).reverse();

            serverData = { 
              name: foundTitle, 
              description: foundDescription,
              image_url: foundImage,
              tracks: clientTracks 
            };
            didServerSucceed = true;
            break;
          }
        } catch (err) {
          console.warn(`Proxy ${proxy.name} error:`, err);
        }
      }
    }

    if (serverData?.tracks && Array.isArray(serverData.tracks) && serverData.tracks.length > 0) {
      memoryCacheRef.current[id] = serverData.tracks;
      setJoelsSongs(serverData.tracks);
      localStorage.setItem(`joely_tracks_${id}`, JSON.stringify(serverData.tracks));

      // Save metadata if provided
      const finalTitle = (serverData.name && serverData.name !== "Suno Playlist") ? serverData.name : "";
      const finalDesc = serverData.description || "";
      const finalImage = serverData.image_url || "";
      
      const metaObj = {
        title: finalTitle || playlistMetaMap[id]?.title || "",
        desc: finalDesc,
        image: finalImage || playlistMetaMap[id]?.image || ""
      };
      metaMemoryCacheRef.current[id] = metaObj;

      setPlaylistMetaMap(prev => ({
        ...prev,
        [id]: metaObj
      }));
      localStorage.setItem(`joely_meta_${id}`, JSON.stringify(metaObj));

      toast.custom((t) => (
        <CustomToast 
          t={t} 
          title="Playlist Synced" 
          description={`Updated with ${serverData.tracks.length} tracks.`} 
          Icon={Check} 
        />
      ));
    } else {
      if (!isRetry) {
        toast.info("Using cached songs. Updating playlist...");
        setTimeout(() => {
          syncPlaylist(id, true);
        }, 1500);
      }
    }
    setIsSyncing(false);
  };

  // Whenever syncPlaylistId changes, load cache and auto-sync once
  useEffect(() => {
    if (syncPlaylistId) {
      loadPlaylistLocalCache(syncPlaylistId);

      const targetPlaylist = PLAYLISTS.find(p => p.id === syncPlaylistId);
      const isLocked = targetPlaylist?.type === "password" && !unlockedPlaylists[syncPlaylistId];

      if (!isLocked) {
        if (!syncedPlaylistsThisSession[syncPlaylistId]) {
          setSyncedPlaylistsThisSession(prev => ({ ...prev, [syncPlaylistId]: true }));
          syncPlaylist(syncPlaylistId);
        }
      }
    }
  }, [syncPlaylistId, unlockedPlaylists, syncedPlaylistsThisSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAutoSync = () => {
    if (syncPlaylistId) {
      syncPlaylist(syncPlaylistId);
    } else {
      syncPlaylist(JOEL_PLAYLIST_ID);
    }
  };

  const handleVerifyPassword = () => {
    const currentPlaylistConfig = PLAYLISTS.find(p => p.id === syncPlaylistId);
    if (!currentPlaylistConfig || currentPlaylistConfig.type !== "password") return;

    const attemptedInput = passwordInput.trim().toLowerCase();
    const correctPassword = currentPlaylistConfig.password?.toLowerCase();

    if (attemptedInput === correctPassword) {
      if (currentPlaylistConfig.storageKey) {
        localStorage.setItem(currentPlaylistConfig.storageKey, 'true');
      }

      setUnlockedPlaylists(prev => ({
        ...prev,
        [currentPlaylistConfig.id]: true
      }));

      toast.custom((t) => (
        <CustomToast 
          t={t} 
          title="Playlist Unlocked!" 
          description={`Unlocked Joel's ${currentPlaylistConfig.name} collection.`} 
          Icon={Check} 
        />
      ));
      setPasswordError("");
      setPasswordInput("");
      
      loadPlaylistLocalCache(currentPlaylistConfig.id);
      setSyncedPlaylistsThisSession(prev => ({ ...prev, [currentPlaylistConfig.id]: true }));
      syncPlaylist(currentPlaylistConfig.id);
    } else {
      setPasswordError("Incorrect passkey. Please try again.");
    }
  };

  const removeSong = useCallback((id: string) => {
    const updated = joelsSongs.filter(s => s.id !== id);
    const activeId = syncPlaylistId || JOEL_PLAYLIST_ID;
    memoryCacheRef.current[activeId] = updated;
    setJoelsSongs(updated);
    localStorage.setItem(`joely_tracks_${activeId}`, JSON.stringify(updated));

    toast.custom((t) => (
      <CustomToast 
        t={t} 
        title="Song removed from playlist" 
        Icon={Trash2} 
      />
    ));
  }, [joelsSongs, syncPlaylistId, setJoelsSongs]);

  const playSunoTrack = useCallback((id: string, title?: string, artist?: string, thumbnail?: string, lyrics?: string) => {
    setPlaybackSource("suno");
    const timestamp = Date.now();
    const isVideo = thumbnail ? (thumbnail.includes('.mp4') || thumbnail.includes('video_upload')) : false;
    const finalThumbnail = thumbnail 
      ? (isVideo ? thumbnail : (thumbnail.includes('?') ? `${thumbnail}&_t=${timestamp}` : `${thumbnail}?_t=${timestamp}`))
      : `https://cdn2.suno.ai/image_${id}.jpeg?v=${timestamp}`;
      
    setCurrentTrack({
      id,
      title: title || "Joel's Song",
      artist: artist || "ELITEJOE",
      thumbnail: finalThumbnail,
      duration: "3:24",
      lyrics: lyrics || ""
    });
    setCurrentPlaylistId("joels_music");
  }, [setPlaybackSource, setCurrentTrack, setCurrentPlaylistId]);

  const handlePlayAll = useCallback(() => {
    if (joelsSongs.length === 0) return;
    const first = joelsSongs[0];
    playSunoTrack(first.id, first.title, first.artist, first.thumbnail, first.lyrics);
    setQueue(joelsSongs);
    toast.success(`Playing ${joelsSongs.length} tracks`);
  }, [joelsSongs, playSunoTrack, setQueue]);

  const handleSharePlaylist = useCallback(() => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({
        title: "Joel's Music Collection",
        text: "Check out Joel's music collection!",
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Playlist link copied to clipboard!");
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = joelsSongs.findIndex(s => s.id === active.id);
      const newIndex = joelsSongs.findIndex(s => s.id === over.id);
      const updated = arrayMove(joelsSongs, oldIndex, newIndex);
      const activeId = syncPlaylistId || JOEL_PLAYLIST_ID;
      memoryCacheRef.current[activeId] = updated;
      setJoelsSongs(updated);
      localStorage.setItem(`joely_tracks_${activeId}`, JSON.stringify(updated));
    }
  }, [joelsSongs, syncPlaylistId, setJoelsSongs]);

  // Filtered song list
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return joelsSongs;
    const q = searchQuery.toLowerCase();
    return joelsSongs.filter(s => 
      s.title?.toLowerCase().includes(q) || 
      s.artist?.toLowerCase().includes(q)
    );
  }, [joelsSongs, searchQuery]);

  // Compute active config & playlist metadata
  const activePlaylistConfig = PLAYLISTS.find(p => p.id === syncPlaylistId) || PLAYLISTS[0];
  const isCurrentLocked = activePlaylistConfig?.type === "password" && !unlockedPlaylists[syncPlaylistId || ""];

  // Playlist Title & Description priority: Actual synced Suno metadata -> Config default
  const activeMeta = syncPlaylistId ? playlistMetaMap[syncPlaylistId] : null;
  const displayTitle = activeMeta?.title || activePlaylistConfig.defaultTitle || activePlaylistConfig.name;
  const displayDesc = activeMeta?.desc?.trim() || "";

  // Playlist cover image: Synced cover image returned by the playlist itself -> first track's thumbnail -> fallback default
  const playlistCoverImage = activeMeta?.image || 
    (joelsSongs.length > 0 && joelsSongs[0]?.thumbnail
      ? joelsSongs[0].thumbnail
      : (FALLBACK_SONGS[0]?.thumbnail || "https://cdn2.suno.ai/24c69462-2727-415e-8f27-cdc43e0184db.jpeg?width=480"));

  // Approximate total duration calculation (average ~3:05 per track or actual duration string)
  const totalDurationFormatted = useMemo(() => {
    let totalSeconds = 0;
    joelsSongs.forEach((song) => {
      if (song.duration && song.duration.includes(":")) {
        const parts = song.duration.split(":");
        const min = parseInt(parts[0], 10) || 0;
        const sec = parseInt(parts[1], 10) || 0;
        totalSeconds += min * 60 + sec;
      } else {
        totalSeconds += 185; // ~3m 05s default
      }
    });

    if (totalSeconds === 0) return "0:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [joelsSongs]);

  return (
    <div className="flex-1 bg-transparent text-foreground pb-44 md:pb-52 overflow-y-auto relative">
      
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 relative z-10 w-full">

        {/* ── PLAYLIST HEADER (MATCHING SCREENSHOT LAYOUT & STYLING) ───────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 pt-2">
          
          {/* Left: Artwork Cover */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl shrink-0 bg-zinc-900/90 group">
            <Image 
              src={playlistCoverImage} 
              alt={cleanSunoText(displayTitle)} 
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105" 
              referrerPolicy="no-referrer" 
            />
          </div>

          {/* Right: Metadata, Title, Description, Stats & Action Buttons */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3 sm:space-y-0 w-full py-0.5">
            
            {/* Top Group: Tag Pill, Artist, Title, Description */}
            <div className="space-y-2 sm:space-y-2.5">
              {/* Tag Pill + Artist */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-primary/15 border border-primary/40 text-primary font-mono text-xs font-bold shadow-sm">
                  {activePlaylistConfig.name}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Artist: <strong className="text-white font-bold tracking-wide">{activePlaylistConfig.artist || "ELITEJOE"}</strong>
                </span>
              </div>

              {/* Main Title (Cleaned of HTML entities and boilerplate) */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-white tracking-tight leading-tight">
                {cleanSunoText(displayTitle)}
              </h1>

              {/* Description (Only displays if playlist has a description on Suno) */}
              {displayDesc && displayDesc.length > 0 && (
                <p className="text-xs sm:text-sm text-zinc-400 font-mono leading-relaxed line-clamp-2">
                  {cleanSunoText(displayDesc)}
                </p>
              )}
            </div>

            {/* Bottom Group: Stats & Action Buttons */}
            <div className="space-y-2.5 sm:space-y-3 pt-2 sm:pt-3">
              {/* Stats Row */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <ListMusic size={16} className="text-primary" />
                  <span>{joelsSongs.length} Songs</span>
                </div>
                
                <span className="text-zinc-600">•</span>
                
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <Clock size={15} className="text-cyan-400" />
                  <span>{totalDurationFormatted} Total</span>
                </div>
              </div>

              {/* Action Buttons Row: PLAY ALL, SHUFFLE, SHARE */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Play All Button */}
                <button
                  onClick={handlePlayAll}
                  disabled={joelsSongs.length === 0}
                  className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-mono font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play size={15} fill="currentColor" />
                  <span>PLAY ALL</span>
                </button>

                {/* Shuffle Toggle Button */}
                <button
                  onClick={toggleShuffle}
                  className={`h-10 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                    shuffle
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-zinc-900/90 hover:bg-zinc-800 border-white/10 text-white"
                  }`}
                  title={shuffle ? "Shuffle is ON" : "Shuffle is OFF"}
                >
                  <Shuffle size={14} />
                  <span>SHUFFLE</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={handleSharePlaylist}
                  className="h-10 px-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-white font-mono text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
                  title="Share playlist"
                >
                  <Share2 size={14} />
                  <span>Share</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Subtle Divider */}
        <div className="border-t border-white/10 my-1" />

        {/* ── PLAYLIST TABS / SELECTOR & SYNC BUTTON (PLACED ABOVE THE SEARCH BAR) ──────── */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {PLAYLISTS.map((playlist) => {
              const isSelected = syncPlaylistId === playlist.id;
              const isLocked = playlist.type === "password" && !unlockedPlaylists[playlist.id];
              
              return (
                <button
                  key={playlist.id}
                  onClick={() => {
                    startTransition(() => {
                      setSyncPlaylistId(playlist.id);
                    });
                  }}
                  className={`h-8 px-3.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5"
                  }`}
                >
                  {playlist.type === "password" ? (
                    <Lock 
                      size={12} 
                      className={isSelected ? "text-primary-foreground" : isLocked ? "text-amber-400" : "text-zinc-400"} 
                    />
                  ) : (
                    <Music2 size={12} />
                  )}
                  <span>{playlist.name}</span>
                  {isLocked && (
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sync Button Inline with Playlist tabs */}
          <button
            onClick={handleAutoSync}
            disabled={isSyncing}
            className="h-8 px-3 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-primary/40 text-zinc-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 ml-auto"
            title="Sync playlist"
          >
            <RefreshCw size={13} className={`text-primary ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>

        {/* ── Password Locked View or Tracks View ────────────────────────────── */}
        {(() => {
          if (isCurrentLocked) {
            return (
              <div className="flex flex-col items-center justify-center py-16 px-6 max-w-md mx-auto text-center bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl space-y-6 shadow-2xl my-6">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-lg animate-bounce">
                  <Lock size={28} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-white">{activePlaylistConfig?.label || "Private Collection"}</h2>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    This playlist is encrypted. Enter passcode to unlock.
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <Input
                    type="password"
                    placeholder="Enter passcode..."
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError("");
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                    className="bg-black/50 border-white/10 rounded-xl pr-10 focus-visible:ring-primary focus:border-primary h-11 text-center font-mono tracking-widest text-lg text-white"
                  />
                  {passwordError && (
                    <p className="text-xs text-red-400 font-mono font-medium animate-pulse">{passwordError}</p>
                  )}
                  <Button
                    variant="default"
                    onClick={handleVerifyPassword}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold tracking-wide transition-all cursor-pointer"
                  >
                    Unlock Playlist
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {/* Search Bar - with generous left padding so icon never overlaps placeholder */}
              <div className="relative max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <Input 
                  type="text"
                  placeholder="Search songs or artist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-11 pr-8 bg-zinc-900/60 border-white/10 rounded-xl text-white placeholder:text-zinc-500 font-mono text-xs w-full focus:border-primary/50"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Clean Track Rows (No individual card borders, matching earlier version) */}
              {filteredSongs.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredSongs.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {filteredSongs.map((track, i) => {
                        const isCurrentInPlayer = currentTrack?.id === track.id && playbackSource === "suno";
                        const isPlayingThis = isCurrentInPlayer;

                        return (
                          <SortableTrackItem
                            key={track.id}
                            track={track}
                            index={i}
                            isPlayingThis={isPlayingThis}
                            isCurrentInPlayer={isCurrentInPlayer}
                            isDownloaded={downloadedIds.has(track.id)}
                            playSunoTrack={playSunoTrack}
                            toggleLikedSong={toggleLikedSong}
                            isTrackLiked={isTrackLiked}
                            addToQueue={addToQueue}
                            removeSong={removeSong}
                            onDownloadToggle={handleDownloadToggle}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-16 bg-zinc-900/20 rounded-2xl border border-dashed border-white/10">
                  <Music2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-mono text-xs">No matching tracks found.</p>
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
