import type { RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';

/** A pre-rendered offscreen pixel sprite and its stage-pixel dimensions. */
export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Standard 4x4 ordered Bayer matrix thresholds (0..15) for crisp pixel dithering. */
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Maps a continuous 0..1 shade to a discrete palette index using 4x4 Bayer dithering. */
export function ditherIndex(x: number, y: number, shade01: number, steps: number): number {
  if (steps <= 1) return 0;
  const clamped = shade01 < 0 ? 0 : shade01 > 1 ? 1 : shade01;
  const scaled = clamped * (steps - 1);
  const lo = Math.floor(scaled);
  const hi = lo + 1 < steps ? lo + 1 : lo;
  const frac = scaled - lo;
  const threshold = (BAYER_4X4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
  return frac > threshold ? hi : lo;
}

/** Deterministic 2D hash in 0..1 for surface craters, rock grain, and star speckles. */
export function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** In-memory pixel grid turned into a memoryCanvas sprite once during resize. */
export class PixelGrid {
  private readonly image: ImageData;

  constructor(readonly w: number, readonly h: number) {
    this.image = new ImageData(Math.max(1, w), Math.max(1, h));
  }

  set(x: number, y: number, c: RGB, alpha = 255): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const o = (iy * this.w + ix) * 4;
    const d = this.image.data;
    d[o] = c[0];
    d[o + 1] = c[1];
    d[o + 2] = c[2];
    d[o + 3] = alpha;
  }

  fillRect(x: number, y: number, rw: number, rh: number, c: RGB, alpha = 255): void {
    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        this.set(x + dx, y + dy, c, alpha);
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB, alpha = 255): void {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)));
      for (let dx = -half; dx <= half; dx++) {
        this.set(cx + dx, cy + dy, c, alpha);
      }
    }
  }

  toSprite(): Sprite {
    const { canvas, ctx } = memoryCanvas(this.w, this.h);
    ctx.putImageData(this.image, 0, 0);
    return { canvas, w: this.w, h: this.h };
  }
}
