/**
 * The land of the Lake, painted once: the hazy far shore with the lake house, the reed islet's mud, the banks and the
 * sandy beach in front (with pebbles, flowers, a driftwood log), and the still foreground (the rowboat and some stones).
 */
import { bayer, ellipse, mix, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_FOREST, PINE_VARIANTS, fadePalette, pineTree, type PinePalette } from '../../gravity-falls/art-trees';
import { hash, noise, ramp } from '../../journeys/noise';
import { BOAT_RIM_ROW, BOAT_W, buildLakeHouse, buildRowboat } from './lake-art';
import { BANK_BASE, BEACH_TOP, BOAT_RIM, ISLET_BASE, WATERLINE, type LakeLayout } from './lake-layout';
import { DESIGN_HEIGHT } from './scene-art';

const HAZE = '#b4d8d6';
/** Cool blue-green pines for the far shore. */
const FAR_PINES: PinePalette = { ...PINE_FOREST, dark: '#2a5a58', mid: '#3d7a70', light: '#6fa890' };
const FAR_PINE_STEP = 10;
const GRASS = { base: '#5f9450', dark: '#437449', light: '#8cc064' } as const;
const SAND = { base: '#d3c697', light: '#e6dcb4', wet: '#b3a47c', dark: '#8f8260' } as const;
const FOAM = '#eaf6f2';
const FLOWERS = ['#f2d24a', '#f6f2e0', '#b28ad8', '#f08aa8'];
const STONE = { base: '#9a9a92', light: '#c5c5bb', dark: '#5f605c' } as const;
const FOOTING = '#6c7b77';
const MUD = '#6b5a43';
const MUD_LIGHT = '#8a7656';
/** Land is painted pixel by pixel down to this row; below it (hidden by the sill) one flat colour does. */
const DETAIL_ROWS = 250;
const SPECKLE_DARK = 0.06;
const SPECKLE_LIGHT = 0.94;
/** Rows between the darker bands that give the grass its slope. */
const GRASS_BAND = 9;

/** A row of small hazy pines along the shore; each is `size` rows tall and stands on `base` give or take a few rows. */
function paintPineRow(ctx: Ctx, width: number, base: number, sizes: readonly number[], fade: number, seed: number): void {
  const palette = fadePalette(FAR_PINES, HAZE, fade);
  const sprites = sizes.flatMap((size) => Array.from({ length: PINE_VARIANTS }, (_, v) => pineTree(v, size, palette)));
  for (let x = -4, i = 0; x < width + 8; x += FAR_PINE_STEP, i++) {
    const sprite = sprites[Math.floor(hash(i + seed) * sprites.length)];
    const y = base + Math.round(noise(i * 0.6 + seed) * 5);
    ctx.drawImage(sprite, Math.round(x - sprite.width / 2 + hash(i * 3 + seed) * 5), y - sprite.height);
  }
}

/** The far shore, on its own picture (as tall as the waterline): pale peaks, two ridges of pines, and the lake house. */
export function paintFarShore(ctx: Ctx, width: number, layout: LakeLayout): void {
  ridge(ctx, width, { base: 158, top: 100, scale: 130, seed: 2, color: '#b3d0d6', mist: '#c6dde0' });
  ridge(ctx, width, { base: 164, top: 112, scale: 80, seed: 21, color: '#94c1c0', mist: '#bddcd9' });
  paintPineRow(ctx, width, 160, [16, 20, 26], 0.62, 1);
  ridge(ctx, width, { base: WATERLINE, top: 138, scale: 50, seed: 8, color: mix('#7fb0ac', HAZE, 0.2), mist: '#a9d2cd' });
  paintPineRow(ctx, width, 163, [22, 30], 0.42, 40);
  const { house } = layout;
  rect(ctx, '#5e8f5a', house.x - 4, WATERLINE - 3, house.w + 8, 3);
  ellipse(ctx, '#3f7a55', house.x - 3, WATERLINE - 4, 4, 3);
  ellipse(ctx, '#3f7a55', house.x + house.w + 2, WATERLINE - 4, 3, 2);
  ctx.drawImage(buildLakeHouse(), house.x, house.y);
}

/** The reed islet's little hump of mud in the middle of the lake, with a few stones and a dark shadow in the water. */
export function paintIslet(ctx: Ctx, layout: LakeLayout): void {
  const { x } = layout.islet;
  ellipse(ctx, '#1f4d63', x, ISLET_BASE + 2, 11, 1);
  ellipse(ctx, MUD, x, ISLET_BASE, 9, 2);
  ellipse(ctx, MUD_LIGHT, x - 1, ISLET_BASE - 1, 6, 1);
  ctx.drawImage(rock(4, 3, 3, STONE), x - 9, ISLET_BASE - 2);
  ctx.drawImage(rock(3, 2, 8, STONE), x + 6, ISLET_BASE - 1);
}

/** 1 where the bank is grass and 0 where it is sand: grass on both banks, sand along the beach between them. */
function grassShare(x: number, width: number): number {
  if (x < width * 0.3) return 1 - ramp(width * 0.05, width * 0.12, x);
  return ramp(width * 0.5, width * 0.6, x);
}

function landColour(grass: boolean, n: number, band: boolean): string {
  const set = grass ? GRASS : SAND;
  if (band && n < 0.5) return set.dark;
  if (n < SPECKLE_DARK) return set.dark;
  if (n > SPECKLE_LIGHT) return set.light;
  return set.base;
}

/** The banks and the beach: wet sand and foam along the water's edge, speckled grass or sand below it. */
export function paintBank(ctx: Ctx, width: number, layout: LakeLayout): void {
  for (let x = 0; x < width; x++) {
    const top = layout.landTop(x);
    const share = grassShare(x, width);
    if (hash(x * 1.9) < 0.5) rect(ctx, FOAM, x, top - 1, 1, 1);
    rect(ctx, SAND.wet, x, top, 1, 1);
    for (let y = top + 1; y < DETAIL_ROWS; y++) {
      const wetEdge = y === top + 1 && bayer(x, y) < 0.5;
      if (wetEdge) {
        rect(ctx, SAND.wet, x, y, 1, 1);
        continue;
      }
      const band = (y - top) % GRASS_BAND === GRASS_BAND - 1 && bayer(x, y) < 0.5;
      rect(ctx, landColour(bayer(x, y) < share, hash(x * 5.3 + y * 11.9), band), x, y, 1, 1);
    }
    rect(ctx, share > 0.5 ? GRASS.base : SAND.base, x, DETAIL_ROWS, 1, DESIGN_HEIGHT - DETAIL_ROWS);
  }
  paintBankDetail(ctx, width, layout);
}

/** Wildflowers on both banks, pebbles and a driftwood log on the beach. */
function paintBankDetail(ctx: Ctx, width: number, layout: LakeLayout): void {
  const rand = seeded(5);
  for (let i = 0; i < 60; i++) {
    const x = Math.round(rand() * width);
    const y = BANK_BASE + 4 + Math.round(rand() * 24);
    const onBank = x > width * 0.66 || x < width * 0.1;
    if (!onBank || y <= layout.landTop(x) + 3) continue;
    rect(ctx, GRASS.dark, x, y, 1, 3);
    rect(ctx, FLOWERS[i % FLOWERS.length], x - 1, y - 1, 3, 1);
    rect(ctx, '#fff3a8', x, y - 1, 1, 1);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.round(width * (0.12 + rand() * 0.45));
    const y = BEACH_TOP + 2 + Math.round(rand() * 8);
    ctx.drawImage(rock(2 + Math.round(rand() * 2), 2, i, STONE), x, y);
  }
  const logX = Math.round(width * 0.4);
  rect(ctx, '#8a6a4a', logX, BEACH_TOP + 3, 15, 3);
  rect(ctx, '#b08a60', logX, BEACH_TOP + 3, 15, 1);
  rect(ctx, '#5b4030', logX + 12, BEACH_TOP + 4, 3, 2);
}

/** A grass tuft's place and height. */
export interface Tuft {
  x: number;
  y: number;
  variant: number;
}

const TUFT_GAP = 8;

/** Where grass tufts sway on the two banks (nowhere on the beach between them). */
export function scatterTufts(width: number, layout: LakeLayout): Tuft[] {
  const tufts: Tuft[] = [];
  for (let x = 2, i = 0; x < width; x += TUFT_GAP, i++) {
    if (grassShare(x, width) < 0.9) continue;
    const top = layout.landTop(x);
    tufts.push({ x, y: top + 5 + Math.round(hash(i * 2.1) * 16), variant: Math.floor(hash(i + 70) * 6) });
  }
  return tufts;
}

/** A stone footing under the boathouse that runs down to the shore wherever the bank dips below its walls. */
export function paintBoathouseFooting(ctx: Ctx, layout: LakeLayout): void {
  const { boathouse } = layout;
  const bottom = boathouse.y + boathouse.h;
  for (let x = boathouse.x; x < boathouse.x + boathouse.w; x++) {
    const depth = layout.landTop(x) + 2 - bottom;
    if (depth <= 0) continue;
    rect(ctx, FOOTING, x, bottom, 1, depth);
    if (bayer(x, bottom + 1) < 0.4) rect(ctx, STONE.dark, x, bottom + 1, 1, 1);
  }
}

/** The foreground that stays still: the rowboat drawn up on the sand with its shadow. It covers the rim of the peek spot. */
export function paintFront(ctx: Ctx, layout: LakeLayout): void {
  const left = layout.boatX - Math.floor(BOAT_W / 2);
  ctx.save();
  ctx.globalAlpha = 0.3;
  ellipse(ctx, '#3b3322', layout.boatX + 1, BOAT_RIM + 7, 12, 1);
  ctx.restore();
  ctx.drawImage(buildRowboat(), left, BOAT_RIM - BOAT_RIM_ROW);
}
