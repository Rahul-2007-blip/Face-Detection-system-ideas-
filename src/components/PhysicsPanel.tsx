import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { Zap, Sun, MoveDown, RotateCcw, Ruler, Lightbulb, Activity, ChevronRight, ChevronLeft, Box } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FacePose } from '@/src/lib/faceUtils';

// --- Sub-components for Simulations ---

const TriangulationSim = ({ curvature, livePose }: { curvature: number, livePose?: FacePose }) => {
  const dots = useMemo(() => {
    const arr = [];
    // Use live pose to shift the "center" of curvature
    const offsetX = livePose ? livePose.yaw * 2 : 0;
    const offsetY = livePose ? livePose.pitch * 2 : 0;

    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        const dx = (x - 4.5 - offsetX) / 4.5;
        const dy = (y - 4.5 - offsetY) / 4.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const z = Math.max(0, 1 - dist * dist) * curvature;
        
        const shift = z * 15;
        arr.push({ x: x * 20 + 10 + shift, y: y * 20 + 10, z });
      }
    }
    return arr;
  }, [curvature, livePose]);

  return (
    <div className="relative h-full w-full bg-black/20 rounded-xl overflow-hidden border border-white/5">
      <svg className="h-full w-full" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="faceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.2)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        
        {/* Surface Shading */}
        <motion.circle 
          cx={100 + (livePose?.yaw || 0) * 20} 
          cy={100 + (livePose?.pitch || 0) * 20} 
          r={60 * curvature} 
          fill="url(#faceGlow)" 
          animate={{ r: 60 * curvature }}
        />

        {/* Reference Grid (Flat) */}
        {dots.map((_, i) => (
          <circle key={`ref-${i}`} cx={(i % 10) * 20 + 10} cy={Math.floor(i / 10) * 20 + 10} r="0.5" fill="rgba(255,255,255,0.1)" />
        ))}
        
        {/* Projected Grid (Deformed) */}
        {dots.map((dot, i) => (
          <motion.circle
            key={`dot-${i}`}
            cx={dot.x}
            cy={dot.y}
            r={0.8 + dot.z * 2.5}
            fill={dot.z > 0.1 ? "#22d3ee" : "#0891b2"}
            initial={false}
            animate={{ cx: dot.x, cy: dot.y, r: 0.8 + dot.z * 2.5 }}
            transition={{ type: "spring", stiffness: 120, damping: 25 }}
          />
        ))}

        {/* Ray Lines from "Projector" */}
        {curvature > 0.1 && [0, 9, 90, 99].map(idx => (
          <motion.line
            key={`ray-${idx}`}
            x1="-20" y1="100"
            x2={dots[idx].x} y2={dots[idx].y}
            stroke="rgba(34, 211, 238, 0.1)"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        ))}
      </svg>
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        <div className="text-[8px] font-mono text-cyan-400/60 uppercase">Disparity Projection</div>
        <div className="text-[6px] font-mono text-white/30">Δx = f(z, B)</div>
      </div>
      {livePose && (
        <div className="absolute bottom-2 right-2 text-[6px] font-mono text-cyan-400/40 uppercase">
          Live Tracking: {livePose.yaw.toFixed(1)}° / {livePose.pitch.toFixed(1)}°
        </div>
      )}
    </div>
  );
};

const ReflectanceSim = ({ angle, livePose }: { angle: number, livePose?: FacePose }) => {
  // Use live yaw to adjust the angle slightly
  const effectiveAngle = angle + (livePose ? livePose.yaw * 10 : 0);
  const rad = (effectiveAngle * Math.PI) / 180;
  const x1 = 100 - Math.cos(rad) * 80;
  const y1 = 100 - Math.sin(rad) * 80;
  const x2 = 100 + Math.cos(rad) * 80;
  const y2 = 100 - Math.sin(rad) * 80;

  return (
    <div className="relative h-full w-full bg-black/20 rounded-xl overflow-hidden border border-white/5">
      <svg className="h-full w-full" viewBox="0 0 200 200">
        {/* Surface with Normal */}
        <line x1="20" y1="120" x2="180" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <line x1="100" y1="120" x2="100" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2 2" />
        
        {/* Incident Ray */}
        <motion.line 
          x1={x1} y1={y1 + 20} x2="100" y2="120" 
          stroke="#f97316" strokeWidth="1.5" 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Specular Reflection */}
        <motion.line 
          x1="100" y1="120" x2={x2} y2={y2 + 20} 
          stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 2"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
        />

        {/* Lambertian Diffusion */}
        {[...Array(9)].map((_, i) => {
          const a = (i + 1) * (Math.PI / 10);
          const intensity = Math.sin(a) * Math.sin(rad);
          const len = intensity * 40;
          return (
            <line 
              key={i}
              x1="100" y1="120" 
              x2={100 + Math.cos(a + Math.PI) * len} 
              y2={120 + Math.sin(a + Math.PI) * len}
              stroke="#a855f7" strokeWidth="1" strokeOpacity={0.2 + intensity * 0.5}
            />
          );
        })}

        {/* Curvature Shading Demo */}
        <circle cx="150" cy="50" r="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" />
        <motion.circle 
          cx="150" cy="50" r="15" 
          fill="radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.4), transparent)"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
        />

        <text x="25" y="115" fill="white" fontSize="5" className="font-mono opacity-40">SURFACE NORMAL (n̂)</text>
        <text x="140" y="80" fill="#a855f7" fontSize="6" className="font-mono">Lambertian Shading</text>
      </svg>
    </div>
  );
};

const InverseSquareSim = ({ distance, liveLiveness }: { distance: number, liveLiveness?: number }) => {
  // If live data is available, use it to drive the distance
  const effectiveDist = liveLiveness ? 2 + (1 - liveLiveness) * 7 : distance;
  const intensity = 1 / (effectiveDist * effectiveDist);

  return (
    <div className="relative h-full w-full bg-black/20 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
      <div className="relative w-full px-8">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="h-6 w-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,1)]" />
          </div>
          <div className="mt-2 text-[6px] font-mono text-yellow-400 uppercase text-center">IR Emitter</div>
        </div>

        <motion.div 
          className="ml-auto mr-4 h-32 w-3 rounded-md bg-white/10 border border-white/10 relative"
          animate={{ x: - (100 - effectiveDist * 10) }}
          transition={{ type: "spring", damping: 25 }}
        >
          <motion.div 
            className="absolute inset-0 bg-yellow-400/30 blur-xl"
            animate={{ opacity: intensity * 1.5 }}
          />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-[8px] font-mono text-white/40 uppercase">Radiance</div>
            <div className="text-xs font-mono text-yellow-400">{(intensity * 100).toFixed(2)}%</div>
          </div>
        </motion.div>

        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 200 100">
          {[...Array(7)].map((_, i) => (
            <motion.line
              key={i}
              x1="25" y1="50"
              x2={200 - (100 - effectiveDist * 10)} y2={20 + i * 10}
              stroke="rgba(250,204,21,0.15)"
              strokeWidth="0.5"
              animate={{ strokeDashoffset: [0, -10] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              strokeDasharray="2 2"
            />
          ))}
        </svg>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">
        Inverse Square Propagation
      </div>
    </div>
  );
};

// --- Main Component ---

interface PhysicsPanelProps {
  pose?: FacePose;
  livenessScore?: number;
}

export const PhysicsPanel: React.FC<PhysicsPanelProps> = ({ pose, livenessScore }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [curvature, setCurvature] = useState(0.6);
  const [angle, setAngle] = useState(45);
  const [distance, setDistance] = useState(4);

  const tabs = [
    {
      id: 'triangulation',
      title: 'Triangulation Geometry',
      icon: <Ruler size={18} />,
      color: 'text-cyan-400',
      equation: 'd ≈ (B × f) / Δ',
      description: 'Depth (d) is reconstructed by measuring the horizontal disparity (Δ) of projected dots. Curved surfaces distort the uniform grid, creating unique Δ signatures for 3D mapping.',
      sim: <TriangulationSim curvature={curvature} livePose={pose} />,
      controls: (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
            <span>Surface Topology</span>
            <span>{curvature > 0.8 ? "Complex (Face)" : curvature > 0.3 ? "Curved" : "Flat (2D)"}</span>
          </div>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={curvature} onChange={(e) => setCurvature(parseFloat(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan-400"
          />
        </div>
      )
    },
    {
      id: 'reflectance',
      title: 'Lambertian Reflectance',
      icon: <RotateCcw size={18} />,
      color: 'text-purple-400',
      equation: 'L = I × cos(θ)',
      description: 'The Lambertian model accounts for diffuse reflection. The system analyzes how IR intensity varies across the face based on the angle (θ) between rays and surface normals.',
      sim: <ReflectanceSim angle={angle} livePose={pose} />,
      controls: (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
            <span>Incidence Angle</span>
            <span>{angle}°</span>
          </div>
          <input 
            type="range" min="10" max="80" step="1" 
            value={angle} onChange={(e) => setAngle(parseInt(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-purple-400"
          />
        </div>
      )
    },
    {
      id: 'radiometry',
      title: 'Inverse Square Law',
      icon: <Lightbulb size={18} />,
      color: 'text-yellow-400',
      equation: 'I ∝ 1 / r²',
      description: 'Radiometric falloff ensures that light intensity (I) decreases with the square of distance (r). This prevents spoofing from high-resolution photos which lack true 3D volumetric falloff.',
      sim: <InverseSquareSim distance={distance} liveLiveness={livenessScore} />,
      controls: (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-white/40 uppercase">
            <span>Emitter Distance</span>
            <span>{distance.toFixed(1)}m</span>
          </div>
          <input 
            type="range" min="2" max="9" step="0.1" 
            value={distance} onChange={(e) => setDistance(parseFloat(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-yellow-400"
          />
        </div>
      )
    },
    {
      id: 'tof',
      title: 'Time-of-Flight (ToF)',
      icon: <Zap size={18} />,
      color: 'text-pink-400',
      equation: 'd = (c × Δt) / 2',
      description: 'ToF sensors measure the phase shift or travel time (Δt) of light pulses at the speed of light (c). This provides a coarse depth map that complements structured light for rapid 3D acquisition.',
      sim: (
        <div className="relative h-full w-full bg-black/20 rounded-xl overflow-hidden border border-white/5 flex flex-col items-center justify-center p-4">
          <div className="w-full h-2 bg-white/5 rounded-full relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full w-8 bg-gradient-to-r from-transparent via-pink-500 to-transparent"
              animate={{ left: ["-20%", "120%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 w-full">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
              <div className="text-[7px] text-white/40 uppercase tracking-widest mb-1">Phase Shift</div>
              <div className="text-xs font-mono text-pink-400">Φ = 2πfΔt</div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
              <div className="text-[7px] text-white/40 uppercase tracking-widest mb-1">Resolution</div>
              <div className="text-xs font-mono text-pink-400">±1.2 mm</div>
            </div>
          </div>
          <div className="absolute bottom-3 text-[6px] font-mono text-white/20 uppercase">Photon Arrival Histogram</div>
        </div>
      ),
      controls: (
        <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/10 text-[9px] text-pink-400/80 leading-relaxed">
          <span className="font-bold">Note:</span> ToF is used for initial scene segmentation and background removal before high-res structured light scanning begins.
        </div>
      )
    }
  ];

  return (
    <GlassCard className="w-full max-w-4xl p-0 overflow-hidden border-white/10">
      <div className="flex flex-col md:flex-row h-full min-h-[550px]">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-white/5 p-4 flex md:flex-col gap-2 overflow-x-auto no-scrollbar">
          <div className="hidden md:flex items-center gap-2 mb-6 px-3">
            <Box size={16} className="text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Physics Engine</span>
          </div>
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-3 px-4 py-4 rounded-2xl transition-all whitespace-nowrap md:whitespace-normal text-left group",
                activeTab === i ? "bg-white/10 text-white shadow-xl border border-white/10" : "text-white/40 hover:bg-white/5 border border-transparent"
              )}
            >
              <div className={cn("transition-transform group-hover:scale-110", activeTab === i ? tab.color : "text-inherit")}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 flex flex-col bg-gradient-to-br from-transparent to-white/[0.02]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 flex flex-col"
            >
              <div className="flex flex-col lg:flex-row gap-10 flex-1">
                {/* Simulation Panel */}
                <div className="flex-1 space-y-6">
                  <div className="aspect-video lg:aspect-square w-full shadow-2xl">
                    {tabs[activeTab].sim}
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    {tabs[activeTab].controls}
                  </div>
                </div>

                {/* Explanation Panel */}
                <div className="w-full lg:w-80 space-y-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", tabs[activeTab].color.replace('text-', 'bg-'))} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Scientific Theorem</span>
                    </div>
                    <h2 className={cn("text-2xl font-bold tracking-tight", tabs[activeTab].color)}>
                      {tabs[activeTab].title}
                    </h2>
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                      <div className="relative bg-black/40 p-6 rounded-2xl border border-white/10 flex items-center justify-center">
                        <span className="text-xl font-mono tracking-tighter text-white/90">
                          {tabs[activeTab].equation}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] leading-relaxed text-white/50 font-medium">
                    {tabs[activeTab].description}
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <Activity size={12} />
                      Live Analysis
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <span className="text-[9px] text-white/40 uppercase">Signal Integrity</span>
                        <span className="text-[10px] font-mono text-green-400">98.4%</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <span className="text-[9px] text-white/40 uppercase">Noise Floor</span>
                        <span className="text-[10px] font-mono text-cyan-400">-42 dB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Footer Navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
             <div className="flex gap-1.5">
              {tabs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    activeTab === i ? "w-10 bg-cyan-400" : "w-2 bg-white/10 hover:bg-white/20"
                  )}
                />
              ))}
            </div>
            <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">
              Physics Simulation v4.2.0
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};


