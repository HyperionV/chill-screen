import type { RGB } from '../../../render/color';
import type { Chapter } from '../route';
import { ramp } from '../noise';

/** The six stretches of Jungle River (27.5 minutes in total at gentle pace). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Misty Dawn Reach', seconds: 270 },
  { name: 'Under the Canopy', seconds: 300 },
  { name: 'The Waterfall', seconds: 240 },
  { name: 'Monsoon', seconds: 270 },
  { name: 'Hidden Temple', seconds: 300 },
  { name: 'Firefly Bend', seconds: 270 },
];

/** The last 28% of each chapter blends smoothly into the next. */
const BLEND_START = 0.72;

export interface ChapterMood {
  farRidge: RGB;
  midBank: RGB;
  nearBank: RGB;
  foliageLight: RGB;
  foliageMid: RGB;
  foliageDark: RGB;
  waterTop: RGB;
  waterDeep: RGB;
  mistColor: RGB;
  mistDensity: number;
  canopyDensity: number;
  shaftStrength: number;
  rainStrength: number;
  dimness: number;
  fireflyBoost: number;
  biolumBoost: number;
  boatRock: number;
}

const MOODS: readonly ChapterMood[] = [
  // 1. Misty Dawn Reach: pale silver-jade mist, soft silhouettes, gentle light shafts
  {
    farRidge: [68, 102, 92],
    midBank: [42, 76, 62],
    nearBank: [26, 56, 40],
    foliageLight: [104, 154, 86],
    foliageMid: [62, 112, 66],
    foliageDark: [32, 68, 48],
    waterTop: [44, 86, 78],
    waterDeep: [20, 48, 46],
    mistColor: [206, 224, 214],
    mistDensity: 0.78,
    canopyDensity: 0.42,
    shaftStrength: 0.55,
    rainStrength: 0,
    dimness: 0.04,
    fireflyBoost: 0.15,
    biolumBoost: 0,
    boatRock: 0.25,
  },
  // 2. Under the Canopy: rich emerald greens, thick overhead leaves, warm dappled shafts
  {
    farRidge: [44, 84, 62],
    midBank: [32, 70, 46],
    nearBank: [22, 52, 34],
    foliageLight: [122, 176, 74],
    foliageMid: [72, 128, 56],
    foliageDark: [34, 72, 42],
    waterTop: [30, 74, 58],
    waterDeep: [16, 44, 36],
    mistColor: [182, 214, 190],
    mistDensity: 0.34,
    canopyDensity: 0.96,
    shaftStrength: 0.82,
    rainStrength: 0,
    dimness: 0.08,
    fireflyBoost: 0.05,
    biolumBoost: 0,
    boatRock: 0.28,
  },
  // 3. The Waterfall: cool misty teal, wet dark stone, bright spray, gentle swell
  {
    farRidge: [48, 86, 78],
    midBank: [34, 72, 62],
    nearBank: [24, 54, 46],
    foliageLight: [112, 168, 84],
    foliageMid: [66, 122, 68],
    foliageDark: [30, 68, 52],
    waterTop: [46, 98, 96],
    waterDeep: [20, 56, 58],
    mistColor: [208, 230, 228],
    mistDensity: 0.62,
    canopyDensity: 0.62,
    shaftStrength: 0.48,
    rainStrength: 0,
    dimness: 0.04,
    fireflyBoost: 0,
    biolumBoost: 0,
    boatRock: 0.85,
  },
  // 4. Monsoon: slate-jade storm, thick mist, heavy rain, dimmed light, choppier river
  {
    farRidge: [44, 64, 66],
    midBank: [30, 52, 48],
    nearBank: [18, 38, 34],
    foliageLight: [72, 114, 70],
    foliageMid: [44, 80, 52],
    foliageDark: [22, 48, 36],
    waterTop: [36, 64, 66],
    waterDeep: [18, 36, 40],
    mistColor: [164, 186, 190],
    mistDensity: 0.88,
    canopyDensity: 0.78,
    shaftStrength: 0.05,
    rainStrength: 1,
    dimness: 0.42,
    fireflyBoost: 0,
    biolumBoost: 0,
    boatRock: 1,
  },
  // 5. Hidden Temple: washed moss greens, golden-stone clearing after rain, soft light returns
  {
    farRidge: [54, 88, 72],
    midBank: [38, 74, 56],
    nearBank: [24, 54, 38],
    foliageLight: [118, 168, 82],
    foliageMid: [70, 118, 60],
    foliageDark: [34, 68, 44],
    waterTop: [36, 80, 68],
    waterDeep: [18, 46, 42],
    mistColor: [194, 218, 202],
    mistDensity: 0.45,
    canopyDensity: 0.66,
    shaftStrength: 0.66,
    rainStrength: 0,
    dimness: 0.05,
    fireflyBoost: 0.35,
    biolumBoost: 0.18,
    boatRock: 0.3,
  },
  // 6. Firefly Bend: deep lush dusk-green, calm water, bioluminescence and fireflies
  {
    farRidge: [26, 56, 48],
    midBank: [20, 48, 38],
    nearBank: [14, 36, 28],
    foliageLight: [68, 124, 68],
    foliageMid: [40, 84, 50],
    foliageDark: [18, 48, 34],
    waterTop: [22, 54, 50],
    waterDeep: [10, 30, 32],
    mistColor: [132, 174, 164],
    mistDensity: 0.42,
    canopyDensity: 0.72,
    shaftStrength: 0.14,
    rainStrength: 0,
    dimness: 0.28,
    fireflyBoost: 1,
    biolumBoost: 1,
    boatRock: 0.18,
  },
];

export function createMood(): ChapterMood {
  return {
    farRidge: [0, 0, 0],
    midBank: [0, 0, 0],
    nearBank: [0, 0, 0],
    foliageLight: [0, 0, 0],
    foliageMid: [0, 0, 0],
    foliageDark: [0, 0, 0],
    waterTop: [0, 0, 0],
    waterDeep: [0, 0, 0],
    mistColor: [0, 0, 0],
    mistDensity: 0,
    canopyDensity: 0,
    shaftStrength: 0,
    rainStrength: 0,
    dimness: 0,
    fireflyBoost: 0,
    biolumBoost: 0,
    boatRock: 0,
  };
}

/** Computes blending weights for all 6 chapters, cross-fading over the last 28% of a chapter. */
export function fillWeights(index: number, t: number, next: number, out: Float32Array): void {
  out.fill(0);
  const blend = ramp(BLEND_START, 1, t);
  out[index] = 1 - blend;
  out[next] += blend;
}

const mixRgbInto = (weights: Float32Array, pick: (m: ChapterMood) => RGB, dst: RGB): void => {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < MOODS.length; i++) {
    const w = weights[i];
    if (w <= 0) continue;
    const c = pick(MOODS[i]);
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
  }
  dst[0] = r;
  dst[1] = g;
  dst[2] = b;
};

const mixNum = (weights: Float32Array, pick: (m: ChapterMood) => number): number => {
  let sum = 0;
  for (let i = 0; i < MOODS.length; i++) {
    const w = weights[i];
    if (w > 0) sum += pick(MOODS[i]) * w;
  }
  return sum;
};

/** Blends the current chapter mood into `out` without allocating. */
export function blendMood(weights: Float32Array, out: ChapterMood): void {
  mixRgbInto(weights, (m) => m.farRidge, out.farRidge);
  mixRgbInto(weights, (m) => m.midBank, out.midBank);
  mixRgbInto(weights, (m) => m.nearBank, out.nearBank);
  mixRgbInto(weights, (m) => m.foliageLight, out.foliageLight);
  mixRgbInto(weights, (m) => m.foliageMid, out.foliageMid);
  mixRgbInto(weights, (m) => m.foliageDark, out.foliageDark);
  mixRgbInto(weights, (m) => m.waterTop, out.waterTop);
  mixRgbInto(weights, (m) => m.waterDeep, out.waterDeep);
  mixRgbInto(weights, (m) => m.mistColor, out.mistColor);
  out.mistDensity = mixNum(weights, (m) => m.mistDensity);
  out.canopyDensity = mixNum(weights, (m) => m.canopyDensity);
  out.shaftStrength = mixNum(weights, (m) => m.shaftStrength);
  out.rainStrength = mixNum(weights, (m) => m.rainStrength);
  out.dimness = mixNum(weights, (m) => m.dimness);
  out.fireflyBoost = mixNum(weights, (m) => m.fireflyBoost);
  out.biolumBoost = mixNum(weights, (m) => m.biolumBoost);
  out.boatRock = mixNum(weights, (m) => m.boatRock);
}
