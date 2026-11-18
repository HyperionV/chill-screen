import type { Chapter } from '../../journeys/route';

export const SCENE_SECONDS = 210;
export const DISSOLVE_SECONDS = 10;
export const DESIGN_HEIGHT = 270;
export const GROUND_ROW = 165;
export const CLOCK_TOP = 78;
export const CLOCK_BOTTOM = 154;
export const MISTY_SCENE = 0;
export const STREAM_SCENE = 1;
export const MEADOW_SCENE = 2;
export const HOLLOW_SCENE = 3;
export const TRAIL_SCENE = 4;
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Misty Pines', seconds: SCENE_SECONDS },
  { name: 'Mossy Stream', seconds: SCENE_SECONDS },
  { name: 'Fern Meadow', seconds: SCENE_SECONDS },
  { name: 'Owl Hollow', seconds: SCENE_SECONDS },
  { name: 'Ranger Trail', seconds: SCENE_SECONDS },
];

export interface Pine { x: number; base: number; height: number; width: number }
export interface MushroomPatch { x: number; y: number }

// Drawing and hit testing share the same landmarks.
export const hollowX = (width: number): number => width * 0.77;
export const HOLLOW_Y = 154;
export const hutX = (width: number): number => width * 0.69;
export const trailLampX = (width: number): number => hutX(width) + 88;
export const TRAIL_LAMP_Y = 173;
export const streamX = (width: number, y: number): number => width * 0.52 + (y - 165) * 0.95;
export const streamHalfWidth = (y: number): number => 10 + (y - 165) * 0.28;
export const STONE_ROWS: readonly number[] = [194, 218, 243];
export const stoneX = (width: number, y: number): number => streamX(width, y) + (y === 218 ? -15 : 12);

export function mushroomPatches(width: number): readonly MushroomPatch[] {
  return [
    { x: width * 0.22, y: 251 },
    { x: Math.max(width * 0.65 + 12, hollowX(width) - 25), y: 225 },
    { x: width * 0.86, y: 249 },
  ];
}

export function nearPines(width: number, scene: number): Pine[] {
  return [
    { x: width * 0.055, base: 223, height: 245, width: 89 },
    { x: width * 0.95, base: 216, height: 237, width: 79 },
    { x: width * (scene === MISTY_SCENE ? 0.27 : 0.15), base: 188, height: 211, width: 62 },
  ];
}
