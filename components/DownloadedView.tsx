"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { listDownloadedSunoIds as getDownloadedSunoTracks, deleteSunoDownload, getOfflineAudioBlobUrl } from "@/lib/sunoOffline";
import { Button } from "@/components/ui/button";
import { Play, Trash2, Music2, RefreshCw } from "lucide-react";
import { TrackImage as Image } from "./TrackImage";
import { toast } from "sonner";
import { FALLBACK_JOELS_SONGS as FALLBACK_SONGS } from "@/lib/constants";

export function DownloadedView() {
  const { setCurrentTrack, setQueue, setPlaybackSource, joelsSongs } = useApp();
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDownloadedIds();
  }, []);

  const loadDownloadedIds = async () => {
    setIsLoading(true);
    const ids = await getDownloadedSunoTracks();
    setDownloadedIds(ids);
    setIsLoading(false);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to remove all downloaded songs? This will free up storage but you will need internet to play them again.")) {
      try {
        for (const id of downloadedIds) {
          await deleteSunoDownload(id);
        }
        setDownloadedIds([]);
        toast.success("Cleared all downloads");
      } catch (e) {
        toast.error("Failed to clear some downloads");
      }
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteSunoDownload(id);
      setDownloadedIds(prev => prev.filter(trackId => trackId !== id));
      toast.success("Removed from offline storage");
    } catch (e) {
      toast.error("Failed to remove download");
    }
  };

  // Find track details for each ID
  const downloadedTracks = downloadedIds.map(id => {
    // Check in joelsSongs first
    let track = joelsSongs.find(t => t.id === id);
    if (!track) {
      // Check in fallback songs
      track = FALLBACK_SONGS.find(t => t.id === id);
    }
    
    if (track) {
      return track;
    }
    
    return {
      id,
      title: "Unknown Track",
      artist: "Suno",
      thumbnail: `https://cdn2.suno.ai/image_${id}.jpeg`,
      duration: "0:00"
    };
  });

  const handlePlay = (track: any) => {
    setCurrentTrack(track);
    setPlaybackSource("suno");
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-gradient-to-b from-zinc-900 to-black text-gray-100">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Downloads</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Songs available for offline playback ({downloadedTracks.length})
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadDownloadedIds} size="sm" className="h-9">
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            {downloadedTracks.length > 0 && (
              <Button variant="destructive" onClick={handleClearAll} size="sm" className="h-9">
                <Trash2 size={16} className="mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-primary" size={32} />
          </div>
        ) : downloadedTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-xl bg-white/[0.02]">
            <Music2 size={64} className="text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-medium mb-2">No downloaded songs</h2>
            <p className="text-muted-foreground max-w-sm">
              Go to Joel's Music and click the download icon next to a track to save it for offline playback.
            </p>
          </div>
        ) : (
          <div className="space-y-2 mt-6">
            {downloadedTracks.map((track) => (
              <div 
                key={track.id}
                className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative aspect-square w-12 flex-shrink-0 cursor-pointer overflow-hidden border border-white/5 rounded-md" onClick={() => handlePlay(track)}>
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
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlay(track)}>
                    <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{track.title}</h3>
                    <p className="text-xs text-muted-foreground truncate opacity-70 mt-0.5">{track.artist}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                    onClick={() => handleRemove(track.id)}
                    title="Remove from device"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}