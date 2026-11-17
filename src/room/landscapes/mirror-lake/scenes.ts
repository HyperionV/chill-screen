import type { Chapter } from '../../journeys/route';

export const DESIGN_HEIGHT = 270;
export const WATERLINE = 0.55;
export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;
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
