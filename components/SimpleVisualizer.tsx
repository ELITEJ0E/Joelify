"use client"

import { useEffect, useRef } from "react"
import { useApp } from "@/contexts/AppContext"

interface SimpleVisualizerProps {
  isPlaying: boolean
  currentTime?: number // Added for beat sync
  volume?: number
  bpm?: number // Added for beat sync
}

export function SimpleVisualizer({ 
  isPlaying, 
  currentTime = 0, // Default to 0
  volume = 1,
  bpm = 128 // Default BPM for electronic music
}: SimpleVisualizerProps) {
  const { analyserNode, audioSettings } = useApp()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const barsRef = useRef<number[]>([])
  const phaseRef = useRef(0)
  const lastBeatRef = useRef(0)
  const energyRef = useRef(0)
  
  // Real-time beat detection refs
  const beatThresholdRef = useRef(0.5)
  const lastBeatTimeRef = useRef(0)

  // Initialize bars
  useEffect(() => {
    const numBars = 64
    barsRef.current = Array(numBars).fill(0).map(() => Math.random() * 0.3)
  }, [])

  // Animation loop with beat sync
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      if (!canvas || !ctx) return

      const width = canvas.width
      const height = canvas.height
      
      // Clear with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'
      ctx.fillRect(0, 0, width, height)

      // Update phase
      phaseRef.current += isPlaying ? 0.03 : 0.01
      
      // Update energy (decay over time)
      energyRef.current *= 0.95

      let bassEnergy = 0
      let midEnergy = 0
      let highEnergy = 0
      let isBeat = false
      let isDownbeat = false
      let beatPhase = 0

      const bars = barsRef.current

      if (audioSettings.realAudioEngine && analyserNode && isPlaying) {
        // Get real frequency data
        const fullDataArray = new Uint8Array(analyserNode.frequencyBinCount)
        analyserNode.getByteFrequencyData(fullDataArray)
        
        // Logarithmic downsampling to 64 bars for a more accurate EQ look
        const minLog = Math.log10(1)
        const maxLog = Math.log10(analyserNode.frequencyBinCount)
        const logRange = maxLog - minLog

        for (let i = 0; i < 64; i++) {
          const startLog = minLog + (i / 64) * logRange
          const endLog = minLog + ((i + 1) / 64) * logRange
          const startIndex = Math.floor(Math.pow(10, startLog))
          const endIndex = Math.floor(Math.pow(10, endLog))
          
          let sum = 0
          let count = 0
          for (let j = startIndex; j <= endIndex && j < analyserNode.frequencyBinCount; j++) {
            sum += fullDataArray[j]
            count++
          }
          const avg = count > 0 ? sum / count : 0
          const normalized = avg / 255.0
          
          // Smooth transition
          bars[i] = bars[i] * 0.7 + normalized * 0.3

          if (i < 21) bassEnergy += normalized
          else if (i < 42) midEnergy += normalized
          else highEnergy += normalized
        }
        bassEnergy /= 21
        midEnergy /= 21
        highEnergy /= 22

        // Real-time beat detection using bass energy
        let currentBassEnergy = 0
        for (let i = 0; i < 5; i++) {
          currentBassEnergy += fullDataArray[i]
        }
        currentBassEnergy /= (5 * 255.0)

        if (currentBassEnergy > beatThresholdRef.current && currentBassEnergy > 0.4 && (Date.now() - lastBeatTimeRef.current > 250)) {
          isBeat = true
          isDownbeat = true
          lastBeatTimeRef.current = Date.now()
          energyRef.current = Math.min(1, energyRef.current + 0.5)
          beatThresholdRef.current = currentBassEnergy * 1.2
        } else {
          beatThresholdRef.current = Math.max(0.3, beatThresholdRef.current * 0.98)
        }
        
        // Calculate a fake beat phase for visual continuity
        const timeSinceBeat = Date.now() - lastBeatTimeRef.current
        beatPhase = Math.min(1, timeSinceBeat / 500)

      } else {
        // Fake beat sync
        const beatInterval = 60 / bpm
        const currentBeat = Math.floor(currentTime / beatInterval)
        beatPhase = (currentTime % beatInterval) / beatInterval
        isDownbeat = currentBeat % 4 === 0
        isBeat = currentBeat !== lastBeatRef.current
        
        if (isBeat) {
          lastBeatRef.current = currentBeat
          energyRef.current = Math.min(1, energyRef.current + (isDownbeat ? 0.5 : 0.3))
        }

        // Simulate frequency bands based on beat
        bassEnergy = Math.sin(beatPhase * Math.PI) * 0.7 * (isDownbeat ? 1.2 : 1)
        midEnergy = Math.sin(beatPhase * Math.PI * 2) * 0.5
        highEnergy = Math.random() * 0.3 + Math.sin(currentTime * 10) * 0.2

        // Update bars based on play state and beat sync
        for (let i = 0; i < bars.length; i++) {
          let baseValue
          
          if (i < bars.length / 3) {
            baseValue = bassEnergy * (0.8 + Math.random() * 0.4)
          } else if (i < (bars.length * 2) / 3) {
            baseValue = midEnergy * (0.7 + Math.random() * 0.6)
          } else {
            baseValue = highEnergy * (0.6 + Math.random() * 0.8)
          }

          if (isPlaying) {
            const randomEnergy = Math.random() * 0.7 * (volume / 100)
            baseValue = Math.min(1, baseValue + randomEnergy)
            if (isBeat) baseValue *= isDownbeat ? 1.5 : 1.2
            if (Math.random() < 0.05) baseValue = 1
          } else {
            baseValue = Math.sin(phaseRef.current * 0.2) * 0.1 + 0.2
          }

          bars[i] = bars[i] * 0.85 + baseValue * 0.15
        }
      }

      // Draw bars with gradient
      const barWidth = width / bars.length
      const centerY = height / 2

      for (let i = 0; i < bars.length; i++) {
        const barHeight = bars[i] * height * (window.innerWidth >= 1024 ? 0.9 : 0.7)
        
        // Create colorful gradient based on frequency band
        let hue
        if (i < bars.length / 3) {
          hue = (i / (bars.length / 3)) * 60 + currentTime * 50
        } else if (i < (bars.length * 2) / 3) {
          hue = 120 + ((i - bars.length / 3) / (bars.length / 3)) * 60 + currentTime * 30
        } else {
          hue = 240 + ((i - (bars.length * 2) / 3) / (bars.length / 3)) * 60 + currentTime * 20
        }

        const gradient = window.innerWidth >= 1024
          ? ctx.createLinearGradient(0, height, 0, height - barHeight)
          : ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`)
        gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 50%, 0.6)`)
        gradient.addColorStop(1, `hsla(${hue + 120}, 100%, 40%, 0.3)`)

        ctx.fillStyle = gradient
        
        // Draw bar with rounded corners effect
        const x = i * barWidth
        const y = window.innerWidth >= 1024 ? height - barHeight : centerY - barHeight / 2
        const barW = barWidth - 1
        
        ctx.fillRect(x, y, barW, barHeight)
        
        const glowIntensity = isBeat ? 20 : 10
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${isBeat ? 0.8 : 0.5})`
        ctx.shadowBlur = glowIntensity
        ctx.fillRect(x, y, barW, barHeight)
        ctx.shadowBlur = 0
      }

      // Draw connecting lines for wave effect
      if (isPlaying) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + bassEnergy * 0.3})`
        ctx.lineWidth = 2
        ctx.beginPath()
        
        const sliceWidth = width / bars.length
        for (let i = 0; i < bars.length; i++) {
          const x = i * sliceWidth
          const y = centerY + (bars[i] - 0.5) * height * 0.3
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      // Draw beat-synced center pulse
      if (isPlaying) {
        const centerX = width / 2
        const pulse = Math.sin(beatPhase * Math.PI * 2) * 0.5 + 0.5
        const pulseSize = 30 + pulse * 50 + energyRef.current * 100
        
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, pulseSize
        )
        
        if (isDownbeat) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
          gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.4)')
        } else if (isBeat) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
          gradient.addColorStop(0.5, 'rgba(100, 100, 255, 0.3)')
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
          gradient.addColorStop(0.5, 'rgba(100, 255, 100, 0.1)')
        }
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2)
        ctx.fill()

        if (isBeat) {
          ctx.strokeStyle = isDownbeat ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 100, 255, 0.6)'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(centerX, centerY, 40, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Draw frequency band indicators
      if (isPlaying) {
        const bandHeight = height / 6
        
        ctx.fillStyle = `rgba(255, 100, 100, ${0.2 + bassEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight, width * bassEnergy, bandHeight)
        
        ctx.fillStyle = `rgba(100, 255, 100, ${0.2 + midEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight * 2, width * midEnergy, bandHeight)
        
        ctx.fillStyle = `rgba(100, 100, 255, ${0.2 + highEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight * 3, width * highEnergy, bandHeight)
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, currentTime, volume, bpm, analyserNode, audioSettings.realAudioEngine])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !canvasRef.current.parentElement) return
      
      const container = canvasRef.current.parentElement
      const dpr = window.devicePixelRatio || 1
      
      canvasRef.current.width = container.clientWidth * dpr
      canvasRef.current.height = container.clientHeight * dpr
      
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'block',
      }}
    />
  )
}
