"use client"

import { useEffect, useRef } from "react"

interface SimpleVisualizerProps {
  isPlaying: boolean
  currentTime?: number // For beat sync
  volume?: number
  bpm?: number // For beat sync
}

export function SimpleVisualizer({ 
  isPlaying, 
  currentTime = 0,
  volume = 1,
  bpm = 128 // Default BPM - can be overridden per song
}: SimpleVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const barsRef = useRef<number[]>([])
  const phaseRef = useRef(0)
  const lastBeatRef = useRef(0)
  const energyRef = useRef(0)
  const sectionRef = useRef(0) // Track simulated song section (0: intro, 1: build, 2: drop, 3: verse, etc.)
  const particleRefs = useRef<Array<{x: number, y: number, vx: number, vy: number, life: number, hue: number}>>([]) // For high-frequency sparkles

  // Initialize bars
  useEffect(() => {
    const numBars = 80 // Increased for finer detail
    barsRef.current = Array(numBars).fill(0).map(() => Math.random() * 0.2)
  }, [])

  // Calculate beat timing and song structure
  const getBeatInfo = (time: number) => {
    const beatInterval = 60 / bpm
    const currentBeat = Math.floor(time / beatInterval)
    const beatPhase = (time % beatInterval) / beatInterval
    const isDownbeat = currentBeat % 4 === 0
    const isBeat = currentBeat !== lastBeatRef.current
    
    if (isBeat) {
      lastBeatRef.current = currentBeat
      // Boost energy on beats, stronger on downbeats
      energyRef.current = Math.min(1, energyRef.current + (isDownbeat ? 0.6 : 0.35))
      
      // Simulate song sections based on beat count (common in modern tracks: 16-32 bar structures)
      const sectionBeat = currentBeat % 64 // Cycle every ~30-60s depending on BPM
      if (sectionBeat < 8) sectionRef.current = 0 // Intro: low energy
      else if (sectionBeat < 16) sectionRef.current = 1 // Build: rising
      else if (sectionBeat < 32) sectionRef.current = 2 // Drop/Chorus: high energy
      else if (sectionBeat < 48) sectionRef.current = 3 // Verse: medium, rhythmic
      else sectionRef.current = 4 // Bridge/Outro: varied, decaying
    }
    
    return { isBeat, isDownbeat, beatPhase, beatInterval, section: sectionRef.current }
  }

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      if (!canvas || !ctx) return

      const width = canvas.width
      const height = canvas.height
      
      // Clear with trail/fade (slower fade for echo effect in drops)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
      ctx.fillRect(0, 0, width, height)

      // Update phase
      phaseRef.current += isPlaying ? 0.04 : 0.008

      // Get beat and section info
      const { isBeat, isDownbeat, beatPhase, section } = getBeatInfo(currentTime)
      
      // Decay energy, slower in drops
      energyRef.current *= (section === 2 ? 0.97 : 0.94)

      // Simulate more detailed frequency bands (sub-bass, bass, low-mid, high-mid, highs, ultra-highs)
      let subBassEnergy = Math.pow(Math.sin(beatPhase * Math.PI * 0.5), 2) * 0.8 * (isDownbeat ? 1.4 : 1)
      let bassEnergy = Math.sin(beatPhase * Math.PI) * 0.9 * (isDownbeat ? 1.3 : 1)
      let lowMidEnergy = (Math.sin(beatPhase * Math.PI * 1.5) + Math.cos(phaseRef.current * 0.5)) * 0.6
      let highMidEnergy = (Math.sin(beatPhase * Math.PI * 3) + Math.random() * 0.4) * 0.5
      let highEnergy = (Math.random() * 0.4 + Math.sin(currentTime * 12) * 0.3) * (section === 2 ? 1.2 : 0.8)
      let ultraHighEnergy = Math.random() * 0.5 + Math.pow(Math.sin(currentTime * 20), 2) * 0.4

      // Adjust energies based on song section for modern song feel
      const sectionMultipliers = [0.4, 1.2, 1.8, 0.8, 0.6] // Intro, build, drop, verse, bridge
      subBassEnergy *= sectionMultipliers[section]
      bassEnergy *= sectionMultipliers[section]
      lowMidEnergy *= sectionMultipliers[section] * 0.8
      highMidEnergy *= sectionMultipliers[section] * 0.9
      highEnergy *= sectionMultipliers[section] * 1.1
      ultraHighEnergy *= sectionMultipliers[section] * 1.2

      // Update bars with more bands
      const bars = barsRef.current
      const bandSize = bars.length / 6 // Divide into 6 bands
      for (let i = 0; i < bars.length; i++) {
        let baseValue
        let bandEnergy

        if (i < bandSize) {
          // Sub-bass: deep, slow pulses
          bandEnergy = subBassEnergy
          baseValue = bandEnergy * (0.7 + Math.random() * 0.3)
        } else if (i < bandSize * 2) {
          // Bass: strong kicks
          bandEnergy = bassEnergy
          baseValue = bandEnergy * (0.8 + Math.random() * 0.4)
        } else if (i < bandSize * 3) {
          // Low-mids: rhythms, vocals
          bandEnergy = lowMidEnergy
          baseValue = bandEnergy * (0.6 + Math.random() * 0.5)
        } else if (i < bandSize * 4) {
          // High-mids: synths, guitars
          bandEnergy = highMidEnergy
          baseValue = bandEnergy * (0.7 + Math.random() * 0.6)
        } else if (i < bandSize * 5) {
          // Highs: hi-hats, cymbals
          bandEnergy = highEnergy
          baseValue = bandEnergy * (0.5 + Math.random() * 0.7)
        } else {
          // Ultra-highs: shimmer, effects
          bandEnergy = ultraHighEnergy
          baseValue = bandEnergy * (0.4 + Math.random() * 0.8)
        }

        if (isPlaying) {
          const randomEnergy = Math.random() * 0.6 * (volume / 100)
          baseValue = Math.min(1.2, baseValue + randomEnergy + energyRef.current * 0.5)
          
          // Boost on beats, varied by band
          if (isBeat) {
            const beatBoost = isDownbeat ? 1.6 : 1.3
            baseValue *= (i < bars.length / 2) ? beatBoost : beatBoost * 0.8 // Stronger in lows
          }
          
          // Occasional peaks for drops/highs (more frequent in drop section)
          if (Math.random() < (section === 2 ? 0.12 : 0.04)) {
            baseValue = Math.max(baseValue, 1.1)
          }
        } else {
          // Paused: gentle wave pulse
          baseValue = (Math.sin(phaseRef.current * 0.15 + i * 0.1) * 0.15 + 0.25) * (volume / 100)
        }

        // Smoother transitions with inertia
        bars[i] = bars[i] * 0.82 + baseValue * 0.18
      }

      // Draw bars with enhanced gradients and symmetry for wave feel
      const barWidth = width / bars.length
      const centerY = height / 2

      for (let i = 0; i < bars.length; i++) {
        // Mirror for symmetry (modern visualizers often have left-right mirror)
        const mirroredI = i < bars.length / 2 ? i : bars.length - 1 - i
        const barHeight = bars[mirroredI] * height * 0.75
        
        // Dynamic hue based on band and time
        const hue = (i / bars.length * 360) + (currentTime * 40 % 360) + (section * 30)

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2)
        gradient.addColorStop(0, `hsla(${hue}, 90%, 65%, 0.95)`)
        gradient.addColorStop(0.5, `hsla(${hue + 45}, 95%, 55%, 0.7)`)
        gradient.addColorStop(1, `hsla(${hue + 90}, 100%, 45%, 0.4)`)

        ctx.fillStyle = gradient
        
        const x = i * barWidth
        const y = centerY - barHeight / 2
        const barW = barWidth - 0.5
        
        // Draw bar
        ctx.beginPath()
        ctx.roundRect(x, y, barW, barHeight, barW / 2) // Rounded for smoother look
        ctx.fill()
        
        // Glow (intenser in drops)
        const glow = (isBeat ? 25 : 12) * (section === 2 ? 1.5 : 1)
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${isBeat ? 0.85 : 0.55})`
        ctx.shadowBlur = glow
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Enhanced wave line (thicker in bass-heavy sections)
      if (isPlaying) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + bassEnergy * 0.4})`
        ctx.lineWidth = 2.5 + (section === 2 ? 1.5 : 0)
        ctx.beginPath()
        
        const sliceWidth = width / bars.length
        for (let i = 0; i < bars.length; i++) {
          const x = i * sliceWidth + sliceWidth / 2
          const y = centerY + (bars[i] - 0.5) * height * 0.35
          
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Center pulse with ripple effect for bass drops
      if (isPlaying) {
        const centerX = width / 2
        const pulse = Math.pow(Math.sin(beatPhase * Math.PI * 2), 2) * 0.6 + 0.4
        let pulseSize = 40 + pulse * 60 + energyRef.current * 120
        pulseSize *= (section === 2 ? 1.3 : 1) // Bigger in drops

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseSize)
        if (isDownbeat) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
          gradient.addColorStop(0.4, 'rgba(255, 80, 80, 0.5)')
        } else if (isBeat) {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)')
          gradient.addColorStop(0.4, 'rgba(80, 80, 255, 0.4)')
        } else {
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
          gradient.addColorStop(0.4, 'rgba(80, 255, 80, 0.2)')
        }
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2)
        ctx.fill()

        // Ripple outline on beats
        if (isBeat) {
          ctx.strokeStyle = isDownbeat ? 'rgba(255, 80, 80, 0.9)' : 'rgba(80, 80, 255, 0.7)'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.arc(centerX, centerY, pulseSize * 0.6, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      // Frequency band overlays (more visible highs/lows)
      if (isPlaying) {
        const bandHeight = height / 8 // Thinner bands
        
        // Sub-bass (deep red, bottom)
        ctx.fillStyle = `rgba(200, 50, 50, ${0.25 + subBassEnergy * 0.35})`
        ctx.fillRect(0, height - bandHeight, width * subBassEnergy, bandHeight)
        
        // Bass (orange)
        ctx.fillStyle = `rgba(255, 140, 0, ${0.25 + bassEnergy * 0.35})`
        ctx.fillRect(0, height - bandHeight * 2, width * bassEnergy, bandHeight)
        
        // Low-mid (yellow)
        ctx.fillStyle = `rgba(255, 255, 0, ${0.2 + lowMidEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight * 3, width * lowMidEnergy, bandHeight)
        
        // High-mid (green)
        ctx.fillStyle = `rgba(0, 255, 0, ${0.2 + highMidEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight * 4, width * highMidEnergy, bandHeight)
        
        // Highs (blue)
        ctx.fillStyle = `rgba(0, 0, 255, ${0.2 + highEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight * 5, width * highEnergy, bandHeight)
        
        // Ultra-highs (purple, top)
        ctx.fillStyle = `rgba(128, 0, 128, ${0.2 + ultraHighEnergy * 0.3})`
        ctx.fillRect(0, height - bandHeight * 6, width * ultraHighEnergy, bandHeight)
      }

      // Particle effects for highs (sparkles on hi-hats/ultra-highs)
      if (isPlaying && ultraHighEnergy > 0.5) {
        // Spawn particles on high energy
        if (Math.random() < ultraHighEnergy * 0.15) {
          for (let p = 0; p < 3; p++) { // Spawn multiple
            particleRefs.current.push({
              x: Math.random() * width,
              y: Math.random() * height,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1,
              hue: 180 + Math.random() * 180 // Cyan to purple
            })
          }
        }
      }

      // Update and draw particles
      particleRefs.current = particleRefs.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 0.02 * (section === 2 ? 1.2 : 1) // Faster decay in drops
        
        if (p.life > 0) {
          ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life * 0.8})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2 + p.life * 3, 0, Math.PI * 2)
          ctx.fill()
          return true
        }
        return false
      })

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, currentTime, volume, bpm])

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
        background: 'linear-gradient(135deg, #000000 0%, #0a001a 50%, #000000 100%)',
      }}
    />
  )
}
