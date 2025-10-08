"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 2500) // fade out after 2.5s
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="flex flex-col items-center gap-6">
            {/* Futuristic Spotify-style loader */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full border-4 border-primary/30 animate-ping" />
              <div className="absolute w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin-slow" />
              <div className="absolute w-10 h-10 border-2 border-primary/40 rounded-full animate-pulse" />
            </div>
            <motion.h1
              className="text-3xl font-bold text-primary tracking-wider"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              Joelify
            </motion.h1>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
