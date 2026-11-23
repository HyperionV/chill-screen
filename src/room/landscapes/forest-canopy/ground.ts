/**
 * The very front of the Forest Canopy: the big mossy root the viewer rests on in the lower left, a smaller one at
 * the right, wildflowers, and tufts of pasture grass swaying along the bottom edge.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { disc, rect, seeded } from '../../gravity-falls/art-kit';
import { GRASS_VARIANTS, buildGrass, drawGrass } from '../../gravity-falls/art-trees';
import type { Point } from '../../gravity-falls/types';
import { DESIGN_HEIGHT } from './layout';

const BARK = { shade: '#24170f', body: '#4b3424', lit: '#8a6644', pale: '#d9aa60' } as const;
const MOSS = ['#2d5a2c', '#4f8a38', '#8cc050'] as const;
const GRASS_BODY = '#3f8a3a';
const GRASS_TIP = '#b6e060';
const PETALS = ['#f4f0e0', '#f2d24a', '#f08aa8', '#c9b6f2'] as const;
const STEM = '#3f7a35';
const ROOT_STEPS = 120;
/** Rows of the grass line: the sill hides everything below about row 242. */
const SHORT_GRASS_ROWS = [243, 247, 252] as const;
/** Pasture chapters stand in longer grass: more rows, reaching higher up the page. */
const TALL_GRASS_ROWS = [228, 233, 238, 243, 247, 252] as const;
const GRASS_SPACING = 6;
const FLOWER_ROW_FROM = 226;
const FLOWER_ROW_TO = 240;

interface RootSpec {
  start: Point;
  bend: Point;
  end: Point;
  /** Thickness at the start and at the end, in pixels of radius. */
  thick: number;
  thin: number;
}

function curvePoint(spec: RootSpec, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * spec.start.x + 2 * u * t * spec.bend.x + t * t * spec.end.x,
    y: u * u * spec.start.y + 2 * u * t * spec.bend.y + t * t * spec.end.y,
  };
}

function paintRoot(ctx: CanvasRenderingContext2D, spec: RootSpec, seed: number): void {
  const rand = seeded(seed);
  for (let i = 0; i <= ROOT_STEPS; i++) {
    const t = i / ROOT_STEPS;
    const { x, y } = curvePoint(spec, t);
    const r = spec.thick + (spec.thin - spec.thick) * t;
    disc(ctx, BARK.shade, x, y, r);
    disc(ctx, BARK.body, x + 1, y - 1, r - 2);
    disc(ctx, BARK.lit, x + r * 0.25, y - r * 0.4, r * 0.45);
    if (rand() > 0.82) rect(ctx, BARK.pale, x + r * 0.3, y - r * 0.7, 2, 1);
    if (t > 0.25 && t < 0.75 && rand() > 0.55) disc(ctx, MOSS[Math.floor(rand() * MOSS.length)], x + (rand() - 0.5) * r, y - r * 0.8, 1 + rand() * 2);
  }
}

function paintFlowers(ctx: CanvasRenderingContext2D, width: number, count: number): void {
  const rand = seeded(61);
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * width);
    const y = Math.round(FLOWER_ROW_FROM + rand() * (FLOWER_ROW_TO - FLOWER_ROW_FROM));
    rect(ctx, STEM, x, y, 1, 7);
    rect(ctx, PETALS[Math.floor(rand() * PETALS.length)], x - 1, y - 1, 3, 2);
    rect(ctx, '#f2d24a', x, y - 1, 1, 1);
  }
}

export interface GroundSpec {
  /** Whether the big mossy root lies across the bottom corners. */
  roots: boolean;
  flowers: number;
  tallGrass: boolean;
}

export class Ground {
  private readonly front: HTMLCanvasElement;
  private readonly grass = buildGrass(GRASS_BODY, GRASS_TIP);
  private readonly tufts: { x: number; row: number; variant: number }[] = [];

  constructor(width: number, spec: GroundSpec) {
    const { canvas, ctx } = memoryCanvas(width, DESIGN_HEIGHT);
    if (spec.roots) paintRoot(ctx, { start: { x: -16, y: 248 }, bend: { x: width * 0.1, y: 190 }, end: { x: width * 0.31, y: 236 }, thick: 16, thin: 6 }, 71);
    if (spec.roots) paintRoot(ctx, { start: { x: width + 16, y: 252 }, bend: { x: width * 0.9, y: 214 }, end: { x: width * 0.74, y: 242 }, thick: 11, thin: 4 }, 83);
    paintFlowers(ctx, width, spec.flowers);
    this.front = canvas;
    const rand = seeded(97);
    for (const row of spec.tallGrass ? TALL_GRASS_ROWS : SHORT_GRASS_ROWS) {
      for (let x = -4; x < width + 4; x += GRASS_SPACING) {
        this.tufts.push({ x: x + rand() * GRASS_SPACING, row, variant: Math.floor(rand() * GRASS_VARIANTS) });
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.drawImage(this.front, 0, 0);
    for (const tuft of this.tufts) drawGrass(ctx, this.grass, tuft.x, tuft.row, tuft.variant, time, 2);
  }
}
