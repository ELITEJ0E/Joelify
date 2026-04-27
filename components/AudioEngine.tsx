"use client"

import { useEffect, useRef, useState } from "react"
import { useApp } from "@/contexts/AppContext"
import { RealTimeBpmAnalyzer } from "realtime-bpm-analyzer"

const FREQUENCY_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

interface AudioEngineProps {
  onPlayerReady: (player: any) => void
  onStateChange: (event: any) => void
  onError: (event: any) => void
  onDurationReady?: (duration: number) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

export function AudioEngine({
  onPlayerReady,
  onStateChange,
  onError,
  onDurationReady,
  onTimeUpdate,
}: AudioEngineProps) {
  const { currentTrack, audioSettings, setAudioContext, setAnalyserNode, setCurrentBPM, setBeatPulse, playbackSource } = useApp()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const filtersRef = useRef<BiquadFilterNode[]>([])
  const bpmAnalyzerRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const progressRAFRef = useRef<number | null>(null)

  // ── Stable callback refs ───────────────────────────────────────────────────
  const onStateChangeRef = useRef(onStateChange)
  const onErrorRef = useRef(onError)
  const onPlayerReadyRef = useRef(onPlayerReady)
  const onDurationReadyRef = useRef(onDurationReady)
  const onTimeUpdateRef = useRef(onTimeUpdate)

  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { onPlayerReadyRef.current = onPlayerReady }, [onPlayerReady])
  useEffect(() => { onDurationReadyRef.current = onDurationReady }, [onDurationReady])
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioRef.current || isInitializedRef.current) return

    const initAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioContextClass()
        contextRef.current = ctx
        setAudioContext(ctx)

        const source = ctx.createMediaElementSource(audioRef.current!)
        sourceRef.current = source

        const analyser = ctx.createAnalyser()
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.8
        analyserRef.current = analyser
        setAnalyserNode(analyser)

        // Create EQ bands
        let prevNode: AudioNode = source
        filtersRef.current = FREQUENCY_BANDS.map((freq, i) => {
          const filter = ctx.createBiquadFilter()
          if (i === 0) filter.type = "lowshelf"
          else if (i === FREQUENCY_BANDS.length - 1) filter.type = "highshelf"
          else filter.type = "peaking"
          
          filter.frequency.value = freq
          filter.Q.value = 1
          filter.gain.value = audioSettings.customEQ[i] || 0
          
          prevNode.connect(filter)
          prevNode = filter
          return filter
        })

        prevNode.connect(analyser)
        analyser.connect(ctx.destination)

        // Setup BPM Analyzer
        const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1)
        analyser.connect(scriptProcessor)
        scriptProcessor.connect(ctx.destination)

        bpmAnalyzerRef.current = new RealTimeBpmAnalyzer({
          scriptNode: {
            bufferSize: 4096,
            numberOfInputChannels: 1,
            numberOfOutputChannels: 1
          },
          pushTime: 2000,
          pushCallback: (err: any, bpm: any) => {
            if (bpm && bpm.length) {
              setCurrentBPM(bpm[0].tempo)
            }
          },
          onBeat: () => {
            setBeatPulse(Date.now())
          }
        })

        scriptProcessor.onaudioprocess = (e) => {
          bpmAnalyzerRef.current.analyze(e)
        }

        isInitializedRef.current = true

        // Create a mock YT player interface
        const mockPlayer = {
          playVideo: () => audioRef.current?.play().catch(e => console.warn("playVideo error", e)),
          pauseVideo: () => audioRef.current?.pause(),
          seekTo: (seconds: number) => {
            if (audioRef.current) audioRef.current.currentTime = seconds
          },
          setVolume: (vol: number) => {
            if (audioRef.current) audioRef.current.volume = vol / 100
          },
          mute: () => {
            if (audioRef.current) audioRef.current.muted = true
          },
          unMute: () => {
            if (audioRef.current) audioRef.current.muted = false
          },
          getDuration: () => audioRef.current?.duration || 0,
          getCurrentTime: () => audioRef.current?.currentTime || 0,
          getPlayerState: () => {
            if (!audioRef.current) return -1
            if (audioRef.current.ended) return 0
            if (audioRef.current.paused) return 2
            return 1
          },
          destroy: () => {
            audioRef.current?.pause()
            audioRef.current?.removeAttribute('src')
            audioRef.current?.load()
          },
          setPlaybackQuality: () => {}
        }

        onPlayerReadyRef.current(mockPlayer)
      } catch (err) {
        console.error("Failed to initialize Web Audio API", err)
      }
    }

    // We need user interaction to start AudioContext usually, but since this is an audio element,
    // we can initialize it right away and resume context on play.
    initAudio()

    return () => {
      if (contextRef.current && contextRef.current.state !== 'closed') {
        contextRef.current.close()
      }
      setAudioContext(null)
      setAnalyserNode(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update EQ when settings change
  useEffect(() => {
    if (filtersRef.current.length === FREQUENCY_BANDS.length) {
      filtersRef.current.forEach((filter, i) => {
        filter.gain.setTargetAtTime(audioSettings.customEQ[i] || 0, contextRef.current?.currentTime || 0, 0.1)
      })
    }
  }, [audioSettings.customEQ])

  // Handle track changes
  useEffect(() => {
    if (currentTrack?.id && audioRef.current && playbackSource === "youtube") {
      audioRef.current.src = `/api/stream/${currentTrack.id}`
      audioRef.current.load()
      audioRef.current.play().catch(e => console.warn("Autoplay prevented", e))
    }
  }, [currentTrack?.id, playbackSource])

  const startProgressTracking = () => {
    if (progressRAFRef.current) cancelAnimationFrame(progressRAFRef.current)
    const update = () => {
      if (audioRef.current) {
        const ct = audioRef.current.currentTime
        const d = audioRef.current.duration
        if (d > 0 && !isNaN(d) && !isNaN(ct)) {
          onTimeUpdateRef.current?.(ct, d)
        }
      }
      progressRAFRef.current = requestAnimationFrame(update)
    }
    progressRAFRef.current = requestAnimationFrame(update)
  }

  const stopProgressTracking = () => {
    if (progressRAFRef.current) {
      cancelAnimationFrame(progressRAFRef.current)
      progressRAFRef.current = null
    }
  }

  return (
    <audio
      ref={audioRef}
      crossOrigin="anonymous"
      onPlay={() => {
        if (contextRef.current?.state === 'suspended') {
          contextRef.current.resume()
        }
        onStateChangeRef.current({ data: 1 }) // Playing
        startProgressTracking()
      }}
      onPause={() => {
        onStateChangeRef.current({ data: 2 }) // Paused
        stopProgressTracking()
      }}
      onEnded={() => {
        onStateChangeRef.current({ data: 0 }) // Ended
        stopProgressTracking()
      }}
      onLoadedMetadata={() => {
        if (audioRef.current) {
          onDurationReadyRef.current?.(audioRef.current.duration)
        }
      }}
      onWaiting={() => onStateChangeRef.current({ data: 3 })} // Buffering
      onPlaying={() => onStateChangeRef.current({ data: 1 })} // Playing
      onError={(e) => onErrorRef.current({ data: "audio_error" })}
      className="hidden"
    />
  )
}
