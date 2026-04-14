import React from 'react';
import { GlassCard } from './GlassCard';
import { Check, X } from 'lucide-react';

export const ComparisonSection: React.FC = () => {
  return (
    <div className="w-full max-w-4xl px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white">Why 3D Matters</h2>
        <p className="mt-2 text-white/50">Comparing traditional 2D recognition with 3D Structured Light</p>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-white/40">Feature</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-cyan-400">3D Face ID</th>
              <th className="p-6 text-xs font-bold uppercase tracking-widest text-white/40">2D Photo Scan</th>
            </tr>
          </thead>
          <tbody className="text-sm text-white/70">
            <tr className="border-b border-white/5">
              <td className="p-6 font-medium">Depth Analysis</td>
              <td className="p-6 text-cyan-400"><Check size={18} /></td>
              <td className="p-6 text-red-400"><X size={18} /></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-6 font-medium">Motion Parallax</td>
              <td className="p-6 text-cyan-400"><Check size={18} /></td>
              <td className="p-6 text-red-400"><X size={18} /></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-6 font-medium">Texture Analysis</td>
              <td className="p-6 text-cyan-400"><Check size={18} /></td>
              <td className="p-6 text-red-400"><X size={18} /></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-6 font-medium">Infrared Mapping</td>
              <td className="p-6 text-cyan-400"><Check size={18} /></td>
              <td className="p-6 text-red-400"><X size={18} /></td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-6 font-medium">Photo Spoofing Resistance</td>
              <td className="p-6 text-cyan-400">High</td>
              <td className="p-6 text-red-400">None</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="p-6 font-medium">Low Light Performance</td>
              <td className="p-6 text-cyan-400">Excellent</td>
              <td className="p-6 text-white/30">Poor</td>
            </tr>
            <tr>
              <td className="p-6 font-medium">Security Level</td>
              <td className="p-6 text-cyan-400 font-bold">1 in 1,000,000</td>
              <td className="p-6 text-white/30">1 in 50,000</td>
            </tr>
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
};
