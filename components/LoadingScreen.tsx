"use client"
import { useEffect, useState } from "react"
import Image from "next/image"

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => setIsVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {isVisible && (
        <div
          className="fixed inset-0 z-[100] bg-gradient-to-br from-black via-[#0a1a0a] to-[#051505] flex flex-col items-center justify-center overflow-hidden animate-fadeIn"
          style={{
            animation: "fadeIn 0.8s ease-in-out forwards"
          }}
        >
          {/* Synthwave Grid Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 grid-rows-12 w-full h-full">
              {[...Array(144)].map((_, i) => (
                <div
                  key={i}
                  className="border border-[#22c55e]/20 animate-pulse"
                  style={{
                    animationDelay: `${(i % 5) * 0.4}s`,
                    animationDuration: `${2 + (i % 5)}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Logo + Rings */}
          <div className="relative w-32 h-32 flex items-center justify-center mb-16">
            {/* Inner glow behind logo */}
            <div className="absolute w-32 h-32 rounded-full bg-green-400/15 blur-2xl" />

            <div
              className="absolute w-40 h-40 rounded-full border-4 border-[#22c55e]/40 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
              style={{
                animation: "pulse-scale 2.5s ease-out infinite"
              }}
            />

            <div
              className="absolute w-36 h-36 rounded-full border-4 border-transparent bg-gradient-to-r from-transparent via-[#22c55e]/60 to-transparent"
              style={{
                animation: "spin 4s linear infinite"
              }}
            />

            <div
              className="absolute w-28 h-28 rounded-full border-2 border-[#22c55e]/60 shadow-[0_0_20px_rgba(34,197,94,0.7)]"
              style={{
                animation: "pulse-scale-short 1.5s ease-in-out infinite"
              }}
            />

            <Image
              src="/favicon.ico"
              alt="Joelify Logo"
              width={96}
              height={96}
              className="rounded-full shadow-[0_0_40px_rgba(34,197,94,0.8)]"
            />
          </div>

          {/* App Name */}
          <h1
            className="text-5xl font-bold text-green-400 uppercase tracking-[0.35em] drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] mb-3 animate-fadeInUp"
            style={{ fontFamily: "'VCR OSD Mono', monospace" }}
          >
            Joelify
          </h1>

          {/* Tuning Text (Static Position) */}
          <p
            className="text-sm text-green-400/80 uppercase tracking-[0.3em] mb-12 animate-pulse"
            style={{ fontFamily: "'VCR OSD Mono', monospace" }}
          >
            Tuning...
          </p>

          {/* Waveform Visualizer (fixed height space) */}
          <div className="relative w-full h-16 flex items-end justify-center pointer-events-none mb-8">
            <div className="absolute bottom-0 flex items-end gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 bg-green-400 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                  style={{
                    height: [14, 40, 20, 50, 18][i % 5],
                    animation: `waveform 0.8s ease-in-out infinite reverse`,
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: `${0.8 + i * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {isMounted && [...Array(15)].map((_, i) => (
              <span
                key={i}
                className="absolute w-1 h-1 bg-green-400/60 rounded-full"
                style={{
                  bottom: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `float-up 3s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                  "--x-offset": `${(Math.random() - 0.5) * 200}px`
                } as React.CSSProperties}
              />
            ))}
          </div>

          {/* Import retro synthwave font */}
          <style jsx global>{`
            @import url("https://fonts.cdnfonts.com/css/vcr-osd-mono");
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(15px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse-scale {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.8); opacity: 0; }
            }
            @keyframes pulse-scale-short {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.25); opacity: 0.6; }
            }
            @keyframes waveform {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
            @keyframes float-up {
              0% { transform: translateY(0) translateX(0); opacity: 1; }
              100% { transform: translateY(-300px) translateX(var(--x-offset)); opacity: 0; }
            }
            .animate-fadeInUp {
              animation: fadeInUp 0.8s ease-out 0.3s both;
            }
          `}</style>
        </div>
      )}
    </>
  )
}
