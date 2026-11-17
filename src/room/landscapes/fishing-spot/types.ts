import type { Chapter } from '../../journeys/route';

/** Design-space reference height in stage pixels (`unit = h / DESIGN_ROWS`). */
export const DESIGN_ROWS = 270;

/** Horizon row as a share of stage height, keeping the middle clock band calm. */
export const HORIZON = 0.54;

/** Water surface top as a share of stage height. */
export const WATER_TOP = 0.555;

/** Cross-dissolve and camera-glide duration between consecutive scenes, in seconds. */
export const TRANSITION_SECONDS = 10;

/** Five scenes of the Fishing Spot, totalling 17.5 minutes (3.5 minutes per scene). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Wooden Jetty', seconds: 210 },
  { name: 'Reed Shallows', seconds: 210 },
  { name: 'Morning Rowboat', seconds: 210 },
  { name: 'Evening Pier', seconds: 210 },
  { name: 'Night Fishing', seconds: 210 },
];

export type SceneIndex = 0 | 1 | 2 | 3 | 4;

export type FishSpecies = 'perch' | 'trout' | 'carp';

export const FISH_SPECIES: readonly FishSpecies[] = ['perch', 'trout', 'carp'];

export type CastPhase = 'idle' | 'arc' | 'bob' | 'bite' | 'reel';

export interface CastSnapshot {
  phase: CastPhase;
  /** Current float or landing position in design pixels. */
  x: number;
  y: number;
  /** Progress 0..1 for `arc` (cast travel) or `reel` (fish showcase). */
  progress: number;
  species: FishSpecies;
}

export interface CatchIcon {
  species: FishSpecies;
}

export interface PointerDesign {
  x: number;
  y: number;
  speed: number;
}

export interface SceneLayout {
  designW: number;
  designH: number;
  unit: number;
  /** Right edge of the left-side jetty/landing so props clear the bottom-centre radio. */
  jettyRight: number;
  /** Left anchor for right-side posts/birds, clearing the radio. */
  rightZone: number;
  deckY: number;
  waterTopY: number;
}

/** Computes responsive design-space anchors that keep characters clear of the clock and radio. */
export function computeLayout(w: number, _h: number, unit: number): SceneLayout {
  const designW = w / Math.max(0.25, unit);
  const designH = DESIGN_ROWS;
  return {
    designW,
    designH,
    unit,
    jettyRight: Math.min(176, designW * 0.365),
    rightZone: Math.max(designW * 0.64, designW - 170),
    deckY: 204,
    waterTopY: Math.round(designH * WATER_TOP),
  };
}
