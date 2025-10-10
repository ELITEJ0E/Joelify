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
          className="fixed inset-0 z-[100] bg-gradient-to-b from-[#050505] via-[#0a0a0a] to-[#000000] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* 💿 Logo + Rings */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-16">
            <div className="absolute w-40 h-40 rounded-full bg-green-400/15 blur-2xl" />

            <motion.div
              className="absolute w-56 h-56 rounded-full border-4 border-green-400/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />

            <motion.div
              className="absolute w-48 h-48 border-4 border-transparent border-t-green-500/50 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />

            <motion.div
              className="absolute w-36 h-36 rounded-full border-2 border-green-500/40"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />

            <Image
              src="/favicon.ico"
              alt="Joelify Logo"
              width={96}
              height={96}
              className="rounded-full shadow-[0_0_40px_rgba(34,197,94,0.6)]"
            />
          </div>

          {/* Title */}
          <motion.h1
            className="text-5xl font-bold text-green-400 uppercase tracking-[0.3em] drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] mb-3"
            style={{ fontFamily: "'VCR OSD Mono', monospace" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            Joelify
          </motion.h1>

          {/* Fixed Initializing Text */}
          <motion.p
            className="text-sm text-green-400/80 uppercase tracking-[0.25em] mb-8"
            style={{ fontFamily: "'VCR OSD Mono', monospace" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              delay: 0.4,
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut",
            }}
          >
            Initializing...
          </motion.p>

          {/* Synthwave Waveform (fixed position, no push) */}
          <div className="relative w-full h-16 flex items-end justify-center mb-8 pointer-events-none">
            <div className="absolute bottom-0 flex items-end gap-1">
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
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
                className="absolute w-1 h-1 bg-green-400/60 rounded-full"
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

          {/*Retro Font Import */}
          <style jsx global>{`
            @import url("https://fonts.cdnfonts.com/css/vcr-osd-mono");
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
