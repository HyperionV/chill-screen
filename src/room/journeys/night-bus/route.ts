import type { Chapter } from '../route';

export const CHAPTERS: readonly Chapter[] = [
  { name: 'Downtown Neon', seconds: 270 },
  { name: 'Noodle Street', seconds: 240 },
  { name: 'River Bridge', seconds: 240 },
  { name: 'Rooftop Quarter', seconds: 240 },
  { name: 'Quiet Suburb', seconds: 270 },
  { name: 'Last Train Crossing', seconds: 180 },
  { name: 'End of the Line', seconds: 300 },
];

/** Artwork is baked at this height, then copied with nearest-neighbour scaling. */
export const DESIGN_HEIGHT = 270;
export const ROAD_TOP = 207;
export const BUS_SPEED = 12;
export const BLEND_START = 0.75;
/** Saturated neon sign colours: hot pink, electric cyan, neon amber. */
export const NEON = ['#ff3493', '#1cf0ff', '#ffae19'] as const;
/** Bright tube highlights used for sign flash peaks. */
export const NEON_CORE = ['#ffd1ea', '#d4fcff', '#fff0b8'] as const;
export const wrap = (value: number, span: number): number => ((value % span) + span) % span;

/** Route time continues while the bus waits, so the train can finish passing. */
export function crossingWait(chapter: number, progress: number): boolean {
  return chapter === 5 && progress >= 0.16 && progress < 0.64;
}

/** Traffic has a long amber phase; there is no rapid flashing. */
export function trafficPhase(time: number): number {
  const phase = wrap(time, 30);
  return phase < 14 ? 0 : phase < 17 ? 1 : 2;
}
