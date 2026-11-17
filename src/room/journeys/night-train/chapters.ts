import type { Chapter } from '../route';
import { lerp, ramp } from '../noise';

export const CHAPTERS: readonly Chapter[] = [
  { name: 'City at Dusk', seconds: 300 },
  { name: 'The Dark Plains', seconds: 270 },
  { name: 'Foothills', seconds: 270 },
  { name: 'Snow Pass', seconds: 330 },
  { name: 'The Long Tunnel', seconds: 150 },
  { name: 'Station at Night', seconds: 270 },
  { name: 'Dawn Valley', seconds: 330 },
];

export const DESIGN_HEIGHT = 270;
export const TRAVEL_SPEED = 16;
export const BLEND_START = 0.75;
export const FROST = [0, 0, 0.18, 0.72, 0, 0.22, 0];

/** Unwrapped hours keep the midnight crossing continuous. The first minute closes the loop. */
export function routeHour(progress: number): number {
  const seconds = progress * 1920;
  if (seconds < 60) return 18.5;
  if (seconds < 300) return lerp(18.5, 20, (seconds - 60) / 240);
  if (seconds < 570) return lerp(20, 22, (seconds - 300) / 270);
  if (seconds < 840) return lerp(22, 24, (seconds - 570) / 270);
  if (seconds < 1170) return lerp(24, 26.5, (seconds - 840) / 330);
  if (seconds < 1320) return lerp(26.5, 27, (seconds - 1170) / 150);
  if (seconds < 1590) return lerp(27, 29.5, (seconds - 1320) / 270);
  return lerp(29.5, 31, (seconds - 1590) / 330);
}

export function stationMotion(t: number): number {
  return 1 - ramp(0, 0.13, t) + ramp(0.82, 1, t);
}

