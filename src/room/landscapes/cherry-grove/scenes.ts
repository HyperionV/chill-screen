import type { Chapter } from '../../journeys/route';

export const DESIGN_HEIGHT = 270;
export const GROUND_ROW = 164;
export const GROUND_DEPTH = 0.75; // The ground, its props, and their click targets move together.
export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Blossom Path', seconds: SCENE_SECONDS },
  { name: 'Torii and Pond', seconds: SCENE_SECONDS },
  { name: 'Hilltop Pagoda', seconds: SCENE_SECONDS },
  { name: 'Petal Stream', seconds: SCENE_SECONDS },
  { name: 'Lantern Night', seconds: SCENE_SECONDS },
];

export interface Point { x: number; y: number }
export interface Tree { u: number; y: number; size: number; variant: number }
export interface Lantern { u: number; y: number }
export interface StoneLantern { u: number | 'stream-bank'; y: number }
export interface Scene {
  cat: Point;
  trees: readonly Tree[];
  lanterns: readonly Lantern[];
  stones: readonly StoneLantern[];
  bridge: Point | null;
  water: 'pond' | 'stream' | null;
}

// X coordinates are shares of the width; Y coordinates are rows at the design height.
export const SCENES: readonly Scene[] = [
  {
    cat: { x: 0.285, y: 224 }, water: null, bridge: null,
    trees: [
      { u: 0.06, y: 226, size: 1.55, variant: 0 },
      { u: 0.94, y: 231, size: 1.7, variant: 1 },
      { u: 0.22, y: 183, size: 0.7, variant: 2 },
      { u: 0.78, y: 181, size: 0.65, variant: 0 },
    ],
    lanterns: [{ u: 0.12, y: 146 }, { u: 0.88, y: 137 }],
    stones: [{ u: 0.86, y: 252 }],
  },
  {
    cat: { x: 0.755, y: 201 }, water: 'pond', bridge: { x: 0.77, y: 207 },
    trees: [
      { u: 0.04, y: 223, size: 1.3, variant: 1 },
      { u: 0.96, y: 220, size: 1.4, variant: 2 },
      { u: 0.47, y: 177, size: 0.55, variant: 0 },
    ],
    lanterns: [{ u: 0.12, y: 153 }, { u: 0.91, y: 155 }],
    stones: [{ u: 0.16, y: 243 }],
  },
  {
    cat: { x: 0.745, y: 203 }, water: null, bridge: null,
    trees: [
      { u: 0.04, y: 237, size: 1.65, variant: 2 },
      { u: 0.38, y: 200, size: 0.7, variant: 0 },
      { u: 0.97, y: 234, size: 1.3, variant: 1 },
    ],
    lanterns: [{ u: 0.66, y: 165 }, { u: 0.86, y: 165 }],
    stones: [{ u: 0.86, y: 252 }],
  },
  {
    cat: { x: 0.35, y: 230 }, water: 'stream', bridge: { x: 0.34, y: 186 },
    trees: [
      { u: 0.02, y: 227, size: 1.6, variant: 0 },
      { u: 0.98, y: 227, size: 1.5, variant: 1 },
      { u: 0.35, y: 181, size: 0.65, variant: 2 },
    ],
    lanterns: [{ u: 0.16, y: 145 }, { u: 0.9, y: 143 }],
    stones: [{ u: 0.86, y: 252 }, { u: 'stream-bank', y: 255 }],
  },
  {
    cat: { x: 0.745, y: 229 }, water: null, bridge: null,
    trees: [
      { u: 0.06, y: 234, size: 1.7, variant: 1 },
      { u: 0.94, y: 234, size: 1.7, variant: 0 },
      { u: 0.29, y: 185, size: 0.7, variant: 2 },
      { u: 0.71, y: 183, size: 0.7, variant: 1 },
    ],
    lanterns: [
      { u: 0.13, y: 153 }, { u: 0.27, y: 170 }, { u: 0.39, y: 180 },
      { u: 0.64, y: 180 }, { u: 0.75, y: 172 }, { u: 0.88, y: 150 },
    ],
    stones: [{ u: 0.86, y: 252 }],
  },
];

export const STONE_WINDOW_RISE = 32;
const STONE_BANK_CLEARANCE = 16;

export function stoneX(scene: Scene, stone: StoneLantern, width: number): number {
  if (stone.u !== 'stream-bank') return Math.round(stone.u * width);
  const bank = waterSpan(scene, stone.y, width);
  return Math.round((bank?.[1] ?? width * 0.25) + STONE_BANK_CLEARANCE);
}

export function waterSpan(scene: Scene, y: number, width: number): [number, number] | null {
  if (scene.water === 'pond') {
    const t = (y - 209) / 30;
    if (Math.abs(t) > 1) return null;
    const half = Math.sqrt(1 - t * t) * width * 0.29;
    return [width * 0.48 - half, width * 0.48 + half];
  }
  if (scene.water === 'stream' && y >= 174 && y <= DESIGN_HEIGHT) {
    const t = (y - 174) / 96;
    const center = width * (0.33 - t * 0.17) + Math.sin(t * 5) * 10;
    const half = 10 + t * 28;
    return [center - half, center + half];
  }
  return null;
}
