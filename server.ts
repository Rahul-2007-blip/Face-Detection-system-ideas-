import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "profiles.json");

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function getProfiles() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveProfiles(profiles: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(profiles, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  
  function calculateEuclideanDistance(a: number[], b: number[]) {
    if (a.length !== b.length) return 100;
    return Math.sqrt(a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0));
  }

  // Get all profiles
  app.get("/api/profiles", (req, res) => {
    res.json(getProfiles());
  });

  // Save profile endpoint
  app.post("/api/save-profile", (req, res) => {
    const { name, email, role, embedding } = req.body;
    const profiles = getProfiles();
    
    const newProfile = {
      id: Date.now().toString(),
      name,
      email,
      role,
      embedding,
      createdAt: new Date().toISOString()
    };
    
    profiles.push(newProfile);
    saveProfiles(profiles);
    
    res.json({ success: true, profile: newProfile });
  });

  // Update profile
  app.put("/api/profiles/:id", (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const profiles = getProfiles();
    
    const index = profiles.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], name, email, role };
      saveProfiles(profiles);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  });

  // Delete profile
  app.delete("/api/profiles/:id", (req, res) => {
    const { id } = req.params;
    const profiles = getProfiles();
    const filtered = profiles.filter((p: any) => p.id !== id);
    saveProfiles(filtered);
    res.json({ success: true });
  });

  // Mock authentication endpoint
  app.post("/api/verify-face", (req, res) => {
    const { embedding, isPhoto, sensitivity, simulateNoise, livenessSignals } = req.body;
    const profiles = getProfiles();

    if (isPhoto) {
      return res.status(400).json({
        success: false,
        message: "Spoof detected: 2D image lack of depth variation.",
        confidence: 0
      });
    }

    if (!embedding || embedding.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No face data received.",
        confidence: 0
      });
    }

    if (profiles.length === 0) {
      return res.json({
        success: true,
        message: "No profiles enrolled. System in guest mode.",
        confidence: 100
      });
    }

    // Find the best match among all profiles
    let bestMatch = null;
    let minDistance = Infinity;

    for (const profile of profiles) {
      const distance = calculateEuclideanDistance(embedding, profile.embedding);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = profile;
      }
    }

    // Inject noise if requested
    if (simulateNoise) {
      minDistance += (Math.random() - 0.5) * 0.1;
    }

    // Convert distance to confidence (0-100)
    const confidence = Math.max(0, Math.min(100, (1 - (minDistance * 2)) * 100));
    const threshold = 100 - sensitivity;

    if (confidence > threshold && bestMatch) {
      res.json({
        success: true,
        message: `Welcome, ${bestMatch.name} ✅`,
        confidence: Math.round(confidence),
        userName: bestMatch.name
      });
    } else {
      res.json({
        success: false,
        message: "Face Not Recognized ❌",
        confidence: Math.round(confidence)
      });
    }
  });

  // 3D vs 2D Detection Endpoint
  app.post("/api/check-3d", (req, res) => {
    const { landmarks, isPhoto, signals } = req.body;

    console.log('3D Check Request:', { isPhoto, signals });

    if (isPhoto) {
      return res.json({
        success: false,
        is3D: false,
        message: "2D Face Detected – Access Denied ❌",
        confidence: 5, // Low confidence for 2D
        score: 0.05
      });
    }

    // Backend logic to verify signals
    // In a real production app, we would analyze the raw landmarks here
    // For this simulation, we use the signals sent from the frontend but add server-side validation
    
    const depthScore = signals?.depth || 0;
    const parallaxScore = signals?.parallax || 0;
    const poseScore = signals?.pose || 0;
    const blinkScore = signals?.blink || 0;
    const textureScore = signals?.texture || 0;

    // Server-side weighted score
    const finalScore = (depthScore * 0.5) + (parallaxScore * 0.2) + (poseScore * 0.1) + (blinkScore * 0.1) + (textureScore * 0.1);
    
    // Increase threshold from 0.6 to 0.7 to be extremely strict against 2D spoofing
    const is3D = finalScore > 0.7;

    res.json({
      success: true,
      is3D,
      message: is3D ? "Real Face Detected (3D) ✅" : "2D Face Detected – Access Denied ❌",
      confidence: Math.round(finalScore * 100),
      score: finalScore
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
