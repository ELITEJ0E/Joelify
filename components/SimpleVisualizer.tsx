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

  // Safe clamp helper
  const clamp = (v: number, min = 0, max = 1.5) => Math.max(min, Math.min(max, isNaN(v) ? 0 : v))

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const numBars = 56
    barsRef.current = new Array(numBars).fill(0.08)
    smoothedBarsRef.current = new Array(numBars).fill(0.08)
  }, [])

  // ─── Beat detection ──────────────────────────────────────────────────────
  const getBeatInfo = (time: number) => {
    const beatInterval = 60 / bpm
    const beatProgress = (time % beatInterval) / beatInterval
    const currentBeat = Math.floor(time / beatInterval)

    const isNewBeat = currentBeat > Math.floor(lastBeatRef.current / beatInterval)
    if (isNewBeat) {
      lastBeatRef.current = time
      const isDownbeat = currentBeat % 4 === 0
      energyRef.current = clamp(energyRef.current + (isDownbeat ? 0.7 : 0.4), 0, 1.35)
    }

    return { beatProgress, isNewBeat, isDownbeat: currentBeat % 4 === 0 }
  }

  // ─── Render loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let prevTime = performance.now()

    const render = (now: number) => {
      const delta = (now - prevTime) / 1000
      prevTime = now

      const w = canvas.width
      const h = canvas.height
      if (w <= 0 || h <= 0) return // safety

      const centerX = w / 2
      const centerY = h / 2

      ctx.fillStyle = "rgba(0, 0, 0, 0.065)"
      ctx.fillRect(0, 0, w, h)

      phaseRef.current += isPlaying ? delta * 0.9 : delta * 0.25

      const { beatProgress, isNewBeat, isDownbeat } = getBeatInfo(currentTime)
      energyRef.current = clamp(energyRef.current * 0.93)

      const bass = Math.sin(beatProgress * Math.PI * 2) ** 1.4 * (isDownbeat ? 1.25 : 0.95)
      const mid = Math.sin(beatProgress * Math.PI * 3.2 + 0.3) * 0.6
      const high = 0.25 + Math.sin(phaseRef.current * 9 + 1.2) * 0.3

      const barCount = barsRef.current.length
      for (let i = 0; i < barCount; i++) {
        let target = 0.08

        if (isPlaying) {
          const pos = i / (barCount - 1)
          if (pos < 0.33) {
            target = bass * (0.9 + Math.random() * 0.35)
          } else if (pos < 0.66) {
            target = mid * (0.8 + Math.random() * 0.5)
          } else {
            target = high * (0.7 + Math.random() * 0.6)
          }

          target += energyRef.current * 0.75

          if (isNewBeat) {
            target *= isDownbeat ? 1.75 : 1.35
          }

          if (Math.random() < 0.04) target = Math.max(target, 0.9)
        } else {
          target = 0.12 + Math.sin(phaseRef.current * 1.4 + i * 0.38) * 0.11
        }

        barsRef.current[i] = clamp(barsRef.current[i] * 0.82 + target * 0.18)
      }

      // Smoothing with boundary check
      for (let i = 0; i < barCount; i++) {
        const prev = i === 0 ? barsRef.current[barCount - 1] : barsRef.current[i - 1]
        const next = i === barCount - 1 ? barsRef.current[0] : barsRef.current[i + 1]
        smoothedBarsRef.current[i] = clamp(
          barsRef.current[i] * 0.62 + prev * 0.19 + next * 0.19
        )
      }

      // ─── Draw bars ───────────────────────────────────────────────────────
      const barWidth = w / barCount
      const timeHueShift = phaseRef.current * 22

      for (let i = 0; i < barCount; i++) {
        let heightVal = smoothedBarsRef.current[i]
        if (isNaN(heightVal) || !isFinite(heightVal)) heightVal = 0.08 // prevent NaN propagation

        const barHeight = clamp(heightVal, 0, 1.5) * h * 0.78

        const pos = i / (barCount - 1)
        let baseHue = 30 + pos * 300
        baseHue = (baseHue + timeHueShift) % 360
        const sat = 85 + Math.sin(phaseRef.current * 0.7 + pos * 4) * 15
        const lum = 55 + heightVal * 20 + (isNewBeat ? 15 : 0)

        const y0 = centerY - barHeight
        const y1 = centerY + barHeight

        // Only create gradient if y values are finite
        let gradient
        if (isFinite(y0) && isFinite(y1)) {
          gradient = ctx.createLinearGradient(0, y0, 0, y1)
          gradient.addColorStop(0, `hsla(${baseHue}, ${sat}%, ${lum + 15}%, 0.92)`)
          gradient.addColorStop(0.45, `hsla(${(baseHue + 40) % 360}, ${sat}%, ${lum}%, 0.75)`)
          gradient.addColorStop(1, `hsla(${(baseHue + 90) % 360}, ${sat - 10}%, ${lum - 15}%, 0.35)`)
        } else {
          gradient = ctx.createLinearGradient(0, centerY, 0, centerY + 1) // fallback
        }

        const x = i * barWidth

        ctx.fillStyle = gradient
        ctx.shadowColor = `hsla(${baseHue}, 90%, 65%, ${0.5 + energyRef.current * 0.45})`
        ctx.shadowBlur = 18 + (isNewBeat ? 28 : 12)
        ctx.fillRect(x + 1, centerY - barHeight / 2, barWidth - 2, barHeight)

        // highlight
        ctx.shadowBlur = 0
        ctx.fillStyle = `hsla(${baseHue}, 80%, 85%, ${0.4 + heightVal * 0.4})`
        ctx.fillRect(x + 1, centerY - barHeight / 2, barWidth - 2, Math.min(4, barHeight * 0.08))
      }

      // ─── Center pulse ────────────────────────────────────────────────────
      if (isPlaying || energyRef.current > 0.05) {
        const pulse = Math.sin(beatProgress * Math.PI * 2.8) * 0.5 + 0.5
        const size = 28 + pulse * 90 + energyRef.current * 160

        const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size)

        if (isDownbeat) {
          grad.addColorStop(0, "rgba(255, 110, 140, 0.75)")
          grad.addColorStop(0.45, "rgba(220, 90, 180, 0.45)")
        } else if (isNewBeat) {
          grad.addColorStop(0, "rgba(170, 130, 255, 0.65)")
          grad.addColorStop(0.5, "rgba(120, 100, 240, 0.35)")
        } else {
          grad.addColorStop(0, `rgba(140, 180, 255, ${0.35 + energyRef.current * 0.25})`)
          grad.addColorStop(0.6, "rgba(100, 140, 220, 0.12)")
        }
        grad.addColorStop(1, "rgba(60, 90, 180, 0)")

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2)
        ctx.fill()

        if (isNewBeat) {
          ctx.strokeStyle = isDownbeat
            ? "rgba(255, 90, 130, 0.85)"
            : "rgba(140, 110, 255, 0.7)"
          ctx.lineWidth = isDownbeat ? 5.5 : 3.8
          ctx.beginPath()
          ctx.arc(centerX, centerY, size * 0.65 + 25, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationFrameRef.current!)
  }, [isPlaying, currentTime, volume, bpm])

  // Resize logic (unchanged)
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !canvas.parentElement) return

      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.parentElement.clientWidth * dpr
      canvas.height = canvas.parentElement.clientHeight * dpr

      const ctx = canvas.getContext("2d")
      ctx?.scale(dpr, dpr)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        background: "radial-gradient(circle at 50% 50%, #0c0015 0%, #000 70%)",
      }}
    />
  )
}
