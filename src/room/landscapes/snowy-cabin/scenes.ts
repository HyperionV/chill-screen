import type { Chapter, Route } from '../../journeys/route';

/** Base design height in stage pixels; coordinates scale by `h / DESIGN_ROWS`. */
export const DESIGN_ROWS = 270;

/** Horizon line as a share of stage height, keeping the middle clock band calm. */
export const HORIZON = 0.56;

/** Route persistence key for Snowy Cabin. */
export const ROUTE_ID = 'landscape-snowy-cabin';

/** Duration of each scene in seconds (3.5 minutes each = 17.5 minutes full loop). */
const SCENE_SECONDS = 210;

/** Cross-dissolve and gentle camera glide duration between scenes. */
const TRANSITION_SECONDS = 10;

export type SceneId = 'clearing' | 'pond' | 'sled' | 'chimney' | 'aurora';

export interface SceneSpec {
  id: SceneId;
  name: string;
  /** Gentle horizontal camera offset at rest, in design pixels. */
  driftAmp: number;
}

export const SCENES: readonly SceneSpec[] = [
  { id: 'clearing', name: 'Cabin Clearing', driftAmp: 4 },
  { id: 'pond', name: 'Frozen Pond', driftAmp: 5 },
  { id: 'sled', name: 'Sled Hill', driftAmp: 5 },
  { id: 'chimney', name: 'Night Chimney', driftAmp: 3 },
  { id: 'aurora', name: 'Aurora Night', driftAmp: 4 },
];

export const CHAPTERS: readonly Chapter[] = SCENES.map((s) => ({
  name: s.name,
  seconds: SCENE_SECONDS,
}));

export interface SceneTransition {
  current: number;
  next: number;
  /** 0 outside the dissolve window, smoothly easing 0..1 over the last 10 seconds. */
  blend: number;
  name: string;
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** Computes active scene, next scene, and 0..1 cross-dissolve progress from the Route. */
export function sceneTransition(route: Route): SceneTransition {
  const now = route.now;
  const fadeShare = TRANSITION_SECONDS / SCENE_SECONDS;
  const fadeStart = 1 - fadeShare;
  const blend = now.t > fadeStart ? smoothstep(Math.min(1, (now.t - fadeStart) / fadeShare)) : 0;
  return {
    current: now.index,
    next: now.next,
    blend,
    name: now.name,
  };
}

/** Hit-test rectangle in stage pixels. */
export interface HitBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function pointInBox(px: number, py: number, box: HitBox, pad = 0): boolean {
  return (
    px >= box.x - pad &&
    px <= box.x + box.w + pad &&
    py >= box.y - pad &&
    py <= box.y + box.h + pad
  );
}
