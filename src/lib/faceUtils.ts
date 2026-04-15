// Define Results type locally since it's not exported as a named type in the ESM build
export type Results = {
  multiFaceLandmarks: any[][];
  image: any;
};

export interface FacePose {
  pitch: number;
  yaw: number;
  roll: number;
}

export function estimatePose(results: Results): FacePose {
  if (!results.multiFaceLandmarks?.[0]) return { pitch: 0, yaw: 0, roll: 0 };
  
  const landmarks = results.multiFaceLandmarks[0];
  
  // Basic pose estimation using key landmarks
  // 1: Nose tip, 33: Left eye, 263: Right eye, 61: Left mouth, 291: Right mouth, 152: Chin
  
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const chin = landmarks[152];
  
  // Yaw: horizontal rotation
  const yaw = Math.atan2(nose.x - (leftEye.x + rightEye.x) / 2, 0.5) * (180 / Math.PI) * 10;
  
  // Pitch: vertical rotation
  const pitch = Math.atan2(nose.y - (leftEye.y + rightEye.y) / 2, 0.5) * (180 / Math.PI) * 10;
  
  // Roll: tilt
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);
  
  return { pitch, yaw, roll };
}

export function generateEmbedding(results: Results): number[] {
  if (!results.multiFaceLandmarks?.[0]) return [];
  
  const landmarks = results.multiFaceLandmarks[0];
  // We take a subset of landmarks to create a "signature"
  // For simplicity, we use the relative distances of some key points
  const keyIndices = [1, 33, 263, 61, 291, 152, 10, 151];
  const embedding: number[] = [];
  
  const nose = landmarks[1];
  
  keyIndices.forEach(idx => {
    const lm = landmarks[idx];
    embedding.push(lm.x - nose.x);
    embedding.push(lm.y - nose.y);
    embedding.push(lm.z - nose.z);
  });
  
  return embedding;
}

export function calculateEAR(landmarks: any[]): number {
  // Eye Aspect Ratio calculation
  // Left Eye: 362, 385, 387, 263, 373, 380
  // Right Eye: 33, 160, 158, 133, 153, 144
  
  const getDistance = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  
  const leftEAR = (getDistance(landmarks[385], landmarks[380]) + getDistance(landmarks[387], landmarks[373])) / (2 * getDistance(landmarks[362], landmarks[263]));
  const rightEAR = (getDistance(landmarks[160], landmarks[144]) + getDistance(landmarks[158], landmarks[153])) / (2 * getDistance(landmarks[33], landmarks[133]));
  
  return (leftEAR + rightEAR) / 2;
}

export function calculate3DScore(results: Results, prevLandmarks: any[] | null): { score: number, signals: any } {
  if (!results.multiFaceLandmarks?.[0]) return { score: 0, signals: {} };
  
  const landmarks = results.multiFaceLandmarks[0];
  
  // 1. Advanced Depth Variation (3D structure)
  const noseTip = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const chin = landmarks[152];
  const forehead = landmarks[10];
  
  // Calculate face width in 2D space
  const faceWidth = Math.sqrt(Math.pow(rightCheek.x - leftCheek.x, 2) + Math.pow(rightCheek.y - leftCheek.y, 2));
  
  // Calculate physical depth variation (Z-axis)
  const horizontalDepth = Math.abs(noseTip.z - (leftCheek.z + rightCheek.z) / 2);
  const verticalDepth = Math.abs(noseTip.z - (forehead.z + chin.z) / 2);
  const eyeDepth = Math.abs(noseTip.z - (leftEye.z + rightEye.z) / 2);
  
  // Depth-to-Width Ratio Check (CRITICAL for 2D detection)
  // A real human face has a depth that is roughly 30-50% of its width.
  // 2D photos/screens have "hallucinated" depth that is usually < 15% of width.
  const depthToWidthRatio = horizontalDepth / faceWidth;
  
  // Strict 2D Rejection: If the face is too "flat" relative to its size, it's 2D.
  const flatnessPenalty = depthToWidthRatio < 0.2 ? (depthToWidthRatio / 0.2) : 1;
  
  // Hard floor: If absolute depth is too low, it's 2D regardless of ratio
  const absoluteDepthPenalty = horizontalDepth < 0.04 ? 0.1 : 1;
  
  // Calculate depth score with penalties
  const rawDepthScore = Math.min(1, (horizontalDepth * 5) + (verticalDepth * 4) + (eyeDepth * 2));
  const depthScore = rawDepthScore * flatnessPenalty * absoluteDepthPenalty;
  
  // 2. Motion Parallax Detection
  // In 3D, foreground objects (nose) move more/differently than background (ears)
  let parallaxScore = 0;
  if (prevLandmarks) {
    const noseMove = Math.sqrt(Math.pow(noseTip.x - prevLandmarks[1].x, 2) + Math.pow(noseTip.y - prevLandmarks[1].y, 2));
    const earMove = Math.sqrt(Math.pow(leftCheek.x - prevLandmarks[234].x, 2) + Math.pow(leftCheek.y - prevLandmarks[234].y, 2));
    
    // In a flat image, noseMove and earMove are identical. In 3D, they differ during rotation.
    const moveDiff = Math.abs(noseMove - earMove);
    // Increase sensitivity to parallax differences
    parallaxScore = Math.min(1, moveDiff * 1500);
  }
  
  // 3. Pose Consistency
  // Does the estimated 3D pose match the 2D landmark distribution?
  const pose = estimatePose(results);
  // Require more significant movement for a "pose" score
  const poseScore = (Math.abs(pose.pitch) > 5 || Math.abs(pose.yaw) > 5) ? 1 : 0.2;
  
  // 4. Eye Blink (EAR)
  const ear = calculateEAR(landmarks);
  const blinkScore = ear < 0.2 ? 1 : 0;
  
  // 5. Texture Stability (Simulated)
  // Real skin has micro-fluctuations; photos are often too "perfect" or have sensor noise
  const textureScore = 0.8; // Placeholder for advanced pixel analysis
  
  // 6. Structured Light Simulation (Pattern Deformation)
  // Analyze if the grid of landmarks deforms correctly over the 3D surface
  const structuredLightScore = simulateStructuredLight(landmarks);
  
  // 7. Infrared Mode Simulation (Intensity Variation)
  const infraredScore = simulateInfrared(landmarks);
  
  // 8. Surface Normal Estimation (Curvature)
  const normalScore = estimateSurfaceNormals(landmarks);

  // Advanced Weighted Scoring
  // Depth (0.4), Parallax (0.15), Pose (0.05), Blink (0.05), Texture (0.05), Structured Light (0.1), Infrared (0.1), Normals (0.1)
  const score = (depthScore * 0.4) + (parallaxScore * 0.15) + (poseScore * 0.05) + (blinkScore * 0.05) + (textureScore * 0.05) + (structuredLightScore * 0.1) + (infraredScore * 0.1) + (normalScore * 0.1);
  
  return {
    score: Math.min(1, score),
    signals: {
      depth: depthScore,
      parallax: parallaxScore,
      pose: poseScore,
      blink: blinkScore,
      texture: textureScore,
      structuredLight: structuredLightScore,
      infrared: infraredScore,
      normals: normalScore,
      ear,
      zVariation: horizontalDepth,
      depthToWidthRatio
    }
  };
}

function simulateStructuredLight(landmarks: any[]): number {
  // In a real system, we'd project a dot grid. 
  // Here we simulate by checking the regularity of the landmark grid relative to depth.
  // Real faces cause predictable non-linear deformation.
  const nose = landmarks[1];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  
  // Check vertical curvature
  const midPointZ = (forehead.z + chin.z) / 2;
  const verticalCurvature = Math.abs(nose.z - midPointZ);
  
  // If vertical curvature is too low, it's likely a flat surface
  return verticalCurvature > 0.05 ? 1 : (verticalCurvature / 0.05);
}

function simulateInfrared(landmarks: any[]): number {
  // Infrared sensors detect heat/reflectivity. 
  // We simulate this by checking if the "intensity" (simulated by depth and angle) 
  // follows a natural 3D falloff.
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  
  const avgCheekZ = (leftCheek.z + rightCheek.z) / 2;
  const intensityDiff = Math.abs(nose.z - avgCheekZ);
  
  // Real 3D faces have a distinct intensity gradient from nose to cheeks
  return intensityDiff > 0.03 ? 1 : (intensityDiff / 0.03);
}

function estimateSurfaceNormals(landmarks: any[]): number {
  // Estimate curvature by looking at the angle between different face segments
  const getNormal = (p1: any, p2: any, p3: any) => {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };
  };

  const n1 = getNormal(landmarks[1], landmarks[33], landmarks[61]); // Nose, Left Eye, Left Mouth
  const n2 = getNormal(landmarks[1], landmarks[263], landmarks[291]); // Nose, Right Eye, Right Mouth
  
  // In 3D, these normals should point in significantly different directions
  const dotProduct = n1.x * n2.x + n1.y * n2.y + n1.z * n2.z;
  const magnitude1 = Math.sqrt(n1.x**2 + n1.y**2 + n1.z**2);
  const magnitude2 = Math.sqrt(n2.x**2 + n2.y**2 + n2.z**2);
  
  const cosTheta = dotProduct / (magnitude1 * magnitude2);
  
  // If cosTheta is close to 1, the surfaces are parallel (flat image)
  return cosTheta < 0.95 ? 1 : (1 - (cosTheta - 0.95) / 0.05);
}

export function calculateLiveness(results: Results, prevLandmarks: any[] | null): { score: number, signals: any } {
  return calculate3DScore(results, prevLandmarks);
}
