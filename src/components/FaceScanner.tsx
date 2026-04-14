import React, { useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Points, PointMaterial, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Results, MediaSourceType, useFaceMesh } from '@/src/hooks/useFaceMesh';
import { GlassCard } from './GlassCard';
import { PhysicsPanel } from './PhysicsPanel';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Scan, Settings2, Info, Zap, Upload, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { FacePose } from '../lib/faceUtils';
import { ControlInfoPanel } from './ControlInfoPanel';

// 3D Dots Component with Structured Light Simulation
const FaceDots = ({ results, showMesh, showDots, depthMode, infraredMode, showPhysics, dimensions }: { 
  results: Results | null, 
  showMesh: boolean, 
  showDots: boolean, 
  depthMode: boolean,
  infraredMode: boolean,
  showPhysics: boolean,
  dimensions: { width: number, height: number }
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    if (!results?.multiFaceLandmarks?.[0]) return new Float32Array(0);
    const landmarks = results.multiFaceLandmarks[0];
    const pos = new Float32Array(landmarks.length * 3);
    
    landmarks.forEach((lm, i) => {
      // Map normalized coordinates (0-1) to pixel-space coordinates
      // MediaPipe: (0,0) is top-left. Three.js: (0,0) is center.
      let x = (lm.x - 0.5) * dimensions.width;
      let y = (0.5 - lm.y) * dimensions.height;
      let z = -lm.z * dimensions.width; // Depth scaled relative to width

      // Simulate surface scattering/jitter in physics mode
      if (showPhysics) {
        x += (Math.random() - 0.5) * 2;
        y += (Math.random() - 0.5) * 2;
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    });
    return pos;
  }, [results, showPhysics, dimensions]);

  const colors = useMemo(() => {
    if (!results?.multiFaceLandmarks?.[0]) return new Float32Array(0);
    const landmarks = results.multiFaceLandmarks[0];
    const cols = new Float32Array(landmarks.length * 3);
    
    landmarks.forEach((lm, i) => {
      if (depthMode) {
        const intensity = Math.min(1, Math.max(0, 1 + lm.z * 10));
        cols[i * 3] = intensity;
        cols[i * 3 + 1] = intensity * 0.5;
        cols[i * 3 + 2] = 1 - intensity;
      } else if (infraredMode) {
        cols[i * 3] = 1.0;
        cols[i * 3 + 1] = 0.2;
        cols[i * 3 + 2] = 0.2; 
      } else {
        cols[i * 3] = 0.2;
        cols[i * 3 + 1] = 0.8;
        cols[i * 3 + 2] = 1.0;
      }
    });
    return cols;
  }, [results, depthMode, infraredMode]);

  if (!showDots && !showMesh) return null;

  return (
    <group>
      <Points ref={pointsRef} positions={positions} colors={colors}>
        <PointMaterial
          transparent
          vertexColors
          size={depthMode ? 12 : 6}
          sizeAttenuation={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      
      {showPhysics && results?.multiFaceLandmarks?.[0] && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={results.multiFaceLandmarks[0].length * 2}
              array={new Float32Array(results.multiFaceLandmarks[0].flatMap(lm => [
                (lm.x - 0.5) * dimensions.width, (0.5 - lm.y) * dimensions.height, -500, 
                (lm.x - 0.5) * dimensions.width, (0.5 - lm.y) * dimensions.height, -lm.z * dimensions.width 
              ]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={infraredMode ? "#ff3333" : "#22d3ee"} transparent opacity={0.1} />
        </lineSegments>
      )}
    </group>
  );
};

const SurfaceNormals = ({ results, visible, dimensions }: { results: Results | null, visible: boolean, dimensions: { width: number, height: number } }) => {
  if (!visible || !results?.multiFaceLandmarks?.[0]) return null;
  
  const landmarks = results.multiFaceLandmarks[0];
  const linePositions = new Float32Array(landmarks.length * 6);
  
  landmarks.forEach((lm, i) => {
    const x = (lm.x - 0.5) * dimensions.width;
    const y = (0.5 - lm.y) * dimensions.height;
    const z = -lm.z * dimensions.width;
    
    linePositions[i * 6] = x;
    linePositions[i * 6 + 1] = y;
    linePositions[i * 6 + 2] = z;
    
    linePositions[i * 6 + 3] = x + (x * 0.1);
    linePositions[i * 6 + 4] = y + (y * 0.1);
    linePositions[i * 6 + 5] = z + 50;
  });

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={landmarks.length * 2}
          array={linePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#a855f7" transparent opacity={0.4} />
    </lineSegments>
  );
};

export const FaceScanner: React.FC<{ 
  mode?: 'enroll' | 'recognize' | 'default',
  onComplete: (success: boolean, message?: string, embedding?: number[], userName?: string) => void 
}> = ({ mode = 'default', onComplete }) => {
  const [results, setResults] = useState<Results | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'detecting' | 'authenticating' | 'liveness' | 'success' | 'failed'>('scanning');
  const [showMesh, setShowMesh] = useState(true);
  const [depthMode, setDepthMode] = useState(false);
  const [infraredMode, setInfraredMode] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [showPhysics, setShowPhysics] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [confidence, setConfidence] = useState(0);
  const [distance, setDistance] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });
  const [facialGeometry, setFacialGeometry] = useState<{ pupilDist: number, mouthRatio: number }>({ pupilDist: 0, mouthRatio: 0 });
  const [pose, setPose] = useState<FacePose>({ pitch: 0, yaw: 0, roll: 0 });
  const [liveness, setLiveness] = useState<{ score: number, signals: any }>({ score: 0, signals: {} });
  const [currentEmbedding, setCurrentEmbedding] = useState<number[]>([]);
  const [isPhotoUpload, setIsPhotoUpload] = useState(false);
  const [livenessPrompt, setLivenessPrompt] = useState<string>('');
  const [livenessSuccess, setLivenessSuccess] = useState<boolean | null>(null);
  const [autoClassification, setAutoClassification] = useState<'unknown' | '3d' | '2d'>('unknown');
  const classificationBuffer = useRef<number[]>([]);
  
  const latestLiveness = useRef(liveness);
  const latestPose = useRef(pose);

  const [autoAuthProgress, setAutoAuthProgress] = useState(0);
  const autoAuthTimer = useRef<NodeJS.Timeout | null>(null);
  const autoAuthInterval = useRef<NodeJS.Timeout | null>(null);
  const [mediaSource, setMediaSource] = useState<MediaSourceType>({ type: 'camera' });
  
  const onResults = React.useCallback((res: Results, extra: { pose: FacePose, embedding: number[], liveness: { score: number, signals: any } }) => {
    setResults(res);
    setPose(extra.pose);
    setCurrentEmbedding(extra.embedding);
    setLiveness(extra.liveness);
    latestLiveness.current = extra.liveness;
    latestPose.current = extra.pose;

    // Automatic 2D/3D Classification with Temporal Filtering
    if (res.multiFaceLandmarks?.length > 0) {
      classificationBuffer.current.push(extra.liveness.score);
      if (classificationBuffer.current.length > 15) classificationBuffer.current.shift();
      
      const avgScore = classificationBuffer.current.reduce((a, b) => a + b, 0) / classificationBuffer.current.length;
      if (classificationBuffer.current.length >= 10) {
        const newClassification = avgScore > 0.7 ? '3d' : '2d';
        setAutoClassification(newClassification);

        // Auto-trigger authentication if 3D is stable
        if (newClassification === '3d' && status === 'detecting' && !autoAuthTimer.current) {
          let progress = 0;
          setAutoAuthProgress(0);
          
          autoAuthInterval.current = setInterval(() => {
            progress += 1;
            setAutoAuthProgress(progress);
          }, 30);

          autoAuthTimer.current = setTimeout(() => {
            if (latestLiveness.current.score > 0.7) {
              handleStartAuth();
            }
            autoAuthTimer.current = null;
            if (autoAuthInterval.current) clearInterval(autoAuthInterval.current);
            setAutoAuthProgress(0);
          }, 3000);
        } else if (newClassification === '2d') {
          if (autoAuthTimer.current) {
            clearTimeout(autoAuthTimer.current);
            autoAuthTimer.current = null;
          }
          if (autoAuthInterval.current) {
            clearInterval(autoAuthInterval.current);
            autoAuthInterval.current = null;
          }
          setAutoAuthProgress(0);
        }
      }
    } else {
      classificationBuffer.current = [];
      setAutoClassification('unknown');
      if (autoAuthInterval.current) {
        clearInterval(autoAuthInterval.current);
        autoAuthInterval.current = null;
      }
      setAutoAuthProgress(0);
    }

    if (res.multiFaceLandmarks?.length > 0) {
      setStatus(prev => prev === 'scanning' ? 'detecting' : prev);
      
      const landmarks = res.multiFaceLandmarks[0];
      const left = landmarks[234].x;
      const right = landmarks[454].x;
      const width = Math.abs(right - left);
      const dist = Math.round((0.15 / width) * 100);
      setDistance(dist);

      // Calculate facial geometry details
      const getDist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      // Pupil distance (indices 468 and 473 are iris centers with refineLandmarks: true)
      const pDist = getDist(landmarks[468], landmarks[473]);
      
      // Mouth aspect ratio (indices 13, 14 for vertical and 61, 291 for horizontal)
      const mViz = getDist(landmarks[13], landmarks[14]);
      const mHor = getDist(landmarks[61], landmarks[291]);
      const mRatio = mHor > 0 ? mViz / mHor : 0;

      setFacialGeometry({
        pupilDist: pDist * 1000, // Scale for display
        mouthRatio: mRatio
      });
    } else {
      setStatus(prev => prev === 'detecting' ? 'scanning' : prev);
      setDistance(0);
    }
  }, []);

  const { videoRef, imageRef, isLoading, error, retry } = useFaceMesh(onResults, mediaSource);

  const handleDemoMode = () => {
    setMediaSource({ type: 'demo' });
    setStatus('detecting');
  };

  const handleRetry = () => {
    setMediaSource({ type: 'camera' });
    retry();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setMediaSource({ type: 'image', file: e.target.files[0] });
      setIsPhotoUpload(true);
      setStatus('detecting');
    }
  };

  const startLivenessTest = async () => {
    if (status !== 'detecting') return;
    setStatus('liveness');
    setLivenessSuccess(null);
    setConfidence(0);
    
    // Sequence of prompts for 3D parallax and movement verification
    const prompts = [
      { text: "Blink your eyes", check: (l: any, p: any) => l.signals.blink > 0.5 },
      { text: "Turn head left", check: (l: any, p: any) => p.yaw > 12 },
      { text: "Turn head right", check: (l: any, p: any) => p.yaw < -12 },
      { text: "Look straight", check: (l: any, p: any) => Math.abs(p.yaw) < 5 }
    ];

    for (const prompt of prompts) {
      setLivenessPrompt(prompt.text);
      let passed = false;
      const startTime = Date.now();
      
      while (Date.now() - startTime < 3000) { 
        if (prompt.check(latestLiveness.current, latestPose.current)) {
          passed = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      
      if (!passed) {
        setStatus('failed');
        setLivenessSuccess(false);
        setLivenessPrompt("2D Face Detected – Access Denied ❌");
        setTimeout(() => onComplete(false, "3D verification failed: Movement timeout."), 2000);
        return;
      }
    }

    // Call backend for final 3D verification
    setLivenessPrompt("Analyzing Surface Texture...");
    await new Promise(r => setTimeout(r, 800)); // Simulate texture analysis
    
    setLivenessPrompt("Analyzing 3D Structure...");
    try {
      const response = await fetch('/api/check-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landmarks: results?.multiFaceLandmarks?.[0],
          isPhoto: isPhotoUpload,
          signals: latestLiveness.current.signals
        })
      });
      const data = await response.json();

      if (data.is3D) {
        setLivenessSuccess(true);
        setLivenessPrompt(data.message);
        setConfidence(data.confidence);
        setTimeout(() => handleStartAuth(), 1500);
      } else {
        setStatus('failed');
        setLivenessSuccess(false);
        setLivenessPrompt(data.message);
        setConfidence(data.confidence);
        setTimeout(() => onComplete(false, "Spoof detected: 2D structure identified."), 2000);
      }
    } catch (err) {
      console.error('3D check error:', err);
      setStatus('failed');
      setLivenessPrompt("System Error ❌");
      setTimeout(() => onComplete(false, "3D analysis system error."), 2000);
    }
  };

  const handleStartAuth = async () => {
    if (status !== 'detecting') return;
    
    if (mode === 'enroll') {
      setStatus('success');
      setLivenessPrompt("3D Signature Captured ✅");
      setTimeout(() => onComplete(true, "Biometric landmarks extracted. Ready for enrollment.", currentEmbedding), 1500);
      return;
    }

    setStatus('authenticating');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setConfidence(progress);
      if (progress >= 100) {
        clearInterval(interval);
        verifyWithBackend();
      }
    }, 50);
  };

  const verifyWithBackend = async () => {
    try {
      const response = await fetch('/api/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: currentEmbedding,
          isPhoto: isPhotoUpload || liveness.score < 0.3, // Simulated spoof detection
          sensitivity,
          simulateNoise: false,
          livenessSignals: liveness.signals
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setTimeout(() => onComplete(true, data.message, currentEmbedding, data.userName), 1500);
      } else {
        setStatus('failed');
        setTimeout(() => onComplete(false, data.message), 1500);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setStatus('failed');
      setTimeout(() => onComplete(false, "System error during verification."), 1500);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-8 p-4">
      {/* Main Scanner View */}
      <GlassCard 
        className="relative overflow-hidden p-0"
        style={{ 
          aspectRatio: `${dimensions.width} / ${dimensions.height}`, 
          width: '100%', 
          maxWidth: '1024px' 
        }}
      >
        {isLoading && !error && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500/20 border-t-cyan-500" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/60">Initializing Biometrics...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-8 text-center backdrop-blur-xl">
            <Shield size={48} className="mb-4 text-red-400" />
            <h3 className="mb-2 text-xl font-bold">Camera Access Required</h3>
            <p className="mb-6 max-w-md text-sm text-white/60">
              {error}
            </p>
            <div className="mb-8 flex flex-col items-center gap-2 text-[10px] font-medium text-white/40 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">1</div>
                <span>Click the camera icon in the address bar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">2</div>
                <span>Select "Always allow"</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">3</div>
                <span>Click "Retry Camera" below</span>
              </div>
            </div>
            
            <div className="mb-8 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
              <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Pro Tip</p>
              <p className="mt-1 text-xs text-white/60">
                If permissions still won't register, try opening the app in a 
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mx-1 text-cyan-400 underline hover:text-cyan-300"
                >
                  new tab
                </a> 
                to bypass iframe restrictions.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleRetry}
                className="rounded-xl bg-white px-8 py-3 font-bold text-black transition-all hover:bg-white/90"
              >
                Retry Camera
              </button>
              <button
                onClick={handleDemoMode}
                className="rounded-xl bg-cyan-500 px-8 py-3 font-bold text-black transition-all hover:bg-cyan-400"
              >
                Run Demo Mode
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3 font-bold text-white transition-all hover:bg-white/10">
                <Upload size={18} />
                Upload Photo
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            setDimensions({ width: video.videoWidth, height: video.videoHeight });
          }}
          className={cn(
            "absolute inset-0 h-full w-full transition-all duration-500 scale-x-[-1] object-cover",
            depthMode && "opacity-20 grayscale",
            infraredMode && "opacity-10 invert sepia hue-rotate-[320deg] saturate-[5] brightness-[0.5]",
            !depthMode && !infraredMode && "opacity-60",
            mediaSource.type === 'image' && "hidden"
          )}
          autoPlay
          playsInline
          muted
        />
        <img
          ref={imageRef}
          onLoad={(e) => {
            const img = e.currentTarget;
            setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          className={cn(
            "absolute inset-0 h-full w-full transition-all duration-500 scale-x-[-1] object-cover",
            depthMode && "opacity-20 grayscale",
            infraredMode && "opacity-10 invert sepia hue-rotate-[320deg] saturate-[5] brightness-[0.5]",
            !depthMode && !infraredMode && "opacity-60",
            mediaSource.type !== 'image' && "hidden"
          )}
          alt="Uploaded face"
        />
        
        <div className="absolute inset-0 z-10 scale-x-[-1]">
          <Canvas 
            orthographic 
            camera={{ 
              left: -dimensions.width / 2, 
              right: dimensions.width / 2, 
              top: dimensions.height / 2, 
              bottom: -dimensions.height / 2, 
              near: 0.1, 
              far: 2000,
              position: [0, 0, 1000]
            }}
          >
            <ambientLight intensity={infraredMode ? 0.2 : 0.5} />
            <pointLight position={[0, 0, 500]} intensity={infraredMode ? 2 : 1} color={infraredMode ? "#ff0000" : "#ffffff"} />
            <FaceDots 
              results={results} 
              showMesh={showMesh} 
              showDots={true} 
              depthMode={depthMode} 
              infraredMode={infraredMode}
              showPhysics={showPhysics}
              dimensions={dimensions}
            />
            <SurfaceNormals results={results} visible={showNormals} dimensions={dimensions} />
          </Canvas>
        </div>

        <AnimatePresence>
          {(status === 'authenticating' || status === 'liveness') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div 
                className="absolute left-0 right-0 h-1 bg-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              {status === 'liveness' ? (
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="mb-6 text-4xl font-bold text-cyan-400"
                  >
                    {livenessPrompt}
                  </motion.div>
                  {confidence > 0 && (
                    <div className="mb-4 text-xl font-mono text-white/60">
                      Confidence: {confidence}%
                    </div>
                  )}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1 w-8 rounded-full transition-all duration-500",
                          i <= ["Blink your eyes", "Turn head left", "Turn head right", "Look straight"].indexOf(livenessPrompt) 
                            ? "bg-cyan-400" 
                            : "bg-white/10"
                        )} 
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative h-48 w-48">
                  <svg className="h-full w-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                    <motion.circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke={infraredMode ? "#ef4444" : "#06b6d4"}
                      strokeWidth="2"
                      strokeDasharray="283"
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ strokeDashoffset: 283 - (283 * confidence) / 100 }}
                    />
                  </svg>
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center text-2xl font-bold",
                    infraredMode ? "text-red-400" : "text-cyan-400"
                  )}>
                    {confidence}%
                  </div>
                </div>
              )}
              <p className="mt-4 text-lg font-medium tracking-widest text-white uppercase">
                {status === 'liveness' ? "2D vs 3D Analysis" : "Authenticating"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status & Pose Overlays */}
        <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
          {autoClassification !== 'unknown' && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur-md",
                autoClassification === '3d' ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-red-500/30 bg-red-500/10 text-red-400"
              )}
            >
              <div className="relative flex h-4 w-4 items-center justify-center">
                <Zap size={12} className={autoClassification === '3d' ? "animate-pulse" : ""} />
                {autoAuthProgress > 0 && (
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="50" strokeDashoffset={50 - (50 * autoAuthProgress) / 100} className="opacity-40" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {autoClassification === '3d' ? (autoAuthProgress > 0 ? `Authenticating...` : "Real 3D Face") : "2D Spoof Detected"}
              </span>
            </motion.div>
          )}
          <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/40 px-4 py-2 backdrop-blur-md">
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              status === 'detecting' ? "bg-green-400" : "bg-cyan-400"
            )} />
            <span className="text-xs font-semibold tracking-wider text-white uppercase">
              {status === 'scanning' && "Searching for face..."}
              {status === 'detecting' && "Face Locked"}
              {status === 'liveness' && "Liveness Check"}
              {status === 'authenticating' && "Processing Mesh"}
              {status === 'success' && "Identity Verified"}
              {status === 'failed' && "Verification Failed"}
            </span>
          </div>
          
          {status === 'detecting' && (
            <div className="flex gap-2">
              <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono text-white/60">
                P: {pose.pitch.toFixed(1)}°
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono text-white/60">
                Y: {pose.yaw.toFixed(1)}°
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono text-white/60">
                R: {pose.roll.toFixed(1)}°
              </div>
            </div>
          )}

          {status === 'detecting' && (
            <div className="flex gap-2">
              <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono text-cyan-400/80">
                Pupil Dist: {facialGeometry.pupilDist.toFixed(1)}px
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-mono text-cyan-400/80">
                Mouth AR: {facialGeometry.mouthRatio.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Liveness & Distance */}
        <div className="absolute top-6 right-6 z-30 flex flex-col items-end gap-2">
          {distance > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 backdrop-blur-md">
              <span className="text-[10px] font-bold text-white/40 uppercase">Distance</span>
              <span className="text-xs font-mono text-cyan-400">{distance}cm</span>
            </div>
          )}
          {status === 'detecting' && (
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 backdrop-blur-md">
              <span className="text-[10px] font-bold text-white/40 uppercase">Liveness</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <motion.div 
                  className={cn("h-full", liveness.score > 0.4 ? "bg-green-400" : "bg-red-400")}
                  animate={{ width: `${liveness.score * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-white/60">{Math.round(liveness.score * 100)}%</span>
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className={cn(
            "h-64 w-64 rounded-[40px] border-2 transition-all duration-500",
            status === 'detecting' ? "border-green-400/50 scale-110" : "border-white/20 scale-100",
            status === 'authenticating' || status === 'liveness' ? "border-cyan-400 animate-pulse" : ""
          )}>
            <div className="absolute -top-1 -left-1 h-8 w-8 border-t-4 border-l-4 border-inherit rounded-tl-2xl" />
            <div className="absolute -top-1 -right-1 h-8 w-8 border-t-4 border-r-4 border-inherit rounded-tr-2xl" />
            <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-inherit rounded-bl-2xl" />
            <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-inherit rounded-br-2xl" />
          </div>
        </div>
      </GlassCard>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60">
              <Settings2 size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">System Controls</span>
            </div>
            {isPhotoUpload && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-orange-400 uppercase">
                <AlertCircle size={12} />
                Photo Mode Active
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <button onClick={() => setShowMesh(!showMesh)} className={cn("flex items-center justify-between rounded-xl border p-3 transition-all", showMesh ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" : "border-white/10 text-white/40")}>
              <span className="text-xs font-medium">Mesh</span>
              <div className={cn("h-2 w-2 rounded-full", showMesh ? "bg-cyan-400" : "bg-white/20")} />
            </button>
            <button onClick={() => setDepthMode(!depthMode)} className={cn("flex items-center justify-between rounded-xl border p-3 transition-all", depthMode ? "border-purple-500/50 bg-purple-500/10 text-purple-400" : "border-white/10 text-white/40")}>
              <span className="text-xs font-medium">Depth</span>
              <div className={cn("h-2 w-2 rounded-full", depthMode ? "bg-purple-400" : "bg-white/20")} />
            </button>
            <button onClick={() => setInfraredMode(!infraredMode)} className={cn("flex items-center justify-between rounded-xl border p-3 transition-all", infraredMode ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-white/10 text-white/40")}>
              <span className="text-xs font-medium">Infrared</span>
              <div className={cn("h-2 w-2 rounded-full", infraredMode ? "bg-red-400" : "bg-white/20")} />
            </button>
            <button onClick={() => setShowNormals(!showNormals)} className={cn("flex items-center justify-between rounded-xl border p-3 transition-all", showNormals ? "border-orange-500/50 bg-orange-500/10 text-orange-400" : "border-white/10 text-white/40")}>
              <span className="text-xs font-medium">Normals</span>
              <div className={cn("h-2 w-2 rounded-full", showNormals ? "bg-orange-400" : "bg-white/20")} />
            </button>
            <button onClick={() => setShowPhysics(!showPhysics)} className={cn("flex items-center justify-between rounded-xl border p-3 transition-all", showPhysics ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "border-white/10 text-white/40")}>
              <span className="text-xs font-medium">Physics</span>
              <div className={cn("h-2 w-2 rounded-full", showPhysics ? "bg-blue-400" : "bg-white/20")} />
            </button>
          </div>

          <ControlInfoPanel 
            activeToggles={[
              showMesh && 'mesh',
              depthMode && 'depth',
              infraredMode && 'infrared',
              showNormals && 'normals',
              showPhysics && 'physics'
            ].filter((t): t is string => !!t)} 
          />
          
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/40">
                <span>Sensitivity</span>
                <span>{sensitivity}%</span>
              </div>
              <input type="range" min="0" max="100" value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-cyan-400" />
            </div>
            <button disabled={status !== 'detecting'} onClick={startLivenessTest} className={cn("flex items-center justify-center gap-2 rounded-xl border px-8 py-3 font-bold uppercase tracking-widest transition-all", status === 'detecting' ? "border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30" : "border-white/5 bg-white/5 text-white/20 cursor-not-allowed")}>
              <Scan size={18} /> Check 2D vs 3D
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-4 flex items-center gap-2 text-white/60">
            <Info size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">Security Info</span>
          </div>
          <div className="space-y-4 text-[11px] text-white/70">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span>Structured Light</span>
              <span className="text-cyan-400">Active</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span>Points Projected</span>
              <span className="text-cyan-400">30,000+</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span>Liveness Check</span>
              <span className={cn(liveness.score > 0.4 ? "text-green-400" : "text-red-400")}>
                {liveness.score > 0.4 ? "Verified" : "Warning"}
              </span>
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex justify-between text-[9px] uppercase opacity-40">
                <span>Depth Variation</span>
                <span>{Math.round(liveness.signals.depth * 100)}%</span>
              </div>
              <div className="flex justify-between text-[9px] uppercase opacity-40">
                <span>Motion Parallax</span>
                <span>{Math.round(liveness.signals.parallax * 100)}%</span>
              </div>
              <div className="flex justify-between text-[9px] uppercase opacity-40">
                <span>Pose Consistency</span>
                <span>{Math.round(liveness.signals.pose * 100)}%</span>
              </div>
              <div className="flex justify-between text-[9px] uppercase opacity-40">
                <span>Texture Analysis</span>
                <span>{Math.round(liveness.signals.texture * 100)}%</span>
              </div>
              <div className="flex justify-between text-[9px] uppercase opacity-40">
                <span>Blink Detection</span>
                <span>{liveness.signals.blink > 0.5 ? "Detected" : "Waiting"}</span>
              </div>
            </div>
            <p className="opacity-50 leading-relaxed">
              TrueDepth camera projects 30,000+ invisible dots to create a precise depth map.
            </p>
          </div>
        </GlassCard>
      </div>

      <PhysicsPanel pose={pose} livenessScore={liveness.score} />
    </div>
  );
};


