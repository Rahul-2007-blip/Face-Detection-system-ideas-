import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceMeshPkg from '@mediapipe/face_mesh';
import { estimatePose, generateEmbedding, calculateLiveness, FacePose, Results } from '../lib/faceUtils';

export type { Results };

// Handle different module formats (ESM vs CJS)
const FaceMesh = (faceMeshPkg as any).FaceMesh || (faceMeshPkg as any).default?.FaceMesh || (window as any).FaceMesh;

// Fix for "Module.arguments has been replaced with plain arguments_" error in MediaPipe
if (typeof window !== 'undefined') {
  (window as any).arguments = (window as any).arguments || [];
  (window as any).Module = (window as any).Module || {};
  (window as any).Module.arguments = (window as any).Module.arguments || [];
}

export type MediaSourceType = { type: 'camera' } | { type: 'image', file: File } | { type: 'demo' };

export const useFaceMesh = (
  onResults: (results: Results, extra: { pose: FacePose, embedding: number[], liveness: { score: number, signals: any } }) => void,
  mediaSource: MediaSourceType = { type: 'camera' }
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const faceMeshRef = useRef<any>(null);
  const prevLandmarksRef = useRef<any[] | null>(null);
  const onResultsRef = useRef(onResults);
  const requestRef = useRef<number>(0);

  const retry = useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      if (navigator.permissions && (navigator.permissions as any).query) {
        const result = await (navigator.permissions as any).query({ name: 'camera' });
        return result.state;
      }
    } catch (e) {
      console.warn("Permissions API not supported:", e);
    }
    return 'unknown';
  }, []);

  // Update the ref whenever onResults changes
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  const handleResults = useCallback((results: Results) => {
    const pose = estimatePose(results);
    const embedding = generateEmbedding(results);
    const liveness = calculateLiveness(results, prevLandmarksRef.current);
    
    if (results.multiFaceLandmarks?.[0]) {
      prevLandmarksRef.current = results.multiFaceLandmarks[0];
    }
    
    onResultsRef.current(results, { pose, embedding, liveness });
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const initFaceMesh = async () => {
      try {
        if (!faceMeshRef.current) {
          const faceMesh = new FaceMesh({
            locateFile: (file) => {
              return `https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619/${file}`;
            },
          });

          faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          faceMesh.onResults(handleResults);
          faceMeshRef.current = faceMesh;
        }

        if (!isMounted) return;

        if (mediaSource.type === 'camera') {
          if (videoRef.current) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              throw new Error('Camera API is not available in this browser. Please ensure you are using HTTPS or localhost.');
            }
            
            // Proactively check permission state if possible
            const permState = await checkPermissions();
            if (permState === 'denied') {
              throw new Error('Camera access was denied. Please click the camera icon in your browser address bar to allow access.');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
              video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user'
              },
            });
            
            if (!isMounted) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }

            videoRef.current.srcObject = stream;
            
            try {
              await videoRef.current.play();
            } catch (e: any) {
              if (e.name === 'AbortError') {
                console.log("Camera play request was interrupted, this is expected on rapid navigation.");
                return;
              }
              throw e;
            }

            const processFrame = async () => {
              if (!isMounted || !faceMeshRef.current || !videoRef.current) return;
              
              if (videoRef.current.readyState >= 2) {
                try {
                  await faceMeshRef.current.send({ image: videoRef.current });
                } catch (e) {
                  console.warn("FaceMesh send error:", e);
                }
              }
              requestRef.current = requestAnimationFrame(processFrame);
            };
            
            processFrame();
          }
        } else if (mediaSource.type === 'image' && imageRef.current) {
           const url = URL.createObjectURL(mediaSource.file);
           imageRef.current.src = url;
           imageRef.current.onload = async () => {
             if (!isMounted || !faceMeshRef.current || !imageRef.current) return;
             try {
               await faceMeshRef.current.send({ image: imageRef.current });
             } catch (e) {
               console.warn("FaceMesh send error:", e);
             }
           };
        } else if (mediaSource.type === 'demo' && videoRef.current) {
           videoRef.current.src = "https://storage.googleapis.com/mediapipe-assets/portrait_video.mp4";
           videoRef.current.crossOrigin = "anonymous";
           videoRef.current.loop = true;
           videoRef.current.muted = true;
           videoRef.current.playsInline = true;
           
           try {
             await videoRef.current.play();
           } catch (e) {
             console.warn("Demo video play error:", e);
           }

           const processFrame = async () => {
              if (!isMounted || !faceMeshRef.current || !videoRef.current) return;
              
              if (videoRef.current.readyState >= 2) {
                try {
                  await faceMeshRef.current.send({ image: videoRef.current });
                } catch (e) {
                  console.warn("FaceMesh send error:", e);
                }
              }
              requestRef.current = requestAnimationFrame(processFrame);
            };
            
            processFrame();
        }
        
        if (isMounted) setIsLoading(false);
      } catch (err: any) {
        console.error('Face Mesh init error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            setError('Camera access was denied. Please click the camera icon in your browser address bar to allow access, then click Retry.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera found on this device. Please connect a camera or use Demo Mode/Photo Upload.');
          } else {
            setError(`Failed to initialize camera or face detection: ${err.message || 'Unknown error'}`);
          }
          setIsLoading(false);
        }
      }
    };

    initFaceMesh();

    return () => {
      isMounted = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
        try {
          videoRef.current.load();
        } catch (e) {
          // Ignore load errors on cleanup
        }
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [handleResults, mediaSource, retryKey, checkPermissions]);

  return { videoRef, imageRef, isLoading, error, retry };
};
