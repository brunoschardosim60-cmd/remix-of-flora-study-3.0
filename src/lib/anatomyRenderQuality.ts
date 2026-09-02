export type AnatomyRenderTier = "economy" | "balanced" | "ultra";

export interface AnatomyDeviceProfile {
  width: number;
  devicePixelRatio: number;
  memoryGb?: number;
  logicalCores?: number;
  reducedMotion?: boolean;
}

export interface AnatomyRenderPolicy {
  tier: AnatomyRenderTier;
  textureResolution: 128 | 256 | 512;
  maxDpr: number;
  shadowMapSize: 512 | 1024 | 2048;
  environmentResolution: 64 | 128;
  contactShadowFrames: number;
}

const policies: Record<AnatomyRenderTier, AnatomyRenderPolicy> = {
  economy: {
    tier: "economy",
    textureResolution: 128,
    maxDpr: 1.1,
    shadowMapSize: 512,
    environmentResolution: 64,
    contactShadowFrames: 1,
  },
  balanced: {
    tier: "balanced",
    textureResolution: 256,
    maxDpr: 1.45,
    shadowMapSize: 1024,
    environmentResolution: 64,
    contactShadowFrames: 2,
  },
  ultra: {
    tier: "ultra",
    textureResolution: 512,
    maxDpr: 1.8,
    shadowMapSize: 2048,
    environmentResolution: 128,
    contactShadowFrames: Number.POSITIVE_INFINITY,
  },
};

export function selectAnatomyRenderPolicy(profile: AnatomyDeviceProfile): AnatomyRenderPolicy {
  const constrainedMemory = profile.memoryGb !== undefined && profile.memoryGb <= 4;
  const constrainedCpu = profile.logicalCores !== undefined && profile.logicalCores <= 4;
  if (profile.width <= 520 || constrainedMemory || (profile.width <= 820 && constrainedCpu)) return policies.economy;
  if (profile.width <= 1100 || constrainedCpu || profile.reducedMotion) return policies.balanced;
  return policies.ultra;
}

export function detectAnatomyRenderPolicy(): AnatomyRenderPolicy {
  if (typeof window === "undefined") return policies.balanced;
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return selectAnatomyRenderPolicy({
    width: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio || 1,
    memoryGb: navigatorWithMemory.deviceMemory,
    logicalCores: navigator.hardwareConcurrency,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  });
}
