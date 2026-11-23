/**
 * Pine trees and swaying grass for the Gravity Falls views. The pictures are built once into small canvases;
 * the draw functions bend them with the shared wind a few whole pixels at a time.
 */
import { memoryCanvas } from '../../render/pixel-stage';
import { hash } from '../journeys/noise';
import { breeze } from '../wind';
import { bayer, mix, rect, type Ctx } from './art-kit';

export interface PinePalette {
  dark: string;
  mid: string;
  light: string;
  trunk: string;
  trunkShade: string;
}

/** Cool green-teal pines, the default shade of the forest. */
export const PINE_FOREST: PinePalette = { dark: '#1d4640', mid: '#2e6b58', light: '#5f9d6e', trunk: '#5b4030', trunkShade: '#3d2a22' };

/** How many different pine shapes `pineTree` knows; any variant number is wrapped into this many. */
export const PINE_VARIANTS = 4;
/** How many different grass tuft heights `buildGrass` draws; any variant number is wrapped into this many. */
export const GRASS_VARIANTS = 6;

interface PineShape {
  tiers: number;
  /** Widest half-width as a share of the tree's height. */
  half: number;
  /** Bare trunk below the branches as a share of the height. */
  trunk: number;
}

const SHAPES: readonly PineShape[] = [
  { tiers: 4, half: 0.27, trunk: 0.12 },
  { tiers: 5, half: 0.2, trunk: 0.1 },
  { tiers: 3, half: 0.32, trunk: 0.15 },
  { tiers: 4, half: 0.24, trunk: 0.3 },
];
/** Neighbouring branch tiers overlap by this much so the tree reads as one shape. */
const TIER_OVERLAP = 1.5;
/** Chance that a branch row is one pixel wider, which gives the ragged pine edge. */
const RAGGED_CHANCE = 0.3;
/** Chance of a single lighter or darker needle pixel inside a tier. */
const NEEDLE_CHANCE = 0.16;
/** Pines taller than this get a 3-pixel trunk, shorter ones 2. */
const THICK_TRUNK_HEIGHT = 60;
/** Wind bends a tree in strips this many rows tall, so each strip moves whole pixels. */
const SWAY_STRIP = 3;

const GRASS_POSE = 2;
const GRASS_MIN_RISE = 4;
const GRASS_CELL_W = 9;
const GRASS_CELL_H = 12;
const GRASS_MIDDLE = 4;

/** The same palette with every colour pulled `t` of the way (0..1) toward `color`: far trees sink into haze. */
export function fadePalette(palette: PinePalette, color: string, t: number): PinePalette {
  return {
    dark: mix(palette.dark, color, t), mid: mix(palette.mid, color, t), light: mix(palette.light, color, t),
    trunk: mix(palette.trunk, color, t), trunkShade: mix(palette.trunkShade, color, t),
  };
}

/** One branch tier: a triangle with a lit left edge, a dithered shadow on the right and a ragged, scalloped underside. */
function paintTier(ctx: Ctx, cx: number, top: number, height: number, halfBase: number, palette: PinePalette, seed: number): void {
  for (let r = 0; r < height; r++) {
    const ragged = hash(seed * 7.1 + r) < RAGGED_CHANCE ? 1 : 0;
    const half = Math.max(1, Math.round((halfBase * (r + 1)) / height) + ragged);
    const y = top + r;
    if (r === height - 1) {
      for (let dx = -half; dx <= half; dx += 2) rect(ctx, palette.dark, cx + dx, y, 1, 1);
      continue;
    }
    rect(ctx, palette.mid, cx - half, y, half * 2 + 1, 1);
    for (let dx = Math.floor(half * 0.2); dx <= half; dx++) if (bayer(cx + dx, y) < 0.6) rect(ctx, palette.dark, cx + dx, y, 1, 1);
    rect(ctx, palette.dark, cx + half, y, 1, 1);
    rect(ctx, r % 2 === 0 ? palette.light : palette.mid, cx - half, y, 1, 1);
    if (half > 3 && hash(seed * 3.3 + r * 1.9) < NEEDLE_CHANCE) rect(ctx, palette.light, cx - Math.floor(half * 0.4), y, 2, 1);
  }
}

/**
 * A pine tree picture `size` pixels tall (variant picks one of 4 shapes: classic, slim, broad, long-trunked), its
 * trunk foot at the bottom-centre. Drawn with a lit left side and a dithered shadow side. Build once, draw many times.
 */
export function pineTree(variant: number, size: number, palette: PinePalette = PINE_FOREST): HTMLCanvasElement {
  const shape = SHAPES[((variant % PINE_VARIANTS) + PINE_VARIANTS) % PINE_VARIANTS];
  const maxHalf = Math.max(3, Math.round(size * shape.half));
  const { canvas, ctx } = memoryCanvas(maxHalf * 2 + 3, size);
  const cx = maxHalf + 1;
  const foliage = size - Math.max(3, Math.round(size * shape.trunk));
  const trunkWidth = size >= THICK_TRUNK_HEIGHT ? 3 : 2;
  const trunkTop = Math.round(foliage * 0.6);
  rect(ctx, palette.trunk, cx - 1, trunkTop, trunkWidth, size - trunkTop);
  rect(ctx, palette.trunkShade, cx - 1 + trunkWidth - 1, trunkTop, 1, size - trunkTop);
  const tierHeight = Math.ceil((foliage / shape.tiers) * TIER_OVERLAP);
  for (let k = 0; k < shape.tiers; k++) {
    const top = Math.round((k * (foliage - tierHeight)) / (shape.tiers - 1));
    const halfBase = Math.round(maxHalf * (0.4 + (0.6 * (k + 1)) / shape.tiers));
    paintTier(ctx, cx, top, tierHeight, halfBase, palette, variant * 13 + k + size * 0.01);
  }
  return canvas;
}

/**
 * Draws a pine (or any tree picture) with its trunk foot centred at (x, baseY), bent by the wind: the foot stays put
 * and the tip leans up to `amount` pixels, in 3-row strips. `amount` 1 to 3 suits trees, a smaller one far trees.
 */
export function drawSwayTree(ctx: Ctx, tree: HTMLCanvasElement, x: number, baseY: number, time: number, amount: number): void {
  const left = Math.round(x - tree.width / 2);
  const top = Math.round(baseY - tree.height);
  const lean = breeze(time, x) * amount;
  for (let sy = 0; sy < tree.height; sy += SWAY_STRIP) {
    const rows = Math.min(SWAY_STRIP, tree.height - sy);
    const above = 1 - (sy + rows) / tree.height;
    const shift = Math.round(lean * above * above);
    ctx.drawImage(tree, 0, sy, tree.width, rows, left + shift, top + sy, tree.width, rows);
  }
}

/** One thin blade: `rise` rows tall, bending `pose` pixels at the tip. */
function blade(ctx: Ctx, color: string, tip: string, x: number, bottom: number, rise: number, pose: number): void {
  for (let row = 0; row < rise; row++) {
    const bend = Math.round((pose * row) / Math.max(1, rise - 1));
    rect(ctx, row === rise - 1 ? tip : color, x + bend, bottom - row - 1, 1, 1);
  }
}

/**
 * A sheet of grass tufts for `drawGrass`: 6 heights (4 to 9 rows) in 5 wind poses each. Every tuft is three blades,
 * `body` coloured with a `tip` pixel on top. Build once per colour pair.
 */
export function buildGrass(body: string, tip: string): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(GRASS_CELL_W * (GRASS_POSE * 2 + 1), GRASS_CELL_H * GRASS_VARIANTS);
  for (let pose = -GRASS_POSE; pose <= GRASS_POSE; pose++) {
    for (let v = 0; v < GRASS_VARIANTS; v++) {
      const rise = GRASS_MIN_RISE + v;
      const cx = (pose + GRASS_POSE) * GRASS_CELL_W + GRASS_MIDDLE;
      const bottom = (v + 1) * GRASS_CELL_H;
      blade(ctx, body, tip, cx - 2, bottom, rise - 2, pose);
      blade(ctx, body, tip, cx + 2, bottom, rise - 1, pose);
      blade(ctx, body, tip, cx, bottom, rise, pose);
    }
  }
  return canvas;
}

/**
 * Draws one grass tuft from a `buildGrass` sheet, standing on row `baseY` at `x`, swaying up to `amount` pixels
 * (at most 2). `variant` picks its height.
 */
export function drawGrass(ctx: Ctx, sheet: HTMLCanvasElement, x: number, baseY: number, variant: number, time: number, amount: number): void {
  const pose = Math.max(-GRASS_POSE, Math.min(GRASS_POSE, Math.round(breeze(time, x) * amount)));
  const v = ((variant % GRASS_VARIANTS) + GRASS_VARIANTS) % GRASS_VARIANTS;
  ctx.drawImage(sheet, (pose + GRASS_POSE) * GRASS_CELL_W, v * GRASS_CELL_H, GRASS_CELL_W, GRASS_CELL_H,
    Math.round(x) - GRASS_MIDDLE, Math.round(baseY) - GRASS_CELL_H, GRASS_CELL_W, GRASS_CELL_H);
}
