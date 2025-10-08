"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

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
            {/* Futuristic Joelify loader with logo */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              {/* Outer expanding ring */}
              <div className="absolute w-24 h-24 rounded-full border-4 border-primary/30 animate-ping" />
              
              {/* Middle rotating ring */}
              <div className="absolute w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin-slow" />
              
              {/* Inner pulsing ring */}
              <div className="absolute w-25 h-25 border-2 border-primary/50 rounded-full animate-pulse" />

              {/* Center logo */}
              <Image
                src="/favicon.ico" // your logo file
                alt="Joelify Logo"
                width={80}
                height={80}
                className="rounded-full"
              />
            </div>

            {/* Logo text */}
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
