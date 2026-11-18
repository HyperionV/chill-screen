import { breeze } from '../../wind';
import type { SpriteBox } from './cast-sprites';

const BEND_STRIP = 2;
const MAX_TIP_BEND = 3;
const WIRE_SAMPLE_STEP = 2;
const WIRE_SWAY = 1.4;

/** Move only the exposed rows. The peg, stem base or crate stays attached. */
export function drawWindBent(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteBox,
  center: number,
  top: number,
  unit: number,
  tipBend: number,
  hanging: boolean,
  fixedRows = 0,
): void {
  const x = Math.round((center - sprite.w / 2) * unit);
  const y = Math.round(top * unit);
  const width = Math.round(sprite.w * unit);
  const bend = Math.max(-MAX_TIP_BEND, Math.min(MAX_TIP_BEND, tipBend));
  const flexRows = sprite.h - fixedRows;
  if (Math.abs(bend * unit) < 0.5) {
    ctx.drawImage(sprite.canvas, x, y, width, Math.round((top + sprite.h) * unit) - y);
    return;
  }
  for (let row = 0; row < sprite.h;) {
    const edge = row < flexRows ? flexRows : sprite.h;
    const count = Math.min(BEND_STRIP, edge - row);
    const t = hanging ? Math.min(1, row / Math.max(1, flexRows - BEND_STRIP)) : Math.max(0, 1 - row / flexRows);
    const shift = Math.round(bend * t * t * unit);
    const first = Math.round((top + row) * unit);
    const last = Math.round((top + row + count) * unit);
    if (last > first) {
      ctx.drawImage(sprite.canvas, 0, row, sprite.w, count, x + shift, first, width, last - first);
    }
    row += count;
  }
}

export function wireHeight(y1: number, y2: number, sag: number, t: number): number {
  return y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * sag;
}

export function windSag(time: number, wx: number, sag: number): number {
  return sag + breeze(time, wx) * WIRE_SWAY;
}

export function drawWire(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sag: number,
  unit: number,
  color: string,
): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / WIRE_SAMPLE_STEP));
  const size = Math.max(1, Math.round(unit));
  ctx.fillStyle = color;
  let xp = Math.round(x1 * unit);
  let yp = Math.round(y1 * unit);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round((x1 + (x2 - x1) * t) * unit);
    const y = Math.round(wireHeight(y1, y2, sag, t) * unit);
    ctx.fillRect(Math.min(xp, x), yp, Math.abs(x - xp) + size, size);
    if (y !== yp) ctx.fillRect(x, Math.min(yp, y), size, Math.abs(y - yp) + size);
    xp = x;
    yp = y;
  }
}
