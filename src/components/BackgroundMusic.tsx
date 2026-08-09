"use client";

import React, { useEffect, useRef, useState } from "react";

export default function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio client-side
    const audio = new Audio("/music/bg-music.mp3");
    audio.loop = true;
    audio.volume = 0.4; // Soft background volume
    audioRef.current = audio;

    // Handle standard browser autoplay restrictions gracefully
    const handleFirstGesture = () => {
      if (audioRef.current && !isPlaying) {
        // Try autoplaying on user's first click anywhere on the page
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.log("Autoplay blocked by browser policy:", err));
      }
      document.removeEventListener("click", handleFirstGesture);
    };

    document.addEventListener("click", handleFirstGesture);

    return () => {
      document.removeEventListener("click", handleFirstGesture);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error("Playback failed:", err));
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering togglePlay
    if (!audioRef.current) return;

    const newMuteState = !isMuted;
    audioRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans text-xs select-none">
      {/* Scope-level custom keyframes to keep the component fully self-contained */}
      <style>{`
        @keyframes soundwave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1.2); }
        }
        .animate-bar-1 { animation: soundwave 1.2s ease-in-out infinite; }
        .animate-bar-2 { animation: soundwave 0.8s ease-in-out infinite 0.2s; }
        .animate-bar-3 { animation: soundwave 1.0s ease-in-out infinite 0.4s; }
      `}</style>

      <div
        onClick={togglePlay}
        className="flex items-center gap-3 bg-[#0a0a0c]/90 border border-white/10 rounded-full px-3 py-2 shadow-lg backdrop-blur-md cursor-pointer hover:border-[#ff801f]/30 transition-all duration-300"
      >
        {/* Animated Waveform */}
        <div className="flex items-end gap-[3px] w-5 h-4 px-0.5">
          <div
            className={`w-[2.5px] h-full bg-[#ff801f] origin-bottom rounded-full transition-transform duration-300 ${
              isPlaying ? "animate-bar-1" : "scale-y-[0.3]"
            }`}
          />
          <div
            className={`w-[2.5px] h-full bg-[#ff801f] origin-bottom rounded-full transition-transform duration-300 ${
              isPlaying ? "animate-bar-2" : "scale-y-[0.3]"
            }`}
          />
          <div
            className={`w-[2.5px] h-full bg-[#ff801f] origin-bottom rounded-full transition-transform duration-300 ${
              isPlaying ? "animate-bar-3" : "scale-y-[0.3]"
            }`}
          />
        </div>

        {/* Status text */}
        <span className="text-[11px] font-medium text-neutral-400 w-16">
          {isPlaying ? "BGM Playing" : "BGM Paused"}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          {/* Mute/Unmute */}
          <button
            onClick={toggleMute}
            className="p-1 hover:text-white transition-colors duration-200"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
