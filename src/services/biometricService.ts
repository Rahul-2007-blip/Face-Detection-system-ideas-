
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  embedding: number[];
  createdAt: string;
}

class BiometricService {
  private STORAGE_KEY = 'biometric_profiles';

  private getProfiles(): Profile[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveProfiles(profiles: Profile[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
  }

  private calculateEuclideanDistance(a: number[], b: number[]) {
    if (a.length !== b.length) return 100;
    return Math.sqrt(a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0));
  }

  async getAllProfiles(): Promise<Profile[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.getProfiles();
  }

  async saveProfile(profileData: Omit<Profile, 'id' | 'createdAt'>): Promise<Profile> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const profiles = this.getProfiles();
    const newProfile: Profile = {
      ...profileData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    profiles.push(newProfile);
    this.saveProfiles(profiles);
    return newProfile;
  }

  async updateProfile(id: string, data: Partial<Omit<Profile, 'id' | 'embedding' | 'createdAt'>>): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === id);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...data };
      this.saveProfiles(profiles);
      return true;
    }
    return false;
  }

  async deleteProfile(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const profiles = this.getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    this.saveProfiles(filtered);
    return true;
  }

  async verifyFace(params: {
    embedding: number[];
    isPhoto: boolean;
    sensitivity: number;
    simulateNoise?: boolean;
  }) {
    await new Promise(resolve => setTimeout(resolve, 800));
    const { embedding, isPhoto, sensitivity, simulateNoise } = params;
    const profiles = this.getProfiles();

    if (isPhoto) {
      return {
        success: false,
        message: "Spoof detected: 2D image lack of depth variation.",
        confidence: 0
      };
    }

    if (!embedding || embedding.length === 0) {
      return {
        success: false,
        message: "No face data received.",
        confidence: 0
      };
    }

    if (profiles.length === 0) {
      return {
        success: true,
        message: "No profiles enrolled. System in guest mode.",
        confidence: 100
      };
    }

    let bestMatch = null;
    let minDistance = Infinity;

    for (const profile of profiles) {
      const distance = this.calculateEuclideanDistance(embedding, profile.embedding);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = profile;
      }
    }

    if (simulateNoise) {
      minDistance += (Math.random() - 0.5) * 0.1;
    }

    const confidence = Math.max(0, Math.min(100, (1 - (minDistance * 2)) * 100));
    const threshold = 100 - sensitivity;

    if (confidence > threshold && bestMatch) {
      return {
        success: true,
        message: `Welcome, ${bestMatch.name} ✅`,
        confidence: Math.round(confidence),
        userName: bestMatch.name
      };
    } else {
      return {
        success: false,
        message: "Face Not Recognized ❌",
        confidence: Math.round(confidence)
      };
    }
  }

  async check3D(params: { isPhoto: boolean; signals: any }) {
    await new Promise(resolve => setTimeout(resolve, 600));
    const { isPhoto, signals } = params;

    if (isPhoto) {
      return {
        success: false,
        is3D: false,
        message: "2D Face Detected – Access Denied ❌",
        confidence: 5,
        score: 0.05
      };
    }

    const depthScore = signals?.depth || 0;
    const parallaxScore = signals?.parallax || 0;
    const poseScore = signals?.pose || 0;
    const blinkScore = signals?.blink || 0;
    const textureScore = signals?.texture || 0;
    const structuredLightScore = signals?.structuredLight || 0;
    const infraredScore = signals?.infrared || 0;
    const normalScore = signals?.normals || 0;

    const finalScore = (depthScore * 0.4) + (parallaxScore * 0.15) + (poseScore * 0.05) + (blinkScore * 0.05) + (textureScore * 0.05) + (structuredLightScore * 0.1) + (infraredScore * 0.1) + (normalScore * 0.1);
    const is3D = finalScore > 0.7;

    return {
      success: true,
      is3D,
      message: is3D ? "Real Face Detected (3D) ✅" : "2D Face Detected – Access Denied ❌",
      confidence: Math.round(finalScore * 100),
      score: finalScore
    };
  }
}

export const biometricService = new BiometricService();
