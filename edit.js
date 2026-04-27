#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components/PlayerControls.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Add sunoAudioRef
code = code.replace(
  `  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)`,
  `  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)\n  const sunoAudioRef = useRef<HTMLAudioElement | null>(null)`
);

// handleRepeatOne
code = code.replace(
  `setTimeout(() => { trackEndHandledRef.current = false }, 1500)\n    }`,
  `setTimeout(() => { trackEndHandledRef.current = false }, 1500)\n    } else if (playbackSource === "suno" && sunoAudioRef.current) {\n      sunoAudioRef.current.currentTime = 0;\n      sunoAudioRef.current.play().catch(e => console.error(e));\n      setIsPlaying(true);\n      setTimeout(() => { trackEndHandledRef.current = false }, 1500)\n    }`
);

// handleNext update playing state for suno
code = code.replace(
  `if (playbackSource === "youtube") setIsPlaying(true)\n      else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)`,
  `if (playbackSource === "youtube") setIsPlaying(true)\n      else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)\n      else if (playbackSource === "suno") setIsPlaying(true)`
);

// same here
code = code.replace(
  `if (playbackSource === "youtube") setIsPlaying(true)\n        else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)`,
  `if (playbackSource === "youtube") setIsPlaying(true)\n        else if (playbackSource === "spotify") setShouldAutoPlaySpotify(true)\n        else if (playbackSource === "suno") setIsPlaying(true)`
);

code = code.replace(
  `if (prevTrack) {\n        setCurrentTrack(prevTrack); setCurrentTime(0); setPlaybackPosition(0); return\n      }`,
  `if (prevTrack) {\n        setCurrentTrack(prevTrack); setCurrentTime(0); setPlaybackPosition(0);\n        if (playbackSource === "suno") setIsPlaying(true);\n        return\n      }`
);

// previous handling
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(0, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, 0)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(0, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, 0)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = 0`
);

// handlePlayPause
code = code.replace(
  `} else if (playbackSource === "spotify") {\n      if (!spotifyPlayer) return\n      SpotifyPlayerControls.togglePlay(spotifyPlayer)\n    }`,
  `} else if (playbackSource === "spotify") {\n      if (!spotifyPlayer) return\n      SpotifyPlayerControls.togglePlay(spotifyPlayer)\n    } else if (playbackSource === "suno" && sunoAudioRef.current) {\n      if (isPlaying) sunoAudioRef.current.pause();\n      else sunoAudioRef.current.play().catch(e => console.error(e));\n      setIsPlaying(!isPlaying);\n    }`
);

// Seek forward
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime`
);

// Seek backward
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime`
);

// Seek slider
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.seekTo(newTime, true)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.seek(spotifyPlayer, newTime * 1000)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.currentTime = newTime`
);

// Volume change
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.setVolume(v)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.setVolume(spotifyPlayer, v)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.setVolume(v)\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.setVolume(spotifyPlayer, v)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.volume = v / 100`
);

// Mute toggle
code = code.replace(
  `else { SpotifyPlayerControls.setVolume(spotifyPlayer, 0); setIsMuted(true) }\n    }`,
  `else { SpotifyPlayerControls.setVolume(spotifyPlayer, 0); setIsMuted(true) }\n    } else if (playbackSource === "suno" && sunoAudioRef.current) {\n      if (isMuted) { sunoAudioRef.current.volume = volume / 100; setIsMuted(false); }\n      else { sunoAudioRef.current.volume = 0; setIsMuted(true); }\n    }`
);

// handleSleepTimerEnd
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.pause()`
);

// handleSwitch pause suno
code = code.replace(
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)`,
  `if (playbackSource === "youtube" && youtubePlayer) youtubePlayer.pauseVideo()\n    else if (playbackSource === "spotify" && spotifyPlayer) SpotifyPlayerControls.pause(spotifyPlayer)\n    else if (playbackSource === "suno" && sunoAudioRef.current) sunoAudioRef.current.pause()`
);

fs.writeFileSync(filePath, code);
