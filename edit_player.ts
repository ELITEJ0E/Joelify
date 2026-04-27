import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "components/PlayerControls.tsx");
let code = fs.readFileSync(filePath, "utf8");

// Add sunoAudioRef
code = code.replace(
  `  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)`,
  `  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const sunoAudioRef = useRef<HTMLAudioElement | null>(null)`
);

// handleRepeatOne
code = code.replace(
  `setTimeout(() => { trackEndHandledRef.current = false }, 1500)
    }
    setCurrentTime(0)`,
  `setTimeout(() => { trackEndHandledRef.current = false }, 1500)
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      sunoAudioRef.current.currentTime = 0;
      sunoAudioRef.current.play().catch(e => console.error(e));
      setIsPlaying(true);
      setTimeout(() => { trackEndHandledRef.current = false }, 1500)
    }
    setCurrentTime(0)`
);

// handleNext update playing state for suno
code = code.replace(
  `if (playbackSource === "youtube") setIsPlaying(true)
      else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)`,
  `if (playbackSource === "youtube") setIsPlaying(true)
      else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)
      else if (playbackSource === "suno") setIsPlaying(true)`
);

// same here
code = code.replace(
  `if (playbackSource === "youtube") setIsPlaying(true)
        else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)`,
  `if (playbackSource === "youtube") setIsPlaying(true)
        else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)
        else if (playbackSource === "suno") setIsPlaying(true)`
);

code = code.replace(
  `if (prevTrack) {
        setCurrentTrack(prevTrack); setCurrentTime(0); setPlaybackPosition(0); return
      }`,
  `if (prevTrack) {
        setCurrentTrack(prevTrack); setCurrentTime(0); setPlaybackPosition(0);
        if (playbackSource === "suno") setIsPlaying(true);
        return
      }`
);

// previous handling
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(0, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, 0)
    setCurrentTime(0); setPlaybackPosition(0)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(0, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, 0)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = 0
    setCurrentTime(0); setPlaybackPosition(0)`
);

// handlePlayPause
code = code.replace(
  `} else if (playbackSource === "spotify") {
      if (!spotifyPlayer) return
      SpotifyPlayerControls.togglePlay(spotifyPlayer)
    }`,
  `} else if (playbackSource === "spotify") {
      if (!spotifyPlayer) return
      SpotifyPlayerControls.togglePlay(spotifyPlayer)
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      if (isPlaying) sunoAudioRef.current.pause();
      else sunoAudioRef.current.play().catch(e => console.error(e));
      setIsPlaying(!isPlaying);
    }`
);

// Seek forward
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    setCurrentTime(newTime); setPlaybackPosition(newTime)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)`
);

// Seek backward
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    setCurrentTime(newTime); setPlaybackPosition(newTime)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)`
);

// Seek slider
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    setCurrentTime(newTime); setPlaybackPosition(newTime)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime
    setCurrentTime(newTime); setPlaybackPosition(newTime)`
);

// Volume change
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.setVolume(v)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.setVolume(spotifyPlayer, v)
    setIsMuted(v === 0)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.setVolume(v)
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.setVolume(spotifyPlayer, v)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.volume = v / 100
    setIsMuted(v === 0)`
);

// Mute toggle
code = code.replace(
  `else { SpotifyPlayerControls.setVolume(spotifyPlayer, 0); setIsMuted(true) }
    }`,
  `else { SpotifyPlayerControls.setVolume(spotifyPlayer, 0); setIsMuted(true) }
    } else if (playbackSource === "suno" && sunoAudioRef.current) {
      if (isMuted) { sunoAudioRef.current.volume = volume / 100; setIsMuted(false); }
      else { sunoAudioRef.current.volume = 0; setIsMuted(true); }
    }`
);

// handleSleepTimerEnd
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.pause()`
);

// handleSwitch pause suno
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()
    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)
    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.pause()`
);

// Update time update logic for suno
code = code.replace(
  `    const handleKeyDown = (e: KeyboardEvent) => {`,
  `    useEffect(() => {
    if (playbackSource === "suno" && sunoAudioRef.current) {
      const audio = sunoAudioRef.current;
      const onTimeUpdate = () => {
        if (!isSeekingRef.current) {
          setCurrentTime(audio.currentTime);
          setPlaybackPosition(audio.currentTime);
        }
      };
      const onLoadedMetadata = () => {
        setDuration(audio.duration);
        setIsReady(true);
      };
      const onEnded = () => {
        if (!trackEndHandledRef.current) {
          trackEndHandledRef.current = true;
          handleNext();
        }
      };

      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("ended", onEnded);

      // Play audio if it was already supposed to be playing
      if (currentTrack && isPlaying) {
        audio.play().catch(e => {
            console.error(e);
            setIsPlaying(false);
        });
      }

      return () => {
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("ended", onEnded);
      };
    }
  }, [playbackSource, currentTrack, isPlaying, handleNext, setCurrentTime, setPlaybackPosition, setDuration, setIsReady]);

    const handleKeyDown = (e: KeyboardEvent) => {`
);

code = code.replace(
  `    </>
  )
}`,
  `      {playbackSource === "suno" && currentTrack && (
        <audio
          ref={sunoAudioRef}
          src={\`https://cdn1.suno.ai/\${currentTrack.id}.mp3\`}
          preload="auto"
        />
      )}
    </>
  )
}`
);


// Ensure video toggle button only shows for youtube
code = code.replace(
  `              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setBarVideoMode(!barVideoMode)}`,
  `              {playbackSource === "youtube" && (<Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setBarVideoMode(!barVideoMode)}`
);

code = code.replace(
  `                </TooltipContent>
              </Tooltip>

              <Tooltip>`,
  `                </TooltipContent>
              </Tooltip>)}

              <Tooltip>`
);

fs.writeFileSync(filePath, code);
