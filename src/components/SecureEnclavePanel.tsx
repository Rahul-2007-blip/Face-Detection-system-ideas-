import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { Shield, User, Mail, Briefcase, Clock } from 'lucide-react';
import { biometricService, Profile as UserProfile } from '../services/biometricService';

export const SecureEnclavePanel: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const data = await biometricService.getAllProfiles();
        // Sort by createdAt descending and take top 5
        const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
        setProfiles(sorted);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const maskData = (str: string) => {
    if (!str) return '';
    return btoa(str).substring(0, 12) + '...';
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-cyan-400" size={24} />
            Secure Enclave
          </h2>
          <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Recent Biometric Entries</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('start-enroll'))}
          className="flex items-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 px-4 py-2 text-xs font-bold text-cyan-400 uppercase tracking-widest transition-all hover:bg-cyan-500/30"
        >
          <User size={14} />
          Enroll New Face
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <GlassCard className="py-20 text-center">
            <Shield className="mx-auto mb-4 text-white/10" size={48} />
            <p className="text-white/40">No recent entries found in the secure enclave.</p>
          </GlassCard>
        ) : (
          profiles.map((profile) => (
            <GlassCard key={profile.id} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    <User size={10} /> Identity
                  </div>
                  <p className="text-sm font-bold text-white">{profile.name}</p>
                  <p className="text-[10px] font-mono text-white/20">{maskData(profile.name)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    <Mail size={10} /> Secure Mail
                  </div>
                  <p className="text-sm text-white/60">{profile.email}</p>
                  <p className="text-[10px] font-mono text-white/20">{maskData(profile.email)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    <Briefcase size={10} /> Clearance
                  </div>
                  <p className="text-sm text-cyan-400">{profile.role}</p>
                  <p className="text-[10px] font-mono text-white/20">{maskData(profile.role)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    <Clock size={10} /> Enrolled
                  </div>
                  <p className="text-sm text-white/60">{new Date(profile.createdAt).toLocaleDateString()}</p>
                  <p className="text-[10px] font-mono text-white/20">{new Date(profile.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};
