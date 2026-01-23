"use client"

import { useEffect, useRef } from "react"

interface SimpleVisualizerProps {
  isPlaying: boolean
  currentTime?: number
  volume?: number
  bpm?: number
}

export function SimpleVisualizer({
  isPlaying,
  currentTime = 0,
  volume = 1,
  bpm = 128,
}: SimpleVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  const barsRef = useRef<number[]>([])
  const smoothedBarsRef = useRef<number[]>([])

  const phaseRef = useRef(0)
  const energyRef = useRef(0)
  const lastBeatRef = useRef(-999)

  // Helper to prevent NaN/Infinity
  const safe = (v: number) => (isNaN(v) || !isFinite(v) ? 0.1 : Math.max(0, Math.min(1.8, v)))

  // Init
  useEffect(() => {
    const numBars = 64
    barsRef.current = Array(numBars).fill(0.1)
    smoothedBarsRef.current = Array(numBars).fill(0.1)
  }, [])

  // Beat info
  const getBeatInfo = (time: number) => {
    const beatInterval = 60 / bpm
    const currentBeat = Math.floor(time / beatInterval)
    const beatPhase = (time % beatInterval) / beatInterval
    const isDownbeat = currentBeat % 4 === 0
    const isBeat = currentBeat !== lastBeatRef.current

    if (isBeat) {
      lastBeatRef.current = currentBeat
      energyRef.current = safe(energyRef.current + (isDownbeat ? 0.65 : 0.38))
    }

    return { isBeat, isDownbeat, beatPhase }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let prevTime = performance.now()

    const render = (now: number) => {
      const delta = (now - prevTime) / 1000
      prevTime = now

      const width = canvas.width
      const height = canvas.height
      if (width <= 0 || height <= 0) return

      const centerX = width / 2
      const centerY = height / 2

      ctx.fillStyle = "rgba(0, 0, 0, 0.07)"
      ctx.fillRect(0, 0, width, height)

      phaseRef.current += isPlaying ? 0.035 : 0.012

      const { isBeat, isDownbeat, beatPhase } = getBeatInfo(currentTime)
      energyRef.current = safe(energyRef.current * 0.94)

      const bassEnergy = Math.sin(beatPhase * Math.PI) * 0.8 * (isDownbeat ? 1.25 : 1)
      const midEnergy = Math.sin(beatPhase * Math.PI * 2) * 0.55
      const highEnergy = Math.random() * 0.35 + Math.sin(currentTime * 12) * 0.22

      // Update bars
      const bars = barsRef.current
      for (let i = 0; i < bars.length; i++) {
        let baseValue

        if (i < bars.length / 3) {
          baseValue = bassEnergy * (0.85 + Math.random() * 0.4)
        } else if (i < (bars.length * 2) / 3) {
          baseValue = midEnergy * (0.75 + Math.random() * 0.55)
        } else {
          baseValue = highEnergy * (0.65 + Math.random() * 0.75)
        }

        if (isPlaying) {
          const randomEnergy = Math.random() * 0.75 * (volume / 100)
          baseValue = safe(baseValue + randomEnergy)

          if (isBeat) {
            baseValue *= isDownbeat ? 1.65 : 1.3
          }

          if (Math.random() < 0.06) baseValue = safe(baseValue + 0.4)
        } else {
          baseValue = Math.sin(phaseRef.current * 0.22 + i * 0.18) * 0.12 + 0.18
        }

        bars[i] = safe(bars[i] * 0.84 + baseValue * 0.16)
      }

      // Extra smoothing for fluidity
      for (let i = 0; i < bars.length; i++) {
        const prev = i === 0 ? bars[bars.length - 1] : bars[i - 1]
        const next = i === bars.length - 1 ? bars[0] : bars[i + 1]
        smoothedBarsRef.current[i] = safe(bars[i] * 0.6 + prev * 0.2 + next * 0.2)
      }

      // Draw bars - original color scheme restored
      const barWidth = width / bars.length

      for (let i = 0; i < bars.length; i++) {
        const heightVal = smoothedBarsRef.current[i]
        const barHeight = heightVal * height * 0.72

        let hue
        if (i < bars.length / 3) {
          hue = (i / (bars.length / 3)) * 60 + currentTime * 50
        } else if (i < (bars.length * 2) / 3) {
          hue = 120 + ((i - bars.length / 3) / (bars.length / 3)) * 60 + currentTime * 30
        } else {
          hue = 240 + ((i - (bars.length * 2) / 3) / (bars.length / 3)) * 60 + currentTime * 20
        }

        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.92)`)
        gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 52%, 0.65)`)
        gradient.addColorStop(1, `hsla(${hue + 120}, 90%, 38%, 0.35)`)

        const x = i * barWidth
        const barW = barWidth - 1.2 // slightly narrower gaps on mobile

        ctx.fillStyle = gradient
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${isBeat ? 0.85 : 0.55})`
        ctx.shadowBlur = isBeat ? 22 : 12
        ctx.fillRect(x + 0.6, centerY - barHeight / 2, barW, barHeight)
        ctx.shadowBlur = 0

        // subtle top highlight
        ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${0.35 + heightVal * 0.4})`
        ctx.fillRect(x + 0.6, centerY - barHeight / 2, barW, 3)
      }

      // Connecting line (wave feel)
      if (isPlaying) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + bassEnergy * 0.35})`
        ctx.lineWidth = 2.2
        ctx.beginPath()

        for (let i = 0; i < bars.length; i++) {
          const x = i * barWidth + barWidth / 2
          const y = centerY + (smoothedBarsRef.current[i] - 0.5) * height * 0.32

          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Center pulse - stronger on mobile-visible
      if (isPlaying) {
        const pulse = Math.sin(beatPhase * Math.PI * 2) * 0.5 + 0.5
        const maxSize = Math.min(width, height) * 0.35
        const pulseSize = 25 + pulse * 60 + energyRef.current * 110
        const safeSize = Math.min(maxSize, pulseSize)

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, safeSize)

        if (isDownbeat) {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.85)")
          gradient.addColorStop(0.45, "rgba(255, 90, 110, 0.45)")
        } else if (isBeat) {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.7)")
          gradient.addColorStop(0.45, "rgba(110, 100, 255, 0.38)")
        } else {
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.35)")
          gradient.addColorStop(0.6, "rgba(90, 180, 255, 0.12)")
        }
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(centerX, centerY, safeSize, 0, Math.PI * 2)
        ctx.fill()

        if (isBeat) {
          ctx.strokeStyle = isDownbeat ? "rgba(255, 80, 100, 0.9)" : "rgba(100, 90, 255, 0.7)"
          ctx.lineWidth = isDownbeat ? 4.5 : 3
          ctx.beginPath()
          ctx.arc(centerX, centerY, safeSize * 0.6 + 18, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Bottom band indicators (smaller on mobile)
      if (isPlaying) {
        const bandH = height * 0.08
        const maxW = width * 0.9

        ctx.fillStyle = `rgba(255, 90, 90, ${0.25 + bassEnergy * 0.35})`
        ctx.fillRect(0, height - bandH, maxW * bassEnergy, bandH)

        ctx.fillStyle = `rgba(90, 255, 140, ${0.25 + midEnergy * 0.35})`
        ctx.fillRect(0, height - bandH * 2.1, maxW * midEnergy, bandH)

        ctx.fillStyle = `rgba(90, 140, 255, ${0.25 + highEnergy * 0.35})`
        ctx.fillRect(0, height - bandH * 4.2, maxW * highEnergy, bandH)
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPlaying, currentTime, volume, bpm])

  // Resize - fully responsive
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !canvas.parentElement) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.parentElement.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      const ctx = canvas.getContext("2d")
      if (ctx) ctx.scale(dpr, dpr)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full touch-none"
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        background: "linear-gradient(135deg, #000000 0%, #0a001a 50%, #000000 100%)",
      }}
    />
  )
}
