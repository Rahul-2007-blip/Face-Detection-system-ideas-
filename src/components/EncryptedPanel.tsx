import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Mail, Briefcase, Trash2, Edit3, Save, X, Database, ShieldCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  embedding: number[];
  createdAt: string;
}

export const EncryptedPanel: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profiles');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this biometric profile? This action is irreversible.')) return;
    
    try {
      const response = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProfiles(profiles.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  const startEdit = (profile: UserProfile) => {
    setEditingId(profile.id);
    setEditForm({ name: profile.name, email: profile.email, role: profile.role });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const response = await fetch(`/api/profiles/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        setProfiles(profiles.map(p => p.id === editingId ? { ...p, ...editForm } : p));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Simulation of encrypted data representation
  const maskData = (str: string) => {
    if (!str) return '';
    return btoa(str).substring(0, 12) + '...';
  };

  const maskEmbedding = (embedding: number[]) => {
    if (!embedding) return '';
    return 'SHA-256:' + btoa(embedding.slice(0, 5).join(',')).substring(0, 16);
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="text-cyan-400" size={24} />
            Encrypted Vault Management
          </h2>
          <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Secure Enclave Storage v2.0</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-1.5 text-[10px] font-bold text-green-400 uppercase tracking-widest">
          <ShieldCheck size={12} />
          AES-256 Active
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <GlassCard className="py-20 text-center">
            <Database className="mx-auto mb-4 text-white/10" size={48} />
            <p className="text-white/40">No biometric profiles found in the secure enclave.</p>
          </GlassCard>
        ) : (
          profiles.map((profile) => (
            <GlassCard key={profile.id} className="p-0 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="flex-1 p-6">
                  {editingId === profile.id ? (
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Name</label>
                        <input 
                          value={editForm.name}
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Email</label>
                        <input 
                          value={editForm.email}
                          onChange={e => setEditForm({...editForm, email: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Role</label>
                        <select 
                          value={editForm.role}
                          onChange={e => setEditForm({...editForm, role: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="Administrator">Administrator</option>
                          <option value="Security Officer">Security Officer</option>
                          <option value="Authorized Personnel">Authorized Personnel</option>
                          <option value="Guest">Guest</option>
                        </select>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                    </div>
                  )}
                  
                  <div className="mt-6 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Biometric Hash (Neural Embedding)</div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <code className="text-[10px] font-mono text-cyan-400/60">{maskEmbedding(profile.embedding)}</code>
                      </div>
                    </div>
                    <div className="text-[10px] text-white/20 font-mono">
                      ENROLLED: {new Date(profile.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 border-l border-white/5 p-4 flex sm:flex-col justify-center gap-2">
                  {editingId === profile.id ? (
                    <>
                      <button 
                        onClick={handleUpdate}
                        className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                        title="Save Changes"
                      >
                        <Save size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => startEdit(profile)}
                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                        title="Edit Profile"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(profile.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Delete Profile"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};
