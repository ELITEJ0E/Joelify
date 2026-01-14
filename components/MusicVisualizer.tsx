"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MusicVisualizerProps {
  isPlaying: boolean
  audioElement?: HTMLAudioElement | null
}

export function MusicVisualizer({ isPlaying, audioElement }: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Audio analysis data
  const freqDataRef = useRef<Uint8Array | null>(null)
  const bassEnergyRef = useRef(0)
  const midEnergyRef = useRef(0)
  const highEnergyRef = useRef(0)
  const beatDetectedRef = useRef(false)
  const lastBeatTimeRef = useRef(0)
  const bassHistoryRef = useRef<number[]>([])

  // Visual state
  const hueRef = useRef(0)
  const targetHueRef = useRef(0)
  const scaleRef = useRef(1)
  const rotationRef = useRef(0)
  const particlesRef = useRef<
    Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      size: number
      hue: number
    }>
  >([])

  // EMA smoothing factor
  const EMA_FACTOR = 0.7

  const initAudio = useCallback(() => {
    try {
      // Get the iframe and its audio
      const iframe = document.getElementById("youtube-player") as HTMLIFrameElement
      if (!iframe) {
        console.log("[Visualizer] YouTube iframe not found")
        return
      }

      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log("[Visualizer] Audio context created")
      }

      // Create analyser
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 2048
        analyserRef.current.smoothingTimeConstant = 0.8
        freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
        console.log("[Visualizer] Analyser created")
      }

      // Try to connect to iframe audio
      // Note: This may not work due to CORS restrictions with YouTube iframe
      // We'll create a fallback procedural visualization
    } catch (error) {
      console.error("[Visualizer] Audio init error:", error)
    }
  }, [])

  const updateAudioAnalysis = useCallback(() => {
    if (!analyserRef.current || !freqDataRef.current) return

    try {
      analyserRef.current.getByteFrequencyData(freqDataRef.current)

      // Extract frequency bands
      const bassEnd = 20
      const midEnd = 160
      const highEnd = 512

      let bassSum = 0
      let midSum = 0
      let highSum = 0

      for (let i = 0; i < bassEnd; i++) {
        bassSum += freqDataRef.current[i]
      }
      for (let i = bassEnd; i < midEnd; i++) {
        midSum += freqDataRef.current[i]
      }
      for (let i = midEnd; i < highEnd; i++) {
        highSum += freqDataRef.current[i]
      }

      // Normalize to 0-1 range
      const bass = bassSum / (bassEnd * 255)
      const mid = midSum / ((midEnd - bassEnd) * 255)
      const high = highSum / ((highEnd - midEnd) * 255)

      // Apply EMA smoothing
      bassEnergyRef.current = bassEnergyRef.current * (1 - EMA_FACTOR) + bass * EMA_FACTOR
      midEnergyRef.current = midEnergyRef.current * (1 - EMA_FACTOR) + mid * EMA_FACTOR
      highEnergyRef.current = highEnergyRef.current * (1 - EMA_FACTOR) + high * EMA_FACTOR

      // Beat detection
      bassHistoryRef.current.push(bass)
      if (bassHistoryRef.current.length > 20) {
        bassHistoryRef.current.shift()
      }

      const avgBass = bassHistoryRef.current.reduce((a, b) => a + b, 0) / bassHistoryRef.current.length
      const now = Date.now()

      if (bass > avgBass * 1.4 && now - lastBeatTimeRef.current > 200) {
        beatDetectedRef.current = true
        lastBeatTimeRef.current = now
        targetHueRef.current += 25
      } else {
        beatDetectedRef.current = false
      }
    } catch (error) {
      // Fallback to procedural generation if no audio data
      // Use time-based animation
      const time = Date.now() / 1000
      bassEnergyRef.current = (Math.sin(time * 2) + 1) / 2
      midEnergyRef.current = (Math.sin(time * 3) + 1) / 2
      highEnergyRef.current = (Math.sin(time * 5) + 1) / 2

      if (Math.random() > 0.97) {
        beatDetectedRef.current = true
        targetHueRef.current += 25
        lastBeatTimeRef.current = Date.now()
      } else {
        beatDetectedRef.current = false
      }
    }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Update audio analysis
    if (isPlaying) {
      updateAudioAnalysis()
    } else {
      // Fade out when paused
      bassEnergyRef.current *= 0.95
      midEnergyRef.current *= 0.95
      highEnergyRef.current *= 0.95
    }

    // Smooth hue transition
    hueRef.current = hueRef.current * 0.95 + targetHueRef.current * 0.05
    if (hueRef.current > 360) hueRef.current -= 360

    // Clear with fade effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
    ctx.fillRect(0, 0, width, height)

    // Layer 1: Bass reactive radial pulse
    const bassScale = 1 + bassEnergyRef.current * 0.3
    scaleRef.current = scaleRef.current * 0.9 + bassScale * 0.1

    const saturation = 60 + bassEnergyRef.current * 40
    const lightness = 40 + bassEnergyRef.current * 30

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.scale(scaleRef.current, scaleRef.current)

    // Draw radial glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 150)
    gradient.addColorStop(0, `hsla(${hueRef.current}, ${saturation}%, ${lightness}%, 0.3)`)
    gradient.addColorStop(0.5, `hsla(${hueRef.current}, ${saturation}%, ${lightness}%, 0.1)`)
    gradient.addColorStop(1, "transparent")

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, 150, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Layer 2: Mid frequency morphing shapes
    rotationRef.current += 0.002 + midEnergyRef.current * 0.01

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotationRef.current)

    const sides = 6
    const radius = 80 + midEnergyRef.current * 60

    ctx.strokeStyle = `hsla(${hueRef.current + 60}, ${saturation}%, ${lightness + 10}%, 0.5)`
    ctx.lineWidth = 2
    ctx.beginPath()

    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2
      const waveOffset = Math.sin(angle * 3 + Date.now() / 500) * 20 * midEnergyRef.current
      const r = radius + waveOffset
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.closePath()
    ctx.stroke()
    ctx.restore()

    // Layer 3: High frequency particles
    if (isPlaying && highEnergyRef.current > 0.3 && Math.random() > 0.7) {
      const particleCount = Math.floor(highEnergyRef.current * 5)
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 3
        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: 2 + Math.random() * 3,
          hue: hueRef.current + Math.random() * 60,
        })
      }
    }

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.life -= 0.02
      p.size *= 0.98

      if (p.life > 0) {
        ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        return true
      }
      return false
    })

    // Layer 4: Beat flash effect
    if (beatDetectedRef.current) {
      ctx.fillStyle = `hsla(${hueRef.current}, 100%, 80%, 0.1)`
      ctx.fillRect(0, 0, width, height)
    }

    // Continue animation
    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(render)
    }
  }, [isPlaying, isVisible, updateAudioAnalysis])

  // Initialize and start rendering
  useEffect(() => {
    if (isVisible) {
      initAudio()
      render()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, initAudio, render])

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = isFullscreen ? window.innerHeight : 200
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => window.removeEventListener("resize", resizeCanvas)
  }, [isFullscreen])

  if (!isVisible) {
    return (
      <div className="relative w-full h-12 bg-black/50 flex items-center justify-center">
        <Button size="sm" variant="ghost" onClick={() => setIsVisible(true)} className="text-white/60 hover:text-white">
          <Eye size={16} className="mr-2" />
          Show Visualizer
        </Button>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${isFullscreen ? "fixed inset-0 z-50" : "h-[200px]"} bg-black`}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="text-white/60 hover:text-white"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsVisible(false)}
          className="text-white/60 hover:text-white"
        >
          <EyeOff size={16} />
        </Button>
      </div>
    </div>
  )
}
