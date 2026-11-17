import type { Chapter } from '../../journeys/route';

export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;
export const DESIGN_HEIGHT = 270;
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Misty Pines', seconds: SCENE_SECONDS },
  { name: 'Mossy Stream', seconds: SCENE_SECONDS },
  { name: 'Fern Meadow', seconds: SCENE_SECONDS },
  { name: 'Owl Hollow', seconds: SCENE_SECONDS },
  { name: 'Ranger Trail', seconds: SCENE_SECONDS },
];

export interface Pine { x: number; base: number; height: number; width: number; depth: number }

// Drawing and hit testing share the same landmarks.
export const hollowX = (width: number): number => width * 0.77;
export const HOLLOW_Y = 154;
export const hutX = (width: number): number => width * 0.69;
export const streamX = (width: number, y: number): number => width * 0.52 + (y - 165) * 0.95;
export const streamHalfWidth = (y: number): number => 10 + (y - 165) * 0.28;
export const STONE_ROWS: readonly number[] = [194, 218, 243];
export const stoneX = (width: number, y: number): number => streamX(width, y) + (y === 218 ? -15 : 12);

export function nearPines(width: number, scene: number): Pine[] {
  return [
    { x: width * 0.055, base: 223, height: 245, width: 89, depth: 1.5 },
    { x: width * 0.95, base: 216, height: 237, width: 79, depth: 1.5 },
    { x: width * (scene === 0 ? 0.27 : 0.15), base: 188, height: 211, width: 62, depth: 1.5 },
  ];
}
