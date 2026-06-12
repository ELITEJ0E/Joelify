"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Check, Trash2, PlusSquare, Music2, GripVertical, Play, Heart, RefreshCw, Lock, Unlock } from "lucide-react";
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

export const PLAYLISTS = [
  { 
    id: JOEL_PLAYLIST_ID, 
    name: "Originals", 
    type: "public" 
  },
  { 
    id: "627c2d15-0cca-4c07-91b3-5f203c981e6e", 
    name: "Worship", 
    type: "password", 
    password: "joelify", 
    storageKey: "joelify_worship_unlocked", 
    label: "Private Worship Sanctuary", 
    desc: "This Worship collection is private. Enter passcode to unlock and enjoy the spirits of praise." 
  },
  { 
    id: "34ac065b-e68e-4dfa-9780-00c49bae047a", 
    name: "Upcoming", 
    type: "password", 
    password: "joelify", 
    storageKey: "joelify_special_unlocked", 
    label: "Upcoming Releases", 
    desc: "New and exclusive songs are coming soon. Stay tuned! Enter passcode to unlock sneak peaks." 
  }
];

interface SortableTrackItemProps {
  track: any;
  index: number;
  playSunoTrack: any;
  toggleLikedSong: any;
  isTrackLiked: any;
  addToQueue: any;
  removeSong: any;
}

function SortableTrackItem({ 
  track, 
  index, 
  playSunoTrack, 
  toggleLikedSong, 
  isTrackLiked, 
  addToQueue, 
  removeSong 
}: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1
  };

  const isFallback = FALLBACK_SONGS.some(s => s.id === track.id);

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`group flex items-center justify-between p-1.5 sm:p-2 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent ${isDragging ? 'bg-white/[0.05] border-primary/20 shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 pr-2 sm:pr-4">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/30 hover:text-primary transition-colors touch-none"
        >
          <GripVertical size={18} />
        </div>

        <div className="relative aspect-square w-12 flex-shrink-0 cursor-pointer overflow-hidden border border-white/5" onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail, track.lyrics)}>
          {track.thumbnail ? (
            <Image 
              src={track.thumbnail} 
              alt={track.title} 
              fill
              className="object-cover" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Music2 size={20} className="text-primary/70" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play size={18} fill="white" className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail, track.lyrics)}>
          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{track.title}</h3>
          <p className="text-xs text-muted-foreground truncate opacity-70 mt-0.5">{track.artist}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className={`h-8 w-8 ${isTrackLiked(track.id) ? "text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`} onClick={() => toggleLikedSong(track)}>
          <Heart size={16} fill={isTrackLiked(track.id) ? "currentColor" : "none"} />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => {
          addToQueue({ ...track, duration: "0:00" });
          toast.custom((t) => (
            <CustomToast 
              t={t} 
              title="Added to queue" 
              Icon={PlusSquare} 
            />
          ))
        }}>
          <PlusSquare size={16} />
        </Button>
        
        {!isFallback && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" 
            onClick={() => removeSong(track.id)}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

export function JoelsMusicView() {
  const { 
    setPlaybackSource, 
    setCurrentTrack, 
    toggleLikedSong, 
    isTrackLiked, 
    addToQueue,
    joelsSongs,
    setJoelsSongs,
    setCurrentPlaylistId
  } = useApp();
  const [syncPlaylistId, setSyncPlaylistId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);



  // Password / Lock settings map for private playlists
  const [unlockedPlaylists, setUnlockedPlaylists] = useState<Record<string, boolean>>({});
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Keep track of which playlist IDs have been synced during this mount session
  const [syncedPlaylistsThisSession, setSyncedPlaylistsThisSession] = useState<Record<string, boolean>>({});

  const loadPlaylistLocalCache = (playlistId: string) => {
    const cachedKey = `joely_tracks_${playlistId}`;
    const cachedStr = localStorage.getItem(cachedKey);
    if (cachedStr) {
      try {
        setJoelsSongs(JSON.parse(cachedStr));
        return true;
      } catch (e) {
        console.warn("Error parsing cache", e);
      }
    }
    
    // Fallback if no cache found
    if (playlistId === JOEL_PLAYLIST_ID) {
      setJoelsSongs([...FALLBACK_SONGS].reverse());
    } else {
      setJoelsSongs([]);
    }
    return false;
  };

  useEffect(() => {
    // Check unlocked state for password-locked playlists
    const unlockedMap: Record<string, boolean> = {};
    PLAYLISTS.forEach(p => {
      if (p.type === "password" && p.storageKey) {
        unlockedMap[p.id] = localStorage.getItem(p.storageKey) === 'true';
      }
    });
    setUnlockedPlaylists(unlockedMap);

    // Default to saved playlist or Originals
    const savedId = localStorage.getItem('joel_sync_playlist_id') || JOEL_PLAYLIST_ID;
    setSyncPlaylistId(savedId);
  }, []);

  const syncPlaylist = async (id: string, isRetry = false) => {
    if (!isRetry) {
      setIsSyncing(true);
      setSyncError(false);
    }
    
    let serverData: any = null;
    let didServerSucceed = false;

    // TRY SERVER PROXIES
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

    // TRY CLIENT PROXIES (Bypass Vercel blocks)
    if (!didServerSucceed) {
      console.log("Attempting client-side extraction...");
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
          for (const match of html.matchAll(/self\.__next_f\.push\((\[1,"(?:\\.|[^"\\])*"\])\)/g)) {
              try {
                const arr = JSON.parse(match[1]);
                const str = arr[1];
                if (typeof str !== 'string') continue;
                let startIdx = str.indexOf('"playlist_clips":');
                if (startIdx !== -1) {
                    const objStart = str.lastIndexOf('{', startIdx);
                    if (objStart !== -1) {
                        let braceCount = 0;
                        for (let i = objStart; i < str.length; i++) {
                            if (str[i] === '{') braceCount++;
                            else if (str[i] === '}') {
                                braceCount--;
                                if (braceCount === 0) {
                                    try {
                                        const jsonObj = JSON.parse(str.substring(objStart, i + 1));
                                        if (jsonObj?.playlist_clips?.length > 0) {
                                            foundClips = jsonObj.playlist_clips.map((pc: any) => pc.clip).filter(Boolean);
                                            break;
                                        }
                                    } catch(e) {}
                                }
                            }
                        }
                    }
                }
                if (foundClips.length > 0) break;
              } catch(e) {}
          }

          const formatDuration = (val: number) => {
            if (!val) return "0:00";
            const d = Math.round(val);
            return `${Math.floor(d / 60)}:${Math.floor(d % 60).toString().padStart(2, "0")}`;
          };

          if (foundClips.length > 0) {
            const formattedTracks = foundClips.map((clip: any) => ({
              id: clip.id || clip.clip_id,
              title: clip.title || "Unknown Title",
              artist: clip.display_name || "Suno AI",
              coverImage: clip.image_url || clip.image_large_url,
              src: clip.audio_url || clip.video_url,
              duration: clip.metadata?.duration ? formatDuration(clip.metadata.duration) : "0:00",
              source: "suno",
              lyrics: clip.metadata?.prompt || clip.metadata?.text || undefined,
              thumbnail: clip.image_url || clip.image_large_url || null,
            })).reverse();
            serverData = { tracks: formattedTracks };
            didServerSucceed = true;
            console.log(`Client-side scraping succeeded with ${proxy.name}:`, formattedTracks.length, "tracks");
            break;
          }
        } catch (err) {
          console.warn(`Proxy fallback ${proxy.name} failed:`, err);
        }
      }
    }

    if (!didServerSucceed) {
        // Silent fallback - users just see existing or fallback songs specific to this playlist id
        console.warn("Suno API restricted or proxies failed");
        const cachedKey = `joely_tracks_${id}`;
        const cachedStr = localStorage.getItem(cachedKey);
        
        if (cachedStr) {
          try {
            setJoelsSongs(JSON.parse(cachedStr));
          } catch (e) {
            setJoelsSongs([]);
          }
        } else {
          if (id === JOEL_PLAYLIST_ID) {
            setJoelsSongs([...FALLBACK_SONGS].reverse());
          } else {
            setJoelsSongs([]);
          }
        }
        setIsSyncing(false);
        setInitialLoading(false);
        return;
    }
    
    if (serverData?.tracks) {
      // Apply cache buster to images
      const timestamp = Date.now();
      const tracksWithBuster = serverData.tracks.map((t: any) => ({
        ...t,
        thumbnail: t.thumbnail ? (t.thumbnail.includes('?') ? `${t.thumbnail}&_t=${timestamp}` : `${t.thumbnail}?_t=${timestamp}`) : t.thumbnail
      }));
      
      const cachedKey = `joely_tracks_${id}`;
      let cachedTracks: any[] = [];
      const cachedStr = localStorage.getItem(cachedKey);
      if (cachedStr) {
        try { cachedTracks = JSON.parse(cachedStr); } catch (e) {}
      } else if (id === JOEL_PLAYLIST_ID) {
        cachedTracks = [...FALLBACK_SONGS].reverse();
      }

      const merged = [...tracksWithBuster];
      cachedTracks.forEach(oldTrack => {
        if (!merged.some((t: any) => t.id === oldTrack.id) && oldTrack.id) {
          merged.push(oldTrack);
        }
      });

      localStorage.setItem(cachedKey, JSON.stringify(merged));
      setJoelsSongs(merged);
      
      setSyncPlaylistId(id);
      localStorage.setItem('joel_sync_playlist_id', id);
    }
    
    setIsSyncing(false);
    setInitialLoading(false);
  };



  useEffect(() => {
    if (!syncPlaylistId) return;

    const currentPlaylistConfig = PLAYLISTS.find(p => p.id === syncPlaylistId);
    if (currentPlaylistConfig?.type === "password") {
      const isUnlocked = unlockedPlaylists[syncPlaylistId];
      if (!isUnlocked) {
        setInitialLoading(false);
        return;
      }
    }

    // Load partition cache instantly
    loadPlaylistLocalCache(syncPlaylistId);

    // Sync live from Suno in background only once per mount session
    if (!syncedPlaylistsThisSession[syncPlaylistId]) {
      setSyncedPlaylistsThisSession(prev => ({ ...prev, [syncPlaylistId]: true }));
      syncPlaylist(syncPlaylistId);
    } else {
      setInitialLoading(false);
    }
  }, [syncPlaylistId, unlockedPlaylists, syncedPlaylistsThisSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMetadataOnly = async () => {
    try {
      const allIds = joelsSongs.map(s => s.id);
      if (allIds.length === 0) return;

      // Ensure we don't exceed URL length limits (around 2048 chars for safety)
      const maxIdsPerRequest = 20; 
      let allClips: any[] = [];
      let isRestricted = false;

      for (let i = 0; i < allIds.length; i += maxIdsPerRequest) {
        const chunkIds = allIds.slice(i, i + maxIdsPerRequest).join(",");
        const res = await fetch(`/api/suno-metadata?ids=${chunkIds}`);
        
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`Invalid JSON response: ${res.status} - ${text.substring(0, 50)}`);
          continue; // Skip this chunk if it fails to parse
        }
        
        if (data.isRestricted || !res.ok) {
           isRestricted = true;
           break;
        }

        if (data.clips && Array.isArray(data.clips)) {
           allClips.push(...data.clips);
        }
      }
      
      if (isRestricted || allClips.length === 0) return;
      
      const timestamp = Date.now();
      const updatedSongs = joelsSongs.map(song => {
        const fresh = allClips.find((c: any) => c.id === song.id);
        if (fresh) {
          const fallbackTrack = FALLBACK_SONGS.find(f => f.id === song.id);
          let sunoProvidedMp4 = null;
          if (fresh.video_cover_url?.includes('.mp4') || fresh.video_cover_url?.includes('video_upload')) {
            sunoProvidedMp4 = fresh.video_cover_url;
          } else if (fresh.video_url?.includes('video_upload')) {
            sunoProvidedMp4 = fresh.video_url;
          }

          let latestImg = sunoProvidedMp4 || fresh.custom_image_url || fresh.image_url || fresh.cover_url || fresh.artwork_url || song.thumbnail;
          
          if (!sunoProvidedMp4) {
            if (fallbackTrack?.thumbnail?.includes('.mp4') || fallbackTrack?.thumbnail?.includes('video_upload')) {
              latestImg = fallbackTrack.thumbnail;
            } else if (song.thumbnail?.includes('.mp4') || song.thumbnail?.includes('video_upload')) {
              latestImg = song.thumbnail;
            }
          }
          
          const buster = latestImg.includes("?") ? `&_t=${timestamp}` : `?_t=${timestamp}`;
          return {
            ...song,
            title: fresh.title || song.title,
            artist: fresh.display_name || song.artist,
            thumbnail: latestImg.includes('.mp4') ? latestImg : latestImg + buster,
            lyrics: fresh.metadata?.prompt || song.lyrics || ""
          };
        }
        return song;
      });
      setJoelsSongs(updatedSongs);
    } catch (error) {
      console.error("Metadata update error", error);
    }
  };

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
      // Store in localStorage
      if (currentPlaylistConfig.storageKey) {
        localStorage.setItem(currentPlaylistConfig.storageKey, 'true');
      }

      // Update state map
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
      
      // Load and sync instantly
      loadPlaylistLocalCache(currentPlaylistConfig.id);
      setSyncedPlaylistsThisSession(prev => ({ ...prev, [currentPlaylistConfig.id]: true }));
      syncPlaylist(currentPlaylistConfig.id);
    } else {
      setPasswordError("Incorrect passkey. Please try again.");
    }
  };

  const removeSong = (id: string) => {
    const updated = joelsSongs.filter(s => s.id !== id);
    setJoelsSongs(updated);
    
    const activeId = syncPlaylistId || JOEL_PLAYLIST_ID;
    localStorage.setItem(`joely_tracks_${activeId}`, JSON.stringify(updated));

    toast.custom((t) => (
      <CustomToast 
        t={t} 
        title="Song removed from playlist" 
        Icon={Trash2} 
      />
    ))
  };

  const playSunoTrack = (id: string, title?: string, artist?: string, thumbnail?: string, lyrics?: string) => {
    setPlaybackSource("suno");
    const timestamp = Date.now();
    const finalThumbnail = thumbnail 
      ? (thumbnail.includes('?') ? `${thumbnail}&_t=${timestamp}` : `${thumbnail}?_t=${timestamp}`)
      : `https://cdn2.suno.ai/image_${id}.jpeg?v=${timestamp}`;
      
    setCurrentTrack({
      id,
      title: title || "Joel's Song",
      artist: artist || "Joel",
      thumbnail: finalThumbnail,
      duration: "0:00",
      lyrics: lyrics || ""
    });
    setCurrentPlaylistId("joels_music");
  };

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = joelsSongs.findIndex(s => s.id === active.id);
      const newIndex = joelsSongs.findIndex(s => s.id === over.id);
      const updated = arrayMove(joelsSongs, oldIndex, newIndex);
      setJoelsSongs(updated);
      
      const activeId = syncPlaylistId || JOEL_PLAYLIST_ID;
      localStorage.setItem(`joely_tracks_${activeId}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-[hsl(var(--primary)/0.06)] to-transparent text-foreground overflow-y-auto relative">
      <div className="max-w-7xl mx-auto p-2 md:p-8 space-y-4 md:space-y-8 relative z-10 w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl shadow-primary/10">
              <Image 
                src={`https://cdn2.suno.ai/24c69462-2727-415e-8f27-cdc43e0184db.jpeg?width=360`} 
                alt="Profile" 
                width={64} 
                height={64} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                <Music2 className="text-primary" /> Joel's Music
                {syncError && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" title="Sync issue - using cache" />}
                {isSyncing && !syncError && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" title="Syncing..." />}
              </h1>
              <p className="text-muted-foreground text-sm font-medium">
                {joelsSongs.length} Exclusive Tracks
              </p>
            </div>
          </div>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 px-4 font-medium border-primary/20 hover:bg-primary/10" 
            onClick={handleAutoSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} /> 
            Sync Playlist
          </Button>
        </div>

        {/* Playlist Tabs Selector */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto scrollbar-none">
          {PLAYLISTS.map((playlist) => {
            const isSelected = syncPlaylistId === playlist.id;
            const isLocked = playlist.type === "password" && !unlockedPlaylists[playlist.id];
            
            return (
              <Button
                key={playlist.id}
                variant={isSelected ? "default" : "ghost"}
                onClick={() => setSyncPlaylistId(playlist.id)}
                className={`h-9 px-4 rounded-xl font-bold transition-all duration-300 flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {playlist.type === "password" ? (
                  <Lock 
                    size={14} 
                    className={isSelected && !isLocked ? "text-primary-foreground" : isLocked ? "text-amber-500 animate-pulse" : "text-muted-foreground"} 
                  />
                ) : (
                  <Music2 size={14} />
                )}
                <span>{playlist.name}</span>
                {isLocked && (
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                )}
              </Button>
            );
          })}
        </div>

        {(() => {
          const activePlaylistConfig = PLAYLISTS.find(p => p.id === syncPlaylistId);
          const isCurrentLocked = activePlaylistConfig?.type === "password" && !unlockedPlaylists[syncPlaylistId || ""];

          if (isCurrentLocked) {
            return (
              /* Private Playlist Passkey Entry Card */
              <div className="flex flex-col items-center justify-center py-20 px-6 max-w-md mx-auto text-center bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-6 shadow-xl shadow-black/40 my-8">
                <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5 animate-bounce">
                  <Lock size={30} />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold tracking-tight text-white">{activePlaylistConfig?.label || "Private Collection"}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activePlaylistConfig?.desc || "This playlist is secure. Please enter the correct passkey to access."}
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
                    className="bg-black/35 border-white/10 rounded-xl pr-10 focus-visible:ring-primary h-11 text-center font-mono tracking-widest text-lg"
                  />
                  {passwordError && (
                    <p className="text-xs text-red-400 font-medium animate-pulse">{passwordError}</p>
                  )}
                  <Button
                    variant="default"
                    onClick={handleVerifyPassword}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold tracking-wide shadow-lg shadow-primary/15 transition-all duration-300"
                  >
                    Unlock Playlist
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <>
              {/* Tracks List */}
              <div className="space-y-1">
                {joelsSongs.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={joelsSongs.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {joelsSongs.map((track, i) => (
                        <SortableTrackItem
                          key={track.id}
                          track={track}
                          index={i}
                          playSunoTrack={playSunoTrack}
                          toggleLikedSong={toggleLikedSong}
                          isTrackLiked={isTrackLiked}
                          addToQueue={addToQueue}
                          removeSong={removeSong}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-20 bg-black/5 rounded-2xl border border-dashed border-white/5">
                    <Music2 className="w-10 h-10 text-muted-foreground opacity-20 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No tracks found.</p>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

