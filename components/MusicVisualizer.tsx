"use client"

import { useEffect, useRef, useCallback } from "react"

interface MusicVisualizerProps {
  isPlaying: boolean
  currentTime?: number
  duration?: number
  volume?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  hue: number
}

export function MusicVisualizer({ isPlaying, currentTime = 0, volume = 1 }: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Refs for smooth animations
  const hueRef = useRef(220)
  const particlesRef = useRef<Particle[]>([])
  const energyRef = useRef({ bass: 0, mid: 0, high: 0 })
  const wavePhaseRef = useRef(0)
  const lastBeatRef = useRef(-1)
  const pulseRef = useRef(1)

  const bpm = 128
  const beatInterval = 60000 / bpm

  const detectBeat = useCallback((time: number) => {
    const currentBeat = Math.floor((time * 1000) / beatInterval)
    const beatPhase = ((time * 1000) % beatInterval) / beatInterval
    const isDownbeat = currentBeat % 4 === 0
    const isBeat = currentBeat !== lastBeatRef.current && beatPhase < 0.15

    if (isBeat) {
      lastBeatRef.current = currentBeat
    }

    return { isBeat, isDownbeat, beatPhase }
  }, [beatInterval])

  const generateEnergy = useCallback((time: number, vol: number) => {
    const { beatPhase, isDownbeat } = detectBeat(time)

    // Bass - strong on beats with smooth decay
    const bassDecay = Math.exp(-beatPhase * 4)
    const bassBase = bassDecay * (isDownbeat ? 1.0 : 0.7)
    const bass = bassBase * vol * (0.8 + Math.sin(time * 1.5) * 0.2)

    // Mid - flowing waves
    const midWave = Math.sin(time * 2.3) * 0.3 + Math.sin(time * 3.7) * 0.2 + 0.5
    const mid = midWave * vol * (0.7 + bassDecay * 0.3)

    // High - sparkly, responsive to volume
    const highBase = (Math.sin(time * 5.1) * Math.cos(time * 7.3) + 1) * 0.5
    const high = highBase * vol * (0.5 + Math.random() * 0.3)

    // Smooth with exponential moving average
    energyRef.current.bass = energyRef.current.bass * 0.75 + bass * 0.25
    energyRef.current.mid = energyRef.current.mid * 0.85 + mid * 0.15
    energyRef.current.high = energyRef.current.high * 0.8 + high * 0.2

    return energyRef.current
  }, [detectBeat])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    const time = currentTime || 0
    const { isBeat, isDownbeat, beatPhase } = detectBeat(time)
    const energy = isPlaying ? generateEnergy(time, volume) : { bass: 0, mid: 0, high: 0 }

    // Fade energy when paused
    if (!isPlaying) {
      energyRef.current.bass *= 0.95
      energyRef.current.mid *= 0.95
      energyRef.current.high *= 0.95
    }

    // Shift hue on beats
    if (isBeat && isPlaying) {
      hueRef.current += isDownbeat ? 25 : 10
      if (hueRef.current > 360) hueRef.current -= 360
    }

    // Smooth pulse
    const targetPulse = 1 + energy.bass * 0.2
    pulseRef.current = pulseRef.current * 0.9 + targetPulse * 0.1

    // Clear with fade trail
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
    ctx.fillRect(0, 0, width, height)

    // Update wave phase
    wavePhaseRef.current += isPlaying ? 0.02 + energy.mid * 0.03 : 0.005

    const centerX = width / 2
    const centerY = height / 2

    // Layer 1: Ambient gradient background
    const bgGradient = ctx.createRadialGradient(
      centerX + Math.sin(wavePhaseRef.current * 0.5) * 50,
      centerY + Math.cos(wavePhaseRef.current * 0.3) * 50,
      0,
      centerX,
      centerY,
      Math.max(width, height) * 0.7
    )
    bgGradient.addColorStop(0, `hsla(${hueRef.current}, 60%, 20%, ${0.15 + energy.bass * 0.1})`)
    bgGradient.addColorStop(0.5, `hsla(${hueRef.current + 40}, 50%, 12%, ${0.1 + energy.mid * 0.05})`)
    bgGradient.addColorStop(1, "transparent")
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Layer 2: Central glow pulse
    const glowRadius = 80 + energy.bass * 120
    const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius)
    glowGradient.addColorStop(0, `hsla(${hueRef.current}, 80%, 60%, ${0.4 + energy.bass * 0.3})`)
    glowGradient.addColorStop(0.4, `hsla(${hueRef.current + 20}, 70%, 50%, ${0.2 + energy.bass * 0.15})`)
    glowGradient.addColorStop(1, "transparent")
    
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.scale(pulseRef.current, pulseRef.current)
    ctx.translate(-centerX, -centerY)
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Layer 3: Flowing wave rings (smooth, no hexagons)
    ctx.save()
    ctx.translate(centerX, centerY)
    
    for (let ring = 0; ring < 4; ring++) {
      const ringRadius = 60 + ring * 50 + energy.bass * 30
      const waveAmplitude = 15 + energy.mid * 25
      const waveFrequency = 4 + ring
      const ringHue = hueRef.current + ring * 30
      const ringAlpha = 0.4 - ring * 0.08 + energy.mid * 0.2

      ctx.strokeStyle = `hsla(${ringHue}, 75%, 55%, ${ringAlpha})`
      ctx.lineWidth = 2.5 - ring * 0.4
      ctx.shadowBlur = 15
      ctx.shadowColor = `hsla(${ringHue}, 80%, 60%, 0.5)`
      ctx.beginPath()

      for (let i = 0; i <= 360; i += 2) {
        const angle = (i * Math.PI) / 180
        const wave = Math.sin(angle * waveFrequency + wavePhaseRef.current + ring * 0.5) * waveAmplitude
        const r = ringRadius + wave
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
    }
    ctx.restore()

    // Layer 4: Horizontal flowing waves at bottom
    const waveCount = 3
    for (let w = 0; w < waveCount; w++) {
      const baseY = height * 0.7 + w * 25
      const waveHue = hueRef.current + w * 40 + 60
      const amplitude = 20 + energy.mid * 40
      const frequency = 0.015 + w * 0.005

      ctx.strokeStyle = `hsla(${waveHue}, 70%, 55%, ${0.3 + energy.mid * 0.2 - w * 0.05})`
      ctx.lineWidth = 3 - w * 0.5
      ctx.shadowBlur = 12
      ctx.shadowColor = `hsla(${waveHue}, 80%, 60%, 0.4)`
      ctx.beginPath()

      for (let x = 0; x <= width; x += 3) {
        const y = baseY + 
          Math.sin(x * frequency + wavePhaseRef.current * (1 + w * 0.3)) * amplitude * (0.5 + energy.bass * 0.5) +
          Math.sin(x * frequency * 2.5 + wavePhaseRef.current * 1.5) * amplitude * 0.3

        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
    }

    // Layer 5: Floating particles on high energy
    if (isPlaying && energy.high > 0.3) {
      const spawnChance = energy.high * 0.4
      if (Math.random() < spawnChance) {
        const count = Math.floor(1 + energy.high * 3)
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2
          const dist = 50 + Math.random() * 100
          particlesRef.current.push({
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 3,
            vy: -1 - Math.random() * 2,
            life: 1,
            size: 2 + Math.random() * 3,
            hue: hueRef.current + Math.random() * 60
          })
        }
      }
    }

    // Limit particles
    if (particlesRef.current.length > 150) {
      particlesRef.current = particlesRef.current.slice(-150)
    }

    // Update and draw particles
    ctx.shadowBlur = 0
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.02
      p.life -= 0.012
      p.size *= 0.99

      if (p.life > 0) {
        const alpha = p.life * 0.8
        ctx.fillStyle = `hsla(${p.hue}, 85%, 65%, ${alpha})`
        ctx.shadowBlur = 8
        ctx.shadowColor = `hsla(${p.hue}, 90%, 70%, ${alpha * 0.5})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        return true
      }
      return false
    })
    ctx.shadowBlur = 0

    // Beat flash
    if (isBeat && isPlaying) {
      const intensity = isDownbeat ? 0.12 : 0.06
      ctx.fillStyle = `hsla(${hueRef.current}, 100%, 85%, ${intensity})`
      ctx.fillRect(0, 0, width, height)
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [isPlaying, currentTime, volume, detectBeat, generateEnergy])

  useEffect(() => {
    render()
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return

      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  )
}
