import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, Cpu, Layers, Eye, Move, Activity, Scan } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ControlInfo {
  id: string;
  name: string;
  purpose: string;
  concept: string;
  logic: string;
  icon: React.ReactNode;
  color: string;
}

const CONTROL_DATA: Record<string, ControlInfo> = {
  mesh: {
    id: 'mesh',
    name: 'Facial Mesh',
    purpose: 'Facial landmark mapping',
    concept: 'Topology reconstruction using 468 3D points to track facial geometry in real-time.',
    logic: 'V = {p₁, p₂, ..., p₄₆₈}',
    icon: <Layers size={14} />,
    color: 'text-cyan-400',
  },
  dots: {
    id: 'dots',
    name: 'Structured Dots',
    purpose: '3D Surface Projection',
    concept: 'Projecting a grid of infrared dots to measure surface deformation and depth.',
    logic: 'P(x,y) = Σ δ(x-xᵢ, y-yᵢ)',
    icon: <Scan size={14} />,
    color: 'text-cyan-400',
  },
  depth: {
    id: 'depth',
    name: 'Depth Map',
    purpose: 'Disparity-based estimation',
    concept: 'Calculating distance by measuring the horizontal shift (disparity) of projected dots.',
    logic: 'd = (B × f) / Δ',
    icon: <Move size={14} />,
    color: 'text-purple-400',
  },
  infrared: {
    id: 'infrared',
    name: 'Infrared Imaging',
    purpose: 'Low-light IR capture',
    concept: 'Using 850nm-940nm light to capture facial details regardless of ambient lighting.',
    logic: 'λ ∈ [850, 940] nm',
    icon: <Eye size={14} />,
    color: 'text-red-400',
  },
  normals: {
    id: 'normals',
    name: 'Surface Normals',
    purpose: 'Orientation vectors',
    concept: 'Calculating the perpendicular vector at each point to determine surface curvature.',
    logic: 'n̂ = (∂P/∂u × ∂P/∂v)',
    icon: <Activity size={14} />,
    color: 'text-orange-400',
  },
  physics: {
    id: 'physics',
    name: 'Physics Engine',
    purpose: 'Reflection & Curvature',
    concept: 'Analyzing light reflection laws and radiometric falloff to verify 3D volume.',
    logic: 'I ∝ 1/r²',
    icon: <Cpu size={14} />,
    color: 'text-blue-400',
  },
};

interface ControlInfoPanelProps {
  activeToggles: string[];
}

export const ControlInfoPanel: React.FC<ControlInfoPanelProps> = ({ activeToggles }) => {
  const activeData = activeToggles
    .map(id => CONTROL_DATA[id.toLowerCase()])
    .filter(Boolean);

  if (activeData.length === 0) return null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
          <Info size={12} />
          Active Feature Analysis
        </div>
        <div className="text-[8px] font-mono text-white/20 uppercase">
          {activeData.length} Module{activeData.length > 1 ? 's' : ''} Active
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {activeData.map((info) => (
            <motion.div
              key={info.id}
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="group relative rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md transition-all hover:bg-white/10">
                <div className="absolute -right-1 -top-1 h-12 w-12 bg-gradient-to-br from-white/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg bg-white/5 border border-white/10", info.color)}>
                      {info.icon}
                    </div>
                    <div>
                      <h4 className={cn("text-[10px] font-bold uppercase tracking-wider", info.color)}>
                        {info.name}
                      </h4>
                      <p className="text-[9px] font-medium text-white/60">
                        {info.purpose}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md bg-black/40 px-2 py-0.5 border border-white/5">
                    <code className="text-[9px] font-mono text-white/40">
                      {info.logic}
                    </code>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-white/5">
                  <p className="text-[9px] leading-relaxed text-white/30 italic line-clamp-2 group-hover:line-clamp-none transition-all">
                    {info.concept}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
