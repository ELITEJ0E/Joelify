"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Play, Heart, PlusSquare, Music2, Link, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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

const FALLBACK_SONGS = [
  { id: "e097968b-ec30-444c-a90a-cba06e953c3d", title: "I Do (ori.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/4a269f74-a1ea-433f-9694-68b708cccc16.jpeg" },
  { id: "592ac792-0d91-4912-b7a8-1d601f277ffe", title: "I Do (wedding.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_592ac792-0d91-4912-b7a8-1d601f277ffe.jpeg" },
  { id: "54aec49b-119c-46c8-a81f-9c718e4ab374", title: "I Do (bright)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_54aec49b-119c-46c8-a81f-9c718e4ab374.jpeg" },
  { id: "aba59ff3-0dc0-456a-b3c5-b69c2b229722", title: "I Do (90s.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_aba59ff3-0dc0-456a-b3c5-b69c2b229722.jpeg" },
  { id: "bd216e5e-4604-48e2-ac6e-7f1698044908", title: "红唇转圈", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/1bc7ee09-ee52-487a-85c7-568e961bbc3d.jpeg" },
  { id: "15095bb6-e6fc-491a-8e6c-0fe284c8b539", title: "红唇转圈 (male.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_15095bb6-e6fc-491a-8e6c-0fe284c8b539.jpeg" },
  { id: "93071252-c3b8-48cf-8fba-29af58e06fa7", title: "红唇转圈 (male + female.ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_93071252-c3b8-48cf-8fba-29af58e06fa7.jpeg" },
  { id: "aff5c48b-1c9a-48e1-8f3a-75e6dc9b6165", title: "Sweetheart Pulse", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/image_aff5c48b-1c9a-48e1-8f3a-75e6dc9b6165.jpeg" },
  { id: "fb92ee0d-ec81-4b13-adff-665d4ce72959", title: "霓虹坠落", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/454dc708-54ae-4e5c-923e-86f3c3a6017d.jpeg?width=100" },
  { id: "fae0bffa-8b42-4efe-ad48-06beec264ed6", title: "霓虹坠落（guzheng ver)", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/59dcf2f0-3c9d-44fc-98ca-5028c884dbc1.jpeg?width=100" },
  { id: "dae2c3e3-5c80-4c86-ba69-f7aca9b393ad", title: "灯一亮就", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/260a7eb5-2093-4d4d-bfbc-7912459816e5.jpeg" },
  { id: "71adb5b0-2a9a-4409-84fd-7b57666728cb", title: "霓虹贴身", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/80a428d7-5a1e-4a30-a889-09b3a3f44b55.jpeg" },
  { id: "269a9621-677f-4864-8193-4b2265cd73cc", title: "Light It Up Tonight", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/cdea3ba4-5f38-4462-968f-1fb74ba5ac92.jpeg" },
  { id: "2239a5e6-3ade-443e-aa21-091376583af2", title: "Light It Up", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/a9493a70-6b86-4f80-ab59-d10d676d4443.jpeg" },
  { id: "2ebad459-81ee-40bf-bdaf-dfc7d90cd1e0", title: "Light It Up 2", artist: "ELITEJOE", thumbnail: "https://cdn2.suno.ai/18f34ffd-7dc7-4d17-81b4-5d64f12dcce6.jpeg" },
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
      className={`group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent ${isDragging ? 'bg-white/[0.05] border-primary/20 shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/30 hover:text-primary transition-colors"
        >
          <GripVertical size={18} />
        </div>

        <div className="relative aspect-square w-12 flex-shrink-0 cursor-pointer overflow-hidden border border-white/5" onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail)}>
          {track.thumbnail ? (
            <Image 
              src={track.thumbnail.includes('?') ? `${track.thumbnail}&v=${Date.now()}` : `${track.thumbnail}?v=${Date.now()}`} 
              alt={track.title} 
              fill
              className="object-cover" 
              referrerPolicy="no-referrer" 
              unoptimized={true}
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
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playSunoTrack(track.id, track.title, track.artist, track.thumbnail)}>
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
          toast.success("Added to queue");
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
    const DEFAULT_ID = "ff247038-e0ae-4778-989d-0529e575027b";
    const savedId = localStorage.getItem('joel_sync_playlist_id') || DEFAULT_ID;
    setSyncPlaylistId(savedId);
  }, []);

  const syncPlaylist = async (id: string) => {
    setIsSyncing(true);
    setSyncError(false);
    try {
      const res = await fetch(`/api/suno-playlist?id=${id}&_t=${Date.now()}`);
      const data = await res.json();
      
      if (data.isRestricted) {
        // Silent fallback - users just see existing or fallback songs
        console.warn("Suno API is restricted:", data.error);
        if (joelsSongs.length === 0 || joelsSongs === FALLBACK_SONGS) {
             setJoelsSongs(FALLBACK_SONGS);
        }
        return;
      }
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync");
      }

      if (data.tracks) {
        // Apply cache buster to images
        const timestamp = Date.now();
        const tracksWithBuster = data.tracks.map((t: any) => ({
          ...t,
          thumbnail: t.thumbnail ? (t.thumbnail.includes('?') ? `${t.thumbnail}&_t=${timestamp}` : `${t.thumbnail}?_t=${timestamp}`) : t.thumbnail
        }));
        
        // Merge with existing songs, prioritizing new data for matches, but keeping everything else (like fallbacks)
        setJoelsSongs(prev => {
          const newSongs = [...prev];
          tracksWithBuster.forEach((newTrack: any) => {
            const index = newSongs.findIndex(s => s.id === newTrack.id);
            if (index >= 0) {
              newSongs[index] = newTrack;
            } else {
              newSongs.push(newTrack);
            }
          });
          return newSongs;
        });
        
        setSyncPlaylistId(id);
        localStorage.setItem('joel_sync_playlist_id', id);
      }
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncError(true);
      const isSunoError = error?.message?.includes("Suno API");
      
      if (isSunoError) {
        // Auto-retry once after 3 seconds in background
        setTimeout(() => syncPlaylist(id), 3000);
      }
    } finally {
      setIsSyncing(false);
      setInitialLoading(false);
    }
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
        const data = await res.json();
        
        if (data.clips && Array.isArray(data.clips) && data.clips.length > 0) {
          const clip = data.clips[0];
          const timestamp = Date.now();
          const img = clip.image_url || clip.custom_image_url || `https://cdn2.suno.ai/image_${clip.id}.jpeg`;
          song = {
            id: clip.id,
            title: clip.title || "New Song",
            artist: clip.display_name || "Joel",
            thumbnail: img.includes('?') ? `${img}&_t=${timestamp}` : `${img}?_t=${timestamp}`
          };
        } else if (data.isRestricted || !res.ok) {
           // Fallback if API is down/restricted
           song = {
             id: id,
             title: "Song " + id.substring(0, 4),
             artist: "Joel",
             thumbnail: `https://cdn2.suno.ai/image_${id}.jpeg`
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
          thumbnail: `https://cdn2.suno.ai/image_${id}.jpeg`
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
        playSunoTrack(song.id, song.title, song.artist, song.thumbnail);
        
        setManualUrl("");
        toast.success("Song added & playing!");
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
      const ids = joelsSongs.map(s => s.id).join(",");
      const res = await fetch(`/api/suno-metadata?ids=${ids}`);
      const data = await res.json();
      
      if (data.isRestricted || !res.ok) return;
      
      if (data.clips && Array.isArray(data.clips)) {
        const timestamp = Date.now();
        const updatedSongs = joelsSongs.map(song => {
          const fresh = data.clips.find((c: any) => c.id === song.id);
          if (fresh) {
            const latestImg = fresh.custom_image_url || fresh.image_url || fresh.cover_url || fresh.artwork_url || song.thumbnail;
            const buster = latestImg.includes("?") ? `&_t=${timestamp}` : `?_t=${timestamp}`;
            return {
              ...song,
              title: fresh.title || song.title,
              artist: fresh.display_name || song.artist,
              thumbnail: latestImg + buster
            };
          }
          return song;
        });
        setJoelsSongs(updatedSongs);
      }
    } catch (error) {
      console.error("Metadata update error", error);
    }
  };

  const handleSyncPrompt = () => {
    const url = prompt("Paste Suno Playlist URL to sync (e.g., suno.com/playlist/...)");
    if (url) {
      const match = url.match(/playlist\/([a-zA-Z0-9-]+)/);
      const uuidMatch = url.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
      const id = (match && match[1]) ? match[1] : (uuidMatch ? uuidMatch[0] : null);
      if (id) {
        syncPlaylist(id);
      } else {
        toast.error("Invalid Suno Playlist URL or ID");
      }
    }
  };

  const removeSong = (id: string) => {
    setJoelsSongs(joelsSongs.filter(s => s.id !== id));
    toast.success("Song removed from playlist");
  };

  const playSunoTrack = (id: string, title?: string, artist?: string, thumbnail?: string) => {
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
      duration: "0:00"
    });
    setCurrentPlaylistId("joels_music");
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
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
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 relative z-10 w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-xl shadow-primary/10">
              <Image 
                src={`https://cdn2.suno.ai/24c69462-2727-415e-8f27-cdc43e0184db.jpeg?width=360&t=${Date.now()}`} 
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
            onClick={handleSyncPrompt}
            disabled={isSyncing}
          >
            <PlusSquare className="w-4 h-4 mr-2" /> 
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

