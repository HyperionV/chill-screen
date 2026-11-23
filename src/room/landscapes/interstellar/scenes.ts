import type { RGB } from '../../../render/color';
import { ramp } from '../../journeys/noise';
import type { Chapter } from '../../journeys/route';

/** Each chapter holds its scene for three and a half minutes at normal speed. */
const CHAPTER_SECONDS = 210;

/** Zero-based index of the first chapter in The Long Way Home. */
export const FIRST_DEEP_CHAPTER = 5;

/** Ten scenes of the Interstellar landscape (35 minutes total loop at speed 1). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Ringed Giant', seconds: CHAPTER_SECONDS },
  { name: 'Nebula Nursery', seconds: CHAPTER_SECONDS },
  { name: 'Asteroid Garden', seconds: CHAPTER_SECONDS },
  { name: 'Ice Moon and Station', seconds: CHAPTER_SECONDS },
  { name: 'Binary Sun', seconds: CHAPTER_SECONDS },
  { name: 'Gargantua', seconds: CHAPTER_SECONDS },
  { name: 'Blue Horizon', seconds: CHAPTER_SECONDS },
  { name: 'Giant and Galaxy', seconds: CHAPTER_SECONDS },
  { name: 'Golden Heart', seconds: CHAPTER_SECONDS },
  { name: 'Two Galaxies', seconds: CHAPTER_SECONDS },
];

/** Cross-dissolve over the final 10.5 seconds of each 210-second chapter. */
const TRANSITION_START = 0.95;

export interface SceneStyle {
  spaceTop: RGB;
  spaceBottom: RGB;
  hazeA: RGB;
  hazeB: RGB;
  tint: RGB;
  mean: number;
  night: number;
  /** Normalized star light position when a scene has a prominent nearby sun. */
  sunStrength: number;
  sunU: number;
  sunV: number;
  sunColor: RGB;
}

export const SCENE_STYLES: readonly SceneStyle[] = [
  // 1. Ringed Giant: deep midnight indigo with warm amber-slate planetary glow
  {
    spaceTop: [6, 8, 22],
    spaceBottom: [14, 18, 42],
    hazeA: [36, 44, 78],
    hazeB: [84, 68, 56],
    tint: [38, 48, 86],
    mean: 0.08,
    night: 1,
    sunStrength: 0,
    sunU: 0.2,
    sunV: 0.2,
    sunColor: [255, 220, 170],
  },
  // 2. Nebula Nursery: rich cosmic plum-violet and luminous teal dust clouds
  {
    spaceTop: [10, 7, 26],
    spaceBottom: [16, 22, 46],
    hazeA: [88, 38, 108],
    hazeB: [28, 114, 126],
    tint: [64, 58, 108],
    mean: 0.12,
    night: 0.98,
    sunStrength: 0,
    sunU: 0.25,
    sunV: 0.25,
    sunColor: [180, 232, 244],
  },
  // 3. Asteroid Garden: cool graphite space with dusty ochre and beacon amber
  {
    spaceTop: [7, 9, 18],
    spaceBottom: [16, 18, 30],
    hazeA: [42, 46, 62],
    hazeB: [76, 62, 48],
    tint: [44, 48, 66],
    mean: 0.075,
    night: 1,
    sunStrength: 0,
    sunU: 0.15,
    sunV: 0.2,
    sunColor: [255, 200, 130],
  },
  // 4. Ice Moon and Station: glacial cyan-blue and crisp steel highlights
  {
    spaceTop: [5, 10, 24],
    spaceBottom: [12, 24, 48],
    hazeA: [32, 68, 104],
    hazeB: [88, 138, 168],
    tint: [46, 78, 116],
    mean: 0.1,
    night: 0.98,
    sunStrength: 0,
    sunU: 0.2,
    sunV: 0.25,
    sunColor: [200, 232, 255],
  },
  // 5. Binary Sun: deep velvet darks lit by warm orange-gold and hot blue starlight
  {
    spaceTop: [12, 10, 24],
    spaceBottom: [24, 18, 36],
    hazeA: [126, 68, 42],
    hazeB: [48, 86, 152],
    tint: [96, 78, 92],
    mean: 0.15,
    night: 0.94,
    sunStrength: 0.52,
    sunU: 0.18,
    sunV: 0.2,
    sunColor: [255, 194, 128],
  },
  // 6. Gargantua: a warm disc against dark space
  {
    spaceTop: [3, 4, 10],
    spaceBottom: [8, 8, 16],
    hazeA: [112, 64, 34],
    hazeB: [30, 48, 92],
    tint: [86, 62, 50],
    mean: 0.09,
    night: 0.97,
    sunStrength: 0.3,
    sunU: 0.76,
    sunV: 0.3,
    sunColor: [255, 190, 120],
  },
  // 7. Blue Horizon: blue and violet light at the edge
  {
    spaceTop: [4, 6, 22],
    spaceBottom: [8, 10, 32],
    hazeA: [40, 64, 170],
    hazeB: [96, 60, 150],
    tint: [48, 60, 128],
    mean: 0.1,
    night: 0.98,
    sunStrength: 0.25,
    sunU: 0.72,
    sunV: 0.38,
    sunColor: [150, 180, 255],
  },
  // 8. Giant and Galaxy: cool space with a faint pink glow
  {
    spaceTop: [4, 8, 22],
    spaceBottom: [10, 18, 40],
    hazeA: [44, 70, 128],
    hazeB: [110, 84, 120],
    tint: [52, 72, 118],
    mean: 0.1,
    night: 0.98,
    sunStrength: 0.18,
    sunU: 0.7,
    sunV: 0.3,
    sunColor: [230, 210, 255],
  },
  // 9. Golden Heart: an amber glow from the galaxy's centre
  {
    spaceTop: [10, 7, 12],
    spaceBottom: [26, 16, 14],
    hazeA: [150, 92, 40],
    hazeB: [70, 70, 120],
    tint: [110, 82, 60],
    mean: 0.16,
    night: 0.93,
    sunStrength: 0.5,
    sunU: 0.5,
    sunV: 0.45,
    sunColor: [255, 200, 130],
  },
  // 10. Two Galaxies: pale gold and blue haze around the two spirals
  {
    spaceTop: [4, 5, 12],
    spaceBottom: [12, 12, 24],
    hazeA: [120, 92, 52],
    hazeB: [60, 74, 120],
    tint: [84, 76, 80],
    mean: 0.11,
    night: 0.97,
    sunStrength: 0.2,
    sunU: 0.4,
    sunV: 0.4,
    sunColor: [255, 214, 160],
  },
];

export function createSceneStyle(): SceneStyle {
  return {
    spaceTop: [0, 0, 0],
    spaceBottom: [0, 0, 0],
    hazeA: [0, 0, 0],
    hazeB: [0, 0, 0],
    tint: [0, 0, 0],
    mean: 0.1,
    night: 1,
    sunStrength: 0,
    sunU: 0.2,
    sunV: 0.2,
    sunColor: [255, 220, 180],
  };
}

/** Fills normalized weights across the ten scenes, cross-dissolving over the final 10.5 seconds. */
export function fillSceneWeights(index: number, t: number, next: number, out: Float32Array): void {
  out.fill(0);
  const blend = ramp(TRANSITION_START, 1, t);
  out[index] = 1 - blend;
  out[next] += blend;
}

function mixRgb(weights: Float32Array, pick: (s: SceneStyle) => RGB, dst: RGB): void {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < SCENE_STYLES.length; i++) {
    const w = weights[i];
    if (w <= 0) continue;
    const c = pick(SCENE_STYLES[i]);
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
  }
  dst[0] = r;
  dst[1] = g;
  dst[2] = b;
}

function mixScalar(weights: Float32Array, pick: (s: SceneStyle) => number): number {
  let sum = 0;
  for (let i = 0; i < SCENE_STYLES.length; i++) {
    const w = weights[i];
    if (w > 0) sum += pick(SCENE_STYLES[i]) * w;
  }
  return sum;
}

/** Blends current scene palette and light metadata into `out` without per-frame allocations. */
export function blendSceneStyle(weights: Float32Array, out: SceneStyle): void {
  mixRgb(weights, (s) => s.spaceTop, out.spaceTop);
  mixRgb(weights, (s) => s.spaceBottom, out.spaceBottom);
  mixRgb(weights, (s) => s.hazeA, out.hazeA);
  mixRgb(weights, (s) => s.hazeB, out.hazeB);
  mixRgb(weights, (s) => s.tint, out.tint);
  mixRgb(weights, (s) => s.sunColor, out.sunColor);
  out.mean = mixScalar(weights, (s) => s.mean);
  out.night = mixScalar(weights, (s) => s.night);
  out.sunStrength = mixScalar(weights, (s) => s.sunStrength);
  out.sunU = mixScalar(weights, (s) => s.sunU);
  out.sunV = mixScalar(weights, (s) => s.sunV);
}
