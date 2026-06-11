"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Check, Trash2, PlusSquare, Music2, Link, GripVertical, Play, Heart, RefreshCw } from "lucide-react";
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

  const [manualUrl, setManualUrl] = useState("");
  const [isAddingSong, setIsAddingSong] = useState(false);

  useEffect(() => {
    // Default to your specific playlist if nothing is saved
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
        // Silent fallback - users just see existing or fallback songs
        console.warn("Suno API restricted or proxies failed");
        if (joelsSongs.length === 0) {
             setJoelsSongs([...FALLBACK_SONGS].reverse());
        } else {
             // Still need to update any old fallback entries with the fresh FALLBACK_SONGS
             setJoelsSongs(prev => {
                const updated = prev.map(p => {
                    const fallback = FALLBACK_SONGS.find(f => f.id === p.id);
                    return fallback ? { ...p, ...fallback } : p;
                });
                const missing = FALLBACK_SONGS.filter(f => !updated.some(u => u.id === f.id));
                return [...[...missing].reverse(), ...updated];
             });
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
      
      // Merge with existing songs, prioritizing new data for matches, but keeping everything else (like fallbacks)
      setJoelsSongs(prev => {
        const newSongs = [...tracksWithBuster];
        prev.forEach(oldTrack => {
          if (!newSongs.some((t: any) => t.id === oldTrack.id)) {
            newSongs.push(oldTrack);
          }
        });
        return newSongs;
      });
      
      setSyncPlaylistId(id);
      localStorage.setItem('joel_sync_playlist_id', id);
    }
    
    setIsSyncing(false);
    setInitialLoading(false);
  };

  const handleAddManualUrl = async () => {
    if (!manualUrl.trim()) return;
    
    setIsAddingSong(true);
    try {
      const match = manualUrl.match(/(?:song|embed|playlist)\/([a-zA-Z0-9-]+)/);
      const uuidMatch = manualUrl.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
      let id = (match && match[1]) ? match[1] : (uuidMatch ? uuidMatch[0] : null);
      
      if (!id) {
        // Support direct pasted ID or last segment of URL
        const trimmed = manualUrl.trim();
        if (trimmed.length >= 10 && !trimmed.includes(' ')) {
          const parts = trimmed.split('/');
          id = parts[parts.length - 1];
        }
      }
      
      if (!id || id.length < 10) {
        throw new Error("Invalid URL or ID format");
      }
      
      // Try to fetch metadata, but provide fallback if API is restricted
      let song;
      try {
        const res = await fetch(`/api/suno-metadata?ids=${id}&_t=${Date.now()}`);
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(`Invalid JSON response: ${res.status}`);
        }
        
        if (data.clips && Array.isArray(data.clips) && data.clips.length > 0) {
          const clip = data.clips[0];
          const timestamp = Date.now();
          const img = clip.image_url || clip.custom_image_url || `https://cdn2.suno.ai/image_${clip.id}.jpeg`;
          song = {
            id: clip.id,
            title: clip.title || "New Song",
            artist: clip.display_name || "Joel",
            thumbnail: img,
            lyrics: clip.metadata?.prompt || ""
          };
        } else if (data.isRestricted || !res.ok) {
           // Fallback if API is down/restricted
           song = {
             id: id,
             title: "Song " + id.substring(0, 4),
             artist: "Joel",
             thumbnail: `https://cdn2.suno.ai/image_${id}.jpeg`,
             lyrics: ""
           };
        } else {
          throw new Error("Song not found");
        }
      } catch (e) {
        // Ultimate fallback
        song = {
          id: id,
          title: "Song " + id.substring(0, 4),
          artist: "Joel",
          thumbnail: `https://cdn2.suno.ai/image_${id}.jpeg`,
          lyrics: ""
        };
      }
      
      if (song) {
        // Prevent duplicates
        setJoelsSongs(prev => {
          const exists = prev.find(s => s.id === song.id);
          if (exists) return prev;
          return [song, ...prev];
        });
        
        // Immediately play the song
        playSunoTrack(song.id, song.title, song.artist, song.thumbnail, song.lyrics);
        
        setManualUrl("");
        toast.custom((t) => (
          <CustomToast 
            t={t} 
            title="Song added & playing!" 
            Icon={Check} 
          />
        ))
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Could not add song. Check the URL/ID.");
    } finally {
      setIsAddingSong(false);
    }
  };

  useEffect(() => {
    if (syncPlaylistId) {
      syncPlaylist(syncPlaylistId);
    } else {
      updateMetadataOnly();
    }
  }, [syncPlaylistId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const removeSong = (id: string) => {
    setJoelsSongs(joelsSongs.filter(s => s.id !== id));
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
      setJoelsSongs(arrayMove(joelsSongs, oldIndex, newIndex));
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

        {/* URL Input Area */}
        <div className="bg-black/10 backdrop-blur-md border border-white/5 p-3 rounded-xl flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
            <Input 
              placeholder="Paste song URL to play..." 
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="bg-transparent border-none pl-10 h-10 focus-visible:ring-0"
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualUrl()}
            />
          </div>
          <Button 
            variant="ghost"
            className="h-10 px-6 font-bold hover:bg-primary/10 hover:text-primary"
            onClick={handleAddManualUrl}
            disabled={isAddingSong || !manualUrl.trim()}
          >
            {isAddingSong ? "Adding..." : "Add & Play"}
          </Button>
        </div>

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
      </div>
    </div>
  );
}

