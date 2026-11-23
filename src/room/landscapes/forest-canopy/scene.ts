/**
 * One chapter of the Forest Canopy, built once per page width: the three depths of oaks (hazy far trees, a middle
 * tree, the near tree), the leaves hanging on their boughs plus filler leaves, the sunlight, the drifting leaves and
 * the pasture in front.
 */
import { buildFiller, clumpsAt, type Canopy, type Clump } from './foliage';
import type { ChapterSpec } from './chapters';
import { Drift } from './drift';
import { Ground } from './ground';
import { perspective, type Perspective } from './layout';
import { Sunlight } from './light';
import { growOaks } from './oak';

const FAR_HAZE = '#5b8f6c';
const MID_HAZE = '#406f55';
const NO_HAZE = '#000000';
const FAR_SWAY = 0.6;
const MID_SWAY = 1.1;
const NEAR_SWAY = 1.8;
const bySky = (a: Clump, b: Clump): number => a.y - b.y;

export interface Scene {
  spec: ChapterSpec;
  width: number;
  p: Perspective;
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  near: HTMLCanvasElement;
  leaves: Canopy;
  light: Sunlight;
  drift: Drift;
  ground: Ground;
}

export function buildScene(width: number, spec: ChapterSpec): Scene {
  const p = perspective(width, spec.sunShare, spec.gapScale);
  const far = growOaks(p, spec.far, FAR_HAZE);
  const mid = growOaks(p, spec.mid, MID_HAZE);
  const near = growOaks(p, spec.near, NO_HAZE);
  const filler = buildFiller(p, spec.filler);
  const seed = spec.far[0].seed;
  return {
    spec, width, p,
    far: far.canvas,
    mid: mid.canvas,
    near: near.canvas,
    leaves: {
      far: [...filler.far, ...clumpsAt(far.tips, 'far', FAR_SWAY, seed + 1)].sort(bySky),
      mid: [...filler.mid, ...clumpsAt(mid.tips, 'mid', MID_SWAY, seed + 2)].sort(bySky),
      near: [...filler.near, ...clumpsAt(near.tips, 'near', NEAR_SWAY, seed + 3)].sort(bySky),
    },
    light: new Sunlight(p, spec.patches),
    drift: new Drift(width),
    ground: new Ground(width, spec.ground),
  };
}
