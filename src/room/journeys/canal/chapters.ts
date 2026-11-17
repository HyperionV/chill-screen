import type { RGB } from '../../../render/color';
import type { Chapter } from '../route';
import { ramp } from '../noise';

/** The seven chapters of the Canal Barge journey. */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Misty Morning Reach', seconds: 270 },
  { name: 'The Locks', seconds: 300 },
  { name: 'Village Market', seconds: 270 },
  { name: 'Windmill Meadows', seconds: 270 },
  { name: 'Under the Bridges', seconds: 240 },
  { name: 'Cows and Willows', seconds: 270 },
  { name: 'Harbour Town', seconds: 300 },
];

/** Horizontal cruising speed in design pixels (at 270 rows) per second. */
export const CRUISE_SPEED = 10;

/** Distance in design pixels covered by each chapter (The Locks pauses while water fills). */
export const CHAPTER_SPAN: readonly number[] = [2700, 1800, 2700, 2700, 2400, 2700, 3000];

export const CHAPTER_START: readonly number[] = CHAPTER_SPAN.reduce<number[]>((acc, _span, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + CHAPTER_SPAN[i - 1]);
  return acc;
}, []);

export const TOTAL_SPAN = CHAPTER_SPAN.reduce((sum, s) => sum + s, 0);

/** Blend window at the end of every chapter so places cross-fade seamlessly. */
const BLEND_START = 0.75;

/** Timing fractions inside The Locks (index 1, 300 s). */
export const LOCK = {
  approachEnd: 0.22,
  stopAt: 0.26,
  fillStart: 0.26,
  fillEnd: 0.56, // Visible steady rise past ?chapter=1.5
  waitEnd: 0.62,
  gateOpenStart: 0.57,
  departAt: 0.62,
  fullSpeedAt: 0.66,
  chamberCenter: 2700 + 940,
  entryGateX: 2700 + 745,
  exitGateX: 2700 + 1145,
  cottageX: 2700 + 1015,
  stoppedScroll: 2700 + 720,
} as const;

/** World X positions of the three arched stone bridges in Chapter 5 (index 4). */
export const BRIDGE_XS: readonly number[] = [
  CHAPTER_START[4] + 640,
  CHAPTER_START[4] + 1440,
  CHAPTER_START[4] + 2080,
];

/** World X positions of the foreground windmills in Windmill Meadows (Chapter 4, index 3). */
export const WINDMILL_XS: readonly number[] = [
  CHAPTER_START[3] + 680,
  CHAPTER_START[3] + 920,
  CHAPTER_START[3] + 1490,
  CHAPTER_START[3] + 1720,
];

/** World X positions of the tall narrow harbour houses in Harbour Town (Chapter 7, index 6). */
export const HARBOUR_HOUSE_SPOTS: readonly { wx: number; variant: number }[] = [
  { wx: CHAPTER_START[6] + 560, variant: 0 },
  { wx: CHAPTER_START[6] + 586, variant: 1 },
  { wx: CHAPTER_START[6] + 613, variant: 2 },
  { wx: CHAPTER_START[6] + 640, variant: 3 },
  { wx: CHAPTER_START[6] + 1090, variant: 2 },
  { wx: CHAPTER_START[6] + 1117, variant: 0 },
  { wx: CHAPTER_START[6] + 1144, variant: 3 },
  { wx: CHAPTER_START[6] + 1171, variant: 1 },
  { wx: CHAPTER_START[6] + 1570, variant: 0 },
  { wx: CHAPTER_START[6] + 1597, variant: 2 },
  { wx: CHAPTER_START[6] + 2090, variant: 1 },
  { wx: CHAPTER_START[6] + 2117, variant: 3 },
  { wx: CHAPTER_START[6] + 2144, variant: 0 },
];

export const HARBOUR_TOWER_X = CHAPTER_START[6] + 1540;

export const HARBOUR_LAMP_XS: readonly number[] = [
  CHAPTER_START[6] + 490,
  CHAPTER_START[6] + 910,
  CHAPTER_START[6] + 1320,
  CHAPTER_START[6] + 1770,
  CHAPTER_START[6] + 2210,
  CHAPTER_START[6] + 2600,
];

export const HARBOUR_BOAT_SPOTS: readonly { wx: number; kind: 0 | 1 | 2 }[] = [
  { wx: CHAPTER_START[6] + 760, kind: 0 }, // rowboat
  { wx: CHAPTER_START[6] + 950, kind: 1 }, // sailboat with furled sail
  { wx: CHAPTER_START[6] + 1360, kind: 2 }, // small fishing boat with lamp
  { wx: CHAPTER_START[6] + 1610, kind: 0 }, // rowboat
  { wx: CHAPTER_START[6] + 1800, kind: 1 }, // sailboat with furled sail
  { wx: CHAPTER_START[6] + 1935, kind: 2 }, // fishing boat with lamp
  { wx: CHAPTER_START[6] + 2360, kind: 2 }, // fishing boat with lamp
];

/** World X positions of the recurring angler in Chapters 1, 3, 6, and 7. */
export const ANGLER_SPOTS: readonly { chapter: number; wx: number; variant: 'jetty' | 'market' | 'nap' | 'harbour' }[] = [
  { chapter: 0, wx: CHAPTER_START[0] + 1540, variant: 'jetty' },
  { chapter: 2, wx: CHAPTER_START[2] + 1660, variant: 'market' },
  { chapter: 5, wx: CHAPTER_START[5] + 1740, variant: 'nap' },
  { chapter: 6, wx: CHAPTER_START[6] + 1700, variant: 'harbour' },
];

export type BankKind = 'earth' | 'brick' | 'stone' | 'wood';

export interface ChapterStyle {
  hill: RGB;
  field: RGB;
  grass: RGB;
  grassDark: RGB;
  bankEdge: RGB;
  bankKind: BankKind;
  waterTop: RGB;
  waterDeep: RGB;
  treeDensity: number;
  willowShare: number;
  reedDensity: number;
  flowerDensity: number;
  mist: number;
  /** Positive widens the water (lifts far shoreline). */
  waterLift: number;
}

export const STYLES: readonly ChapterStyle[] = [
  // 1. Misty Morning Reach
  {
    hill: [122, 146, 140],
    field: [94, 134, 96],
    grass: [88, 132, 78],
    grassDark: [62, 98, 58],
    bankEdge: [112, 96, 72],
    bankKind: 'earth',
    waterTop: [96, 144, 152],
    waterDeep: [56, 98, 114],
    treeDensity: 0.72,
    willowShare: 0.6,
    reedDensity: 0.85,
    flowerDensity: 0.25,
    mist: 0.9,
    waterLift: 0,
  },
  // 2. The Locks
  {
    hill: [116, 140, 128],
    field: [96, 138, 86],
    grass: [92, 138, 76],
    grassDark: [66, 102, 54],
    bankEdge: [132, 88, 72],
    bankKind: 'brick',
    waterTop: [82, 132, 144],
    waterDeep: [48, 88, 108],
    treeDensity: 0.42,
    willowShare: 0.2,
    reedDensity: 0.25,
    flowerDensity: 0.55,
    mist: 0.15,
    waterLift: 0,
  },
  // 3. Village Market
  {
    hill: [124, 142, 136],
    field: [104, 142, 86],
    grass: [100, 138, 82],
    grassDark: [72, 104, 60],
    bankEdge: [152, 146, 134],
    bankKind: 'stone',
    waterTop: [86, 134, 150],
    waterDeep: [50, 92, 116],
    treeDensity: 0.32,
    willowShare: 0.1,
    reedDensity: 0.12,
    flowerDensity: 0.3,
    mist: 0.05,
    waterLift: 0.005,
  },
  // 4. Windmill Meadows
  {
    hill: [132, 152, 136],
    field: [112, 154, 82],
    grass: [106, 152, 76],
    grassDark: [76, 116, 54],
    bankEdge: [122, 110, 78],
    bankKind: 'earth',
    waterTop: [88, 142, 162],
    waterDeep: [52, 96, 124],
    treeDensity: 0.2,
    willowShare: 0.15,
    reedDensity: 0.45,
    flowerDensity: 0.95,
    mist: 0.05,
    waterLift: 0,
  },
  // 5. Under the Bridges
  {
    hill: [110, 130, 126],
    field: [88, 126, 82],
    grass: [82, 122, 74],
    grassDark: [56, 88, 52],
    bankEdge: [118, 118, 108],
    bankKind: 'stone',
    waterTop: [72, 118, 132],
    waterDeep: [42, 78, 98],
    treeDensity: 0.48,
    willowShare: 0.35,
    reedDensity: 0.4,
    flowerDensity: 0.2,
    mist: 0.2,
    waterLift: -0.005,
  },
  // 6. Cows and Willows
  {
    hill: [126, 148, 126],
    field: [108, 148, 78],
    grass: [102, 144, 72],
    grassDark: [72, 108, 50],
    bankEdge: [124, 102, 72],
    bankKind: 'earth',
    waterTop: [88, 138, 148],
    waterDeep: [54, 94, 114],
    treeDensity: 0.65,
    willowShare: 0.72,
    reedDensity: 0.65,
    flowerDensity: 0.45,
    mist: 0.1,
    waterLift: 0,
  },
  // 7. Harbour Town
  {
    hill: [126, 142, 152],
    field: [104, 132, 104],
    grass: [106, 128, 98],
    grassDark: [76, 96, 74],
    bankEdge: [128, 98, 68],
    bankKind: 'wood',
    waterTop: [80, 134, 160],
    waterDeep: [44, 88, 122],
    treeDensity: 0.12,
    willowShare: 0.05,
    reedDensity: 0.04,
    flowerDensity: 0.08,
    mist: 0.08,
    waterLift: 0.052,
  },
];

/** C1-smooth travel fraction 0..1 inside The Locks so the barge halts at the chamber while water fills. */
export function lockTravel(t: number): number {
  if (t <= LOCK.approachEnd) return (t / 0.24) * 0.4;
  if (t < LOCK.stopAt) {
    const s = (t - LOCK.approachEnd) / (LOCK.stopAt - LOCK.approachEnd);
    return 0.3666667 + 0.0333333 * (1 - (1 - s) * (1 - s));
  }
  if (t <= LOCK.departAt) return 0.4;
  if (t < LOCK.fullSpeedAt) {
    const s = (t - LOCK.departAt) / (LOCK.fullSpeedAt - LOCK.departAt);
    return 0.4 + 0.0333333 * s * s;
  }
  return 0.4333333 + ((t - LOCK.fullSpeedAt) / (1 - LOCK.fullSpeedAt)) * 0.5666667;
}

/** Converts Route's (chapter index, progress t) into continuous world design-pixel scroll. */
export function canalScroll(index: number, t: number): number {
  const local = index === 1 ? lockTravel(t) : t;
  return CHAPTER_START[index] + local * CHAPTER_SPAN[index];
}

/** Smooth 0..1 water-depth factor inside The Locks: 1 = deep/low water, 0 = raised to upper canal level. */
export function lockDepthAt(index: number, t: number): number {
  if (index !== 1) return 0;
  if (t < LOCK.approachEnd) return 1 - 0.15 * (1 - ramp(0.08, LOCK.approachEnd, t));
  if (t < LOCK.fillStart) return 1;
  if (t <= LOCK.fillEnd) return 1 - ramp(LOCK.fillStart, LOCK.fillEnd, t);
  return 0;
}

/** How open the far lock gates are (0 = closed, 1 = wide open). */
export function lockGateOpenAt(index: number, t: number): number {
  if (index !== 1) return 1;
  if (t < LOCK.gateOpenStart) return 0;
  if (t < 0.72) return ramp(LOCK.gateOpenStart, 0.7, t);
  return 1;
}

/** How closed the rear entry lock gates are (0 = open, 1 = closed). */
export function lockEntryClosedAt(index: number, t: number): number {
  if (index !== 1) return 0;
  if (t < 0.18) return 0;
  if (t < 0.25) return ramp(0.18, 0.25, t);
  if (t < 0.78) return 1;
  return 1 - ramp(0.78, 0.92, t);
}

/** Shortest signed distance from `scroll` to world coordinate `wx` along the periodic canal loop. */
export function wrapDelta(wx: number, scroll: number): number {
  let d = (((wx - scroll) % TOTAL_SPAN) + TOTAL_SPAN) % TOTAL_SPAN;
  if (d > TOTAL_SPAN * 0.5) d -= TOTAL_SPAN;
  return d;
}

/** Normalizes any world coordinate into `[0, TOTAL_SPAN)`. */
export function wrapWorld(wx: number): number {
  return ((wx % TOTAL_SPAN) + TOTAL_SPAN) % TOTAL_SPAN;
}

/** Fills `out` (length 7) with the smooth blend weights for world coordinate `wx`. */
export function weightsAtWorld(wx: number, out: number[]): void {
  const x = wrapWorld(wx);
  for (let i = 0; i < CHAPTERS.length; i++) out[i] = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const start = CHAPTER_START[i];
    const span = CHAPTER_SPAN[i];
    if (x >= start && x < start + span) {
      const localT = (x - start) / span;
      const next = (i + 1) % CHAPTERS.length;
      if (localT <= BLEND_START) {
        out[i] = 1;
      } else {
        const mixT = ramp(BLEND_START, 1, localT);
        out[i] = 1 - mixT;
        out[next] = mixT;
      }
      return;
    }
  }
  out[0] = 1;
}

/** Writes the blended RGB into `out` without allocating a new array. */
export function blendRgbInto(weights: ArrayLike<number>, pick: (s: ChapterStyle) => RGB, out: RGB): void {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < STYLES.length; i++) {
    const w = weights[i];
    if (w <= 0) continue;
    const c = pick(STYLES[i]);
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
}

export function blendScalar(weights: ArrayLike<number>, pick: (s: ChapterStyle) => number): number {
  let sum = 0;
  for (let i = 0; i < STYLES.length; i++) {
    const w = weights[i];
    if (w > 0) sum += pick(STYLES[i]) * w;
  }
  return sum;
}
