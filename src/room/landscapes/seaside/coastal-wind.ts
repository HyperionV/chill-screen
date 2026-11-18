import { smooth } from '../../sky';
import { breeze } from '../../wind';
import { drawSprite, type SceneRenderContext } from './types';

/** Seed travel in design pixels per second, with the gust speed added to the calm speed. */
export const SEED_DRIFT_CALM = 3;
export const SEED_DRIFT_GUST = 5;

/** Four staggered seed paths, sized in design pixels except for the stage-pixel sway. */
const SEED_COUNT = 4;
const SEED_DISTANCE = 52;
const SEED_GAP = 66;
const SEED_SPACING = 4;
const SEED_LIFT = 7;
const SEED_SWAY = 2;

/** Source columns for the pole and cloth, plus the tip's travel in stage pixels. */
const POLE_COLUMNS = 2;
const PENNANT_END = 6;
const PENNANT_SWAY = 2;

/** The sail fills and relaxes by this many stage pixels on each side of the mast. */
const SAIL_MAST_COLUMN = 13;
const SAIL_SWELL = 2;

/** Shears a pixel sprite in horizontal bands with its bottom row fixed. */
export function drawBentSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  unit: number,
  sway: number,
): void {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const w = Math.max(1, Math.round(sprite.width * unit));
  const h = Math.max(1, Math.round(sprite.height * unit));
  let bend = Math.round(sway);
  if (bend === 0 || h === 1 || sprite.height === 1) {
    drawSprite(ctx, sprite, x0, y0, unit);
    return;
  }

  let start = 0;
  let top = 0;
  for (let row = 1; row <= sprite.height; row++) {
    const nextBend = Math.round(sway * (1 - row / (sprite.height - 1)));
    if (row < sprite.height && nextBend === bend) continue;
    const bottom = Math.round(row * h / sprite.height);
    if (bottom > top) {
      ctx.drawImage(sprite, 0, start, sprite.width, row - start, x0 + bend, y0 + top, w, bottom - top);
    }
    start = row;
    top = bottom;
    bend = nextBend;
  }
}

export function drawPennant(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  unit: number,
  wind: number,
): void {
  const sway = wind * PENNANT_SWAY;
  if (Math.round(sway) === 0) {
    drawSprite(ctx, sprite, x, y, unit);
    return;
  }

  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const w = Math.max(1, Math.round(sprite.width * unit));
  const h = Math.max(1, Math.round(sprite.height * unit));
  let left = Math.round(POLE_COLUMNS * w / sprite.width);
  if (left > 0) ctx.drawImage(sprite, 0, 0, POLE_COLUMNS, sprite.height, x0, y0, left, h);
  for (let col = POLE_COLUMNS; col < PENNANT_END; col++) {
    const right = Math.round((col + 1) * w / sprite.width);
    const bend = Math.round(sway * (col - POLE_COLUMNS) / (PENNANT_END - POLE_COLUMNS - 1));
    if (right > left) ctx.drawImage(sprite, col, 0, 1, sprite.height, x0 + left, y0 + bend, right - left, h);
    left = right;
  }
}

export function drawSailCloth(
  ctx: CanvasRenderingContext2D,
  cloth: HTMLCanvasElement,
  x: number,
  y: number,
  unit: number,
  wind: number,
): void {
  const swell = Math.round(wind * SAIL_SWELL);
  const w = Math.max(1, Math.round(cloth.width * unit));
  if (swell === 0 || w < cloth.width / 2) {
    drawSprite(ctx, cloth, x, y, unit);
    return;
  }

  const h = Math.max(1, Math.round(cloth.height * unit));
  const mastLeft = Math.round(SAIL_MAST_COLUMN * w / cloth.width);
  const rightColumn = SAIL_MAST_COLUMN + 1;
  const mastRight = Math.round(rightColumn * w / cloth.width);
  ctx.drawImage(cloth, 0, 0, SAIL_MAST_COLUMN, cloth.height, x - swell, y, mastLeft + swell, h);
  ctx.drawImage(cloth, rightColumn, 0, cloth.width - rightColumn, cloth.height,
    x + mastRight, y, w - mastRight + swell, h);
}

/** A few single-pixel seeds lift and fade near the grass or pines. */
export function drawWindSeeds(
  ctx: CanvasRenderingContext2D,
  rc: SceneRenderContext,
  originU: number,
  originV: number,
  color: string,
  glideX = rc.glideX,
): void {
  const { w, h, unit, time, seedTravel, windStrength, state: { day } } = rc;
  const originX = originU * w;
  const originY = originV * h;
  const cycle = SEED_DISTANCE + SEED_GAP;
  const previousAlpha = ctx.globalAlpha;
  const alpha = previousAlpha * day * smooth(windStrength);
  ctx.fillStyle = color;
  for (let i = 0; i < SEED_COUNT; i++) {
    const distance = (seedTravel + i * cycle / SEED_COUNT) % cycle;
    if (distance >= SEED_DISTANCE) continue;
    const progress = distance / SEED_DISTANCE;
    const x = originX + (distance + i * SEED_SPACING) * unit;
    const lift = Math.sin(progress * Math.PI);
    const y = originY - (SEED_LIFT * unit + breeze(time, x) * SEED_SWAY) * lift;
    ctx.globalAlpha = alpha * lift;
    ctx.fillRect(Math.round(x + glideX), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = previousAlpha;
}
