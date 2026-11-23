/**
 * Where everything in the Hidden Hollow stands, the twilight colours it is painted in, and the plan for the cast
 * and the clues. Pure arithmetic on the design width; every painter and light of the scene reads from here.
 */
import type { PinePalette } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, Point, ScenePlan } from '../../gravity-falls/types';
import { noise } from '../../journeys/noise';

/** Misty lilac the far hills and trees sink into. */
export const HAZE = '#aaa4d6';
/** Soil of the hillside bank, lit from the left. */
export const EARTH = { base: '#6a5a86', light: '#8a78a8', dark: '#463a62' } as const;
/** Twilight lawn: violet-blue, readable by day and calm at night. */
export const GROUND = { base: '#56689e', dark: '#3e4a82', light: '#7b8cc4' } as const;
export const STONE = { base: '#948fbc', light: '#c6c2e6', dark: '#4e4a78' } as const;
export const ROOT = { base: '#4a3552', light: '#7a5a78', dark: '#2c2038' } as const;
export const MOSS = '#5f9a82';
/** Dark indigo pines with a violet lit edge. */
export const PINE_TWILIGHT: PinePalette = { dark: '#1f2250', mid: '#343a78', light: '#6670b4', trunk: '#4a3552', trunkShade: '#2c2038' };
export const GOLD = '#ffd36a';
export const TEAL = '#8ff0e0';
export const WARM = '#ffcf6e';

/** The round door in the hillside is this many pixels in radius; the clue and the mystery board's door draw at the same size. */
export const DOOR_RADIUS = 10;
/** Row of the lawn behind the clearing, and of the top of the highest part of the hillside bank. */
export const GROUND_TOP = 196;
export const MOUND_PEAK = 164;
/** Row where the foot of the hillside bank meets the lawn in front of it. */
export const MOUND_FOOT = 222;
const MOUND_EDGE_SHARE = 0.4;
const DOOR_SHARE = 0.185;
const DOOR_ROW = 204;
const BUMP = 3;

export interface StoneSpec {
  /** Centre column. */
  x: number;
  w: number;
  h: number;
  /** Row of the foot. */
  base: number;
  /** How many runes are carved into it. */
  runes: number;
  seed: number;
}

export interface HiddenLayout {
  width: number;
  /** Centre of the round hidden door. */
  door: Point;
  /** Column where the hillside bank ends and the flat lawn begins. */
  edge: number;
  stones: readonly StoneSpec[];
  /** Foot of the old iron lamp beside the door. */
  lantern: Point;
  /** Foot of the little signpost. */
  sign: Point;
  /** Bottom-centre of the berry bush. */
  bush: Point;
  /** Bottom-centre of the stump with the burrow under it. */
  stump: Point;
  /** Far down in the valley: the lake, the shack and its one lit window. */
  lake: Point;
  shack: Point;
  /** Where the little owl sits (its feet). */
  owl: Point;
  shrooms: readonly Point[];
  crystals: readonly Point[];
}

/** Row of the walkable top surface at column `x`: the rounded bank on the left, the flat lawn beyond it. */
export function landTop(width: number, x: number): number {
  const edge = width * MOUND_EDGE_SHARE;
  const lawn = GROUND_TOP + Math.round(noise(x / 40 + 4) * 4);
  if (x >= edge) return lawn;
  const t = Math.max(0, x) / edge;
  const eased = t * t * (3 - 2 * t);
  return Math.round(MOUND_PEAK + (lawn - MOUND_PEAK) * eased + noise(x / 9 + 2) * BUMP);
}

export function hiddenLayout(width: number): HiddenLayout {
  const at = (share: number): number => Math.round(width * share);
  const stones: StoneSpec[] = [
    { x: at(0.765), w: 9, h: 42, base: 212, runes: 3, seed: 1 },
    { x: at(0.835), w: 11, h: 58, base: 209, runes: 4, seed: 2 },
    { x: at(0.905), w: 9, h: 46, base: 213, runes: 3, seed: 3 },
  ];
  const door = { x: at(DOOR_SHARE), y: DOOR_ROW };
  const owlStone = stones[0];
  return {
    width,
    door,
    edge: at(MOUND_EDGE_SHARE),
    stones,
    lantern: { x: door.x + 19, y: 224 },
    sign: { x: at(0.5), y: 222 },
    bush: { x: at(0.6), y: 221 },
    stump: { x: at(0.455), y: 221 },
    lake: { x: at(0.4), y: 184 },
    shack: { x: at(0.64), y: 185 },
    owl: { x: owlStone.x + 1, y: owlStone.base - owlStone.h + 1 },
    shrooms: [
      { x: door.x + 9, y: 224 }, { x: door.x + 29, y: 225 }, { x: at(0.69), y: 224 },
      { x: at(0.945), y: 226 }, { x: at(0.66), y: 226 },
    ],
    crystals: [{ x: door.x + 36, y: 222 }, { x: at(0.715), y: 222 }, { x: at(0.865), y: 220 }],
  };
}

/** Who stands where (the family by the door, the twins by the stones, Bill floating beside the stones), where they gather, what can be found. */
export function hiddenPlan(layout: HiddenLayout): ScenePlan {
  const { width, door, stones, bush, stump, lantern } = layout;
  const at = (share: number): number => Math.round(width * share);
  const homes: PerformerHome[] = [
    { id: 'stan', x: at(0.255), y: 230, facing: 1 },
    { id: 'soos', x: at(0.345), y: 236, facing: -1 },
    { id: 'dipper', x: at(0.665), y: 236, facing: 1 },
    { id: 'mabel', x: at(0.8), y: 234, facing: -1 },
    { id: 'waddles', x: at(0.895), y: 238, facing: -1 },
    { id: 'bill', x: at(0.7), y: 192, facing: 1 },
  ];
  const centre = stones[1];
  const clues: Clue[] = [
    { id: 'hidden-symbol', kind: 'symbol', place: 'hidden', x: centre.x, y: centre.base - 17, w: 14, h: 14 },
    { id: 'hidden-note', kind: 'note', place: 'hidden', x: lantern.x, y: lantern.y - 9, w: 12, h: 14 },
    { id: 'hidden-page', kind: 'page', place: 'hidden', x: bush.x, y: bush.y - 6, w: 14, h: 14 },
    { id: 'hidden-peek', kind: 'peek', place: 'hidden', x: stump.x, y: stump.y - 7, w: 16, h: 14 },
    { id: 'hidden-door', kind: 'door', place: 'hidden', x: door.x, y: door.y, w: DOOR_RADIUS * 2, h: DOOR_RADIUS * 2 },
  ];
  return { homes, spots: [{ x: at(0.3), y: 236 }, { x: at(0.73), y: 238 }, { x: at(0.87), y: 237 }], clues };
}
