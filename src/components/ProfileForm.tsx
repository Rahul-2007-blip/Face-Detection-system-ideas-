import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { User, Mail, Briefcase, Save, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileFormProps {
  embedding: number[];
  onSave: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ embedding, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          embedding
        })
      });

      if (response.ok) {
        setIsSaved(true);
        setTimeout(() => {
          onSave();
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <GlassCard className="w-full max-w-md text-center py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Profile Secured</h3>
          <p className="text-white/60">Your biometric profile and details have been encrypted and saved to the secure vault.</p>
        </motion.div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="w-full max-w-md">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Enroll Identity</h3>
        <p className="text-white/60 text-sm">Associate your 3D biometric signature with your personal credentials.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/10 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Security Role</label>
          <div className="relative">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white appearance-none focus:outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="" disabled className="bg-[#0a0a0a]">Select Role</option>
              <option value="Administrator" className="bg-[#0a0a0a]">Administrator</option>
              <option value="Security Officer" className="bg-[#0a0a0a]">Security Officer</option>
              <option value="Authorized Personnel" className="bg-[#0a0a0a]">Authorized Personnel</option>
              <option value="Guest" className="bg-[#0a0a0a]">Guest</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          {isSaving ? (
            <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} />
              Save Biometric Profile
            </>
          )}
        </button>
      </form>
    </GlassCard>
  );
};
