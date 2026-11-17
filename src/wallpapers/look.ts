import type { RGB } from '../render/color';

/** What a picture's light is like, read from a small copy of it: how bright, where the sun is, where the night sky is. */
export interface Look {
  /** Average brightness, 0 (black) to 1 (white). */
  mean: number;
  /** The brightest spot, if one stands out enough to read as a light source (sun, lamp, glow). Position is 0..1 of the picture. */
  sun: { u: number; v: number; strength: number; color: RGB } | null;
  /** Dark patches of open sky where stars can show, as 0..1 positions of the picture. */
  sky: { u: number; v: number }[];
  /** 0 for a daylit picture, 1 for a night one. */
  night: number;
  /** The picture's average colour: the colour of the light it throws into the room. */
  tint: RGB;
}

const GRID_W = 64;
const GRID_H = 36;
/** Only the upper part of a picture is searched for the sun and for open sky. */
const SUN_SEARCH_V = 0.75;
const SKY_SEARCH_V = 0.55;
const SUN_MIN_LUMA = 0.8;
const SUN_MIN_LIFT = 0.22;
const SKY_MAX_LUMA = 0.24;
const NIGHT_MEAN = 0.3;
const DAY_MEAN = 0.42;

const luma = (r: number, g: number, b: number): number => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export function readLook(source: CanvasImageSource): Look {
  const c = document.createElement('canvas');
  c.width = GRID_W;
  c.height = GRID_H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.drawImage(source, 0, 0, GRID_W, GRID_H);
  const px = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
  const L = new Float32Array(GRID_W * GRID_H);
  let sum = 0;
  const tint: RGB = [0, 0, 0];
  for (let i = 0; i < L.length; i++) {
    L[i] = luma(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    sum += L[i];
    for (let k = 0; k < 3; k++) tint[k] += px[i * 4 + k] / L.length;
  }
  const mean = sum / L.length;

  // The sun: the brightest 3x3 neighbourhood, so a single bright pixel does not count.
  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = 1; y < GRID_H * SUN_SEARCH_V; y++) {
    for (let x = 1; x < GRID_W - 1; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += L[(y + dy) * GRID_W + x + dx];
      if (s > best) {
        best = s;
        bx = x;
        by = y;
      }
    }
  }
  const peak = best / 9;
  let sun: Look['sun'] = null;
  if (peak > SUN_MIN_LUMA && peak - mean > SUN_MIN_LIFT) {
    const k = (by * GRID_W + bx) * 4;
    sun = {
      u: (bx + 0.5) / GRID_W,
      v: (by + 0.5) / GRID_H,
      strength: Math.min(1, (peak - mean - SUN_MIN_LIFT) * 2.5 + 0.35),
      color: [px[k], px[k + 1], px[k + 2]],
    };
  }

  const sky: Look['sky'] = [];
  for (let y = 0; y < GRID_H * SKY_SEARCH_V; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (L[y * GRID_W + x] < SKY_MAX_LUMA) sky.push({ u: (x + 0.5) / GRID_W, v: (y + 0.5) / GRID_H });
    }
  }
  const night = Math.max(0, Math.min(1, (DAY_MEAN - mean) / (DAY_MEAN - NIGHT_MEAN)));
  return { mean, sun, sky, night, tint };
}
