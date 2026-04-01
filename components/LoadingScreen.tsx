"use client"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Radial primary glow background */}
          <div className="absolute inset-0 bg-radial-primary opacity-80" />

          {/* Synthwave Grid Background */}
          <div className="absolute inset-0 opacity-[0.06]">
            <div className="grid grid-cols-12 grid-rows-12 w-full h-full">
              {[...Array(144)].map((_, i) => (
                <motion.div
                  key={i}
                  className="border border-[hsl(var(--primary))]"
                  animate={{ opacity: [0.1, 0.3, 0.1] }}
                  transition={{ repeat: Infinity, duration: 2 + (i % 5), ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>

          {/* Logo + Concentric Rings */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-16">
            {/* Inner glow behind logo */}
            <div className="absolute w-32 h-32 rounded-full bg-[hsl(var(--primary)/0.15)] blur-2xl" />

            {/* Outer ring - slowest */}
            <motion.div
              className="absolute w-48 h-48 rounded-full border-2 border-[hsl(var(--primary)/0.2)]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
            />

            {/* Middle ring */}
            <motion.div
              className="absolute w-40 h-40 rounded-full border-2 border-[hsl(var(--primary)/0.35)]"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />

            {/* Inner ring - fastest */}
            <motion.div
              className="absolute w-32 h-32 rounded-full border-2 border-[hsl(var(--primary)/0.5)] shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            />

            <Image
              src="/favicon.ico"
              alt="Joelify Logo"
              width={96}
              height={96}
              className="rounded-full shadow-[0_0_40px_hsl(var(--primary)/0.6)]"
            />
          </div>

          {/* App Name */}
          <motion.h1
            className="text-5xl font-bold text-primary uppercase tracking-[0.35em] drop-shadow-[0_0_15px_hsl(var(--primary)/0.8)] mb-3"
            style={{ fontFamily: "'VCR OSD Mono', monospace" }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          >
            Joelify
          </motion.h1>

          {/* Tuning Text */}
          <motion.p
            className="text-sm text-primary/80 uppercase tracking-[0.3em] mb-12"
            style={{ fontFamily: "'VCR OSD Mono', monospace" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut",
            }}
          >
            Tuning...
          </motion.p>

          {/* Waveform Visualizer using theme color */}
          <div className="relative w-full h-16 flex items-end justify-center pointer-events-none mb-8">
            <div className="absolute bottom-0 flex items-end gap-1">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-primary rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                  animate={{
                    height: [14, 40, 20, 50, 18][i % 5],
                    opacity: [0.6, 1, 0.8, 1, 0.6],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8 + i * 0.1,
                    ease: "easeInOut",
                    repeatType: "reverse",
                    delay: i * 0.05,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-1 h-1 bg-primary/60 rounded-full"
                animate={{
                  y: [-10, -300],
                  x: [0, (Math.random() - 0.5) * 200],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                style={{
                  bottom: Math.random() * 100,
                  left: Math.random() * 100 + "%",
                }}
              />
            ))}
          </div>

          {/* Import retro synthwave font */}
          <style jsx global>{`
            @import url("https://fonts.cdnfonts.com/css/vcr-osd-mono");
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
