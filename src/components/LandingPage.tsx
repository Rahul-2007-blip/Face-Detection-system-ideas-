import React from 'react';
import { motion } from 'motion/react';
import { GlassCard } from './GlassCard';
import { Shield, Scan, Cpu, Lock } from 'lucide-react';

export const LandingPage: React.FC<{ onStart: (mode?: 'enroll' | 'manage' | 'recognize') => void }> = ({ onStart }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="mb-12 text-center"
      >
        <h1 className="mb-4 bg-gradient-to-b from-white to-white/40 bg-clip-text text-6xl font-black tracking-tighter text-transparent md:text-8xl">
          3D Face ID<br />Authentication
        </h1>
        <p className="text-lg font-medium tracking-[0.3em] text-cyan-400 uppercase">
          Structured Light + AI-Based Recognition
        </p>
      </motion.div>

      <GlassCard className="max-w-2xl text-center">
        <div className="mb-8 flex justify-center gap-8">
          <button 
            onClick={() => onStart('recognize')}
            className="flex flex-col items-center gap-2 group transition-all hover:scale-110"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:bg-cyan-400/20 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all">
              <Cpu size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Neural Engine</span>
          </button>
          <button 
            onClick={() => onStart('enroll')}
            className="flex flex-col items-center gap-2 group transition-all hover:scale-110"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:bg-cyan-400/20 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all">
              <Shield size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Secure Enclave</span>
          </button>
          <button 
            onClick={() => onStart('manage')}
            className="flex flex-col items-center gap-2 group transition-all hover:scale-110"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] group-hover:bg-cyan-400/20 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-all">
              <Lock size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Encrypted</span>
          </button>
        </div>

        <p className="mb-10 text-lg leading-relaxed text-white/70">
          Experience the next generation of biometric security. Our system projects 30,000+ infrared dots to build a unique 3D map of your facial geometry.
        </p>

        <button
          onClick={() => onStart('recognize')}
          className="group relative overflow-hidden rounded-2xl bg-white px-12 py-4 font-bold text-black transition-all hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          <span className="relative flex items-center gap-2">
            <Scan size={20} />
            START SCAN
          </span>
        </button>
      </GlassCard>

      <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { title: "Depth Sensing", desc: "Infrared projection for sub-millimeter accuracy." },
          { title: "Liveness Detection", desc: "Prevents spoofing via photos or high-res displays." },
          { title: "Adaptive Learning", desc: "Recognizes changes in appearance over time." },
        ].map((feature, i) => (
          <GlassCard key={i} className="p-6 text-left">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-cyan-400">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-white/50">{feature.desc}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
