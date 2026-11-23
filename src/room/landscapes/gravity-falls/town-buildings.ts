/**
 * The ordinary buildings of the town: pitched-roof houses (singly or in a row) and the small shops with striped awnings.
 * Every lit-at-dusk pane and chimney is recorded in a `TownLights` so the moving parts can use it.
 * Static work, built once per size.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { ditherFill, mix, polygon, rect, seeded, shaded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash } from '../../journeys/noise';
import type { Shop } from './town-layout';

export const OUTLINE = '#3b2f3a';
/** Cool plum that every shadow is pulled toward, so shade stays warm-purple in the afternoon haze. */
export const PLUM = '#5b3f5a';
export const GLASS = '#587a8e';
const GLASS_LIGHT = '#b5ced8';
export const CREAM = '#f1e6cf';
const DOOR = '#6b4636';
const WALLS = ['#ecd9b0', '#a9c0cf', '#e2a79c', '#b8cc9f', '#e8c88f', '#d9b9d0'];
const ROOFS = ['#b5584a', '#6b6f86', '#4f8a88', '#c9a042', '#8a5a6b', '#a86a45'];
const AWNINGS = ['#d4524e', '#4a9a98', '#e0a93d', '#8a67b0'];
const SHADE_AMOUNT = 0.3;
const HIGHLIGHT_AMOUNT = 0.35;
const WINDOW_SPACING = 7;
const DOOR_W = 3;
const DOOR_H = 6;

/** A pane that glows at dusk. `seed` (0..1) decides how early in the evening its light comes on. */
export interface TownWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
}

/** Everything a painted building leaves behind for the moving parts: glowing panes and chimney tops. */
export interface TownLights {
  windows: TownWindow[];
  chimneys: Point[];
}

export const emptyLights = (): TownLights => ({ windows: [], chimneys: [] });

/** A framed pane with a bright corner; recorded so it can light up at dusk. */
export function addPane(ctx: Ctx, lights: TownLights, x: number, y: number, w: number, h: number): void {
  rect(ctx, OUTLINE, x - 1, y - 1, w + 2, h + 2);
  rect(ctx, GLASS, x, y, w, h);
  rect(ctx, GLASS_LIGHT, x, y, 1, 1);
  if (w >= 3) rect(ctx, mix(GLASS, OUTLINE, 0.5), x + Math.floor(w / 2), y + 1, 1, h - 1);
  lights.windows.push({ x, y, w, h, seed: hash(x * 3.1 + y * 1.7) });
}

/** A pitched roof from eave to ridge: lit left slope, dithered shadow on the right and a darker eave line. */
function paintGable(ctx: Ctx, x: number, top: number, w: number, roofH: number, color: string): void {
  const tri = [{ x: x - 1, y: top }, { x: x + w / 2, y: top - roofH }, { x: x + w + 1, y: top }];
  polygon(ctx, OUTLINE, [{ x: x - 2, y: top + 1 }, { x: x + w / 2, y: top - roofH - 1 }, { x: x + w + 2, y: top + 1 }]);
  shaded(ctx, x - 2, top - roofH - 1, w + 4, roofH + 3, (c) => polygon(c, color, tri), (c) => {
    ditherFill(c, Math.round(x + w / 2), top - roofH - 1, Math.ceil(w / 2) + 3, roofH + 3, color, mix(color, PLUM, 0.45), 0.5);
    rect(c, mix(color, '#ffffff', HIGHLIGHT_AMOUNT), x - 1, top - 1, Math.max(2, Math.floor(w / 2) - 1), 1);
    rect(c, mix(color, OUTLINE, 0.5), x - 1, top, w + 2, 1);
  });
}

/**
 * One house standing on row `base`: outlined walls, a gable roof, windows in rows, a door, sometimes a chimney, and
 * `seed` varies colours and details.
 */
export function paintHouse(ctx: Ctx, lights: TownLights, x: number, base: number, w: number, h: number, seed: number): void {
  const wall = WALLS[seed % WALLS.length];
  const top = base - h;
  const roofH = Math.max(5, Math.round(w * 0.42));
  rect(ctx, OUTLINE, x - 1, top, w + 2, h + 1);
  rect(ctx, wall, x, top, w, h);
  rect(ctx, mix(wall, PLUM, SHADE_AMOUNT), x + w - 2, top, 2, h);
  ditherFill(ctx, x, base - 3, w - 2, 3, wall, mix(wall, PLUM, SHADE_AMOUNT), 0.5);
  if (seed % 3 === 0) {
    const cx = x + Math.round(w * 0.72);
    const chimneyTop = top - Math.round(roofH * 0.55) - 3;
    rect(ctx, OUTLINE, cx - 1, chimneyTop, 5, top - chimneyTop);
    rect(ctx, '#a85f4f', cx, chimneyTop + 1, 3, top - chimneyTop);
    lights.chimneys.push({ x: cx + 1, y: chimneyTop });
  }
  paintGable(ctx, x, top, w, roofH, ROOFS[(seed * 2 + 1) % ROOFS.length]);
  const doorX = x + Math.floor(w / 2) - 1;
  const doorTop = base - DOOR_H;
  const cols = Math.max(1, Math.floor((w - 2) / WINDOW_SPACING));
  const rows = h >= 20 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const px = Math.round(x + ((i + 0.5) * w) / cols - 1.5);
      const py = top + 3 + r * 8;
      if (py + 4 > doorTop && Math.abs(px + 1 - doorX) < 4) continue;
      addPane(ctx, lights, px, py, 3, 4);
    }
  }
  rect(ctx, OUTLINE, doorX - 1, doorTop - 1, DOOR_W + 2, DOOR_H + 1);
  rect(ctx, DOOR, doorX, doorTop, DOOR_W, DOOR_H);
  rect(ctx, '#e8c26a', doorX + DOOR_W - 1, doorTop + 3, 1, 1);
}

/** A run of houses from `from` to `to`, each `minW` to `maxW` wide, `minH` to `maxH` tall, with their feet on row `base`. */
export function paintHouseRow(ctx: Ctx, lights: TownLights, base: number, from: number, to: number, size: { minW: number; maxW: number; minH: number; maxH: number }, seed: number): void {
  const rand = seeded(seed);
  let x = from;
  for (let i = 0; x < to; i++) {
    const w = size.minW + Math.floor(rand() * (size.maxW - size.minW));
    const h = size.minH + Math.floor(rand() * (size.maxH - size.minH));
    paintHouse(ctx, lights, x, base + Math.round(rand() * 2), w, h, i + seed);
    x += w + 1 + Math.floor(rand() * 4);
  }
}

/** A narrow shop: flat roof with a sign board, a striped awning with a scalloped edge, a display window and a door. */
export function paintShop(ctx: Ctx, lights: TownLights, shop: Shop): void {
  const { x, y, w, h } = shop.rect;
  const base = y + h;
  const wall = WALLS[(shop.seed * 5) % WALLS.length];
  const awning = AWNINGS[shop.seed % AWNINGS.length];
  rect(ctx, OUTLINE, x - 1, y - 2, w + 2, h + 3);
  rect(ctx, wall, x, y + 1, w, h - 1);
  rect(ctx, mix(wall, PLUM, SHADE_AMOUNT), x + w - 2, y + 1, 2, h - 1);
  rect(ctx, mix(wall, PLUM, 0.5), x - 1, y - 2, w + 2, 3);
  rect(ctx, mix(wall, '#ffffff', HIGHLIGHT_AMOUNT), x, y - 1, w - 2, 1);
  if (shop.seed % 2 === 1) {
    rect(ctx, OUTLINE, x + w - 8, y - 8, 5, 7);
    rect(ctx, '#a85f4f', x + w - 7, y - 7, 3, 6);
    lights.chimneys.push({ x: x + w - 6, y: y - 8 });
  }
  if (shop.label) {
    const boardW = w - 4;
    rect(ctx, OUTLINE, x + 2, y + 2, boardW, 7);
    drawText(ctx, shop.label, x + 2 + Math.floor((boardW - textWidth(shop.label)) / 2), y + 3, CREAM);
  }
  const secondFloor = h >= 30;
  const awningTop = secondFloor ? y + 17 : y + 11;
  if (secondFloor) {
    addPane(ctx, lights, x + 4, y + 11, 3, 4);
    addPane(ctx, lights, x + w - 8, y + 11, 3, 4);
  }
  rect(ctx, OUTLINE, x - 1, awningTop - 1, w + 2, 6);
  for (let i = 0; i < w; i++) {
    const stripe = Math.floor(i / 3) % 2 === 0 ? awning : CREAM;
    rect(ctx, stripe, x + i, awningTop, 1, 4);
    if (i % 3 !== 1) rect(ctx, stripe, x + i, awningTop + 4, 1, 1);
  }
  const glassTop = awningTop + 7;
  const doorW = 5;
  const glassW = w - doorW - 7;
  addPane(ctx, lights, x + 3, glassTop, glassW, Math.max(3, base - glassTop - 3));
  const wares = ['#e8c26a', '#d4524e', '#7fb89a', '#b28ad8'];
  for (let i = 0; i < glassW - 1; i += 3) rect(ctx, wares[(i + shop.seed) % wares.length], x + 4 + i, base - 6, 2, 2);
  rect(ctx, OUTLINE, x + w - doorW - 3, base - 11, doorW + 2, 11);
  rect(ctx, DOOR, x + w - doorW - 2, base - 10, doorW, 10);
  rect(ctx, '#e8c26a', x + w - 5, base - 5, 1, 1);
}
