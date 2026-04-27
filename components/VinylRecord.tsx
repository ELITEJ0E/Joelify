'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { memo } from 'react';

interface VinylRecordProps {
  isPlaying: boolean;
  coverImage?: string;
}

const VinylRecord = memo(function VinylRecord({ isPlaying, coverImage }: VinylRecordProps) {
  return (
    <div className="relative flex justify-center items-center py-4">
      {/* Outer Glow */}
      <motion.div
        animate={{
          scale: isPlaying ? [1, 1.05, 1] : 1,
          opacity: isPlaying ? [0.4, 0.6, 0.4] : 0.2,
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full bg-white/20 blur-[60px]"
      />

      {/* The Vinyl Disc Container (Static Shine) */}
      <div className="relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] rounded-full shadow-2xl flex items-center justify-center border-4 border-zinc-700/80 transform-gpu overflow-hidden">
        
        {/* The Spinning Vinyl Elements */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at center, #3a3a3a 0%, #1a1a1a 80%, #0a0a0a 100%)',
            animation: 'spin 4s linear infinite',
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        >
          {/* Vinyl Ridges (Texture) with continuous subtle pulse */}
          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/[0.04]"
                animate={{
                  opacity: isPlaying ? [0.6, 1, 0.6] : 0.6,
                  borderWidth: isPlaying ? ['1px', '2px', '1px'] : '1px'
                }}
                transition={{
                  duration: 2 + (i % 3), // slight variation in pulse
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1
                }}
                style={{
                  width: `${100 - i * 4.5}%`,
                  height: `${100 - i * 4.5}%`,
                }}
              />
            ))}
          </div>

          {/* Center Label */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110px] h-[110px] rounded-full bg-[#111] border-[3px] border-zinc-600 shadow-inner flex items-center justify-center overflow-hidden z-10">
            {coverImage ? (
              <Image src={coverImage} alt="Cover" width={110} height={110} className="w-full h-full object-cover opacity-90" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <div className="w-8 h-8 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)] flex items-center justify-center border border-white/20">
                  <div className="w-3 h-3 rounded-full bg-emerald-300 shadow-inner" />
                </div>
              </div>
            )}
            {/* Center Hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] border border-white/10" />
          </div>
        </div>

        {/* Static Shine Overlay (Stays still while record spins underneath) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 mix-blend-overlay pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.05)_45deg,transparent_90deg,rgba(255,255,255,0.05)_135deg,transparent_180deg,rgba(255,255,255,0.05)_225deg,transparent_270deg,rgba(255,255,255,0.05)_315deg,transparent_360deg)] mix-blend-screen pointer-events-none rounded-full" />
      </div>
      
      {/* Subtle Tonearm Overlay style */}
      <div className="absolute -top-2 -right-2 w-24 h-32 pointer-events-none z-20 opacity-60 drop-shadow-md">
        <svg viewBox="0 0 100 120" className="w-full h-full">
           <path 
             d="M 85 15 L 85 35 Q 85 45 75 45 L 45 45 Q 35 45 35 55 L 35 95" 
             fill="none" 
             stroke="#d4d4d8" 
             strokeWidth="3" 
             strokeLinecap="round" 
           />
           <rect x="30" y="90" width="10" height="15" rx="3" fill="#a1a1aa" />
        </svg>
      </div>
    </div>
  );
});

export default VinylRecord;
