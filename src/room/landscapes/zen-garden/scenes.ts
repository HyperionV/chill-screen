import type { Chapter } from '../../journeys/route';

export const DESIGN_HEIGHT = 270;
export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Raked Sand Garden', seconds: SCENE_SECONDS },
  { name: 'Koi Pond', seconds: SCENE_SECONDS },
  { name: 'Bamboo Grove', seconds: SCENE_SECONDS },
  { name: 'Tea House Veranda', seconds: SCENE_SECONDS },
  { name: 'Moon Viewing', seconds: SCENE_SECONDS },
];

export interface Spot { x: number; y: number }
export interface GardenLayout {
  monk: Spot;
  lantern: Spot;
  pond: { x: number; y: number; rx: number; ry: number };
  feature: Spot;
  chime: Spot;
}

/** Shared positions keep painted props and their click targets together. */
export function layout(scene: number, width: number): GardenLayout {
  return {
    monk: { x: width * (scene === 3 ? 0.73 : scene === 4 ? 0.24 : 0.22), y: scene === 3 ? 204 : 216 },
    lantern: { x: width * (scene === 4 ? 0.79 : 0.86), y: 209 },
    pond: { x: width * 0.51, y: scene === 4 ? 201 : 207, rx: width * 0.38, ry: 43 },
    feature: { x: width * 0.74, y: 200 },
    chime: { x: width * 0.83, y: 100 },
  };
}
