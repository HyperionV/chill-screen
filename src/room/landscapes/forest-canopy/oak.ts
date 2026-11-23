/**
 * Oak trees seen from underneath: a thick furrowed trunk that splits high up into a few huge, twisting boughs which
 * spread wide and curl back up, each throwing off smaller limbs. The trunk is drawn by `paintTrunks`; the boughs
 * are grown here, one step at a time, as chains of round pieces shaded in three passes (dark rim, body, lit side)
 * so every limb reads as a rounded, sunlit tube. Leaf places are collected along the thin ends.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { disc, mix, rect, seeded } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { DESIGN_HEIGHT, railAt, type Perspective } from './layout';
import { BARK, paintTrunks } from './trunks';

export interface OakSpec {
  /** Where the trunk meets the bottom row, as a share of the page width. */
  baseX: number;
  /** Trunk width at the bottom row, in pixels. */
  width: number;
  /** Row where the trunk splits into boughs. */
  forkRow: number;
  /** Boughs leaving the fork. */
  limbs: number;
  /** How far a main bough reaches, in pixels. */
  reach: number;
  /** How much of the haze colour the tree is seen through (0 near, about 0.5 far away). */
  haze: number;
  seed: number;
}

export interface Oaks {
  canvas: HTMLCanvasElement;
  /** Places on the thin ends of the boughs where leaf clumps belong. */
  tips: Point[];
}

/** Distance between two pieces of a bough. */
const STEP = 1.4;
/** A bough thins steadily so it ends this many pixels thick (a little more than `MIN_RADIUS`, where it stops). */
const TIP_RADIUS = 2.2;
const MIN_RADIUS = 1.3;
/** How sharply a bough may turn from one step to the next (oaks twist), and how hard it curls back up. */
const WOBBLE = 0.16;
const CURL_UP = 0.011;
/** The angle a main bough leaves the fork at, measured from straight up: oaks spread wide. */
const SPREAD_MIN = 0.5;
const SPREAD_RANGE = 0.85;
const MAIN_RADIUS_SHARE = 0.62;
/** A bough throws off a side limb now and then; the side limb leaves at about this angle and is this much thinner. */
const FORK_CHANCE = 0.034;
const FORK_ANGLE = 0.9;
const FORK_THIN = 0.6;
const FORK_REACH = 0.55;
const MIN_FORK_RADIUS = 2.6;
/** Leaves grow where a bough is thinner than this, one place every few steps. */
const LEAF_RADIUS = 6.5;
const LEAF_EVERY = 4;
const MAX_DEPTH = 3;
const OFF_PAGE = 30;
const CRACK_CHANCE = 0.1;
const MOSS = '#3f6a30';

interface Joint {
  x: number;
  y: number;
  r: number;
}

function shades(hazeColour: string, haze: number): string[] {
  return BARK.map((c) => mix(c, hazeColour, haze));
}

/** Grows one bough (and the limbs it throws off) from a point, returning every joint in order. */
function grow(
  rand: () => number, p: Perspective, start: Joint, angle: number, steps: number, depth: number, paths: Joint[][], tips: Point[],
): void {
  const path: Joint[] = [];
  let { x, y, r } = start;
  let heading = angle;
  const taper = Math.pow(Math.min(1, TIP_RADIUS / start.r), 1 / steps);
  for (let i = 0; i < steps && r > MIN_RADIUS; i++) {
    path.push({ x, y, r });
    if (r < LEAF_RADIUS && i % LEAF_EVERY === 0) tips.push({ x, y });
    x += Math.sin(heading) * STEP;
    y -= Math.cos(heading) * STEP;
    heading += (rand() - 0.5) * WOBBLE - Math.sin(heading) * CURL_UP;
    r *= taper;
    if (depth < MAX_DEPTH && r > MIN_FORK_RADIUS && rand() < FORK_CHANCE) {
      const side = rand() > 0.5 ? 1 : -1;
      grow(rand, p, { x, y, r: r * FORK_THIN }, heading + side * (FORK_ANGLE * (0.7 + rand() * 0.6)), Math.round(steps * FORK_REACH), depth + 1, paths, tips);
    }
    if (x < -OFF_PAGE || x > p.width + OFF_PAGE || y < -OFF_PAGE || y > DESIGN_HEIGHT + OFF_PAGE) break;
  }
  tips.push({ x, y });
  paths.push(path);
}

function paintPaths(ctx: CanvasRenderingContext2D, paths: Joint[][], colours: string[], rand: () => number): void {
  const thickFirst = [...paths].sort((a, b) => (b[0]?.r ?? 0) - (a[0]?.r ?? 0));
  for (const path of thickFirst) {
    for (const j of path) disc(ctx, colours[0], j.x, j.y, j.r);
    for (const j of path) disc(ctx, colours[1], j.x + j.r * 0.12, j.y - j.r * 0.1, j.r * 0.84);
    for (const j of path) if (j.r > 2.2) disc(ctx, colours[2], j.x + j.r * 0.3, j.y - j.r * 0.22, j.r * 0.52);
    for (const j of path) if (j.r > 4) disc(ctx, colours[3], j.x + j.r * 0.45, j.y - j.r * 0.3, j.r * 0.22);
    for (const j of path) {
      if (j.r > 3 && rand() < CRACK_CHANCE) rect(ctx, colours[0], j.x - j.r * 0.3 + rand() * j.r * 0.4, j.y - 1, 1, 3);
      if (j.r > 3.5 && rand() < CRACK_CHANCE * 0.5) rect(ctx, MOSS, j.x - j.r * 0.6 + rand() * j.r * 0.6, j.y - j.r * 0.7, 2, 1);
    }
  }
}

/** Grows every oak of a depth into one picture: trunks, boughs, and the places leaves belong. */
export function growOaks(p: Perspective, specs: readonly OakSpec[], hazeColour: string): Oaks {
  const { canvas, ctx } = memoryCanvas(p.width, DESIGN_HEIGHT);
  const tips: Point[] = [];
  for (const spec of specs) {
    const baseX = spec.baseX * p.width;
    const trunk = paintTrunks(p, [{ baseX, width: spec.width, top: spec.forkRow }], hazeColour, spec.haze, spec.seed);
    ctx.drawImage(trunk, 0, 0);
    const rand = seeded(spec.seed + 5);
    const half = (railAt(p, baseX + spec.width / 2, spec.forkRow) - railAt(p, baseX - spec.width / 2, spec.forkRow)) / 2;
    const fork = { x: railAt(p, baseX, spec.forkRow), y: spec.forkRow, r: half * MAIN_RADIUS_SHARE };
    const paths: Joint[][] = [];
    for (let i = 0; i < spec.limbs; i++) {
      const side = spec.limbs === 1 ? (rand() > 0.5 ? 1 : -1) : -1 + (2 * i) / (spec.limbs - 1);
      const spread = side * (SPREAD_MIN + rand() * SPREAD_RANGE) * (Math.abs(side) < 0.2 ? 0.3 : 1);
      grow(rand, p, fork, spread, Math.round((spec.reach * (0.75 + rand() * 0.5)) / STEP), 0, paths, tips);
    }
    paintPaths(ctx, paths, shades(hazeColour, spec.haze), rand);
  }
  return { canvas, tips };
}
