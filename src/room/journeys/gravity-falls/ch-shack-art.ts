/**
 * Morning at the Shack, part one: where things stand, the far-to-near strips (hills, two tree lines, undergrowth,
 * gravel ground) and the small yard props. Everything is painted once when the chapter is built.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, disc, ellipse, mix, mushroom, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_FOREST, PINE_VARIANTS, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import { SHACK } from '../../landscapes/gravity-falls/shack-art';
import { noise } from '../noise';
import { DESIGN_ROWS } from './world';

/** Where things stand, in pixels left (-) or right (+) of the porch centre `pc` (the centre of the shack's front). */
export const X = {
  billboard: -520, mailbox: -452, cans: -400, tyres: -372, cart: -330, parking: -285, flamingo: -168,
  leftWindow: -125, door: -70, openSign: -44, lantern: -50, peak: -5, shopWindow: 53, awningLeft: 10, awningRight: 110,
  chimney: 92, vending: 128, sideWindow: 188, drainpipe: 144, laundryLeft: 246, laundryRight: 328,
  woodpile: 356, block: 404, barrel: 432, shed: 509, crates: 568, barrow: 602, fence: 628,
} as const;
/** The front of the shack spans this far either side of `pc`; the side wall runs on to `SIDE_END`. */
export const FRONT_HALF = 140;
export const SIDE_END = 236;

/** Rows: the grass verge starts at GROUND_TOP, the gravel at ROAD_TOP, the shack wall stands on BASE. */
export const GROUND_TOP = 212;
export const ROAD_TOP = 224;
export const BASE = 224;
/** Rows where the shack's wall begins under the roof, where the porch's front board ends. */
export const WALL_TOP = 178;
export const PORCH_BOTTOM = 236;

/** Warm morning haze that far things sink into. */
export const HAZE = '#d9c89b';
const GRASS = '#8c9650';
const GRASS_LIGHT = '#a9b05d';
const GRASS_DARK = '#6d7a38';
const GRAVEL = '#cbab78';
const GRAVEL_LIGHT = '#e6cc9a';
const GRAVEL_DARK = '#a98a5c';
const RUT = '#8f7549';
const FLOWERS = ['#f4d35e', '#f6f1e0', '#e58fb0', '#8ab4e8'] as const;
const STONE = { base: '#8f8a7c', light: '#bdb7a2', dark: '#5f5a4e' };
const EDGE_SLACK = 8;
/** Fixed seeds: every build paints the same chapter. */
const SEED_GROUND = 7;
const SEED_HEDGE = 41;

/** Width of a strip that scrolls at `factor` of the camera: enough to cover the whole walk without repeating. */
export function stripWidth(worldWidth: number, factor: number, viewWidth: number): number {
  return Math.ceil(worldWidth * factor) + viewWidth + EDGE_SLACK;
}

/** Far blue-green hills sunk in haze, with a solid haze foot so no sky shows between them and the trees. */
export function buildHills(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  ridge(ctx, width, { base: 196, top: 118, scale: 90, seed: 3, color: '#9bb0a0', mist: HAZE });
  ridge(ctx, width, { base: 204, top: 140, scale: 52, seed: 17, color: '#82a08c', mist: HAZE });
  rect(ctx, mix(HAZE, '#82a08c', 0.4), 0, 204, width, DESIGN_ROWS - 204);
  return canvas;
}

export interface LineLook {
  /** Row the trunks stand on. */
  base: number;
  sizeMin: number;
  sizeMax: number;
  /** Average distance between trees. */
  gap: number;
  /** How far the pines are pulled toward the haze (0..1). */
  fade: number;
  seed: number;
}

/** A row of pines sinking into haze. Sprites are shared per size so a long strip stays cheap to build. */
export function buildTreeLine(width: number, look: LineLook): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const palette = fadePalette(PINE_FOREST, HAZE, look.fade);
  const rand = seeded(look.seed);
  const sprites = new Map<number, HTMLCanvasElement>();
  rect(ctx, palette.dark, 0, look.base - 3, width, DESIGN_ROWS - look.base + 3);
  for (let x = -look.gap; x < width + look.gap; x += look.gap * (0.7 + rand() * 0.6)) {
    const size = Math.round(look.sizeMin + rand() * (look.sizeMax - look.sizeMin));
    const variant = Math.floor(rand() * PINE_VARIANTS);
    const key = size * PINE_VARIANTS + variant;
    let tree = sprites.get(key);
    if (!tree) {
      tree = pineTree(variant, size, palette);
      sprites.set(key, tree);
    }
    ctx.drawImage(tree, Math.round(x - tree.width / 2), look.base - tree.height);
  }
  return canvas;
}

/** A round bush: dark body, lit upper left, a few sun-bright leaf flecks kept inside its outline. */
function bush(ctx: Ctx, x: number, base: number, rx: number, ry: number, rand: () => number): void {
  ellipse(ctx, '#27432f', x, base - ry, rx, ry);
  ellipse(ctx, '#3d6a45', x - 1, base - ry - 1, rx - 2, ry - 2);
  for (let i = 0; i < rx; i++) {
    const dx = (rand() * 1.2 - 0.6) * rx;
    const top = base - ry - Math.sqrt(1 - (dx / rx) * (dx / rx)) * ry;
    rect(ctx, rand() < 0.5 ? '#6f9d52' : '#8fb85f', x + dx, top + 1 + rand() * ry * 0.6, 2, 1);
  }
}

/** The undergrowth just behind the lot: bushes, boulders, toadstools and wildflowers on a solid dark floor. */
export function buildHedge(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(SEED_HEDGE);
  const stones = [rock(18, 11, 1, STONE), rock(26, 14, 2, STONE), rock(14, 9, 3, STONE)];
  const cap = mushroom(7, SHACK.red, '#f4ecd2', '#e8dcc0');
  rect(ctx, '#3d5a3a', 0, GROUND_TOP - 2, width, DESIGN_ROWS - GROUND_TOP + 2);
  let sinceStone = 0;
  for (let x = 0; x < width; x += 20 + rand() * 24) {
    bush(ctx, x, GROUND_TOP + 4, 12 + rand() * 10, 7 + rand() * 6, rand);
    sinceStone += 1;
    if (sinceStone >= 6) {
      const stone = stones[Math.floor(rand() * stones.length)];
      ctx.drawImage(stone, Math.round(x + 14), GROUND_TOP + 6 - stone.height);
      if (rand() < 0.6) ctx.drawImage(cap, Math.round(x + 14 + stone.width), GROUND_TOP + 6 - cap.height);
      sinceStone = 0;
    }
    if (rand() < 0.4) rect(ctx, FLOWERS[Math.floor(rand() * FLOWERS.length)], x + 8, GROUND_TOP + 3, 2, 2);
  }
  return canvas;
}

/** The ground the cast stands on: a sun-baked verge, a gravel road and lot with ruts and pebbles, weeds and wildflowers. */
export function buildGround(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(SEED_GROUND);
  rect(ctx, GRASS, 0, GROUND_TOP, width, DESIGN_ROWS - GROUND_TOP);
  for (let i = 0; i < width / 5; i++) {
    rect(ctx, GRASS_LIGHT, rand() * width, GROUND_TOP + rand() * (ROAD_TOP - GROUND_TOP), 3 + rand() * 4, 1);
  }
  for (let x = 0; x < width; x++) {
    const edge = ROAD_TOP + Math.round(noise(x / 11 + 5) * 4);
    rect(ctx, GRAVEL, x, edge, 1, DESIGN_ROWS - edge);
    if (bayer(x, edge - 1) < 0.5) rect(ctx, GRASS_DARK, x, edge - 1, 1, 1);
    if (noise(x / 40 + 90) > 0.25) {
      rect(ctx, RUT, x, 236, 1, 2);
      if (bayer(x, 238) < 0.5) rect(ctx, RUT, x, 238, 1, 1);
    }
    if (noise(x / 55 + 140) > 0.3) rect(ctx, RUT, x, 247, 1, 2);
  }
  for (let i = 0; i < width * 0.6; i++) {
    const tone = rand();
    rect(ctx, tone < 0.45 ? GRAVEL_LIGHT : tone < 0.85 ? GRAVEL_DARK : '#8f8a80', rand() * width, ROAD_TOP + 4 + rand() * 26, 1 + (rand() < 0.3 ? 1 : 0), 1);
  }
  for (let x = 4; x < width; x += 12 + rand() * 10) {
    const rise = 3 + Math.floor(rand() * 3);
    rect(ctx, GRASS_DARK, x, ROAD_TOP - rise + 2, 1, rise);
    rect(ctx, '#b8b560', x + 1, ROAD_TOP - rise + 1, 1, 1);
    rect(ctx, GRASS_DARK, x + 2, ROAD_TOP - rise + 3, 1, rise - 1);
  }
  for (let x = 10; x < width; x += 22 + rand() * 16) {
    const y = GROUND_TOP + 3 + rand() * 6;
    rect(ctx, GRASS_DARK, x, y + 1, 1, 2);
    rect(ctx, FLOWERS[Math.floor(rand() * FLOWERS.length)], x - 1, y - 1, 2, 2);
  }
  return canvas;
}

/** A tourist golf cart facing right: cream body with a teal stripe, a striped canopy, bench seat, wheel and lamp. */
export function paintCart(ctx: Ctx, cx: number, base: number): void {
  const x0 = cx - 19;
  rect(ctx, GRAVEL_DARK, x0 + 1, base, 36, 1);
  rect(ctx, '#e6dcc0', x0 + 2, base - 14, 34, 8);
  rect(ctx, '#bfb28f', x0 + 2, base - 7, 34, 1);
  rect(ctx, SHACK.trim, x0 + 2, base - 11, 34, 2);
  rect(ctx, '#e6dcc0', x0 + 32, base - 12, 6, 6);
  rect(ctx, '#7b4636', x0 + 6, base - 21, 9, 7);
  rect(ctx, '#a8694f', x0 + 6, base - 15, 11, 2);
  for (let i = 0; i < 7; i++) rect(ctx, i % 2 === 0 ? SHACK.trim : SHACK.cream, x0 + 3 + i * 4, base - 28, 4, 3);
  rect(ctx, SHACK.trimDark, x0 + 3, base - 25, 28, 1);
  rect(ctx, SHACK.outline, x0 + 4, base - 25, 1, 11);
  rect(ctx, SHACK.outline, x0 + 30, base - 25, 1, 11);
  rect(ctx, SHACK.glassLight, x0 + 31, base - 24, 1, 9);
  rect(ctx, SHACK.outline, x0 + 26, base - 19, 3, 1);
  rect(ctx, SHACK.lamp, x0 + 37, base - 11, 1, 2);
  rect(ctx, SHACK.red, x0 + 20, base - 13, 2, 2);
  for (const wx of [x0 + 9, x0 + 29]) {
    disc(ctx, '#2a2622', wx, base - 4, 4);
    disc(ctx, '#8e8a82', wx, base - 4, 1);
  }
}

/** A free-standing soda machine, `x`,`y` its top-left corner: red body, glass front with three shelves, coin slot and tray. */
export function paintVending(ctx: Ctx, x: number, y: number): void {
  const goods = ['#e8b23a', '#4a9fd0', '#c4473b', '#7fb85a'];
  rect(ctx, SHACK.outline, x - 1, y - 1, 22, 38);
  rect(ctx, '#b8383a', x, y, 20, 36);
  rect(ctx, '#8a2a2e', x + 18, y, 2, 36);
  rect(ctx, '#f1e6c4', x + 2, y + 2, 14, 5);
  rect(ctx, SHACK.outline, x + 4, y + 3, 10, 1);
  rect(ctx, SHACK.outline, x + 4, y + 5, 6, 1);
  rect(ctx, '#2a3a44', x + 2, y + 9, 13, 18);
  for (let shelf = 0; shelf < 3; shelf++) {
    rect(ctx, '#9aa6ad', x + 2, y + 14 + shelf * 6, 13, 1);
    for (let i = 0; i < 4; i++) rect(ctx, goods[(i + shelf) % goods.length], x + 3 + i * 3, y + 10 + shelf * 6, 2, 4);
  }
  rect(ctx, '#d6d6d6', x + 16, y + 10, 2, 4);
  for (let b = 0; b < 3; b++) rect(ctx, '#f1e6c4', x + 16, y + 16 + b * 3, 2, 2);
  rect(ctx, '#1b1b1b', x + 3, y + 29, 13, 5);
  rect(ctx, '#5a5a5a', x + 3, y + 29, 13, 1);
}

/** The roadside mailbox on its post: red box, little flag, and a dithered shadow. */
export function paintMailbox(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, SHACK.wood, cx - 1, base - 16, 3, 16);
  rect(ctx, SHACK.woodDark, cx + 1, base - 16, 1, 16);
  rect(ctx, SHACK.outline, cx - 6, base - 22, 13, 7);
  rect(ctx, SHACK.red, cx - 5, base - 21, 11, 5);
  rect(ctx, '#e88a7e', cx - 5, base - 21, 11, 1);
  rect(ctx, SHACK.outline, cx + 7, base - 25, 1, 6);
  rect(ctx, SHACK.lamp, cx + 8, base - 25, 3, 2);
}

/** A plastic pink flamingo on a stake, the Shack's idea of landscaping. */
export function paintFlamingo(ctx: Ctx, cx: number, base: number): void {
  const pink = '#f08fae';
  rect(ctx, '#7a7a7a', cx, base - 9, 1, 9);
  rect(ctx, '#7a7a7a', cx + 2, base - 9, 1, 7);
  ellipse(ctx, pink, cx + 1, base - 12, 4, 3);
  rect(ctx, pink, cx + 4, base - 20, 2, 8);
  rect(ctx, pink, cx + 3, base - 22, 4, 2);
  rect(ctx, SHACK.outline, cx + 6, base - 21, 1, 1);
  rect(ctx, '#e8a23a', cx + 7, base - 22, 2, 1);
  rect(ctx, '#c76b88', cx - 2, base - 11, 3, 2);
}

/** Two dented trash cans with lids, side by side. */
export function paintCans(ctx: Ctx, cx: number, base: number): void {
  for (const dx of [-6, 6]) {
    rect(ctx, SHACK.outline, cx + dx - 5, base - 14, 10, 14);
    rect(ctx, '#8a949a', cx + dx - 4, base - 13, 8, 13);
    rect(ctx, '#b9c3c8', cx + dx - 4, base - 13, 2, 13);
    rect(ctx, '#5f6a70', cx + dx + 2, base - 13, 2, 13);
    rect(ctx, '#6e787e', cx + dx - 5, base - 15, 10, 2);
    rect(ctx, SHACK.outline, cx + dx - 1, base - 17, 3, 2);
    rect(ctx, '#5f6a70', cx + dx - 3, base - 8, 6, 1);
  }
}

/** A stack of three old tyres. */
export function paintTyres(ctx: Ctx, cx: number, base: number): void {
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, '#232323', cx, base - 3 - i * 5, 8, 3);
    ellipse(ctx, '#3a3a3a', cx, base - 4 - i * 5, 6, 2);
    rect(ctx, '#1a1a1a', cx - 3, base - 4 - i * 5, 6, 1);
  }
}

/** The water barrel: banded wooden staves, iron hoops, a lid of water on top, a tap and a puddle. */
export function paintBarrel(ctx: Ctx, cx: number, base: number): void {
  for (let i = 0; i < 9; i++) rect(ctx, '#8aa8b8', cx - 14 + i * 3, base, 3, 1);
  rect(ctx, SHACK.outline, cx - 8, base - 22, 17, 22);
  rect(ctx, '#7b5a3a', cx - 7, base - 21, 15, 21);
  for (let sx = cx - 7; sx < cx + 8; sx += 4) rect(ctx, '#5e4228', sx + 3, base - 21, 1, 21);
  rect(ctx, '#9a7650', cx - 7, base - 21, 2, 21);
  rect(ctx, '#5a626a', cx - 8, base - 17, 17, 2);
  rect(ctx, '#5a626a', cx - 8, base - 6, 17, 2);
  rect(ctx, '#6fb4d6', cx - 6, base - 22, 13, 2);
  rect(ctx, '#c9ecf6', cx - 4, base - 22, 3, 1);
  rect(ctx, '#c0b060', cx - 11, base - 7, 3, 2);
  rect(ctx, '#c0b060', cx - 11, base - 5, 1, 2);
}

/** A stack of three wooden crates with crossed slats. */
export function paintCrates(ctx: Ctx, cx: number, base: number): void {
  const crate = (x: number, y: number): void => {
    rect(ctx, SHACK.outline, x, y, 14, 12);
    rect(ctx, SHACK.wood, x + 1, y + 1, 12, 10);
    rect(ctx, SHACK.woodLight, x + 1, y + 1, 12, 1);
    rect(ctx, SHACK.woodDark, x + 1, y + 5, 12, 1);
    rect(ctx, SHACK.woodDark, x + 6, y + 1, 1, 10);
  };
  crate(cx - 15, base - 12);
  crate(cx + 1, base - 12);
  crate(cx - 7, base - 24);
}

/** A wheelbarrow of soil, tipped on its single wheel and rest legs. */
export function paintBarrow(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, SHACK.outline, cx - 10, base - 13, 21, 8);
  rect(ctx, '#4f7a5a', cx - 9, base - 12, 19, 6);
  rect(ctx, '#7fa88a', cx - 9, base - 12, 19, 1);
  rect(ctx, '#5a3f2a', cx - 8, base - 15, 15, 3);
  rect(ctx, SHACK.woodDark, cx + 9, base - 7, 10, 1);
  rect(ctx, SHACK.woodDark, cx - 8, base - 6, 1, 6);
  rect(ctx, SHACK.woodDark, cx + 4, base - 6, 1, 6);
  disc(ctx, '#2a2622', cx - 11, base - 4, 4);
  disc(ctx, '#8e8a82', cx - 11, base - 4, 1);
}

/** The woodpile: staggered log ends in four rows between two posts, with a few split pieces leaning on it. */
export function paintWoodpile(ctx: Ctx, cx: number, base: number): void {
  const counts = [7, 6, 7, 5];
  rect(ctx, SHACK.woodDark, cx - 25, base - 23, 3, 23);
  rect(ctx, SHACK.woodDark, cx + 22, base - 23, 3, 23);
  counts.forEach((count, row) => {
    const y = base - 4 - row * 5;
    const left = cx - ((count - 1) * 6) / 2;
    for (let i = 0; i < count; i++) {
      disc(ctx, '#6e4a2e', left + i * 6, y, 3);
      disc(ctx, '#c99a5e', left + i * 6, y, 2);
      rect(ctx, '#8b5f37', left + i * 6, y, 1, 1);
    }
  });
  rect(ctx, '#7a5a3a', cx - 26, base - 24, 53, 2);
  splitLog(ctx, cx + 25, base);
}

/** One split log leaning on the right post. */
function splitLog(ctx: Ctx, x: number, base: number): void {
  for (let i = 0; i < 12; i++) rect(ctx, '#a0703c', x + 1 + Math.floor(i / 4), base - 2 - i, 2, 1);
}

/** The chopping block with an axe stuck in it, and a scatter of chips on the ground. */
export function paintBlock(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, SHACK.outline, cx - 7, base - 13, 15, 13);
  rect(ctx, '#a0703c', cx - 6, base - 12, 13, 12);
  rect(ctx, '#c99a5e', cx - 6, base - 12, 13, 3);
  rect(ctx, '#8b5f37', cx - 2, base - 11, 5, 1);
  rect(ctx, '#6e4a2e', cx + 3, base - 9, 4, 9);
  for (let i = 0; i < 12; i++) rect(ctx, SHACK.woodDark, cx - 1 + Math.floor(i / 3), base - 12 - i, 1, 1);
  rect(ctx, '#aab4ba', cx + 2, base - 24, 5, 4);
  rect(ctx, '#dde6ea', cx + 2, base - 24, 5, 1);
  for (const dx of [-12, -9, 11, 14]) rect(ctx, '#c99a5e', cx + dx, base - 1, 2, 1);
}
