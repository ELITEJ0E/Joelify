loading 3

"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3000) // fade out after 3s
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-gradient-to-b from-[#0a0a0a] via-[#101010] to-[#050505] flex flex-col items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Pulse Rings + Logo */}
          <div className="relative w-40 h-40 flex items-center justify-center mb-8">
            {/* Expanding pulse ring (larger radius) */}
            <motion.div
              className="absolute w-50 h-50 rounded-full border-1 border-green-400/20"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />

            {/* Rotating outer ring */}
            <motion.div
              className="absolute w-48 h-48 border-4 border-transparent border-t-green-500/50 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />

            {/* Inner glowing ring */}
            <motion.div
              className="absolute w-36 h-36 rounded-full border-2 border-green-500/40"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />

            {/* Center logo */}
            <Image
              src="/favicon.ico"
              alt="Joelify Logo"
              width={96}
              height={96}
              className="rounded-full shadow-[0_0_40px_rgba(34,197,94,0.6)]"
            />
          </div>

          {/* Synthwave-style waveform bars */}
          <div className="flex items-end gap-1 mb-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                animate={{
                  height: [12, 40, 20, 50, 18][i % 5],
                  opacity: [0.6, 1, 0.8, 1, 0.6],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8 + i * 0.1,
                  ease: "easeInOut",
                  repeatType: "reverse",
                }}
              />
            ))}
          </div>

          {/* App name */}
          <motion.h1
            className="text-4xl font-extrabold tracking-wider text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            Joelify
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
