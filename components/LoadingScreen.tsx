"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 3500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Synthwave Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,0,0.1)_0%,transparent_70%)]">
            <div className="absolute bottom-0 w-full h-1/2 overflow-hidden [perspective:800px]">
              <div className="absolute w-full h-full bg-[linear-gradient(to_bottom,transparent_90%,#00ff8899_100%),repeating-linear-gradient(90deg,#00ff5544_0px,#00ff5544_2px,transparent_2px,transparent_40px),repeating-linear-gradient(0deg,#00ff5544_0px,#00ff5544_2px,transparent_2px,transparent_40px)] animate-[gridMove_10s_linear_infinite]" />
            </div>
          </div>

          {/* Energy particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-1 h-1 bg-green-400 rounded-full opacity-60"
                animate={{
                  y: [-20, -200],
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

          {/* Central Logo + Rings */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Glowing Pulse Aura */}
              <div className="absolute w-32 h-32 rounded-full border-4 border-green-400/20 animate-[pulseGlow_2s_ease-in-out_infinite]" />

              {/* Outer Expanding Ring */}
              <div className="absolute w-40 h-40 rounded-full border-4 border-green-400/40 animate-[ping_2s_ease-in-out_infinite]" />

              {/* Rotating Neon Halo */}
              <div className="absolute w-28 h-28 border-4 border-transparent border-t-green-400 rounded-full animate-[spin_3s_linear_infinite]" />

              {/* Center Logo */}
              <motion.div
                className="relative z-10"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/favicon.ico"
                  alt="Joelify Logo"
                  width={90}
                  height={90}
                  className="rounded-full drop-shadow-[0_0_15px_#00ff88]"
                />
              </motion.div>
            </div>

            {/* Title */}
            <motion.h1
              className="text-4xl font-extrabold tracking-widest text-green-400 drop-shadow-[0_0_10px_#00ff88]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              Joelify
            </motion.h1>
          </div>

          {/* Animation keyframes */}
          <style jsx global>{`
            @keyframes gridMove {
              0% {
                transform: rotateX(60deg) translateY(0);
              }
              100% {
                transform: rotateX(60deg) translateY(40px);
              }
            }

            @keyframes pulseGlow {
              0%, 100% {
                box-shadow: 0 0 25px #00ff88, 0 0 60px #00ff88;
                opacity: 0.6;
              }
              50% {
                box-shadow: 0 0 50px #00ffaa, 0 0 100px #00ffaa;
                opacity: 1;
              }
            }

            @keyframes spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
