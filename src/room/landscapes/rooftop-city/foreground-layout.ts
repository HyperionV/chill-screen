import { SCENE_SPACING } from './scenes';
import type { ScreenRect } from './skyline';

export interface PropSpot {
  wx: number;
  feetY: number;
  variant: number;
}

export interface PuddleSpot {
  wx: number;
  y: number;
  w: number;
  h: number;
  kind: 'sky' | 'neon' | 'warm' | 'billboard' | 'greenhouse';
  screenRect: ScreenRect | null;
}

export interface PuddleRipple {
  puddle: PuddleSpot;
  age: number;
}

export interface StringSpan {
  wx1: number;
  y1: number;
  wx2: number;
  y2: number;
  sag: number;
  bulbs: number;
}

export interface CableSpan {
  wx1: number;
  y1: number;
  wx2: number;
  y2: number;
  sag: number;
}

export interface LaundryLine {
  wx1: number;
  wx2: number;
  y: number;
  sag: number;
  count: number;
  seedOffset: number;
}

export const AC_SPOTS: readonly PropSpot[] = [
  { wx: -193, feetY: 239, variant: 0 },
  { wx: 214, feetY: 240, variant: 1 },
  { wx: SCENE_SPACING - 204, feetY: 238, variant: 1 },
  { wx: SCENE_SPACING + 172, feetY: 236, variant: 0 },
  { wx: SCENE_SPACING * 2 - 198, feetY: 240, variant: 1 },
  { wx: SCENE_SPACING * 2 + 184, feetY: 240, variant: 0 },
  { wx: SCENE_SPACING * 3 - 146, feetY: 238, variant: 0 },
  { wx: SCENE_SPACING * 4 - 193, feetY: 240, variant: 1 },
];

export const VENT_STACK_SPOTS: readonly PropSpot[] = [
  { wx: -221, feetY: 217, variant: 0 },
  { wx: 181, feetY: 218, variant: 1 },
  { wx: SCENE_SPACING - 184, feetY: 218, variant: 1 },
  { wx: SCENE_SPACING + 288, feetY: 214, variant: 0 },
  { wx: SCENE_SPACING * 2 + 166, feetY: 217, variant: 0 },
  { wx: SCENE_SPACING * 3 - 187, feetY: 217, variant: 1 },
  { wx: SCENE_SPACING * 3 + 292, feetY: 214, variant: 0 },
  { wx: SCENE_SPACING * 4 - 204, feetY: 218, variant: 0 },
];

export const LADDER_SPOTS: readonly PropSpot[] = [
  { wx: -150, feetY: 238, variant: 0 },
  { wx: SCENE_SPACING - 168, feetY: 236, variant: 1 },
  { wx: SCENE_SPACING * 2 + 199, feetY: 240, variant: 1 },
  { wx: SCENE_SPACING * 3 - 201, feetY: 238, variant: 0 },
  { wx: SCENE_SPACING * 4 + 106, feetY: 238, variant: 1 },
];

export const CRATE_PLANTER_SPOTS: readonly PropSpot[] = [
  { wx: -126, feetY: 240, variant: 0 },
  { wx: -96, feetY: 242, variant: 2 },
  { wx: 206, feetY: 242, variant: 1 },
  { wx: 264, feetY: 242, variant: 2 },
  { wx: SCENE_SPACING - 218, feetY: 244, variant: 1 },
  { wx: SCENE_SPACING - 140, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING + 96, feetY: 242, variant: 2 },
  { wx: SCENE_SPACING + 194, feetY: 244, variant: 1 },
  { wx: SCENE_SPACING + 264, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING * 2 - 190, feetY: 244, variant: 1 },
  { wx: SCENE_SPACING * 2 - 100, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING * 3 - 216, feetY: 242, variant: 2 },
  { wx: SCENE_SPACING * 3 - 112, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING * 3 + 94, feetY: 242, variant: 1 },
  { wx: SCENE_SPACING * 3 + 214, feetY: 244, variant: 2 },
  { wx: SCENE_SPACING * 3 + 268, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING * 4 - 212, feetY: 242, variant: 2 },
  { wx: SCENE_SPACING * 4 - 104, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING * 4 + 134, feetY: 242, variant: 1 },
  { wx: SCENE_SPACING * 4 + 192, feetY: 244, variant: 2 },
];

export const CHAIR_TABLE_SPOTS: readonly PropSpot[] = [
  { wx: 118, feetY: 242, variant: 1 },
  { wx: SCENE_SPACING - 98, feetY: 242, variant: 0 },
  { wx: SCENE_SPACING * 2 - 134, feetY: 244, variant: 0 },
  { wx: SCENE_SPACING * 2 + 104, feetY: 244, variant: 0 },
  { wx: SCENE_SPACING * 3 - 172, feetY: 244, variant: 1 },
  { wx: SCENE_SPACING * 4 - 176, feetY: 244, variant: 0 },
];

export const ANTENNA_SPOTS: readonly (PropSpot & { phase: number })[] = [
  { wx: -198, feetY: 207, variant: 0, phase: 0.2 },
  { wx: SCENE_SPACING + 199, feetY: 207, variant: 0, phase: 1.4 },
  { wx: SCENE_SPACING + 298, feetY: 204, variant: 1, phase: 2.1 },
  { wx: SCENE_SPACING * 2 + 214, feetY: 207, variant: 1, phase: 0.9 },
  { wx: SCENE_SPACING * 3 - 102, feetY: 204, variant: 1, phase: 2.8 },
  { wx: SCENE_SPACING * 3 + 302, feetY: 204, variant: 0, phase: 1.7 },
  { wx: SCENE_SPACING * 4 + 204, feetY: 207, variant: 0, phase: 0.5 },
];

export const DRAIN_XS: readonly number[] = [
  -188,
  152,
  SCENE_SPACING - 122,
  SCENE_SPACING + 148,
  SCENE_SPACING * 2 - 154,
  SCENE_SPACING * 3 + 150,
  SCENE_SPACING * 4 - 128,
];

export const REAR_PIER_XS: readonly number[] = [
  -224,
  226,
  SCENE_SPACING - 156,
  SCENE_SPACING + 156,
  SCENE_SPACING * 2 - 246,
  SCENE_SPACING * 2 + 246,
  SCENE_SPACING * 3 - 246,
  SCENE_SPACING * 3 + 246,
  SCENE_SPACING * 4 - 246,
  SCENE_SPACING * 4 + 246,
];

export const FRONT_PIER_XS: readonly number[] = [
  -232,
  280,
  SCENE_SPACING - 232,
  SCENE_SPACING + 238,
  SCENE_SPACING * 2 + 233,
  SCENE_SPACING * 3 - 236,
  SCENE_SPACING * 4 + 234,
  840,
  1400,
  1960,
  2520,
];

export const SCENE_STRING_SPANS: readonly StringSpan[] = [
  { wx1: -226, y1: 186, wx2: -146, y2: 192, sag: 6, bulbs: 7 },
  { wx1: 76, y1: 158, wx2: 228, y2: 192, sag: 8, bulbs: 10 },
  { wx1: SCENE_SPACING - 226, y1: 194, wx2: SCENE_SPACING - 148, y2: 198, sag: 5, bulbs: 6 },
  { wx1: SCENE_SPACING + 148, y1: 198, wx2: SCENE_SPACING + 226, y2: 192, sag: 5, bulbs: 6 },
  { wx1: SCENE_SPACING * 3 + 96, y1: 178, wx2: SCENE_SPACING * 3 + 220, y2: 182, sag: 7, bulbs: 8 },
  { wx1: SCENE_SPACING * 4 - 222, y1: 176, wx2: SCENE_SPACING * 4 - 96, y2: 182, sag: 7, bulbs: 8 },
  { wx1: SCENE_SPACING * 4 + 102, y1: 182, wx2: SCENE_SPACING * 4 + 218, y2: 180, sag: 6, bulbs: 7 },
];

export const CABLE_SPANS: readonly CableSpan[] = [
  { wx1: -198, y1: 178, wx2: -172, y2: 162, sag: 7 },
  { wx1: -193, y1: 222, wx2: -221, y2: 204, sag: 4 },
  { wx1: SCENE_SPACING - 224, y1: 196, wx2: SCENE_SPACING - 156, y2: 192, sag: 5 },
  { wx1: SCENE_SPACING + 156, y1: 192, wx2: SCENE_SPACING + 199, y2: 178, sag: 6 },
  { wx1: SCENE_SPACING * 2 - 234, y1: 194, wx2: SCENE_SPACING * 2 - 192, y2: 142, sag: 8 },
  { wx1: SCENE_SPACING * 2 + 216, y1: 146, wx2: SCENE_SPACING * 2 + 214, y2: 180, sag: 5 },
  { wx1: SCENE_SPACING * 3 - 146, y1: 222, wx2: SCENE_SPACING * 3 - 102, y2: 184, sag: 6 },
  { wx1: SCENE_SPACING * 3 - 102, y1: 184, wx2: SCENE_SPACING * 3 - 106, y2: 136, sag: 5 },
  { wx1: SCENE_SPACING * 4 + 171, y1: 194, wx2: SCENE_SPACING * 4 + 204, y2: 178, sag: 4 },
];

export const SECONDARY_LAUNDRY: readonly LaundryLine[] = [
  { wx1: SCENE_SPACING + 148, wx2: SCENE_SPACING + 205, y: 181, sag: 4, count: 3, seedOffset: 0 },
  { wx1: SCENE_SPACING * 2 + 150, wx2: SCENE_SPACING * 2 + 207, y: 178, sag: 4, count: 3, seedOffset: 1 },
  { wx1: SCENE_SPACING * 3 + 187, wx2: SCENE_SPACING * 3 + 227, y: 182, sag: 3, count: 2, seedOffset: 2 },
  { wx1: SCENE_SPACING * 4 + 178, wx2: SCENE_SPACING * 4 + 223, y: 182, sag: 3, count: 2, seedOffset: 0 },
];

export function createInitialPuddles(): PuddleSpot[] {
  return [
    { wx: -165, y: 230, w: 30, h: 8, kind: 'sky', screenRect: null },
    { wx: 151, y: 232, w: 34, h: 9, kind: 'warm', screenRect: null },
    { wx: SCENE_SPACING - 132, y: 234, w: 30, h: 9, kind: 'warm', screenRect: null },
    { wx: SCENE_SPACING + 126, y: 230, w: 30, h: 8, kind: 'sky', screenRect: null },
    { wx: SCENE_SPACING * 2 - 168, y: 230, w: 32, h: 8, kind: 'neon', screenRect: null },
    { wx: SCENE_SPACING * 2 + 162, y: 231, w: 26, h: 7, kind: 'warm', screenRect: null },
    { wx: SCENE_SPACING * 3 - 106, y: 226, w: 30, h: 8, kind: 'billboard', screenRect: null },
    { wx: SCENE_SPACING * 3 + 128, y: 230, w: 24, h: 7, kind: 'sky', screenRect: null },
    { wx: SCENE_SPACING * 4 - 144, y: 226, w: 32, h: 8, kind: 'sky', screenRect: null },
    { wx: SCENE_SPACING * 4 + 162, y: 231, w: 28, h: 7, kind: 'greenhouse', screenRect: null },
  ];
}
