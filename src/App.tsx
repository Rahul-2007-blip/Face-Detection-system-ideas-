/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { FaceScanner } from './components/FaceScanner';
import { ProfileForm } from './components/ProfileForm';
import { ComparisonSection } from './components/ComparisonSection';
import { EncryptedPanel } from './components/EncryptedPanel';
import { SecureEnclavePanel } from './components/SecureEnclavePanel';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { GlassCard } from './components/GlassCard';
import { cn } from './lib/utils';

type Screen = 'landing' | 'scanning' | 'result' | 'enroll' | 'manage' | 'enclave';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [lastResult, setLastResult] = useState<boolean | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [lastEmbedding, setLastEmbedding] = useState<number[] | null>(null);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'enroll' | 'recognize' | 'default'>('default');

  const handleStart = (mode?: 'enroll' | 'manage' | 'recognize' | 'enclave') => {
    setLastResult(null);
    setResultMessage('');
    setLastEmbedding(null);
    setMatchedName(null);
    
    if (mode === 'manage') {
      setScreen('manage');
    } else if (mode === 'enclave') {
      setScreen('enclave');
    } else {
      setActiveMode(mode === 'enroll' ? 'enroll' : 'recognize');
      setScreen('scanning');
    }
  };

  React.useEffect(() => {
    const handleEnrollEvent = () => handleStart('enroll');
    window.addEventListener('start-enroll', handleEnrollEvent);
    return () => window.removeEventListener('start-enroll', handleEnrollEvent);
  }, []);

  const handleComplete = (success: boolean, message?: string, embedding?: number[], userName?: string) => {
    setLastResult(success);
    setResultMessage(message || '');
    if (embedding) setLastEmbedding(embedding);
    if (userName) setMatchedName(userName);
    setScreen('result');
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] font-sans text-white">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] h-[30%] w-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <LandingPage onStart={handleStart} />
            <ComparisonSection />
          </motion.div>
        )}

        {screen === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col items-center justify-center pt-10"
          >
            <button
              onClick={() => {
                setScreen('landing');
                setLastResult(null);
              }}
              className="mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Cancel Scan
            </button>
            <FaceScanner mode={activeMode} onComplete={handleComplete} />
          </motion.div>
        )}

        {screen === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-screen flex-col items-center justify-center p-4"
          >
            <GlassCard className="w-full max-w-md text-center">
              <div className="mb-8 flex justify-center">
                {lastResult ? (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                    <ShieldCheck size={48} />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                    <ShieldAlert size={48} />
                  </div>
                )}
              </div>

              <h2 className={lastResult ? "text-3xl font-bold text-green-400" : "text-3xl font-bold text-red-400"}>
                {resultMessage || (lastResult ? "Access Granted" : "Access Denied")}
              </h2>
              <p className="mt-4 text-white/60">
                {lastResult 
                  ? "Identity successfully verified via 3D biometric analysis. Secure session established." 
                  : "Biometric mismatch or spoof detected. System lockdown active."}
              </p>

              <div className="mt-8 space-y-4">
                {lastResult && !matchedName && (
                  <button
                    onClick={() => setScreen('enroll')}
                    className="w-full rounded-xl bg-cyan-500 py-4 font-bold text-black transition-all hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  >
                    Save Identity Details
                  </button>
                )}
                <button
                  onClick={() => setScreen('scanning')}
                  className="w-full rounded-xl bg-white/10 py-4 font-bold transition-all hover:bg-white/20"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setScreen('landing')}
                  className="w-full rounded-xl border border-white/10 py-4 font-bold text-white/40 transition-all hover:text-white"
                >
                  Back to Home
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
        {screen === 'enroll' && lastEmbedding && (
          <motion.div
            key="enroll"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-screen flex-col items-center justify-center p-4"
          >
            <button
              onClick={() => setScreen('result')}
              className="mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Result
            </button>
            <ProfileForm 
              embedding={lastEmbedding} 
              onSave={() => {
                setScreen('landing');
                setLastEmbedding(null);
              }} 
            />
          </motion.div>
        )}

        {screen === 'manage' && (
          <motion.div
            key="manage"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-screen flex-col items-center justify-center p-4 pt-20"
          >
            <button
              onClick={() => setScreen('landing')}
              className="mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
            <EncryptedPanel />
          </motion.div>
        )}

        {screen === 'enclave' && (
          <motion.div
            key="enclave"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-screen flex-col items-center justify-center p-4 pt-20"
          >
            <button
              onClick={() => setScreen('landing')}
              className="mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Home
            </button>
            <SecureEnclavePanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-10 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
        VisionOS Biometric Security Framework v2.4.0
      </footer>
    </div>
  );
}

