"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface AudioAnalyzerVisualizerProps {
  isPlaying: boolean
  volume?: number
  audioElement?: HTMLAudioElement | null
  audioContext?: AudioContext | null
  currentTime?: number
}

export function AudioAnalyzerVisualizer({
  isPlaying,
  volume = 100,
  audioElement,
  audioContext: externalAudioContext,
  currentTime = 0
}: AudioAnalyzerVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Audio data state
  const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(0))
  const timeDataRef = useRef<Uint8Array>(new Uint8Array(0))
  const smoothedDataRef = useRef<number[]>([])
  const lastEnergyRef = useRef(0)

  // Initialize audio analysis
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      console.log("[AudioAnalyzer] Initializing audio analysis...")
      
      let audioCtx = externalAudioContext
      
      // Create audio context if not provided
      if (!audioCtx && audioElement) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      if (!audioCtx || !audioElement) {
        console.warn("[AudioAnalyzer] No audio context or element available")
        setError("No audio source available")
        return false
      }

      // Resume if suspended (required by browser autoplay policies)
      if (audioCtx.state === "suspended") {
        await audioCtx.resume()
      }

      // Create analyser node
      analyserRef.current = audioCtx.createAnalyser()
      analyserRef.current.fftSize = 2048
      analyserRef.current.smoothingTimeConstant = 0.8
      
      // Connect audio element to analyser
      sourceRef.current = audioCtx.createMediaElementSource(audioElement)
      sourceRef.current.connect(analyserRef.current)
      analyserRef.current.connect(audioCtx.destination)
      
      // Initialize data arrays
      const bufferLength = analyserRef.current.frequencyBinCount
      frequencyDataRef.current = new Uint8Array(bufferLength)
      timeDataRef.current = new Uint8Array(bufferLength)
      smoothedDataRef.current = new Array(80).fill(0.01)
      
      setIsInitialized(true)
      setError(null)
      console.log("[AudioAnalyzer] Audio analysis initialized successfully")
      return true
      
    } catch (error) {
      console.error("[AudioAnalyzer] Failed to initialize audio analysis:", error)
      setError("Audio analysis failed")
      setIsInitialized(false)
      return false
    }
  }, [audioElement, externalAudioContext])

  // Smooth data for wave effect (from your reference project)
  const smoothData = (data: number[]) => {
    const smoothed = [...data]
    for (let i = 1; i < smoothed.length - 1; i++) {
      smoothed[i] = (data[i - 1] + data[i] * 2 + data[i + 1]) / 4
    }
    return smoothed
  }

  // Update audio data with energy threshold and wave effect
  const updateAudioData = useCallback(() => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const frequencyData = frequencyDataRef.current
    
    // Get frequency data
    analyserRef.current.getByteFrequencyData(frequencyData)
    
    // Calculate total energy for threshold
    let totalEnergy = 0
    const usefulRange = Math.floor(bufferLength * 0.3)
    for (let i = 0; i < usefulRange; i++) {
      totalEnergy += frequencyData[i]
    }
    const averageEnergy = totalEnergy / usefulRange
    
    // Calculate bars (80 bars like your reference project)
    const bars = 80
    const rawData: number[] = []
    
    for (let i = 0; i < bars; i++) {
      let value = 0
      
      if (i < 40) {
        // Left side: real frequency data
        const freqIndex = Math.floor((i / 40) * usefulRange)
        value = frequencyData[freqIndex] || 0
        
        // Add synthetic variation
        const timeOffset = Date.now() * 0.006 + i * 0.12
        const synthetic = Math.sin(timeOffset) * 0.25 + Math.cos(timeOffset * 1.5) * 0.15
        value *= (0.8 + synthetic)
      } else {
        // Right side: mirrored synthetic data
        const mirrorIndex = 79 - i
        const freqIndex = Math.floor((mirrorIndex / 40) * usefulRange)
        const baseValue = frequencyData[freqIndex] || 0
        
        const timeOffset = Date.now() * 0.008 + i * 0.15
        const synthetic = Math.sin(timeOffset) * 0.3 + Math.cos(timeOffset * 1.2) * 0.2
        value = baseValue * (0.7 + synthetic)
      }
      
      let normalized = value / 255
      
      // Apply energy threshold
      const energyThreshold = 30
      if (averageEnergy < energyThreshold) {
        normalized = 0.01
      } else {
        // Apply wave effect scaling
        if (i < 20) normalized *= 1.5
        else if (i < 40) normalized *= 1.2
        else if (i < 60) normalized *= 1.05
        else normalized *= 0.9
        
        // Apply curve
        normalized = Math.pow(Math.max(0, normalized), 0.4)
        
        // Apply contrast levels (similar to your reference)
        if (normalized > 0.8) {
          normalized = Math.pow(normalized, 0.15) * 1.8
        } else if (normalized > 0.7) {
          normalized = Math.pow(normalized, 0.3) * 0.9
        } else if (normalized > 0.5) {
          normalized = Math.pow(normalized, 0.8) * 0.1
        } else if (normalized > 0.45) {
          normalized = 0.01
        } else {
          normalized = 0.01
        }
        
        // Individual threshold
        if (normalized < 0.45) {
          normalized = 0.01
        }
      }
      
      rawData.push(Math.max(0, Math.min(1.2, normalized)))
    }
    
    // Apply smoothing for wave effect
    const smoothedData = smoothData(rawData)
    const extraSmoothed = smoothData(smoothedData)
    
    // Update refs
    smoothedDataRef.current = extraSmoothed
    lastEnergyRef.current = averageEnergy
  }, [])

  // Render visualizer
  const renderVisualizer = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    
    // Clear with fade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(0, 0, width, height)
    
    const audioData = smoothedDataRef.current
    
    // Draw wave bars
    const barCount = audioData.length
    const barWidth = Math.max(1, width / barCount)
    const centerY = height / 2
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = audioData[i] * height * 0.7
      
      // Skip if too small
      if (barHeight < 2) continue
      
      const x = i * barWidth
      const y = centerY - barHeight / 2
      
      // Calculate color based on position and energy
      const hue = 200 + i * 2 + currentTime * 50
      const saturation = 80 + lastEnergyRef.current / 2.55 * 0.3
      const lightness = 50 + barHeight / height * 100 * 0.4
      
      ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.7 + audioData[i] * 0.3})`
      ctx.fillRect(x, y, barWidth - 1, barHeight)
      
      // Add glow on high energy
      if (lastEnergyRef.current > 100 && audioData[i] > 0.6) {
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.6)`
        ctx.shadowBlur = 12
        ctx.fillRect(x, y, barWidth - 1, barHeight)
        ctx.shadowBlur = 0
      }
    }
    
    // Draw center energy indicator
    if (lastEnergyRef.current > 50 && isPlaying) {
      const pulseSize = 20 + (lastEnergyRef.current / 255) * 100
      const gradient = ctx.createRadialGradient(
        width / 2, centerY, 0,
        width / 2, centerY, pulseSize
      )
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.5 + lastEnergyRef.current / 510})`)
      gradient.addColorStop(0.7, `rgba(100, 100, 255, ${0.2 + lastEnergyRef.current / 850})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(width / 2, centerY, pulseSize, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [currentTime, isPlaying])

  // Main animation loop
  useEffect(() => {
    let animationId: number | null = null
    
    const animate = () => {
      if (isPlaying && isInitialized) {
        updateAudioData()
      }
      renderVisualizer()
      animationId = requestAnimationFrame(animate)
    }
    
    if (isPlaying || isInitialized) {
      animationId = requestAnimationFrame(animate)
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isPlaying, isInitialized, updateAudioData, renderVisualizer])

  // Initialize and cleanup
  useEffect(() => {
    if (audioElement && !isInitialized) {
      initializeAudioAnalysis()
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect()
      }
    }
  }, [audioElement, isInitialized, initializeAudioAnalysis])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !canvas.parentElement) return
      
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement.getBoundingClientRect()
      
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary)/0.05) 50%, hsl(var(--background)) 100%)',
        }}
      />
      
      {error && (
        <div className="absolute bottom-4 left-4 bg-red-500/20 text-red-400 text-xs px-3 py-1 rounded">
          {error}
        </div>
      )}
      
      {!isInitialized && !error && (
        <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded">
          Initializing audio analysis...
        </div>
      )}
    </div>
  )
}
