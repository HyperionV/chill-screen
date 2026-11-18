import type { Chapter } from '../../journeys/route';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';

export const DESIGN_HEIGHT = 270;
export const WATERLINE = 0.55;
export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;
export const LILY_COUNT = 22;
/** Every third pad has a flower, five design pixels above its anchor. */
export const LILY_FLOWER_SPACING = 3;
export const LILY_FLOWER_HEIGHT = 5;
export const CANOE_LAMP_X = 4;
export const CANOE_LAMP_Y = 14;
/** Maximum bloom movement in stage pixels. */
const LILY_SWAY = 2;
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Dawn Shore', seconds: SCENE_SECONDS },
  { name: 'Pine Island', seconds: SCENE_SECONDS },
  { name: 'Lily Cove', seconds: SCENE_SECONDS },
  { name: 'Mountain Mirror', seconds: SCENE_SECONDS },
  { name: 'Starlit Shore', seconds: SCENE_SECONDS },
];

export interface Composition {
  peak: number;
  island: number;
  swanX: number;
  swanY: number;
  swanSize: number;
}

export const SCENES: readonly Composition[] = [
  { peak: 0.13, island: 0.83, swanX: 0.28, swanY: 0.69, swanSize: 1 },
  { peak: 0.08, island: 0.74, swanX: 0.8, swanY: 0.72, swanSize: 1 },
  { peak: 0.07, island: 0.88, swanX: 0.19, swanY: 0.66, swanSize: 1 },
  { peak: 0.2, island: 0.91, swanX: 0.76, swanY: 0.61, swanSize: 0.55 },
  { peak: 0.1, island: 0.84, swanX: 0.16, swanY: 0.85, swanSize: 1 },
];

/** The hover target, petal sprite and night glow share a position. */
export function lilyX(i: number, w: number): number {
  return w * (i % 2 === 0 ? 0.06 + hash(i + 3) * 0.26 : 0.69 + hash(i + 3) * 0.25);
}

export function lilyY(i: number, h: number): number { return h * (0.72 + hash(i + 33) * 0.2); }

export function lilySway(time: number, x: number): number { return Math.round(breeze(time, x) * LILY_SWAY); }

export function canoeX(w: number, unit: number, time: number): number {
  return w * 0.76 + Math.sin(time * 0.15) * 3 * unit;
}

export function canoeY(h: number, unit: number, time: number): number {
  return h * 0.79 + Math.sin(time * 0.7) * unit;
}
