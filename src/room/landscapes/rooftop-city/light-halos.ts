import { css, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import type { SpriteBox } from './cast-sprites';

/** 4x4 Bayer matrix thresholds (0..15) for crisp ordered-dither halo edges. */
const BAYER_4X4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export function ditherThreshold(x: number, y: number): number {
  return (BAYER_4X4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
}

export interface HaloSprites {
  bulbAmber: SpriteBox;
  lanternWarm: SpriteBox;
  beaconRed: SpriteBox;
  neonCyan: SpriteBox;
  neonPink: SpriteBox;
  floodWarm: SpriteBox;
  tableSpill: SpriteBox;
  stringSpill: SpriteBox;
  neonCyanSpill: SpriteBox;
  neonPinkSpill: SpriteBox;
  greenhouseSpill: SpriteBox;
}

/**
 * Builds a pre-rendered pixel-art halo with a bright core, mid glow ring,
 * and wide outer ring softened with 4x4 ordered dithering.
 */
function buildDitheredHalo(radius: number, ringRgb: RGB, coreRgb: RGB): SpriteBox {
  const size = radius * 2 + 1;
  const { canvas, ctx } = memoryCanvas(size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dist = Math.hypot(px - radius, py - radius) / Math.max(1, radius);
      if (dist > 1) continue;

      const bayer = ditherThreshold(px, py);

      if (dist <= 0.22) {
        ctx.fillStyle = css(coreRgb, 0.95);
        ctx.fillRect(px, py, 1, 1);
      } else if (dist <= 0.56) {
        const falloff = 1 - (dist - 0.22) / 0.34;
        if (falloff > 0.55 || falloff * 1.15 > bayer) {
          ctx.fillStyle = css(ringRgb, falloff > 0.55 ? 0.44 : 0.28);
          ctx.fillRect(px, py, 1, 1);
        }
      } else {
        const falloff = 1 - (dist - 0.56) / 0.44;
        if (falloff * 0.85 > bayer) {
          ctx.fillStyle = css(ringRgb, 0.16);
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  return { canvas, w: size, h: size };
}

/** Builds all reusable layered dithered light halos once at startup. */
export function createHaloSprites(): HaloSprites {
  return {
    bulbAmber: buildDitheredHalo(6, [255, 206, 108], [255, 244, 198]),
    lanternWarm: buildDitheredHalo(10, [255, 190, 96], [255, 240, 184]),
    beaconRed: buildDitheredHalo(7, [255, 76, 70], [255, 198, 188]),
    neonCyan: buildDitheredHalo(11, [96, 236, 250], [216, 252, 255]),
    neonPink: buildDitheredHalo(9, [255, 114, 176], [255, 214, 234]),
    floodWarm: buildDitheredHalo(14, [255, 222, 144], [255, 248, 216]),
    tableSpill: buildSpill(23, 7, [255, 190, 96]),
    stringSpill: buildSpill(43, 9, [255, 206, 108]),
    neonCyanSpill: buildSpill(35, 7, [96, 236, 250]),
    neonPinkSpill: buildSpill(25, 7, [255, 114, 176]),
    greenhouseSpill: buildSpill(87, 9, [255, 206, 118]),
  };
}

/** Draws a pre-baked dithered halo centered at design coordinates `(cx, cy)`. */
export function drawHalo(
  ctx: CanvasRenderingContext2D,
  halo: SpriteBox,
  cx: number,
  cy: number,
  unit: number,
  alpha: number,
): void {
  if (alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    halo.canvas,
    Math.round((cx - Math.floor(halo.w / 2)) * unit),
    Math.round((cy - Math.floor(halo.h / 2)) * unit),
    Math.round(halo.w * unit),
    Math.round(halo.h * unit),
  );
  ctx.restore();
}

/** Draws an ordered-dither light pool from a baked surface sprite. */
export function drawDitheredSpill(
  ctx: CanvasRenderingContext2D,
  spill: SpriteBox,
  cx: number,
  cy: number,
  alpha: number,
  unit: number,
): void {
  drawHalo(ctx, spill, cx, cy, unit, alpha);
}

function buildSpill(w: number, h: number, rgb: RGB): SpriteBox {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rx = (w - 1) / 2;
  const ry = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot((x - rx) / rx, (y - ry) / ry);
      const light = 1 - dist;
      const threshold = ditherThreshold(x, y);
      if (light * 1.8 <= threshold) continue;
      ctx.fillStyle = css(rgb, dist < 0.38 ? 1 : dist < 0.7 ? 0.68 : 0.35);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return { canvas, w, h };
}
