import { seededRandom } from '../../../world/math';
import { smooth } from '../../sky';
import type { Chapter } from '../../journeys/route';
import { ramp } from '../../journeys/noise';

/** Design stage height in pixels; horizontal dimensions scale proportionally by `h / DESIGN_ROWS`. */
export const DESIGN_ROWS = 270;

const STANDARD_DECK_TOP = 204;
const OVERLOOK_DROP = 14;
const REAR_WALL_DEPTH = 10;
const OVERLOOK_CURB_REDUCTION = 2;

/** Horizon line as a share of the stage height (sky above, city & rooftop below). */
export const HORIZON = 0.56;

/** Design pixels between consecutive rooftop scene centers. */
export const SCENE_SPACING = 560;

/** Total looping world width across all five rooftop scenes. */
export const WORLD_W = SCENE_SPACING * 5;

/** Duration of the smooth camera glide between scenes, in seconds. */
export const TRANSITION_SECONDS = 10;

/** Parallax scroll factors; each span divides WORLD_W cleanly so looping is seamless. */
export const FAR_PARALLAX = 0.25;
export const FAR_SPAN = WORLD_W * FAR_PARALLAX;

export const MID_PARALLAX = 0.5;
export const MID_SPAN = WORLD_W * MID_PARALLAX;

export const NEAR_ROOF_PARALLAX = 0.75;
export const NEAR_ROOF_SPAN = WORLD_W * NEAR_ROOF_PARALLAX;

export const SILHOUETTE_PARALLAX = 0.88;
export const SILHOUETTE_SPAN = WORLD_W * SILHOUETTE_PARALLAX;

/** The five scenes of Rooftop City (17.5 minute full loop). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Water Tower Roof', seconds: 210 },
  { name: 'Skyline Golden Hour', seconds: 210 },
  { name: 'Neon Rooftop Bar', seconds: 210 },
  { name: 'Billboard Roof', seconds: 210 },
  { name: 'Rooftop Garden', seconds: 210 },
];

export interface FarTower {
  x: number;
  w: number;
  topY: number;
  hasSpire: boolean;
  beaconPhase: number;
}

export interface WindowSlot {
  id: number;
  rx: number;
  ry: number;
  w: number;
  h: number;
  defaultLit: boolean;
  tone: 0 | 1 | 2;
}

export interface MidBuilding {
  id: number;
  x: number;
  w: number;
  topY: number;
  tone: 0 | 1 | 2;
  roofKind: 'flat' | 'penthouse' | 'tank';
  windows: readonly WindowSlot[];
}

export interface NearRoof {
  x: number;
  w: number;
  topY: number;
  tone: 0 | 1;
  hasVent: boolean;
  hasAntenna: boolean;
  windows: readonly WindowSlot[];
}

export interface CityLayout {
  farTowers: readonly FarTower[];
  midBuildings: readonly MidBuilding[];
  nearRoofs: readonly NearRoof[];
}

/** Wraps a coordinate into [0, period). */
export function wrapCoord(x: number, period: number): number {
  const m = x % period;
  return m < 0 ? m + period : m;
}

/** Shortest signed distance from `anchor` to `target` on a ring of length `period`. */
export function wrapDelta(target: number, anchor: number, period: number): number {
  let d = (target - anchor) % period;
  if (d > period * 0.5) d -= period;
  if (d < -period * 0.5) d += period;
  return d;
}

/** Smoothly glides the camera between scene centers during the final seconds of each chapter. */
export function cameraAt(index: number, t: number, next: number): { camX: number; blend: number } {
  const chapter = CHAPTERS[index] ?? CHAPTERS[0];
  const glideStart = 1 - TRANSITION_SECONDS / chapter.seconds;
  const fromX = SCENE_SPACING * index;
  if (t <= glideStart) return { camX: fromX, blend: 0 };
  const u = smooth((t - glideStart) / (1 - glideStart));
  const delta = wrapDelta(SCENE_SPACING * next, fromX, WORLD_W);
  return { camX: wrapCoord(fromX + delta * u, WORLD_W), blend: u };
}

/** Y position (in design rows) of the foreground rooftop deck at world coordinate `wx`. */
export function deckTopAt(wx: number): number {
  const x = wrapCoord(wx, WORLD_W);
  const overlookCenter = SCENE_SPACING;
  const dist = Math.abs(x - overlookCenter);
  // Dip the foreground parapet in Scene 2 (Skyline Golden Hour) to open the panoramic view.
  const dip = 1 - ramp(145, 205, dist);
  return Math.round(STANDARD_DECK_TOP + dip * OVERLOOK_DROP);
}

/** Coping rises above the back of the deck, with a lower curb at the overlook. */
export function rearCapAt(wx: number): number {
  const back = deckTopAt(wx);
  const drop = (back - STANDARD_DECK_TOP) / OVERLOOK_DROP;
  return back - REAR_WALL_DEPTH + Math.round(drop * OVERLOOK_CURB_REDUCTION);
}

/** Builds deterministic skyline layers so buildings and clickable windows stay identical across resizes. */
export function createCityLayout(): CityLayout {
  const rnd = seededRandom(4207);

  const farTowers: FarTower[] = [];
  let fx = 0;
  while (fx < FAR_SPAN - 18) {
    const w = 18 + Math.floor(rnd() * 24);
    // Keep peaks calm behind the central clock band (roughly rows 108..146).
    const topY = 108 + Math.floor(rnd() * 38);
    farTowers.push({
      x: fx,
      w,
      topY,
      hasSpire: rnd() < 0.34,
      beaconPhase: rnd() * Math.PI * 2,
    });
    fx += w - 2 + Math.floor(rnd() * 7);
  }

  let nextWindowId = 1;
  const midBuildings: MidBuilding[] = [];
  let mx = 0;
  let mbId = 0;
  while (mx < MID_SPAN - 24) {
    const w = 32 + Math.floor(rnd() * 30);
    // Mid-far buildings rise just below the clock band (rows 146..182).
    const topY = 146 + Math.floor(rnd() * 34);
    const cols = Math.max(2, Math.floor((w - 8) / 8));
    const rows = Math.max(2, Math.floor((226 - topY) / 10));
    const windows: WindowSlot[] = [];
    const padX = Math.floor((w - cols * 8 + 3) / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.14) continue;
        const toneRoll = rnd();
        windows.push({
          id: nextWindowId++,
          rx: padX + c * 8,
          ry: 7 + r * 10,
          w: 5,
          h: 6,
          defaultLit: rnd() < 0.56,
          tone: toneRoll < 0.65 ? 0 : toneRoll < 0.88 ? 1 : 2,
        });
      }
    }
    const roofRoll = rnd();
    const toneRoll2 = rnd();
    const buildingTone: 0 | 1 | 2 = toneRoll2 < 0.34 ? 0 : toneRoll2 < 0.67 ? 1 : 2;
    midBuildings.push({
      id: mbId++,
      x: mx,
      w,
      topY,
      tone: buildingTone,
      roofKind: roofRoll < 0.55 ? 'flat' : roofRoll < 0.8 ? 'penthouse' : 'tank',
      windows,
    });
    mx += w + 2 + Math.floor(rnd() * 8);
  }

  const nearRoofs: NearRoof[] = [];
  let nx = 24;
  while (nx < NEAR_ROOF_SPAN - 60) {
    const w = 52 + Math.floor(rnd() * 44);
    // Keep the central overlook bay of Scene 2 open so the street traffic below is visible.
    if (nx + w > 330 && nx < 510) {
      nx = 515;
      continue;
    }
    const topY = 176 + Math.floor(rnd() * 18);
    const cols = Math.max(2, Math.floor((w - 14) / 11));
    const rows = Math.max(1, Math.floor((228 - topY) / 13));
    const windows: WindowSlot[] = [];
    const padX = Math.floor((w - cols * 11 + 5) / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() < 0.2) continue;
        windows.push({
          id: nextWindowId++,
          rx: padX + c * 11,
          ry: 9 + r * 13,
          w: 6,
          h: 8,
          defaultLit: rnd() < 0.6,
          tone: rnd() < 0.72 ? 0 : 1,
        });
      }
    }
    nearRoofs.push({
      x: nx,
      w,
      topY,
      tone: rnd() < 0.5 ? 0 : 1,
      hasVent: rnd() < 0.65,
      hasAntenna: rnd() < 0.55,
      windows,
    });
    nx += w + 22 + Math.floor(rnd() * 34);
  }

  return { farTowers, midBuildings, nearRoofs };
}
