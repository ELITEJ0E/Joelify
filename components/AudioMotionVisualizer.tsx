"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useApp } from "@/contexts/AppContext"

interface AudioMotionVisualizerProps {
  isPlaying: boolean
  volume?: number
}

export function AudioMotionVisualizer({ 
  isPlaying, 
  volume = 1 
}: AudioMotionVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const audioMotionRef = useRef<any>(null)
  const { audioContext, setAudioContext, setAnalyserNode } = useApp()
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAudioMotionLoaded, setIsAudioMotionLoaded] = useState(false)

  // Load AudioMotion.js dynamically
  useEffect(() => {
    let mounted = true
    
    const loadAudioMotion = async () => {
      try {
        // Try to load AudioMotion
        const AudioMotionModule = await import('audiomotion-analyzer')
        if (mounted) {
          setIsAudioMotionLoaded(true)
        }
      } catch (error) {
        console.warn('[AudioMotion] Failed to load library:', error)
        if (mounted) {
          setError('Visualizer library failed to load. Using fallback.')
          setIsAudioMotionLoaded(false)
        }
      }
    }
    
    loadAudioMotion()
    
    return () => {
      mounted = false
    }
  }, [])

  // Initialize AudioMotion.js
  const initAudioMotion = useCallback(async () => {
    if (!containerRef.current || audioMotionRef.current || !isAudioMotionLoaded) return

    try {
      console.log("[AudioMotion] Initializing visualizer...")
      
      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!containerRef.current || containerRef.current.clientHeight === 0) {
        console.warn("[AudioMotion] Container not ready, retrying...")
        setTimeout(initAudioMotion, 100)
        return
      }

      // Dynamically import AudioMotion
      const AudioMotion = (await import('audiomotion-analyzer')).default
      
      // Create audio context if needed
      let ctx = audioContext
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          setAudioContext(ctx)
        } catch (ctxError) {
          console.warn('[AudioMotion] Could not create audio context:', ctxError)
          setError('Audio context not supported')
          return
        }
      }

      // Create visualizer instance
      audioMotionRef.current = new AudioMotion({
        container: containerRef.current,
        height: containerRef.current.clientHeight,
        width: containerRef.current.clientWidth,
        mode: 2, // line mode
        bgAlpha: 0,
        gradient: 'rainbow',
        showScaleX: false,
        showScaleY: false,
        reflexRatio: 0.5,
        reflexAlpha: 1,
        reflexBright: 1,
        lineWidth: 2,
        ledBars: false,
        radial: false,
        overlay: true,
        ansiBands: false,
        loRes: false,
        maxFreq: 20000,
        minFreq: 20,
        frequencyScale: 'log',
        smoothing: 0.5,
        spinSpeed: 0,
        fsElement: containerRef.current,
        audioCtx: ctx,
      })

      console.log("[AudioMotion] Visualizer created")

      // Create a dummy audio source for visualization when no real audio is available
      try {
        const dummySource = ctx.createOscillator()
        const dummyGain = ctx.createGain()
        dummyGain.gain.value = 0.01 // Very low volume - just for visualization
        dummySource.connect(dummyGain)
        dummyGain.connect(audioMotionRef.current.analyser)
        dummySource.start()
        
        // Store analyser for potential use elsewhere
        setAnalyserNode(audioMotionRef.current.analyser)
      } catch (audioError) {
        console.warn('[AudioMotion] Could not create audio source:', audioError)
      }

      // Enable the analyzer
      audioMotionRef.current.toggleAnalyzer(true)
      setIsInitialized(true)
      setError(null)

    } catch (error) {
      console.error('[AudioMotion] Failed to initialize:', error)
      setError('Failed to initialize visualizer')
      setIsInitialized(false)
    }
  }, [audioContext, setAudioContext, setAnalyserNode, isAudioMotionLoaded])

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log("[AudioMotion] Cleaning up...")
    
    if (audioMotionRef.current) {
      try {
        audioMotionRef.current.toggleAnalyzer(false)
        audioMotionRef.current.destroy()
      } catch (error) {
        console.warn('[AudioMotion] Error during cleanup:', error)
      }
      audioMotionRef.current = null
    }
    
    setIsInitialized(false)
  }, [])

  // Initialize and cleanup
  useEffect(() => {
    if (!containerRef.current) return

    if (isAudioMotionLoaded) {
      initAudioMotion()
    }

    return () => {
      cleanup()
    }
  }, [initAudioMotion, cleanup, isAudioMotionLoaded])

  // Toggle analyzer based on play state
  useEffect(() => {
    if (audioMotionRef.current && isInitialized) {
      audioMotionRef.current.toggleAnalyzer(isPlaying)
    }
  }, [isPlaying, isInitialized])

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && audioMotionRef.current && isInitialized) {
        try {
          audioMotionRef.current.setOptions({
            height: containerRef.current.clientHeight,
            width: containerRef.current.clientWidth
          })
        } catch (error) {
          console.warn('[AudioMotion] Error during resize:', error)
        }
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [isInitialized])

  // Simple fallback visualizer when AudioMotion fails
  const renderFallbackVisualizer = () => {
    return (
      <div className="w-full h-full bg-gradient-to-br from-black via-purple-900/30 to-black flex items-center justify-center">
        <div className="text-white/60 text-center">
          <p className="mb-2">Visualizer unavailable</p>
          <p className="text-sm">Try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-gradient-to-br from-black/90 via-purple-900/20 to-black/90"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {error ? (
        renderFallbackVisualizer()
      ) : !isInitialized ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-white/50">Loading visualizer...</div>
        </div>
      ) : null}
    </div>
  )
}
