"use client"

import { useEffect, useRef, useCallback } from "react"

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
  const phaseRef = useRef(0)
  const lastBeatRef = useRef(0)
  const energyRef = useRef(0)

  // Init bars
  useEffect(() => {
    barsRef.current = Array(80).fill(0).map(() => Math.random() * 0.2)
  }, [])

  // Resize observer — keeps canvas pixel-perfect at any container size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const { width, height } = parent.getBoundingClientRect()
      canvas.width = width * dpr
      canvas.height = height * dpr
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.scale(dpr, dpr)
    }

    resize()

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize)
      const parent = canvas.parentElement
      if (parent) ro.observe(parent)
    } else {
      window.addEventListener("resize", resize)
    }

    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener("resize", resize)
    }
  }, [])

  // Animation loop
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr

    // Fade
    ctx.fillStyle = "rgba(0,0,0,0.09)"
    ctx.fillRect(0, 0, W, H)

    phaseRef.current += isPlaying ? 0.028 : 0.006

    // Beat info
    const beatInterval = 60 / bpm
    const currentBeat = Math.floor(currentTime / beatInterval)
    const beatPhase = (currentTime % beatInterval) / beatInterval
    const isDownbeat = currentBeat % 4 === 0
    const isBeat = currentBeat !== lastBeatRef.current

    if (isBeat) {
      lastBeatRef.current = currentBeat
      energyRef.current = Math.min(1, energyRef.current + (isDownbeat ? 0.55 : 0.32))
    }
    energyRef.current *= 0.94

    const bassEnergy = Math.sin(beatPhase * Math.PI) * 0.7 * (isDownbeat ? 1.25 : 1)
    const midEnergy = Math.sin(beatPhase * Math.PI * 2) * 0.5
    const highEnergy = Math.random() * 0.28 + Math.sin(currentTime * 11) * 0.18

    const bars = barsRef.current
    const N = bars.length
    for (let i = 0; i < N; i++) {
      let base: number
      if (i < N / 3) {
        base = bassEnergy * (0.75 + Math.random() * 0.45)
      } else if (i < (N * 2) / 3) {
        base = midEnergy * (0.65 + Math.random() * 0.65)
      } else {
        base = highEnergy * (0.55 + Math.random() * 0.85)
      }

      if (isPlaying) {
        const rnd = Math.random() * 0.65 * (volume / 100)
        base = Math.min(1, base + rnd)
        if (isBeat) base *= isDownbeat ? 1.5 : 1.22
        if (Math.random() < 0.04) base = 1
      } else {
        base = Math.sin(phaseRef.current * 0.18 + i * 0.12) * 0.12 + 0.14
      }

      bars[i] = bars[i] * 0.82 + base * 0.18
    }

    // Draw bars
    const barW = W / N
    const cy = H / 2

    for (let i = 0; i < N; i++) {
      const bh = bars[i] * H * 0.68
      if (bh < 1.5) continue
      const x = i * barW
      const y = cy - bh / 2

      let hue: number
      if (i < N / 3) hue = (i / (N / 3)) * 55 + currentTime * 45
      else if (i < (N * 2) / 3) hue = 120 + ((i - N / 3) / (N / 3)) * 65 + currentTime * 28
      else hue = 245 + ((i - (N * 2) / 3) / (N / 3)) * 60 + currentTime * 18

      const grad = ctx.createLinearGradient(0, y, 0, y + bh)
      grad.addColorStop(0, `hsla(${hue}, 100%, 65%, 0.95)`)
      grad.addColorStop(0.5, `hsla(${hue + 50}, 100%, 50%, 0.65)`)
      grad.addColorStop(1, `hsla(${hue + 110}, 100%, 38%, 0.3)`)

      ctx.fillStyle = grad

      // Glow on active beats
      if (isBeat && bars[i] > 0.55) {
        ctx.shadowColor = `hsla(${hue}, 100%, 62%, 0.7)`
        ctx.shadowBlur = isDownbeat ? 18 : 10
      } else {
        ctx.shadowBlur = 0
      }

      ctx.fillRect(x, y, Math.max(barW - 1.5, 1), bh)
    }
    ctx.shadowBlur = 0

    // Centre pulse
    if (isPlaying) {
      const pulseSize = 28 + Math.sin(beatPhase * Math.PI * 2) * 22 + energyRef.current * 80
      const grd = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, pulseSize)

      if (isDownbeat && isBeat) {
        grd.addColorStop(0, "rgba(255,255,255,0.85)")
        grd.addColorStop(0.5, "rgba(255,100,100,0.35)")
      } else {
        grd.addColorStop(0, "rgba(255,255,255,0.35)")
        grd.addColorStop(0.5, "rgba(100,130,255,0.12)")
      }
      grd.addColorStop(1, "rgba(0,0,0,0)")

      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(W / 2, cy, pulseSize, 0, Math.PI * 2)
      ctx.fill()
    }

    // Wave line overlay
    if (isPlaying) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + bassEnergy * 0.22})`
      ctx.lineWidth = 1.5
      for (let i = 0; i < N; i++) {
        const x = i * barW
        const yy = cy + (bars[i] - 0.5) * H * 0.28
        i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }

    animationFrameRef.current = requestAnimationFrame(render)
  }, [isPlaying, currentTime, volume, bpm]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render)
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [render])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
      style={{
        background: "linear-gradient(145deg, #000 0%, #06001a 55%, #000 100%)",
      }}
    />
  )
}
