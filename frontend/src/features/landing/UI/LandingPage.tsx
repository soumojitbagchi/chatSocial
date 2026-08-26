import * as React from "react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck, Zap, Mic, Image as ImageIcon } from "lucide-react";
import confetti from "canvas-confetti";
import { GrassCanvas } from "./GrassCanvas";
import { LandingNav } from "./LandingNav";

export interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onOpenApp: () => void;
}

export function LandingPage({ onSignIn, onSignUp, onOpenApp }: LandingPageProps) {
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(" ")[4] || "");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerLaunch = () => {
    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#10b981", "#06b6d4", "#34d399", "#ffffff"],
    });
    onOpenApp();
  };

  const partnerLogos = [
    { name: "BOEN", style: "font-serif tracking-widest text-lg font-bold" },
    { name: "tadaaz", style: "font-sans lowercase text-lg tracking-tight font-semibold" },
    { name: "loop", style: "font-mono font-bold text-xl tracking-tighter" },
    { name: "gentlee®", style: "font-sans font-medium text-lg italic" },
    { name: "mazda", style: "font-sans uppercase text-sm tracking-widest font-semibold" },
    { name: "FAVORITE FAMILY", style: "font-mono text-xs tracking-wider uppercase font-bold" },
    { name: "LIFE IS BANANAS", style: "font-mono text-xs tracking-widest uppercase" },
    { name: "NEU", style: "font-serif text-xl tracking-widest font-bold" },
  ];

  const previewCards = [
    {
      title: "Real-time Mesh",
      subtitle: "< 15ms Latency",
      icon: Zap,
      accent: "text-emerald-400",
      rating: "★★★★★",
    },
    {
      title: "Zero-Knowledge Encryption",
      subtitle: "256-bit Post-Quantum",
      icon: Lock,
      accent: "text-cyan-400",
      rating: "VERIFIED",
    },
    {
      title: "Studio Voice Notes",
      subtitle: "Opus Low-Bandwidth",
      icon: Mic,
      accent: "text-emerald-300",
      rating: "HD AUDIO",
    },
    {
      title: "Lossless Media Engine",
      subtitle: "Up to 2GB Raw Files",
      icon: ImageIcon,
      accent: "text-teal-300",
      rating: "4K READY",
    },
  ];

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#060a0c] text-foreground select-none font-sans flex flex-col justify-between">
      {/* 3D Interactive WebGL Starry Night & Ultra-Subtle Swaying Grass Background */}
      <GrassCanvas windSpeed={0.8} bladeCount={19000} />

      {/* Radiant Chromatic Glowing Aura (Matching the Reference Arc) */}
      <div 
        className="absolute -top-32 -right-32 w-[850px] h-[850px] pointer-events-none opacity-40 blur-[130px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, rgba(16, 185, 129, 0.35) 45%, rgba(6, 182, 212, 0.25) 75%, transparent 100%)"
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/90" />

      {/* Fixed Modern Navigation */}
      <LandingNav onSignIn={onSignIn} onSignUp={onSignUp} onOpenApp={onOpenApp} />

      {/* Structured Hero Section matching the Reference Template */}
      <main className="relative z-20 max-w-7xl mx-auto px-6 sm:px-12 w-full pt-32 sm:pt-36 pb-12 flex flex-col justify-center my-auto">
        <div className="max-w-2xl space-y-6">
          {/* Eyebrow Tag with Golden Sparkle Accent */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-yellow-400 font-semibold"
          >
            <span className="text-yellow-400 text-sm">▶</span>
            <span>REAL-TIME ENCRYPTED DATA PLATFORM</span>
          </motion.div>

          {/* Monumental Structured Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]"
          >
            Turn data into <br />
            winning chats. <br />
            At scale.
          </motion.h1>

          {/* Clean Descriptive Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-lg text-white/80 font-normal leading-relaxed max-w-lg"
          >
            Turn messaging data, voice notes, and live consumer signals into seamless real-time conversations, using custom zero-knowledge encrypted workflows you build and own.
          </motion.p>

          {/* Dual Action Buttons matching Reference */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4 pt-2"
          >
            {/* Primary Action Pill */}
            <button
              onClick={triggerLaunch}
              className="px-7 py-3.5 rounded-full text-sm font-semibold text-black bg-white hover:bg-white/90 shadow-xl shadow-white/10 transition-all flex items-center gap-2 cursor-pointer group"
            >
              <span>Try now for free</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>

            {/* Product Hunt Style Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-black/80 border border-white/20 backdrop-blur-md text-xs font-mono text-white/90 shadow-lg cursor-pointer hover:border-white/40 transition-colors">
              <div className="w-5 h-5 rounded-full bg-[#EA532B] text-white font-bold flex items-center justify-center text-[11px] leading-none">
                P
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">FIND US ON</span>
                <span className="font-bold text-xs tracking-tight">Product Hunt</span>
              </div>
              <span className="text-emerald-400 font-bold text-xs">▲</span>
            </div>
          </motion.div>
        </div>

        {/* Social Proof / Partner Logos Strip matching Reference */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 sm:mt-20 pt-8 border-t border-white/10 space-y-4"
        >
          <div className="text-[11px] font-mono tracking-widest uppercase text-white/50 text-left">
            TRUSTED BY PERFORMANCE TEAMS & COMMUNITIES OF ALL SIZES
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6 sm:gap-8 opacity-70 hover:opacity-100 transition-opacity">
            {partnerLogos.map((logo) => (
              <div key={logo.name} className={`${logo.style} text-white/80 hover:text-emerald-400 transition-colors cursor-default`}>
                {logo.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Interactive Feature Peek Cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
        >
          {previewCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md space-y-1.5 hover:border-emerald-500/40 transition-all hover:bg-black/75 group"
              >
                <div className="flex items-center justify-between">
                  <Icon size={16} className={`${card.accent} group-hover:scale-110 transition-transform`} />
                  <span className="text-[10px] font-mono text-emerald-400">{card.rating}</span>
                </div>
                <h4 className="text-xs font-bold text-white tracking-tight">{card.title}</h4>
                <p className="text-[11px] font-mono text-muted-foreground">{card.subtitle}</p>
              </div>
            );
          })}
        </motion.div>
      </main>

      {/* Editorial Footer */}
      <footer className="relative z-20 py-4 px-6 sm:px-12 border-t border-white/[0.08] bg-black/50 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </span>
          <span className="hidden md:inline text-white/20">|</span>
          <span className="hidden md:inline">UTC: {utcTime || "00:00:00"}</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>ZERO-KNOWLEDGE ENCRYPTED</span>
          </span>
          <span>&copy; {new Date().getFullYear()} chatSocial</span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
