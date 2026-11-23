/**
 * The far side of the Hidden Hollow, painted once: lilac hills fading into haze, hazy pines, the valley far below
 * with its lake, the little shack and its one lit window, the twilight lawn (under the whole width, the bank is
 * painted over its left part) with wildflowers and pebbles.
 * The hillside bank, the roots and the props are in `hidden-props.ts`.
 */
import { bayer, ditherFill, ellipse, mix, polygon, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_VARIANTS, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import type { Point } from '../../gravity-falls/types';
import { hash, noise } from '../../journeys/noise';
import { DESIGN_HEIGHT } from './scene-art';
import { GROUND, HAZE, PINE_TWILIGHT, STONE, landTop, type HiddenLayout } from './hidden-layout';

const FAR_RIDGE = { base: 150, top: 104, scale: 90, seed: 7, color: '#8f8ac6', mist: '#b8b3e0' } as const;
const NEAR_RIDGE = { base: 174, top: 136, scale: 60, seed: 19, color: '#7b73b4', mist: '#a39ed0' } as const;
const VALLEY = { top: 172, base: '#6f7cb6', light: '#8e96cc', dark: '#5a66a0' } as const;
const WATER = { rim: '#5f6fb0', deep: '#7f98d6', base: '#a6bdf0', shine: '#d3e2ff' } as const;
const FAR_PINE_STEP = 10;
/** Share of the width the radio hides at the bottom; pebbles keep out of it. */
const RADIO_FROM = 0.39;
const RADIO_TO = 0.62;
const RADIO_ROW = 224;
const FLOWER_COLOURS = ['#c9a8ff', '#f4e6ff', '#ffd36a', '#8ff0e0'];
const FLOWERS = 64;
const PEBBLES = 26;
const HOUSES = [0.7, 0.745, 0.79, 0.86];
const HOUSE_W = 4;
const HOUSE_H = 3;
const HOUSE_ROW = 190;

/** The shack's one window in the valley, top-left corner: the glow code lights it at dusk. */
export function valleyWindow(layout: HiddenLayout): Point {
  return { x: layout.shack.x - 1, y: layout.shack.y - 4 };
}

/** The windows of the distant roofs (one pixel each): the glow code lights them at dusk. */
export function valleyLights(layout: HiddenLayout): Point[] {
  return HOUSES.map((share) => ({ x: Math.round(layout.width * share) + 1, y: HOUSE_ROW + 1 }));
}

/** A row of small hazy pines that melts a ridge into the valley. */
function paintFarPines(ctx: Ctx, width: number, base: number, sizes: readonly number[], fade: number, seed: number): void {
  const palette = fadePalette(PINE_TWILIGHT, HAZE, fade);
  const sprites = sizes.flatMap((size) => Array.from({ length: PINE_VARIANTS }, (_, v) => pineTree(v, size, palette)));
  for (let x = -4, i = 0; x < width + 8; x += FAR_PINE_STEP, i++) {
    const sprite = sprites[Math.floor(hash(i + seed) * sprites.length)];
    const y = base + Math.round(noise(i * 0.6 + seed) * 4);
    ctx.drawImage(sprite, Math.round(x - sprite.width / 2 + hash(i * 3 + seed) * 5), y - sprite.height);
  }
}

/** The lake far below: a still oval with a dark rim and a pale sheen on its far edge. */
function paintLake(ctx: Ctx, layout: HiddenLayout): void {
  const { x, y } = layout.lake;
  const rx = Math.max(10, Math.round(layout.width * 0.09));
  ellipse(ctx, WATER.rim, x, y, rx + 1, 4);
  ellipse(ctx, WATER.base, x, y, rx, 3);
  ellipse(ctx, WATER.deep, x + 2, y + 1, rx - 4, 2);
  for (let px = x - rx + 2; px < x + rx - 2; px++) if (bayer(px, y - 2) < 0.5) rect(ctx, WATER.shine, px, y - 2, 1, 1);
}

/** The little Mystery Shack seen from far above: a brown box, a teal roof, a chimney and a dark window to be lit later. */
function paintFarShack(ctx: Ctx, layout: HiddenLayout): void {
  const { x, y } = layout.shack;
  rect(ctx, '#5a463f', x - 4, y - 5, 9, 5);
  rect(ctx, '#8a6a58', x - 4, y - 5, 4, 5);
  polygon(ctx, '#2f6f78', [{ x: x - 6, y: y - 5 }, { x: x + 6, y: y - 5 }, { x, y: y - 9 }]);
  rect(ctx, '#46959b', x - 4, y - 7, 2, 1);
  rect(ctx, '#4a3a38', x + 3, y - 10, 1, 3);
  const pane = valleyWindow(layout);
  rect(ctx, '#2a2442', pane.x, pane.y, 2, 2);
  rect(ctx, '#2a2442', x + 2, y - 3, 2, 3);
}

/** The valley floor: patchwork fields, tiny pines, a few distant roofs, the lake and the shack. */
function paintValley(ctx: Ctx, layout: HiddenLayout): void {
  const { width } = layout;
  ditherFill(ctx, 0, VALLEY.top, width, DESIGN_HEIGHT - VALLEY.top, VALLEY.base, VALLEY.light, 0.25);
  const rand = seeded(23);
  for (let i = 0; i < 34; i++) {
    const x = Math.round(rand() * width);
    const y = VALLEY.top + 6 + Math.round(rand() * 18);
    rect(ctx, i % 2 === 0 ? VALLEY.light : VALLEY.dark, x, y, 5 + Math.round(rand() * 8), 1 + Math.round(rand() * 2));
  }
  paintLake(ctx, layout);
  const fade = fadePalette(PINE_TWILIGHT, HAZE, 0.3);
  for (let i = 0; i < 18; i++) {
    const x = Math.round(width * (0.3 + rand() * 0.66));
    const sprite = pineTree(i, 9 + Math.round(rand() * 4), fade);
    ctx.drawImage(sprite, x - Math.floor(sprite.width / 2), 190 + Math.round(rand() * 5) - sprite.height);
  }
  for (const share of HOUSES) {
    const x = Math.round(width * share);
    rect(ctx, '#4d4378', x, HOUSE_ROW, HOUSE_W, HOUSE_H);
    rect(ctx, '#7a5a78', x, HOUSE_ROW - 1, HOUSE_W, 1);
  }
  paintFarShack(ctx, layout);
}

/** The lawn from the land's top edge down: violet-blue grass with a dark rim, soft darker bands and fine specks. */
function paintLawn(ctx: Ctx, layout: HiddenLayout): void {
  const { width } = layout;
  for (let x = 0; x < width; x++) {
    const top = landTop(width, x);
    rect(ctx, GROUND.base, x, top, 1, DESIGN_HEIGHT - top);
    rect(ctx, GROUND.dark, x, top, 1, 1);
    if (hash(x * 1.7) < 0.5) rect(ctx, GROUND.light, x, top + 1, 1, 1);
  }
  for (let y = 200; y < DESIGN_HEIGHT; y += 9) ditherFill(ctx, 0, y + 3, width, 4, GROUND.base, GROUND.dark, 0.22);
  ditherFill(ctx, 0, 198, width, 6, GROUND.base, GROUND.light, 0.3);
  for (let x = 0; x < width; x++) {
    for (let y = 212; y < DESIGN_HEIGHT; y++) {
      const n = hash(x * 5.3 + y * 11.9);
      if (n < 0.04) rect(ctx, GROUND.dark, x, y, 1, 1);
      else if (n > 0.965) rect(ctx, GROUND.light, x, y, 1, 1);
    }
  }
}

/** Wildflowers and pebbles in the lawn, the pebbles kept out of the radio's patch. */
function paintLawnDetail(ctx: Ctx, layout: HiddenLayout): void {
  const { width, edge } = layout;
  const rand = seeded(5);
  for (let i = 0; i < FLOWERS; i++) {
    const x = edge + 6 + Math.round(rand() * (width - edge - 12));
    const y = landTop(width, x) + 8 + Math.round(rand() * 20);
    rect(ctx, GROUND.dark, x, y, 1, 3);
    rect(ctx, FLOWER_COLOURS[i % FLOWER_COLOURS.length], x - 1, y - 1, 3, 1);
    rect(ctx, '#fff8d8', x, y - 1, 1, 1);
  }
  const look = { base: STONE.base, light: STONE.light, dark: STONE.dark };
  for (let i = 0; i < PEBBLES; i++) {
    const x = Math.round(rand() * width);
    const y = RADIO_ROW + 6 + Math.round(rand() * (DESIGN_HEIGHT - RADIO_ROW - 12));
    if (x > width * RADIO_FROM && x < width * RADIO_TO) continue;
    ctx.drawImage(rock(2 + Math.round(rand() * 3), 2, i, look), x, y);
  }
}

/** Paints hills, valley and lawn into the back layer. */
export function paintBackdrop(ctx: Ctx, layout: HiddenLayout): void {
  const { width } = layout;
  ridge(ctx, width, FAR_RIDGE);
  paintFarPines(ctx, width, 156, [16, 22, 28], 0.65, 3);
  ridge(ctx, width, { ...NEAR_RIDGE, color: mix(NEAR_RIDGE.color, HAZE, 0.15) });
  paintFarPines(ctx, width, 180, [18, 24], 0.5, 41);
  paintValley(ctx, layout);
  paintLawn(ctx, layout);
  paintLawnDetail(ctx, layout);
}
