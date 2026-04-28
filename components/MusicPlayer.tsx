'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Palette, Link as LinkIcon, Disc, ArrowRight, Check, Repeat, Repeat1, Shuffle, ListMusic, Plus, Trash2, X, Save, Download, Image as ImageIcon } from 'lucide-react';
import VinylRecord from './VinylRecord';

import Image from 'next/image';

const THEMES = [
  { id: 'cover', name: 'Dynamic Art', colors: 'from-zinc-800 via-zinc-900 to-black', accent: 'amber' },
  { id: 'emerald', name: 'Neon Emerald', colors: 'from-emerald-900 via-teal-950 to-black', accent: 'emerald' },
  { id: 'ocean', name: 'Ocean Vibes', colors: 'from-blue-800 via-sky-900 to-slate-900', accent: 'amber' },
  { id: 'sunset', name: 'Golden Hour', colors: 'from-rose-800 via-orange-900 to-amber-950', accent: 'amber' },
  { id: 'amethyst', name: 'Amethyst', colors: 'from-fuchsia-800 via-purple-900 to-slate-950', accent: 'amber' },
];

export default function MusicPlayer({ initialSongId }: { initialSongId?: string | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [songId, setSongId] = useState(initialSongId || 'bd216e5e-4604-48e2-ac6e-7f1698044908');
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [showThemes, setShowThemes] = useState(false);
  const [viewMode, setViewMode] = useState<'vinyl' | 'cover'>('vinyl');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [playlist, setPlaylist] = useState<{id: string, title: string, artist?: string, thumbnail?: string}[]>([
    { id: initialSongId || 'bd216e5e-4604-48e2-ac6e-7f1698044908', title: 'Currently Playing' }
  ]);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [shuffle, setShuffle] = useState(false);
  const [savedStatus, setSavedStatus] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrackInfo = playlist.find(p => p.id === songId);
  const audioUrl = `https://cdn1.suno.ai/${songId}.mp3`;
  const imageUrl = currentTrackInfo?.thumbnail || `https://cdn1.suno.ai/image_${songId}.jpeg?v=${Date.now()}`;

  useEffect(() => {
    if (initialSongId) {
      setSongId(initialSongId);
      setIsPlaying(true);
      setPlaylist(prev => {
        if (!prev.find(p => p.id === initialSongId)) {
          return [{ id: initialSongId, title: "Loaded Track" }, ...prev];
        }
        return prev;
      });
    }
  }, [initialSongId]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (e.name === "NotAllowedError") {
              console.warn("Autoplay blocked. Waiting for user interaction.");
              setSavedStatus("⚠️ Click Play to start");
              setTimeout(() => {
                if (!isPlaying) setSavedStatus("");
              }, 6000);
              setIsPlaying(false);
            } else {
              console.error("Playback error:", e);
              setIsPlaying(false);
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, songId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const currentTrackIndex = playlist.findIndex(p => p.id === songId);

  const playNext = () => {
    if (playlist.length <= 1) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (!isPlaying) setIsPlaying(true);
      }
      return;
    }
    
    let nextIndex = 0;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
      while (nextIndex === currentTrackIndex && playlist.length > 1) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      }
    } else {
      nextIndex = currentTrackIndex + 1;
      if (nextIndex >= playlist.length) {
        nextIndex = 0;
        if (repeatMode === 'off') {
          setIsPlaying(false);
          setSongId(playlist[0].id);
          return;
        }
      }
    }
    setSongId(playlist[nextIndex].id);
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (progress > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    if (playlist.length <= 1) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    let prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) prevIndex = playlist.length - 1;
    setSongId(playlist[prevIndex].id);
    setIsPlaying(true);
  };

  const handleEnded = () => {
    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    } else {
      playNext();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    // Check for playlist URL
    const playlistMatch = inputValue.match(/playlist\/([a-zA-Z0-9-]+)/);
    if (playlistMatch) {
      const playlistId = playlistMatch[1];
      setSavedStatus('Loading Playlist...');
      try {
        const timestamp = Date.now();
        const res = await fetch(`/api/suno-playlist?id=${playlistId}&_t=${timestamp}`);
        if (!res.ok) throw new Error("Playlist not found");
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          setPlaylist(data.tracks);
          setSongId(data.tracks[0].id);
          setIsPlaying(true);
          setSavedStatus('Playlist Loaded!');
          setTimeout(() => setSavedStatus(''), 2500);
        }
      } catch (error) {
        console.error("Failed to load playlist", error);
        alert("Failed to load Suno playlist. Make sure it is public.");
      }
      setInputValue('');
      setShowInput(false);
      return;
    }

    const match = inputValue.match(/(?:song|embed)\/([a-zA-Z0-9-]+)/);
    // Support also plain UUID
    const uuidMatch = inputValue.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const newId = (match && match[1]) ? match[1] : (uuidMatch ? uuidMatch[0] : null);
    if (newId) {
      if (!playlist.find(p => p.id === newId)) {
        setPlaylist(prev => [{ id: newId, title: `Loading...` }, ...prev]);
        // Trigger metadata update for this new track
        fetchMetadataForTracks([newId]);
      }
      setSongId(newId);
      setInputValue('');
      setShowInput(false);
      setIsPlaying(true);
    } else {
      alert("Invalid Suno URL snippet. Try: https://suno.com/song/... or playlist URL");
    }
  };

  const fetchMetadataForTracks = async (idsToFetch: string[]) => {
    if (idsToFetch.length === 0) return;
    try {
      const timestamp = Date.now();
      const res = await fetch(`/api/suno-metadata?ids=${idsToFetch.join(',')}&_t=${timestamp}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.clips && Array.isArray(data.clips)) {
        setPlaylist(prev => prev.map(track => {
          const fresh = data.clips.find((c: any) => c.id === track.id);
          if (fresh) {
            const latestImg = fresh.custom_image_url || fresh.image_url || fresh.cover_url || fresh.artwork_url || `https://cdn2.suno.ai/image_${fresh.id}.jpeg`;
            return {
              ...track,
              title: fresh.title || track.title,
              artist: fresh.display_name || "Suno AI",
              thumbnail: latestImg + (latestImg.includes('?') ? `&updated=${timestamp}` : `?updated=${timestamp}`)
            };
          }
          return track;
        }));
      }
    } catch (error) {
      console.error("Failed to fetch metadata", error);
    }
  };

  useEffect(() => {
    // Initial batch metadata fetch for the default playlist
    const ids = playlist.map(p => p.id);
    fetchMetadataForTracks(ids);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const removeFromPlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPlaylist = playlist.filter(p => p.id !== id);
    if (newPlaylist.length === 0) return; // Keep at least one
    setPlaylist(newPlaylist);
    if (songId === id) {
      setSongId(newPlaylist[0].id);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const savePlaylist = () => {
    try {
      localStorage.setItem('suno_playlist', JSON.stringify(playlist));
      setSavedStatus('Saved!');
      setTimeout(() => setSavedStatus(''), 2500);
    } catch (e) {
      setSavedStatus('Error');
      setTimeout(() => setSavedStatus(''), 2500);
    }
  };

  const loadPlaylist = () => {
    try {
      const saved = localStorage.getItem('suno_playlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlaylist(parsed);
          setSavedStatus('Loaded!');
          setTimeout(() => setSavedStatus(''), 2500);
          return;
        }
      }
      setSavedStatus('No saved list');
      setTimeout(() => setSavedStatus(''), 2500);
    } catch (e) {
      setSavedStatus('Error');
      setTimeout(() => setSavedStatus(''), 2500);
    }
  };

  const currentTrackInfo = playlist.find(p => p.id === songId);

  return (
    <div className="relative w-full max-w-[480px] mx-auto min-h-[500px] flex flex-col items-center justify-center p-4">
      
      {/* Background Layer inside widget */}
      <div className={`absolute inset-0 transition-colors duration-1000 bg-[length:200%_200%] bg-gradient-to-br ${activeTheme.colors} animate-gradient-xy opacity-60 rounded-[40px] shadow-lg`} />
      
      {/* Dynamic Cover Art Glow (Only active on 'cover' theme) */}
      <AnimatePresence>
        {activeTheme.id === 'cover' && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.6 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 overflow-hidden rounded-[40px]"
          >
            <Image src={imageUrl} alt="" fill className="object-cover blur-[40px] brightness-[0.3] saturate-150 animate-subtle-pan" referrerPolicy="no-referrer" />
          </motion.div>
        )}
      </AnimatePresence>

      <audio 
        ref={audioRef} 
        src={audioUrl} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5 z-10"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Disc className={`w-4 h-4 text-white ${isPlaying ? 'animate-spin-slow' : ''}`} />
            </div>
            <button 
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showPlaylist ? 'bg-emerald-500 text-black' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
            >
              <ListMusic className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode(prev => prev === 'vinyl' ? 'cover' : 'vinyl')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-white/5 text-zinc-400 hover:text-white`}
              title={viewMode === 'vinyl' ? 'Switch to Cover View' : 'Switch to Vinyl View'}
            >
              {viewMode === 'vinyl' ? <ImageIcon className="w-4 h-4" /> : <Disc className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowThemes(!showThemes)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 active:scale-95 flex items-center justify-center transition-all duration-200 ease-out"
            >
              <Palette className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Theme Picker Dropdown */}
        <AnimatePresence>
          {showThemes && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 flex gap-2 overflow-x-auto pb-4 no-scrollbar"
            >
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => { setActiveTheme(theme); setShowThemes(false); }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeTheme.id === theme.id 
                      ? 'bg-white text-black' 
                      : 'bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {activeTheme.id === theme.id && <Check className="w-3 h-3" />}
                  {theme.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* URL Input Dropdown (Moved to Vinyl) */}

        {/* Main Player Area */}
        <div className="flex flex-col items-center px-6 pb-8">
          
          <AnimatePresence mode="wait">
            {!showPlaylist ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex flex-col items-center"
              >
                {/* Vinyl Container */}
                <div className="relative w-full aspect-square max-w-[280px] mx-auto flex items-center justify-center my-4 group">
                  <button 
                    onClick={() => setShowInput(true)} 
                    className="absolute inset-0 z-30 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm cursor-pointer"
                  >
                    <div className="bg-white/20 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-2 text-white">
                      <LinkIcon className="w-4 h-4" /> Change Track
                    </div>
                  </button>
                  
                  {viewMode === 'vinyl' ? (
                    <VinylRecord isPlaying={isPlaying} coverImage={imageUrl} />
                  ) : (
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                      <Image 
                        src={imageUrl} 
                        alt={currentTrackInfo?.title || ''} 
                        fill 
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        unoptimized={true}
                      />
                    </div>
                  )}
                  
                  {/* URL Input Overlay */}
                  <AnimatePresence>
                    {showInput && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900/95 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 shadow-2xl"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Load Track</h3>
                          <button onClick={(e) => { e.stopPropagation(); setShowInput(false); }} className="text-zinc-500 hover:text-white transition-colors"><X size={16}/></button>
                        </div>
                        <form onSubmit={handleUrlSubmit} className="flex gap-2">
                          <input 
                            type="url"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Paste song URL..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                            required
                            autoFocus
                          />
                          <button type="submit" className="bg-white text-black px-4 rounded-xl hover:bg-zinc-200 active:scale-95 transition-all duration-200">
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Track Info */}
                <div className="text-center mt-2 w-full">
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-1 truncate px-4">
                    {currentTrackInfo?.title || 'Unknown Track'}
                  </h2>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase truncate">
                    Original Audio
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full mt-8 flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-1.5 appearance-none bg-white/10 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between w-full mt-6 px-2">
                  <button
                    onClick={() => setShuffle(!shuffle)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-95 ${shuffle ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    <Shuffle size={18} />
                  </button>

                  <div className="flex items-center gap-6">
                    <button
                      onClick={playPrev}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-all duration-200 ease-out active:scale-95 hover:bg-white/5"
                    >
                      <SkipBack size={24} fill="currentColor" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all duration-200 ease-out shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
                    >
                      {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} className="ml-1" fill="black" />}
                    </button>

                    <button
                      onClick={playNext}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-white transition-all duration-200 ease-out active:scale-95 hover:bg-white/5"
                    >
                      <SkipForward size={24} fill="currentColor" />
                    </button>
                  </div>

                  <button
                    onClick={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ease-out active:scale-95 relative ${repeatMode !== 'off' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="playlist"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col h-[400px]"
              >
                <div className="flex justify-between items-center mb-6 px-2 text-zinc-400 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                      Your Playlist
                      {savedStatus && (
                        <span className="text-[10px] text-emerald-400 normal-case bg-emerald-500/10 px-1.5 py-0.5 rounded-full inline-block">
                          {savedStatus}
                        </span>
                      )}
                    </h3>
                    <span className="text-[10px] font-mono">{playlist.length} track{playlist.length !== 1 && 's'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={loadPlaylist}
                      title="Load Playlist"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-zinc-400 hover:bg-white/15 hover:text-white transition-all duration-200 ease-out active:scale-95"
                    >
                      <Download size={14} />
                    </button>
                    <button 
                      onClick={savePlaylist}
                      title="Save Playlist"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-200 ease-out active:scale-95"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {playlist.map((track, idx) => (
                    <div 
                      key={track.id + idx}
                      onClick={() => {
                        setSongId(track.id);
                        setIsPlaying(true);
                        setShowPlaylist(false);
                      }}
                      className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                        songId === track.id
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-black/20 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-800">
                          <Image src={track.thumbnail || `https://cdn1.suno.ai/image_${track.id}.jpeg?v=${Date.now()}`} alt="" fill className="object-cover" referrerPolicy="no-referrer" />
                          {songId === track.id && isPlaying && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                              <div className="flex gap-0.5 items-end h-3">
                                <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-0.5 bg-emerald-500" />
                                <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-0.5 bg-emerald-500" />
                                <motion.div animate={{ height: [6, 10, 6] }} transition={{ repeat: Infinity, duration: 0.9 }} className="w-0.5 bg-emerald-500" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${songId === track.id ? 'text-emerald-500' : 'text-zinc-200'}`}>
                            {track.title}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">ID: {track.id.substring(0, 8)}...</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => removeFromPlaylist(track.id, e)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:bg-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
