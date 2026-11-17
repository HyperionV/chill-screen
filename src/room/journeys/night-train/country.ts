import { hash, noise, ramp } from '../noise';
import type { SceneryFrame } from './scenery';
import { sprite, type Sprites } from './sprites';

const RIDGES = [
  { speed: 0.025, span: 172, base: 129, height: 54, color: '#9aafc0', face: '#8096ad' },
  { speed: 0.065, span: 121, base: 154, height: 34, color: '#657f98', face: '#526c87' },
  { speed: 0.14, span: 88, base: 178, height: 25, color: '#344f63', face: '#2a4357' },
];
const PLAINS_HEIGHT = 0.74; // Plains still have a distant mountain backdrop.
const VILLAGE_SPACING = 122;
const FARM_SPACING = 164;
const FENCE_SPACING = 23;
const FIELD_TOP = 186;
const FIELD_BOTTOM = 256;
const FURROW_SPACING = 24;
const FOREGROUND_PINE_SPACING = 213;

function ridgeY(x: number, scroll: number, chapter: number, layer: number): number {
  const ridge = RIDGES[layer];
  if (!ridge) return FIELD_TOP;
  const at = (x + scroll * ridge.speed) / ridge.span + layer * 2.7;
  const tooth = 1 - Math.abs(((at % 2) + 2) % 2 - 1);
  const height = chapter === 1 ? PLAINS_HEIGHT : 1;
  return Math.round(ridge.base - ridge.height * height * (0.3 + tooth * 0.7));
}

/** Peaks have a minimum height so even a quiet stretch still reads as a mountain pass. */
export function mountains(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
  for (let layer = 0; layer < RIDGES.length; layer++) {
    const ridge = RIDGES[layer];
    if (!ridge) continue;
    for (let x = 0; x < f.width; x++) {
      const y = ridgeY(x, f.scroll, f.chapter, layer);
      ctx.fillStyle = ridge.color;
      ctx.fillRect(x, y, 1, 184 - y);
      const facing = Math.floor((x + f.scroll * ridge.speed) / ridge.span + layer * 2.7) % 2;
      if (facing === 1) {
        ctx.fillStyle = ridge.face;
        ctx.fillRect(x, y + 2, 1, 182 - y);
      }
      if (layer === 0) {
        ctx.fillStyle = '#d1dee6';
        const cap = Math.max(2, Math.round((113 - y) * 0.24));
        ctx.fillRect(x, y, 1, cap);
        if ((x + Math.round(f.scroll * ridge.speed)) % 4 === 0) ctx.fillRect(x, y + cap + 1, 1, 2);
      }
    }
    // Village roofs sit on the middle slope, before the near ridge is drawn.
    if (layer === 1) village(ctx, f);
    if (layer === 2) {
      const offset = f.scroll * ridge.speed;
      const spacing = 14;
      for (let k = Math.floor(offset / spacing) - 1; k * spacing - offset < f.width + spacing; k++) {
        const x = Math.round(k * spacing - offset);
        sprite(ctx, art.darkPine, x, ridgeY(x, f.scroll, f.chapter, layer) + 5, 0.55 + hash(k) * 0.3);
      }
    }
  }
}

export function village(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
  const offset = f.scroll * 0.065;
  for (let k = Math.floor(offset / VILLAGE_SPACING) - 1; k * VILLAGE_SPACING - offset < f.width; k++) {
    const x = Math.round(k * VILLAGE_SPACING - offset);
    // Keep the lit buildings beside the clock rather than behind its numerals.
    if (x + 35 > f.width * 0.32 && x < f.width * 0.68) continue;
    const y = Math.min(153, ridgeY(x + 17, f.scroll, f.chapter, 1) + 12);
    ctx.fillStyle = '#65737b';
    ctx.fillRect(x, y - 13, 35, 13);
    ctx.fillStyle = '#dbe5e5';
    ctx.fillRect(x - 2, y - 15, 39, 2);
    ctx.fillStyle = '#f5cf8d';
    for (let col = 4; col < 32; col += 7) ctx.fillRect(x + col, y - 8, 2, 3);
    if (k % 4 === 0 || x >= f.width * 0.68) {
      ctx.fillStyle = '#53656f';
      ctx.fillRect(x + 10, y - 28, 7, 16);
      for (let row = 0; row < 6; row++) ctx.fillRect(x + 7 + row, y - 28 - row, 13 - row * 2, 1);
      ctx.fillStyle = '#f7d59c';
      ctx.fillRect(x + 12, y - 24, 2, 4);
      ctx.fillStyle = '#e3e9e7';
      ctx.fillRect(x + 13, y - 37, 1, 5);
      ctx.fillRect(x + 12, y - 36, 3, 1);
    }
  }
}

/** Long broken furrows and alternating strips give the moonlit ground depth. */
export function fields(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
  for (let row = FIELD_TOP; row < FIELD_BOTTOM; row += 5) {
    const depth = (row - FIELD_TOP) / (FIELD_BOTTOM - FIELD_TOP);
    const offset = f.scroll * (0.32 + depth * 0.85);
    ctx.fillStyle = row % 10 === 1 ? '#8c9fae' : '#a9bcc7';
    ctx.fillRect(0, row, f.width, 1);
    for (let k = Math.floor(offset / FURROW_SPACING) - 1; k * FURROW_SPACING - offset < f.width; k++) {
      const x = Math.round(k * FURROW_SPACING - offset + depth * 14);
      ctx.fillStyle = '#718898';
      ctx.fillRect(x, row + 1, 16, 1);
      ctx.fillStyle = '#bdcdd3';
      ctx.fillRect(x + 2, row, 12, 1);
    }
  }
}

export function foregroundPines(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
  const offset = f.scroll * 1.65;
  for (let k = Math.floor(offset / FOREGROUND_PINE_SPACING) - 1; k * FOREGROUND_PINE_SPACING - offset < f.width + 40; k++) {
    const x = k * FOREGROUND_PINE_SPACING - offset;
    sprite(ctx, art.darkPine, x, 257, 3 + hash(k + 3) * 0.7);
  }
}

export function farms(ctx: CanvasRenderingContext2D, f: SceneryFrame, art: Sprites): void {
  const trees = f.scroll * 0.28;
  for (let k = Math.floor(trees / 16) - 1; k * 16 - trees < f.width + 12; k++) {
    sprite(ctx, art.pine, k * 16 - trees, 193, 0.65 + hash(k) * 0.25);
  }
  const offset = f.scroll * 0.43;
  for (let k = Math.floor(offset / FARM_SPACING) - 1; k * FARM_SPACING - offset < f.width; k++) {
    const x = Math.round(k * FARM_SPACING - offset + 23);
    ctx.fillStyle = '#796e69';
    ctx.fillRect(x, 190, 43, 17);
    ctx.fillStyle = '#4d5f69';
    ctx.fillRect(x + 30, 190, 13, 17);
    ctx.fillStyle = '#e5eaE6';
    for (let row = 0; row < 7; row++) ctx.fillRect(x - 4 + row * 3, 190 - row, 51 - row * 6, 1);
    ctx.fillStyle = '#f7cd8b';
    ctx.fillRect(x + 5, 195, 4, 4);
    ctx.fillRect(x + 16, 195, 4, 4);
    ctx.fillStyle = '#59656b';
    ctx.fillRect(x + 32, 179, 4, 10);
    ctx.save();
    ctx.fillStyle = '#d4dedd';
    for (let puff = 0; puff < 3; puff++) {
      const age = (f.time * 0.14 + puff / 3 + hash(k)) % 1;
      ctx.globalAlpha = (1 - age) * 0.55;
      ctx.fillRect(Math.round(x + 31 - age * 15), Math.round(178 - age * 19), 4 + Math.round(age * 8), 3);
    }
    ctx.restore();
  }
}

export function fences(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
  const offset = f.scroll * 0.95;
  for (let k = Math.floor(offset / FENCE_SPACING) - 1; k * FENCE_SPACING - offset < f.width; k++) {
    const x = Math.round(k * FENCE_SPACING - offset);
    ctx.fillStyle = '#697b83';
    ctx.fillRect(x, 236, 2, 17);
    ctx.fillRect(x, 241, FENCE_SPACING, 2);
    ctx.fillRect(x, 247, FENCE_SPACING, 1);
    ctx.fillStyle = '#e7eeee';
    ctx.fillRect(x - 1, 235, 4, 2);
    ctx.fillRect(x + 2, 240, FENCE_SPACING - 2, 1);
  }
}

export function passCutting(ctx: CanvasRenderingContext2D, f: SceneryFrame): void {
  const offset = f.scroll * 0.6;
  for (let k = Math.floor(offset / 19) - 1; k * 19 - offset < f.width; k++) {
    const x = Math.round(k * 19 - offset);
    ctx.fillStyle = '#6c7d85';
    ctx.fillRect(x, 199, 2, 23);
    for (let d = 0; d < 16; d++) ctx.fillRect(x + d, 220 - d, 1, 2);
    ctx.fillStyle = '#d8e3e5';
    ctx.fillRect(x, 199, 18, 2);
    ctx.fillRect(x, 208, 18, 2);
  }
  for (let x = 0; x < f.width; x++) {
    const at = x + f.scroll * 1.2;
    const y = Math.round(246 - noise(at * 0.035) * 17);
    ctx.fillStyle = '#667782';
    ctx.fillRect(x, y, 1, 257 - y);
    ctx.fillStyle = '#cbd9dd';
    ctx.fillRect(x, y, 1, 2);
    if (Math.floor(at) % 9 === 0) {
      ctx.fillStyle = '#465e70';
      ctx.fillRect(x, y + 4, 1, 7);
    }
  }
  if (f.progress < 0.66) return;
  const approach = ramp(0.66, 1, f.progress);
  const x = Math.round(f.width * (1.08 - approach * 0.3));
  ctx.fillStyle = '#5e7382';
  ctx.fillRect(x - 30, 169, 60, 65);
  ctx.fillRect(x - 23, 159, 46, 12);
  ctx.fillStyle = '#dce8e9';
  ctx.fillRect(x - 30, 167, 60, 3);
  ctx.fillRect(x - 23, 157, 46, 3);
  ctx.fillStyle = '#152330';
  ctx.fillRect(x - 19, 179, 38, 55);
  ctx.fillRect(x - 14, 173, 28, 8);
}
