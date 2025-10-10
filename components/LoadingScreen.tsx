"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000) // Fade out after 3s
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-gradient-to-br from-black via-[#0a1a0a] to-[#051505] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Subtle background grid for synthwave depth */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 grid-rows-12 w-full h-full">
              {[...Array(144)].map((_, i) => (
                <motion.div
                  key={i}
                  className="border border-[#1DB954]/20"
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 2 + (i % 5), ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 relative z-10">
            {/* Enhanced Futuristic Loader with Logo */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Outer expanding neon ring with glow */}
              <motion.div
                className="absolute w-40 h-40 rounded-full border-4 border-[#1DB954]/40 shadow-[0_0_30px_rgba(29,185,84,0.5)]"
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
              />

              {/* Middle rotating ring with gradient */}
              <motion.div
                className="absolute w-36 h-36 rounded-full border-4 border-transparent bg-gradient-to-r from-transparent via-[#1DB954]/60 to-transparent"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              />

              {/* Inner pulsing ring with beat sync */}
              <motion.div
                className="absolute w-28 h-28 rounded-full border-2 border-[#1DB954]/60 shadow-[0_0_20px_rgba(29,185,84,0.7)]"
                animate={{ scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />

              {/* Center logo with enhanced glow */}
              <Image
                src="/favicon.ico"
                alt="Joelify Logo"
                width={96}
                height={96}
                className="rounded-full shadow-[0_0_40px_rgba(29,185,84,0.8)]"
              />
            </div>

            {/* Music Waveform Visualizer */}
            <div className="flex items-center gap-1">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-[#1DB954] rounded-full shadow-[0_0_8px_rgba(29,185,84,0.9)]"
                  style={{ height: '4px' }}
                  animate={{
                    height: [4, 32 + Math.random() * 20, 4, 48, 8][i % 5],
                    opacity: [0.5, 1, 0.7, 1, 0.5],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + i * 0.05,
                    ease: "easeInOut",
                    delay: i * 0.05,
                    repeatType: "loop",
                  }}
                />
              ))}
            </div>

            {/* App Name with Neon Text Effect */}
            <motion.h1
              className="text-4xl font-extrabold tracking-widest text-[#1DB954] drop-shadow-[0_0_12px_rgba(29,185,84,0.8)]"
              style={{ fontFamily: "'Orbitron', sans-serif" }} // Synthwave/music-inspired font
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            >
              Joelify
            </motion.h1>

            {/* Loading Dots with Beat Pulse */}
            <motion.div
              className="flex gap-2 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  className="text-[#1DB954]/70 text-sm"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                >
                  •
                </motion.span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
