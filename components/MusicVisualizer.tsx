"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MusicVisualizerProps {
  isPlaying: boolean
  currentTime?: number
  duration?: number
  audioElement?: HTMLAudioElement | null
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  hue: number
  angle: number
  speed: number
}

export function MusicVisualizer({ isPlaying, currentTime = 0, duration = 0 }: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const bpm = 120 // Assume 120 BPM for most music
  const beatInterval = 60000 / bpm // ~500ms per beat
  const lastBeatRef = useRef(-1)
  const hueRef = useRef(180)
  const particlesRef = useRef<Particle[]>([])
  const rotationRef = useRef(0)
  const pulseRef = useRef(1)
  const energyRef = useRef({ bass: 0, mid: 0, high: 0 })
  const meshOffsetRef = useRef(0)

  const detectBeat = useCallback(
    (time: number): { isBeat: boolean; isDownbeat: boolean; beatPhase: number } => {
      const currentBeat = Math.floor((time * 1000) / beatInterval)
      const beatPhase = ((time * 1000) % beatInterval) / beatInterval
      const isDownbeat = currentBeat % 4 === 0
      const isBeat = currentBeat !== lastBeatRef.current && beatPhase < 0.1

      if (isBeat) {
        lastBeatRef.current = currentBeat
      }

      return { isBeat, isDownbeat, beatPhase }
    },
    [beatInterval],
  )

  const generateEnergy = useCallback(
    (time: number) => {
      const { beatPhase, isDownbeat } = detectBeat(time)

      // Bass follows beat pattern with exponential decay
      const bassDecay = 1 - Math.pow(beatPhase, 2)
      const bassBoost = isDownbeat ? 1.5 : 1.0
      const bassNoise = Math.sin(time * 2.5) * 0.2 + 0.8
      const bass = bassDecay * bassBoost * bassNoise

      // Mid frequencies are more continuous
      const mid = (Math.sin(time * 3.7) * 0.5 + 0.5) * (0.6 + bassDecay * 0.4)

      // High frequencies are sporadic
      const highBase = Math.sin(time * 7.3) * Math.sin(time * 11.1)
      const high = (highBase * 0.5 + 0.5) * (Math.random() > 0.6 ? 1.2 : 0.8)

      // Smooth transitions with EMA
      energyRef.current.bass = energyRef.current.bass * 0.7 + bass * 0.3
      energyRef.current.mid = energyRef.current.mid * 0.8 + mid * 0.2
      energyRef.current.high = energyRef.current.high * 0.85 + high * 0.15

      return energyRef.current
    },
    [detectBeat],
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    const time = currentTime || 0
    const { isBeat, isDownbeat } = detectBeat(time)

    // Generate energy levels
    const energy = isPlaying ? generateEnergy(time) : { bass: 0, mid: 0, high: 0 }

    // Fade out when paused
    if (!isPlaying) {
      energy.bass *= 0.9
      energy.mid *= 0.9
      energy.high *= 0.9
    }

    // Update hue on beats
    if (isBeat) {
      hueRef.current += isDownbeat ? 40 : 15
      if (hueRef.current > 360) hueRef.current -= 360
    }

    // Smooth pulse animation
    const targetPulse = 1 + energy.bass * 0.15
    pulseRef.current = pulseRef.current * 0.85 + targetPulse * 0.15

    ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
    ctx.fillRect(0, 0, width, height)

    meshOffsetRef.current += isPlaying ? 0.01 : 0
    const gradient = ctx.createRadialGradient(
      centerX + Math.sin(meshOffsetRef.current) * 100,
      centerY + Math.cos(meshOffsetRef.current * 0.7) * 100,
      0,
      centerX,
      centerY,
      Math.max(width, height) * 0.8,
    )
    gradient.addColorStop(0, `hsla(${hueRef.current}, 70%, 15%, 0.3)`)
    gradient.addColorStop(0.5, `hsla(${hueRef.current + 60}, 60%, 10%, 0.2)`)
    gradient.addColorStop(1, "hsla(0, 0%, 0%, 0.1)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.scale(pulseRef.current, pulseRef.current)

    const glowSize = 150 + energy.bass * 100
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize)
    const saturation = 60 + energy.bass * 30
    const lightness = 40 + energy.bass * 20

    glowGradient.addColorStop(0, `hsla(${hueRef.current}, ${saturation}%, ${lightness}%, 0.6)`)
    glowGradient.addColorStop(0.3, `hsla(${hueRef.current}, ${saturation}%, ${lightness}%, 0.3)`)
    glowGradient.addColorStop(0.6, `hsla(${hueRef.current + 30}, ${saturation}%, ${lightness - 10}%, 0.1)`)
    glowGradient.addColorStop(1, "transparent")

    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(centerX, centerY)
    rotationRef.current += (0.001 + energy.mid * 0.005) * (isPlaying ? 1 : 0)
    ctx.rotate(rotationRef.current)

    const barCount = 64
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2
      const barEnergy = (Math.sin(angle * 3 + time * 2) * 0.5 + 0.5) * energy.mid + energy.bass * 0.5
      const barHeight = 40 + barEnergy * 120
      const innerRadius = 60 + energy.bass * 30
      const barWidth = ((Math.PI * 2 * innerRadius) / barCount) * 0.7

      const x1 = Math.cos(angle) * innerRadius
      const y1 = Math.sin(angle) * innerRadius
      const x2 = Math.cos(angle) * (innerRadius + barHeight)
      const y2 = Math.sin(angle) * (innerRadius + barHeight)

      // Gradient for each bar
      const barGradient = ctx.createLinearGradient(x1, y1, x2, y2)
      const barHue = hueRef.current + (i / barCount) * 60
      barGradient.addColorStop(0, `hsla(${barHue}, 70%, 50%, 0.8)`)
      barGradient.addColorStop(1, `hsla(${barHue + 30}, 80%, 60%, 0.3)`)

      ctx.strokeStyle = barGradient
      ctx.lineWidth = barWidth
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(-rotationRef.current * 2)

    const sides = 6
    const shapeRadius = 80 + energy.mid * 60

    ctx.strokeStyle = `hsla(${hueRef.current + 120}, 80%, 60%, 0.6)`
    ctx.lineWidth = 3
    ctx.shadowBlur = 20
    ctx.shadowColor = `hsla(${hueRef.current + 120}, 80%, 60%, 0.8)`
    ctx.beginPath()

    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2
      const waveOffset = Math.sin(angle * 3 + time * 3) * 25 * energy.mid
      const r = shapeRadius + waveOffset
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

    if (isPlaying && energy.high > 0.4 && Math.random() > 0.6) {
      const particleCount = Math.floor(energy.high * 8)
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 4
        const distance = Math.random() * 100 + 50
        particlesRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: 1.5 + Math.random() * 3,
          hue: hueRef.current + Math.random() * 120,
          angle,
          speed,
        })
      }
    }

    // Limit particle count
    if (particlesRef.current.length > 300) {
      particlesRef.current = particlesRef.current.slice(-300)
    }

    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // Slight gravity
      p.life -= 0.015
      p.size *= 0.98

      if (p.life > 0) {
        // Draw particle with glow
        ctx.shadowBlur = 10
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, ${p.life})`
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${p.life})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        return true
      }
      return false
    })

    if (isBeat) {
      const flashIntensity = isDownbeat ? 0.15 : 0.08
      ctx.fillStyle = `hsla(${hueRef.current}, 100%, 80%, ${flashIntensity})`
      ctx.fillRect(0, 0, width, height)
    }

    // Continue animation loop
    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(render)
    }
  }, [isPlaying, currentTime, isVisible, detectBeat, generateEnergy])

  // Start/stop animation loop
  useEffect(() => {
    if (isVisible) {
      render()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, render])

  // Handle canvas resize with high DPI support
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const dpr = window.devicePixelRatio || 1
      const displayWidth = container.clientWidth
      const displayHeight = isFullscreen ? window.innerHeight : 200

      canvas.width = displayWidth * dpr
      canvas.height = displayHeight * dpr
      canvas.style.width = `${displayWidth}px`
      canvas.style.height = `${displayHeight}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    return () => window.removeEventListener("resize", resizeCanvas)
  }, [isFullscreen])

  if (!isVisible) {
    return (
      <div className="relative w-full h-12 bg-black/50 backdrop-blur-sm flex items-center justify-center border-b border-white/10">
        <Button size="sm" variant="ghost" onClick={() => setIsVisible(true)} className="text-white/60 hover:text-white">
          <Eye size={16} className="mr-2" />
          Show Visualizer
        </Button>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${isFullscreen ? "fixed inset-0 z-50" : "h-[200px]"} bg-black overflow-hidden`}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />

      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 via-black/20 to-transparent backdrop-blur-sm" />
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsVisible(false)}
          className="text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm"
        >
          <EyeOff size={16} />
        </Button>
      </div>
    </div>
  )
}
