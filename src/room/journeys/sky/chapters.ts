import type { Chapter } from '../route';
import { ramp } from '../noise';

export const CHAPTERS: readonly Chapter[] = [
  { name: 'Above the Clouds', seconds: 270 },
  { name: 'Floating Islands', seconds: 300 },
  { name: 'The Great Migration', seconds: 240 },
  { name: 'Storm Front', seconds: 270 },
  { name: 'Lantern Festival', seconds: 300 },
  { name: 'Sea of Stars', seconds: 240 },
];

// A quarter of each chapter belongs to both places, including the loop seam.
const BLEND_START = 0.75;
export function chapterWeights(index: number, next: number, t: number, out: Float32Array): void {
  out.fill(0);
  const blend = ramp(BLEND_START, 1, t);
  out[index] = 1 - blend;
  out[next] = blend;
}

export const DESIGN_HEIGHT = 270;
export const CLOUD_ROW = 190;
export const TRAVEL_SPEED = 8;
export const wrap = (x: number, span: number): number => ((x % span) + span) % span;
