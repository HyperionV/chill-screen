/**
 * The Hidden Hollow, part two: the ground strip the cast walks on. A violet lawn with a worn flagstone path, roots
 * arching across the trail, ferns and wildflowers along the verge, the hillside bank with the round door in it (stone
 * ring, lintel, steps and roots; the door itself is drawn over this by the mystery board), the three standing stones and
 * the props of the clearing. Painted once. The stones, the door's surround and the props reuse the Landscape's painters.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ditherFill, ellipse, rect, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { DOOR_RADIUS, EARTH, GROUND, MOSS, MOUND_FOOT, MOUND_PEAK, ROOT, STONE } from '../../landscapes/gravity-falls/hidden-layout';
import { paintProps } from '../../landscapes/gravity-falls/hidden-props';
import { buildRuneSheets, paintDoorSurround, paintStones, runeSlots, type Rune, type RuneSheets } from '../../landscapes/gravity-falls/hidden-stones';
import { hash, noise } from '../noise';
import { BANK_HALF, buildFern, type HollowLayout } from './ch-hidden-art';
import { DESIGN_ROWS } from './world';

/** What the chapter needs from the painted ground: where the lamp shines from and the carved runes with their pictures. */
export interface Ground {
  readonly canvas: HTMLCanvasElement;
  readonly lamp: Point;
  readonly runes: readonly Rune[];
  readonly sheets: RuneSheets;
}

const GROUND_SEED = 5;
const LAWN_TOP = 196;
const LAWN_WOBBLE = 4;
const LAWN_BAND_FIRST = 200;
const LAWN_BAND_STEP = 9;
const SPECK_FROM = 212;
const SPECK_DARK = 0.04;
const SPECK_LIGHT = 0.965;

/** The worn path: a lighter band of lawn with flagstones in it, where the cast's feet are. */
const PATH_TOP = 227;
const PATH_ROWS = 15;
const PATH_LEVEL = 0.2;
const FLAG_STEP = 12;
const FLAG_ROW = 234;
const FLAG_SHADE = '#6f6a9c';
const PEBBLE_COUNT_PER_PIXEL = 0.03;
const PEBBLE_TOP = 244;
const PEBBLE_ROWS = 20;

/** The bank: its grass cap, its foot line and the shade across its soil. */
const BANK_CAP_ROWS = 3;
const BANK_BUMP = 3;
const BANK_FLAT_SHARE = 0.6;
const BANK_SHADE_BASE = 0.12;
const BANK_SHADE_ACROSS = 0.35;
const FOOT_SHADE_ROWS = 5;
const FOOT_SHADE_MAX = 0.4;
const STRATA_EVERY = 9;
const FOOT_BLEND_ROWS = 3;

/** Roots and vines on the bank. */
const ARCH_STEPS = 60;
const ARCH_START = 1.12;
const ARCH_SPAN = 0.76;
const ROOT_DROPS: readonly (readonly [number, number, number, number])[] = [[-19, -22, 1, 3], [17, 22, 2, 3], [30, 28, 3, 2], [-31, -29, 4, 2]];
const ROOT_DROP_FOOT = 220;
const VINES: readonly (readonly [number, number])[] = [[24, 18], [34, 14], [-17, 16]];
const VINE_LEAF = '#8fd6b0';
const HANGING_ROOT_STEP = 4;
const HANGING_ROOT_SKIP = 0.45;

/** Roots arching across the path near the start, where the trail climbs through them. */
const ARCH_FIRST = 90;
const ARCH_GAP = 130;
const ARCH_COUNT = 5;
const ARCH_WIDTH = 30;
const ARCH_HEIGHT = 5;
const ARCH_ROW = 237;

/** Verge: ferns, mossy rocks, wildflowers and fallen leaves along the lawn behind the path. */
const VERGE_GAP = 18;
const VERGE_SPREAD = 30;
const VERGE_FOOT = 222;
const VERGE_FOOT_SPREAD = 5;
const VERGE_KEEP_CLEAR = 30;
const FERN_REACHES = [8, 12, 15] as const;
const VERGE_FLOWERS = ['#c9a8ff', '#f4e6ff', '#ffd36a', '#8ff0e0'] as const;
const FALLEN_LEAVES = ['#c9a8ff', '#f0c870'] as const;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Row of the lawn's top edge at column `x`. */
const lawnTop = (x: number): number => LAWN_TOP + Math.round(noise(x / 40 + 4) * LAWN_WOBBLE);

/** Row of the bank's top at column `x` (the rounded hill, falling back to the lawn at its ends). */
function bankTop(centre: number, x: number): number {
  const lawn = lawnTop(x);
  const lift = 1 - smooth(Math.min(1, Math.abs(x - centre) / BANK_HALF));
  return Math.round(lawn - (lawn - MOUND_PEAK) * lift + (noise(x / 9 + 2) - 0.5) * 2 * BANK_BUMP);
}

/** Violet-blue grass with a dark rim, soft darker bands and fine specks, from the horizon to the bottom. */
function paintLawn(ctx: Ctx, width: number): void {
  for (let x = 0; x < width; x++) {
    const top = lawnTop(x);
    rect(ctx, GROUND.base, x, top, 1, DESIGN_ROWS - top);
    rect(ctx, GROUND.dark, x, top, 1, 1);
    if (hash(x * 1.7) < 0.5) rect(ctx, GROUND.light, x, top + 1, 1, 1);
  }
  for (let y = LAWN_BAND_FIRST; y < DESIGN_ROWS; y += LAWN_BAND_STEP) ditherFill(ctx, 0, y + 3, width, 4, GROUND.base, GROUND.dark, 0.22);
  ditherFill(ctx, 0, LAWN_TOP + 2, width, 6, GROUND.base, GROUND.light, 0.3);
  for (let x = 0; x < width; x++) {
    for (let y = SPECK_FROM; y < DESIGN_ROWS; y++) {
      const n = hash(x * 5.3 + y * 11.9);
      if (n < SPECK_DARK) rect(ctx, GROUND.dark, x, y, 1, 1);
      else if (n > SPECK_LIGHT) rect(ctx, GROUND.light, x, y, 1, 1);
    }
  }
}

/** Row where the bank's foot meets the lawn at column offset `t` (0 middle, 1 end): flat in the middle, rising to the soil's top at the ends. */
function bankFoot(t: number, soilTop: number): number {
  if (t <= BANK_FLAT_SHARE) return MOUND_FOOT;
  return Math.round(MOUND_FOOT + (soilTop - MOUND_FOOT) * smooth((t - BANK_FLAT_SHARE) / (1 - BANK_FLAT_SHARE)));
}

/** The hillside bank: a grassy cap, soil with strata and dithered shade, and a shadow where it meets the lawn. */
function paintBank(ctx: Ctx, centre: number): void {
  const from = centre - BANK_HALF;
  for (let x = from; x <= centre + BANK_HALF; x++) {
    const top = bankTop(centre, x);
    const cap = BANK_CAP_ROWS + (hash(x * 2.9) < 0.4 ? 1 : 0);
    rect(ctx, GROUND.light, x, top, 1, 1);
    rect(ctx, GROUND.base, x, top + 1, 1, cap - 1);
    rect(ctx, GROUND.dark, x, top + cap, 1, 1);
    const soilTop = top + cap + 1;
    const foot = bankFoot(Math.abs(x - centre) / BANK_HALF, soilTop);
    rect(ctx, EARTH.base, x, soilTop, 1, Math.max(0, foot - soilTop));
    for (let y = soilTop; y < foot; y++) {
      const ao = y > foot - FOOT_SHADE_ROWS ? ((y - (foot - FOOT_SHADE_ROWS)) / FOOT_SHADE_ROWS) * FOOT_SHADE_MAX : 0;
      const shade = BANK_SHADE_BASE + BANK_SHADE_ACROSS * ((x - from) / (BANK_HALF * 2)) + ao;
      const n = hash(x * 3.1 + y * 7.7);
      if (bayer(x, y) < shade || n < 0.05 || ((y - top) % STRATA_EVERY === 0 && n < 0.6)) rect(ctx, EARTH.dark, x, y, 1, 1);
      else if (n > 0.96) rect(ctx, EARTH.light, x, y, 1, 1);
    }
  }
  const flat = Math.round(BANK_HALF * BANK_FLAT_SHARE);
  ditherFill(ctx, centre - flat, MOUND_FOOT, flat * 2, FOOT_BLEND_ROWS, GROUND.base, GROUND.dark, 0.5);
}

/** A gnarled root wandering down the bank from (x, y0) to row `y1`, thick at the top, tapering, lit on its left edge. */
function rootDrop(ctx: Ctx, x: number, y0: number, drift: number, seed: number, thick: number): void {
  const length = ROOT_DROP_FOOT - y0;
  for (let i = 0; i <= length; i++) {
    const t = i / length;
    const rx = Math.round(x + drift * t + Math.sin(t * Math.PI * 2 + seed) * 3 * Math.sin(t * Math.PI));
    const w = Math.max(1, Math.round(thick * (1 - t * 0.6)));
    rect(ctx, ROOT.base, rx, y0 + i, w, 1);
    rect(ctx, ROOT.dark, rx + w, y0 + i, 1, 1);
    if (i % 3 !== 2) rect(ctx, ROOT.light, rx, y0 + i, 1, 1);
  }
}

/** A thin vine hanging from (x, y) with a leaf every few rows. */
function vine(ctx: Ctx, x: number, y: number, length: number, seed: number): void {
  for (let i = 0; i < length; i++) {
    const vx = x + Math.round(Math.sin(i * 0.5 + seed) * 1.2);
    rect(ctx, MOSS, vx, y + i, 1, 1);
    if (i % 4 === 3) rect(ctx, VINE_LEAF, vx + (i % 8 === 3 ? 1 : -2), y + i, 2, 1);
  }
}

/** Old roots arching over the door and running down the bank, hanging roots along its top edge and a few vines. */
function paintBankRoots(ctx: Ctx, layout: HollowLayout): void {
  const { door } = layout.spec;
  const centre = layout.bankCentre;
  const arch = DOOR_RADIUS + 6;
  for (let i = 0; i <= ARCH_STEPS; i++) {
    const angle = Math.PI * (ARCH_START + (ARCH_SPAN * i) / ARCH_STEPS);
    const x = Math.round(door.x + Math.cos(angle) * arch);
    const y = Math.round(door.y + Math.sin(angle) * arch);
    rect(ctx, ROOT.dark, x, y + 1, 3, 2);
    rect(ctx, ROOT.base, x, y, 3, 2);
    rect(ctx, ROOT.light, x, y, 1, 1);
  }
  for (const [from, to, seed, thick] of ROOT_DROPS) rootDrop(ctx, door.x + from, bankTop(centre, door.x + from) + BANK_CAP_ROWS, to - from, seed, thick);
  for (let x = centre - BANK_HALF + 6; x < centre + BANK_HALF - 6; x += HANGING_ROOT_STEP) {
    if (Math.abs(x - door.x) < DOOR_RADIUS + 6 || hash(x * 1.3) < HANGING_ROOT_SKIP) continue;
    const length = 3 + Math.floor(hash(x * 0.7) * 6);
    rect(ctx, ROOT.base, x, bankTop(centre, x) + BANK_CAP_ROWS + 1, 1, length);
    rect(ctx, ROOT.light, x, bankTop(centre, x) + BANK_CAP_ROWS + length, 1, 1);
  }
  for (const [dx, length] of VINES) vine(ctx, door.x + dx, bankTop(centre, door.x + dx) + BANK_CAP_ROWS + 1, length, dx);
}

/** The worn path: a lighter band with flagstones set in it and a scatter of pebbles on and below it. */
function paintPath(ctx: Ctx, width: number, rand: () => number): void {
  ditherFill(ctx, 0, PATH_TOP, width, PATH_ROWS, GROUND.base, GROUND.light, PATH_LEVEL);
  for (let x = FLAG_STEP, i = 0; x < width; x += FLAG_STEP + Math.floor(rand() * 4), i++) {
    const y = FLAG_ROW + Math.round(Math.sin(i * 1.7) * 2);
    ellipse(ctx, GROUND.dark, x, y, 4, 2);
    ellipse(ctx, FLAG_SHADE, x, y, 3, 1);
    rect(ctx, STONE.light, x - 2, y - 1, 2, 1);
  }
  for (let i = 0; i < width * PEBBLE_COUNT_PER_PIXEL; i++) {
    ctx.drawImage(rock(2 + Math.floor(rand() * 3), 2, i, STONE), Math.round(rand() * width), PEBBLE_TOP + Math.floor(rand() * PEBBLE_ROWS));
  }
}

/** Roots that arch across the path near the start, so the trail seems to climb through them. */
function paintPathRoots(ctx: Ctx): void {
  for (let k = 0; k < ARCH_COUNT; k++) {
    const left = ARCH_FIRST + k * ARCH_GAP + Math.round(hash(k * 3.7) * 20);
    for (let dx = 0; dx < ARCH_WIDTH; dx++) {
      const y = ARCH_ROW - Math.round(ARCH_HEIGHT * Math.sin((Math.PI * dx) / ARCH_WIDTH));
      rect(ctx, ROOT.dark, left + dx, y + 2, 1, 2);
      rect(ctx, ROOT.base, left + dx, y, 1, 2);
      if (dx % 3 !== 2) rect(ctx, ROOT.light, left + dx, y, 1, 1);
    }
  }
}

/** Ferns, mossy rocks, wildflowers and fallen leaves along the verge, left clear of the door's steps. */
function paintVerge(ctx: Ctx, layout: HollowLayout, rand: () => number): void {
  const ferns = FERN_REACHES.map(buildFern);
  const stones = [rock(10, 6, 3, STONE), rock(14, 8, 4, STONE)];
  const doorX = layout.spec.door.x;
  for (let x = 6; x < layout.worldWidth; x += VERGE_GAP + rand() * VERGE_SPREAD) {
    if (Math.abs(x - doorX) < VERGE_KEEP_CLEAR) continue;
    const y = VERGE_FOOT + Math.floor(rand() * VERGE_FOOT_SPREAD);
    const pick = rand();
    if (pick < 0.4) {
      const fern = ferns[Math.floor(rand() * ferns.length)];
      ctx.drawImage(fern, Math.round(x - fern.width / 2), y + 1 - fern.height);
    } else if (pick < 0.6) {
      const stone = stones[Math.floor(rand() * stones.length)];
      ctx.drawImage(stone, Math.round(x), y + 1 - stone.height);
      rect(ctx, MOSS, x + 2, y + 1 - stone.height, 4, 1);
    } else if (pick < 0.85) {
      rect(ctx, GROUND.dark, x, y - 2, 1, 3);
      rect(ctx, VERGE_FLOWERS[Math.floor(rand() * VERGE_FLOWERS.length)], x - 1, y - 3, 3, 1);
      rect(ctx, '#fff8d8', x, y - 3, 1, 1);
    } else {
      rect(ctx, FALLEN_LEAVES[Math.floor(rand() * FALLEN_LEAVES.length)], x, y, 2, 1);
    }
  }
}

/** Paints the whole ground strip and hands back what the lights and runes need. */
export function buildGround(layout: HollowLayout): Ground {
  const { canvas, ctx } = memoryCanvas(layout.worldWidth, DESIGN_ROWS);
  const rand = seeded(GROUND_SEED);
  paintLawn(ctx, layout.worldWidth);
  paintBank(ctx, layout.bankCentre);
  paintVerge(ctx, layout, rand);
  paintPath(ctx, layout.worldWidth, rand);
  paintDoorSurround(ctx, layout.spec);
  paintBankRoots(ctx, layout);
  const runes = runeSlots(layout.spec);
  paintStones(ctx, layout.spec, runes);
  const lamp = paintProps(ctx, layout.spec);
  paintPathRoots(ctx);
  return { canvas, lamp, runes, sheets: buildRuneSheets() };
}
