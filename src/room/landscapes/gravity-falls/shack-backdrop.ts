/**
 * The land around the Mystery Shack: hazy hills, far pines, sunny grass, the gravel lot, the swaying mid pines,
 * grass tufts and the foreground frame. Static layers are painted once; the swaying parts are lists to draw each frame.
 */
import { bayer, ditherFill, ellipse, mix, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_VARIANTS, drawGrass, drawSwayTree, fadePalette, pineTree, type PinePalette } from '../../gravity-falls/art-trees';
import { hash, noise } from '../../journeys/noise';
import { DESIGN_HEIGHT } from './scene-art';
import type { ShackLayout } from './shack-props';

/** Row where the grass starts behind the shack. */
const GROUND_TOP = 196;
/** Top edge of the gravel lot; it wanders a few rows with noise. */
const LOT_TOP = 229;
const HAZE = '#b7cfc4';
/** Warm sunlit pines for the near trees. */
const PINE_SUNNY: PinePalette = { dark: '#244d3c', mid: '#37704f', light: '#74ab62', trunk: '#5b4030', trunkShade: '#3d2a22' };
const GRASS = { base: '#86a85e', dark: '#6f9553', light: '#a0be6c' } as const;
const GRAVEL = { base: '#bfb190', light: '#d6cba9', dark: '#9c8f72' } as const;
const STONE = { base: '#9a948a', light: '#c5beb0', dark: '#5f5a55' } as const;
const FLOWERS = ['#f2d24a', '#f6f2e0', '#b28ad8', '#f08aa8'];
const FAR_TREE_STEP = 11;
/** The mid pines: where (share of width), how tall, which row the trunk foot is on, and which shape. */
const MID_PINES: readonly (readonly [number, number, number, number])[] = [
  [0.012, 118, 208, 0], [0.4, 52, 196, 1], [0.47, 44, 194, 3], [0.54, 50, 196, 2], [0.6, 46, 196, 0],
  [0.7, 100, 205, 0], [0.76, 108, 208, 1], [0.84, 92, 204, 2], [0.9, 106, 208, 3], [0.975, 100, 206, 0],
];
const SWAY_FAR = 1;
const SWAY_NEAR = 2;
const TUFT_GAP = 7;

export interface MidTree {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  amount: number;
}

export interface Tuft {
  x: number;
  y: number;
  variant: number;
}

/** A row of small, hazy, still pines that fades the hills into the forest. */
function paintFarPines(ctx: Ctx, width: number, base: number, sizes: readonly number[], fade: number, seed: number): void {
  const palette = fadePalette(PINE_SUNNY, HAZE, fade);
  const sprites = sizes.flatMap((size) => Array.from({ length: PINE_VARIANTS }, (_, v) => pineTree(v, size, palette)));
  for (let x = -4, i = 0; x < width + 8; x += FAR_TREE_STEP, i++) {
    const sprite = sprites[Math.floor(hash(i + seed) * sprites.length)];
    const y = base + Math.round(noise(i * 0.6 + seed) * 5);
    ctx.drawImage(sprite, Math.round(x - sprite.width / 2 + hash(i * 3 + seed) * 5), y - sprite.height);
  }
}

function paintGrassAndLot(ctx: Ctx, width: number, layout: ShackLayout): void {
  const g = layout.geometry;
  for (let x = 0; x < width; x++) {
    const top = GROUND_TOP + Math.round(noise(x / 40 + 4) * 4);
    rect(ctx, GRASS.base, x, top, 1, DESIGN_HEIGHT - top);
    const lot = LOT_TOP + Math.round(noise(x / 25 + 9) * 7) + (x < g.x0 - 14 ? 12 : 0);
    rect(ctx, GRAVEL.base, x, lot, 1, DESIGN_HEIGHT - lot);
    rect(ctx, GRASS.dark, x, lot - 1, 1, 1);
    if (hash(x * 1.7) < 0.5) rect(ctx, GRASS.light, x, lot - 2, 1, 1);
  }
  for (let y = GROUND_TOP; y < LOT_TOP; y += 8) ditherFill(ctx, 0, y + 3, width, 4, GRASS.base, GRASS.dark, 0.22);
  ditherFill(ctx, 0, GROUND_TOP, width, 6, GRASS.base, GRASS.light, 0.3);
  for (let x = 0; x < width; x++) {
    for (let y = LOT_TOP + 8; y < DESIGN_HEIGHT; y++) {
      const n = hash(x * 5.3 + y * 11.9);
      if (n < 0.05) rect(ctx, GRAVEL.dark, x, y, 1, 1);
      else if (n > 0.955) rect(ctx, GRAVEL.light, x, y, 1, 1);
    }
  }
  // Two wheel ruts curving away from the porch toward the road, drawn as dithered dark bands.
  for (let y = LOT_TOP + 6; y < DESIGN_HEIGHT; y++) {
    const drift = Math.round((y - LOT_TOP) * 0.9);
    for (const rutX of [g.doorX - 14 + drift, g.doorX + 8 + drift]) {
      for (let dx = 0; dx < 3; dx++) if (bayer(rutX + dx, y) < 0.55) rect(ctx, GRAVEL.dark, rutX + dx, y, 1, 1);
    }
  }
  const rand = seeded(17);
  for (let i = 0; i < 26; i++) {
    const x = Math.round(rand() * width);
    const y = LOT_TOP + 12 + Math.round(rand() * (DESIGN_HEIGHT - LOT_TOP - 16));
    ctx.drawImage(rock(2 + Math.round(rand() * 3), 2, i, STONE), x, y);
  }
}

/** Wildflowers, dandelions and pine cones in the grass behind the lot, kept clear of the buildings and the fence. */
function paintGrassDetail(ctx: Ctx, width: number, layout: ShackLayout): void {
  const g = layout.geometry;
  const rand = seeded(5);
  for (let i = 0; i < 70; i++) {
    const x = Math.round(rand() * width);
    const y = GROUND_TOP + 6 + Math.round(rand() * 22);
    if (x > g.x0 - 10 && x < layout.vending.x + layout.vending.w + 10) continue;
    if (x > layout.fence.x - 4) continue;
    rect(ctx, GRASS.dark, x, y, 1, 3);
    rect(ctx, FLOWERS[i % FLOWERS.length], x - 1, y - 1, 3, 1);
    rect(ctx, '#fff3a8', x, y - 1, 1, 1);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.round(rand() * width);
    const y = LOT_TOP + 2 + Math.round(rand() * 10);
    ellipse(ctx, '#6b4a35', x, y, 1, 1);
    rect(ctx, '#8d6a4a', x, y - 1, 1, 1);
  }
}

/** Paints sky-side land into the back layer: hills, far pines, grass, gravel lot and the small detail on them. */
export function paintBackdrop(ctx: Ctx, width: number, layout: ShackLayout): void {
  ridge(ctx, width, { base: 178, top: 112, scale: 90, seed: 3, color: '#a3beb4', mist: '#c3d8ce' });
  paintFarPines(ctx, width, 184, [22, 28, 34], 0.62, 1);
  ridge(ctx, width, { base: 192, top: 148, scale: 60, seed: 11, color: mix('#8fb0a3', HAZE, 0.3), mist: '#b4cdc1' });
  paintFarPines(ctx, width, 197, [34, 42, 50], 0.42, 40);
  ellipse(ctx, '#3a6a58', layout.peek.x, layout.peek.y, 8, 6);
  ellipse(ctx, '#1d3f37', layout.peek.x, layout.peek.y, 6, 5);
  paintGrassAndLot(ctx, width, layout);
  paintGrassDetail(ctx, width, layout);
}

/** The swaying pines behind the shack, built once. The tallest stand at the sides; the middle ones stay short and hazy. */
export function buildMidTrees(width: number): MidTree[] {
  return MID_PINES.map(([share, height, foot, variant]) => {
    const far = height < 60;
    const palette = far ? fadePalette(PINE_SUNNY, HAZE, 0.3) : PINE_SUNNY;
    return { sprite: pineTree(variant, height, palette), x: Math.round(share * width), y: foot, amount: far ? SWAY_FAR : SWAY_NEAR };
  });
}

export function drawMidTrees(ctx: Ctx, trees: readonly MidTree[], time: number): void {
  for (const t of trees) drawSwayTree(ctx, t.sprite, t.x, t.y, time, t.amount);
}

/**
 * Where grass tufts grow: `back` tufts stand behind the buildings' feet (drawn before them), `front` tufts
 * along the bottom edge (drawn over the cast), with the middle left bare so the radio stays clear.
 */
export function scatterTufts(width: number, layout: ShackLayout): { back: Tuft[]; front: Tuft[] } {
  const g = layout.geometry;
  const back: Tuft[] = [];
  const front: Tuft[] = [];
  for (let x = 2, i = 0; x < width; x += TUFT_GAP, i++) {
    const variant = Math.floor(hash(i + 70) * 6);
    const clear = x > g.x0 - 8 && x < layout.vending.x + layout.vending.w + 12;
    if (!clear && x < layout.fence.x - 6) back.push({ x, y: GROUND_TOP + 12 + Math.round(hash(i * 2.1) * 14), variant });
    if (x < width * 0.35 || x > width * 0.65) front.push({ x: x + 2, y: DESIGN_HEIGHT - Math.round(hash(i * 4.3) * 5), variant });
  }
  return { back, front };
}

export function drawTufts(ctx: Ctx, sheet: HTMLCanvasElement, tufts: readonly Tuft[], time: number, amount: number): void {
  for (const t of tufts) drawGrass(ctx, sheet, t.x, t.y, t.variant, time, amount);
}

/** Foreground frame: a big trunk at the left edge with rough bark, and a drooping branch of needles in the top right. */
export function paintForeground(ctx: Ctx, width: number): void {
  const trunk = 9;
  rect(ctx, '#3a281f', 0, 0, trunk, DESIGN_HEIGHT);
  rect(ctx, '#5b4030', 0, 0, 3, DESIGN_HEIGHT);
  rect(ctx, '#241812', trunk - 2, 0, 2, DESIGN_HEIGHT);
  for (let y = 0; y < DESIGN_HEIGHT; y += 5) rect(ctx, '#241812', Math.round(hash(y) * 5), y, 2 + Math.round(hash(y + 3) * 3), 1);
  const dark = PINE_SUNNY.dark;
  for (let i = 0; i < 9; i++) {
    const x = width - 6 - i * 9;
    const drop = 6 + Math.round(noise(i * 0.8) * 10) + i * 2;
    rect(ctx, '#3a281f', x, 4 + i, 9, 2);
    for (let n = 0; n < 5; n++) rect(ctx, n % 2 ? PINE_SUNNY.mid : dark, x + n * 2, 6 + i, 1, drop - i);
    rect(ctx, PINE_SUNNY.light, x + 1, 6 + i, 1, 3);
  }
}
