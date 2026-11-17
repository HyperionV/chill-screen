import type { RGB } from '../../../render/color';
import { clamp } from '../../../world/math';
import { fbm, hash, noise } from '../../journeys/noise';
import type { Chapter } from '../../journeys/route';

/** Five scenes of Alpine Peak, 3.5 minutes each (17.5 minute loop). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Summit Sunrise', seconds: 210 },
  { name: 'Glacier Valley', seconds: 210 },
  { name: 'Ridge Walk', seconds: 210 },
  { name: 'Cable Car Col', seconds: 210 },
  { name: 'Starry Col', seconds: 210 },
];

/** Duration of the smooth cross-dissolve between scenes, in seconds. */
export const TRANSITION_SECONDS = 10;

/** Horizon line shared with SkyDome so sun/moon arcs sit naturally behind the high ridges. */
export const SKY_HORIZON = 0.62;

export interface AlpinePalette {
  snowLit: RGB;
  snowShade: RGB;
  snowDeep: RGB;
  rockLit: RGB;
  rockMid: RGB;
  rockDark: RGB;
  rockCrack: RGB;
  iceLit: RGB;
  iceMid: RGB;
  iceDeep: RGB;
  crevasse: RGB;
  streamLit: RGB;
  streamDeep: RGB;
  alpenglowOrange: RGB;
  alpenglowPink: RGB;
  alpenglowShadow: RGB;
  alpenglowDeep: RGB;
  cloudLit: RGB;
  cloudShade: RGB;
  pineValley: RGB;
}

/** Shared palette tones for alpine rock, snow, glacier ice, and rich alpenglow. */
export const ALPINE_COLORS: AlpinePalette = {
  snowLit: [244, 248, 255],
  snowShade: [168, 192, 224],
  snowDeep: [118, 146, 188],
  rockLit: [132, 138, 154],
  rockMid: [86, 94, 114],
  rockDark: [48, 54, 72],
  rockCrack: [26, 30, 44],
  iceLit: [158, 222, 242],
  iceMid: [96, 174, 212],
  iceDeep: [48, 108, 156],
  crevasse: [24, 58, 98],
  streamLit: [134, 214, 232],
  streamDeep: [56, 134, 172],
  alpenglowOrange: [255, 138, 94],
  alpenglowPink: [255, 160, 142],
  alpenglowShadow: [58, 68, 132],
  alpenglowDeep: [36, 42, 96],
  cloudLit: [246, 248, 255],
  cloudShade: [176, 194, 222],
  pineValley: [38, 66, 62],
};

/** Cableway endpoints and catenary sag in normalized stage coordinates (Scene 4). */
export const CABLE_SPAN = {
  u0: 0.09,
  v0: 0.545,
  u1: 0.75,
  v1: 0.605,
  sag: 0.026,
};

/** Key landmark positions in normalized stage coordinates (u: 0..1, v: 0..1). */
export const SCENE_ANCHORS = {
  summitPole: { u: 0.225, v: 0.25 },
  summitClimber: { u: 0.205, v: 0.25 },
  buntingEnd: { u: 0.305, v: 0.45 },
  glacierHut: { u: 0.785, v: 0.665 },
  glacierStreamSnout: { u: 0.325, v: 0.74 },
  ridgeClimberMinU: 0.165,
  ridgeClimberMaxU: 0.315,
  cableStation: { u: 0.815, v: 0.635 },
  cafeTerrace: { u: 0.695, v: 0.695 },
  starryHut: { u: 0.77, v: 0.685 },
  starryTent: { u: 0.215, v: 0.725 },
};

/** Smooth hermite pulse for sunrise (5.5..7.5) and sunset (17.0..19.5) alpenglow. */
export function alpenglowStrength(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  const bell = (a: number, peakA: number, peakB: number, b: number): number => {
    if (h <= a || h >= b) return 0;
    if (h < peakA) {
      const t = (h - a) / (peakA - a);
      return t * t * (3 - 2 * t);
    }
    if (h > peakB) {
      const t = 1 - (h - peakB) / (b - peakB);
      return t * t * (3 - 2 * t);
    }
    return 1;
  };
  return Math.max(bell(5.1, 5.7, 6.9, 7.8), bell(16.7, 17.5, 18.8, 19.8));
}

/** Sharp asymmetric triangular alpine peak (0 outside base, `height` at apex). */
function triPeak(u: number, center: number, width: number, height: number, skew = 0): number {
  const wSide = u < center ? width * (1 - skew) : width * (1 + skew);
  const d = Math.abs(u - center) / Math.max(0.01, wSide);
  if (d >= 1) return 0;
  return Math.pow(1 - d, 1.12) * height;
}

/** Stepped jagged rock-tooth noise along a ridge so crests read as serrated crags. */
function ridgeCrag(u: number, seed: number, amp: number): number {
  const stepA = Math.floor(u * 135) / 135;
  const stepB = Math.floor(u * 290) / 290;
  const tooth = (hash(Math.floor(u * 160) + seed * 37) - 0.5) * 0.55;
  const ledge = (fbm(stepA * 22 + seed * 5.3) - 0.5) * 0.85;
  const fine = (hash(Math.floor(stepB * 300) + seed * 71) - 0.5) * 0.35;
  return (tooth + ledge + fine) * amp;
}

/** Furthest hazy alpine range (lightest blue haze), with distant peaks poking above the cloud sea. */
export function far1RidgeY(scene: number, u: number): number {
  const crag = ridgeCrag(u, scene * 3 + 11, 0.022);
  let base = 0.62;
  switch (scene) {
    case 0:
      base =
        0.65 -
        triPeak(u, 0.08, 0.14, 0.22, -0.15) -
        triPeak(u, 0.39, 0.11, 0.13, 0.2) -
        triPeak(u, 0.54, 0.13, 0.15, -0.12) -
        triPeak(u, 0.68, 0.12, 0.14, 0.15) -
        triPeak(u, 0.92, 0.15, 0.22, 0.1);
      break;
    case 1:
      base =
        0.60 -
        triPeak(u, 0.14, 0.16, 0.22, -0.1) -
        triPeak(u, 0.37, 0.11, 0.13, 0.15) -
        triPeak(u, 0.52, 0.12, 0.14, -0.15) -
        triPeak(u, 0.66, 0.11, 0.13, 0.1) -
        triPeak(u, 0.88, 0.16, 0.23, 0.12);
      break;
    case 2:
      base =
        0.62 -
        triPeak(u, 0.09, 0.14, 0.22, -0.1) -
        triPeak(u, 0.41, 0.12, 0.14, 0.18) -
        triPeak(u, 0.57, 0.13, 0.16, -0.18) -
        triPeak(u, 0.74, 0.13, 0.17, 0.1) -
        triPeak(u, 0.94, 0.14, 0.20, 0.12);
      break;
    case 3:
      base =
        0.63 -
        triPeak(u, 0.16, 0.16, 0.17, -0.1) -
        triPeak(u, 0.45, 0.14, 0.11, 0.1) -
        triPeak(u, 0.72, 0.16, 0.16, 0.15);
      break;
    default:
      base =
        0.61 -
        triPeak(u, 0.10, 0.16, 0.22, -0.12) -
        triPeak(u, 0.34, 0.11, 0.09, 0.15) -
        triPeak(u, 0.66, 0.12, 0.10, -0.12) -
        triPeak(u, 0.90, 0.16, 0.22, 0.14);
      break;
  }
  return clamp(base + crag, 0.28, 0.74);
}

/** Second hazy alpine range (darker blue-slate haze than far1), poking out of the cloud sea. */
export function far2RidgeY(scene: number, u: number): number {
  const crag = ridgeCrag(u, scene * 5 + 29, 0.025);
  let base = 0.66;
  switch (scene) {
    case 0:
      base =
        0.68 -
        triPeak(u, 0.14, 0.14, 0.19, 0.12) -
        triPeak(u, 0.46, 0.11, 0.12, -0.16) -
        triPeak(u, 0.61, 0.11, 0.13, 0.18) -
        triPeak(u, 0.86, 0.15, 0.20, -0.12);
      break;
    case 1:
      base =
        0.63 -
        triPeak(u, 0.24, 0.14, 0.16, -0.12) -
        triPeak(u, 0.44, 0.11, 0.11, 0.12) -
        triPeak(u, 0.59, 0.12, 0.12, -0.14) -
        triPeak(u, 0.77, 0.14, 0.18, 0.12);
      break;
    case 2:
      base =
        0.64 -
        triPeak(u, 0.18, 0.14, 0.17, 0.12) -
        triPeak(u, 0.49, 0.12, 0.11, -0.14) -
        triPeak(u, 0.65, 0.11, 0.13, 0.16) -
        triPeak(u, 0.88, 0.15, 0.19, -0.1);
      break;
    case 3:
      base =
        0.66 -
        triPeak(u, 0.26, 0.15, 0.14, 0.1) -
        triPeak(u, 0.58, 0.14, 0.11, -0.12) -
        triPeak(u, 0.84, 0.15, 0.17, -0.1);
      break;
    default:
      base =
        0.64 -
        triPeak(u, 0.20, 0.15, 0.18, 0.12) -
        triPeak(u, 0.50, 0.14, 0.06, 0) -
        triPeak(u, 0.80, 0.15, 0.18, -0.12);
      break;
  }
  return clamp(base + crag, 0.34, 0.76);
}

/** Macro elevation of the mid-far rocky/snowy range (without fine teeth) for facet shading. */
export function midMacroY(scene: number, u: number): number {
  switch (scene) {
    case 0:
      return 0.69 - triPeak(u, 0.04, 0.12, 0.18, 0.2) - triPeak(u, 0.85, 0.17, 0.25, -0.18);
    case 1:
      return 0.65 - triPeak(u, 0.13, 0.17, 0.23, 0.1) - triPeak(u, 0.87, 0.17, 0.24, -0.1);
    case 2:
      return 0.65 - triPeak(u, 0.11, 0.16, 0.20, 0.15) - triPeak(u, 0.90, 0.16, 0.21, -0.15);
    case 3:
      return 0.69 - triPeak(u, 0.12, 0.14, 0.15, 0.15) - triPeak(u, 0.88, 0.17, 0.22, -0.15);
    default:
      return 0.66 - triPeak(u, 0.14, 0.17, 0.23, 0.15) - triPeak(u, 0.86, 0.17, 0.23, -0.15);
  }
}

/** Normalized vertical height (0..1) of the mid-far rocky/snowy range. */
export function midRidgeY(scene: number, u: number): number {
  return clamp(midMacroY(scene, u) + ridgeCrag(u, scene * 7 + 43, 0.026), 0.32, 0.78);
}

/** Smooth macro silhouette of the main mountain ridge (used to determine sunlit vs shaded facets cleanly). */
export function macroTerrainY(scene: number, u: number): number {
  switch (scene) {
    case 0: {
      // Summit Sunrise: Matterhorn-style sharp spire on left, deep cloud-filled valley in center, rocky horn on right.
      const spire = triPeak(u, 0.215, 0.175, 0.47, 0.18);
      const subTooth = triPeak(u, 0.075, 0.10, 0.21, -0.12);
      const rightHorn = triPeak(u, 0.795, 0.16, 0.24, -0.18);
      const rightShoulder = triPeak(u, 0.94, 0.12, 0.19, 0.1);
      return clamp(0.73 - spire - subTooth - rightHorn - rightShoulder, 0.245, 0.745);
    }
    case 1: {
      // Glacier Valley: jagged left and right cirque walls framing an open central glacial col.
      const leftSpireA = triPeak(u, 0.06, 0.14, 0.34, 0.22);
      const leftSpireB = triPeak(u, 0.21, 0.13, 0.24, 0.12);
      const rightSpireA = triPeak(u, 0.89, 0.15, 0.32, -0.2);
      const rightShoulder = triPeak(u, 0.75, 0.13, 0.13, -0.15);
      return clamp(0.64 - leftSpireA - leftSpireB - rightSpireA - rightShoulder, 0.29, 0.67);
    }
    case 2: {
      // Ridge Walk: sharp granite pinnacle left, knife-edge arête across center, steep Matterhorn buttress right.
      const leftPinnacle = triPeak(u, 0.055, 0.12, 0.25, 0.2);
      const walkCrest = triPeak(u, 0.24, 0.21, 0.095, 0.12);
      const rightButtress = triPeak(u, 0.825, 0.17, 0.255, -0.22);
      const rightWing = triPeak(u, 0.96, 0.10, 0.16, 0.1);
      return clamp(0.655 - leftPinnacle - walkCrest - rightButtress - rightWing, 0.37, 0.68);
    }
    case 3: {
      // Cable Car Col: left pylon spur, deep pine valley, jagged right station peak.
      const leftSpur = triPeak(u, 0.07, 0.13, 0.165, 0.18);
      const rightBluff = triPeak(u, 0.85, 0.20, 0.16, -0.15);
      return clamp(0.71 - leftSpur - rightBluff, 0.49, 0.75);
    }
    default: {
      // Starry Col: jagged twin granite peaks framing a broad starry col in the center.
      const leftPeak = triPeak(u, 0.10, 0.17, 0.29, 0.18);
      const rightPeak = triPeak(u, 0.90, 0.17, 0.28, -0.18);
      return clamp(0.675 - leftPeak - rightPeak, 0.34, 0.71);
    }
  }
}

/**
 * Normalized vertical height (0..1) of the main mountain/ridge silhouette with stepped jagged crags.
 * Keeps the central clock band (u 0.32..0.68, v 0.30..0.56) open and readable.
 */
export function sceneTerrainY(scene: number, u: number): number {
  const macro = macroTerrainY(scene, u);
  // Keep climber & pole footholds steadier while keeping peaks and shoulders aggressively craggy.
  let cragAmp = 0.022;
  if (scene === 0 && u > 0.195 && u < 0.235) cragAmp = 0.008;
  else if (scene === 2 && u > 0.155 && u < 0.33) cragAmp = 0.011;
  else if (scene === 4 && u > 0.20 && u < 0.80) cragAmp = 0.010;
  return clamp(macro + ridgeCrag(u, scene * 11 + 7, cragAmp), 0.22, 0.78);
}

/** Normalized bounds of the glacier tongue in Scene 2 (Glacier Valley). */
export function glacierProfile(u: number): { topV: number; botV: number } {
  const t = clamp((0.86 - u) / 0.78, 0, 1);
  const center = 0.625 + t * 0.205 + Math.sin(t * Math.PI * 1.4) * 0.018;
  const halfWidth = 0.032 + t * 0.048 + (noise(u * 12 + 4) - 0.5) * 0.012;
  return { topV: center - halfWidth, botV: center + halfWidth };
}

/** Normalized vertical height of the cloud sea surface (layer 0 = distant valley, layer 1 = foreground mist). */
export function cloudSeaBaseY(scene: number, layer: 0 | 1 = 0): number {
  switch (scene) {
    case 0:
      return layer === 0 ? 0.625 : 0.675;
    case 1:
      return layer === 0 ? 0.585 : 0.755;
    case 2:
      return layer === 0 ? 0.595 : 0.695;
    case 3:
      return layer === 0 ? 0.68 : 0.755;
    default:
      return layer === 0 ? 0.67 : 0.77;
  }
}

/** Catenary cable vertical coordinate (0..1) at normalized horizontal u in Cable Car Col. */
export function cableYAt(u: number): number {
  const t = clamp((u - CABLE_SPAN.u0) / (CABLE_SPAN.u1 - CABLE_SPAN.u0), 0, 1);
  const line = CABLE_SPAN.v0 + (CABLE_SPAN.v1 - CABLE_SPAN.v0) * t;
  return line + Math.sin(Math.PI * t) * CABLE_SPAN.sag;
}

/** Downhill horizontal direction (-1, 0, +1) from the local slope gradient at u. */
export function slopeDirection(scene: number, u: number): number {
  const eps = 0.01;
  const yL = macroTerrainY(scene, clamp(u - eps, 0, 1));
  const yR = macroTerrainY(scene, clamp(u + eps, 0, 1));
  const diff = yR - yL;
  if (Math.abs(diff) < 0.002) return u < 0.5 ? 1 : -1;
  return diff > 0 ? 1 : -1;
}

/** True when a clicked normalized point (u, v) falls on a snow slope or cornice able to shed snow dust. */
export function isSnowSurface(scene: number, u: number, v: number): boolean {
  const ridge = sceneTerrainY(scene, u);
  const far = Math.min(far1RidgeY(scene, u), far2RidgeY(scene, u));
  const cloud = cloudSeaBaseY(scene, 1);
  if (v < Math.min(ridge, far) - 0.03) return false;
  if (v > cloud + 0.08 && v < 0.78 && scene !== 1 && scene !== 4) return false;
  return v >= ridge - 0.025 || v >= far - 0.015;
}
