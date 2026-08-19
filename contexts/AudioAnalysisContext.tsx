"use client"

import { createContext, useContext, useState, useMemo, type ReactNode } from "react"

interface AudioAnalysisContextType {
  audioContext: AudioContext | null
  setAudioContext: (context: AudioContext | null) => void
  analyserNode: AnalyserNode | null
  setAnalyserNode: (node: AnalyserNode | null) => void
  currentBPM: number
  setCurrentBPM: (bpm: number) => void
  beatPulse: number
  setBeatPulse: (pulse: number) => void
}

const AudioAnalysisContext = createContext<AudioAnalysisContextType | undefined>(undefined)

export function AudioAnalysisProvider({ children }: { children: ReactNode }) {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [currentBPM, setCurrentBPM] = useState<number>(0)
  const [beatPulse, setBeatPulse] = useState<number>(0)

  const value = useMemo(
    () => ({
      audioContext,
      setAudioContext,
      analyserNode,
      setAnalyserNode,
      currentBPM,
      setCurrentBPM,
      beatPulse,
      setBeatPulse,
    }),
    [audioContext, analyserNode, currentBPM, beatPulse, setAudioContext, setAnalyserNode, setCurrentBPM, setBeatPulse]
  )

  return (
    <AudioAnalysisContext.Provider value={value}>
      {children}
    </AudioAnalysisContext.Provider>
  )
}

export function useAudioAnalysis() {
  const context = useContext(AudioAnalysisContext)
  if (!context) {
    throw new Error("useAudioAnalysis must be used within AudioAnalysisProvider")
  }
  return context
}
