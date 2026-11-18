import { memoryCanvas } from '../../../render/pixel-stage';
import { breeze } from '../../wind';
import type { SkyState } from '../../sky';
import { drawBoxBottom } from './creatures';
import { boathouseX, cabinX } from './far-shore';
import type { FishingSprites, SpriteBox } from './sprites';
import type { SceneIndex, SceneLayout } from './types';
import { lanternBend } from './wind-sprites';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const FLICKER_RATE = 1.9;
const WINDOW_HALO_SCALE = 0.38;
const WINDOW_REFLECTION_SCALE = 0.4;
/** Maximum movement of reflected light on the water, in stage pixels. */
const REFLECTION_SWAY = 2;
const WARM_HIGHLIGHT = 'rgba(255,220,146,0.44)';
const WARM_EDGE = 'rgba(241,163,91,0.22)';

function buildSpill(width: number, height: number, water: boolean): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, height);
  for (let y = 0; y < height; y++) {
    const depth = y / height;
    if (water && y % 7 >= 3) continue;
    const reach = water ? 0.34 + depth * 0.58 : 1 - depth * 0.52;
    const bend = water ? Math.round(Math.sin(y * 1.14) * 3) : 0;
    for (let x = 0; x < width; x++) {
      const cross = Math.abs((x - bend) / (width - 1) * 2 - 1);
      const light = (1 - cross / reach) * (1 - depth * 0.8);
      const threshold = BAYER[(y & 3) * 4 + (x & 3)] / BAYER.length;
      if (light <= threshold * 0.72) continue;
      ctx.fillStyle = light > 0.56 ? WARM_HIGHLIGHT : WARM_EDGE;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function drawSpill(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, y: number, unit: number, scale = 1): void {
  const w = Math.max(1, Math.round(image.width * unit * scale));
  const h = Math.max(1, Math.round(image.height * unit * scale));
  ctx.drawImage(image, Math.round(x * unit - w / 2), Math.round(y * unit), w, h);
}

/** Keeps lamps and their reflections attached to the props through the camera glide. */
export class LakeLights {
  private readonly plank = buildSpill(43, 9, false);
  private readonly water = buildSpill(47, 29, true);

  draw(ctx: CanvasRenderingContext2D, sprites: FishingSprites, state: SkyState, scene: SceneIndex, layout: SceneLayout, time: number): void {
    const night = 1 - state.day;
    const farStrength = night * 0.84;
    const u = layout.unit;
    if (farStrength > 0.04) {
      const cabin = cabinX(layout);
      const shed = boathouseX(layout);
      const shore = layout.waterTopY;
      ctx.save();
      ctx.globalAlpha = farStrength * 0.48;
      drawSpill(ctx, sprites.haloEmber.canvas, cabin - 5, shore - 10, u, WINDOW_HALO_SCALE);
      drawSpill(ctx, sprites.haloEmber.canvas, cabin + 6, shore - 10, u, WINDOW_HALO_SCALE);
      drawSpill(ctx, sprites.haloEmber.canvas, shed - 8, shore - 10, u, WINDOW_HALO_SCALE);
      drawSpill(ctx, sprites.haloEmber.canvas, shed + 11, shore - 10, u, WINDOW_HALO_SCALE);
      ctx.globalAlpha = farStrength;
      drawBoxBottom(ctx, sprites.cabinGlow, cabin, shore, u);
      drawBoxBottom(ctx, sprites.boathouseGlow, shed, shore + 1, u);
      ctx.globalAlpha = farStrength * 0.66;
      drawSpill(ctx, this.water, cabin + breeze(time, cabin * u) / u, shore + 1, u, WINDOW_REFLECTION_SCALE);
      drawSpill(ctx, this.water, shed + breeze(time, shed * u) / u, shore + 1, u, WINDOW_REFLECTION_SCALE);
      ctx.restore();
    }

    const strength = scene === 4 ? 0.52 + 0.48 * night : scene === 3 ? 0.4 + 0.6 * night : Math.max(0, night * 1.35 - 0.18);
    if (strength < 0.04) return;
    const j = layout.jettyRight;
    const d = layout.deckY;
    const r = layout.rightZone;
    ctx.save();
    if (scene === 0) {
      this.drawLamp(ctx, sprites.haloLantern, j - 9.5, d - 20.5, d, d + 12, u, strength, time, 0, true);
    } else if (scene === 1) {
      this.drawLamp(ctx, sprites.haloLantern, 48.5, d - 24.5, d + 2, d + 14, u, strength, time, 1, true);
    } else if (scene === 2) {
      this.drawLamp(ctx, sprites.haloLantern, 124.5, d - 16.5, d + 4, d + 16, u, strength, time, 2, true);
    } else if (scene === 3) {
      this.drawLamp(ctx, sprites.haloLantern, 28.5, d - 6.5, d, d + 13, u, strength, time, 0, true);
      this.drawLamp(ctx, sprites.haloLantern, j - 7.5, d - 6.5, d, d + 12, u, strength, time, 1.5, true);
      this.drawLamp(ctx, sprites.haloLantern, r + 36.5, 195.5, null, 217, u, strength, time, 2, true);
      this.drawLamp(ctx, sprites.haloEmber, j - 55, d - 4, d, null, u, 0.38 + 0.38 * night, time, 1);
    } else {
      this.drawLamp(ctx, sprites.haloLantern, j - 18, d - 5.5, d, d + 11, u, strength, time);
      this.drawLamp(ctx, sprites.haloEmber, r + 31, 176.5, null, 192, u, strength * 0.8, time, 1.5, true);
    }
    ctx.restore();
  }

  private drawLamp(
    ctx: CanvasRenderingContext2D,
    halo: SpriteBox,
    x: number,
    y: number,
    plankY: number | null,
    waterY: number | null,
    unit: number,
    strength: number,
    time: number,
    phase = 0,
    hanging = false,
  ): void {
    const glow = strength * (0.92 + 0.08 * Math.sin((time + phase) * FLICKER_RATE));
    const stageX = x * unit;
    const bend = hanging ? lanternBend(time, stageX) : 0;
    const center = x + Math.sign(bend) * Math.round(Math.abs(bend) / 2) / unit;
    ctx.globalAlpha = glow;
    const h = Math.max(1, Math.round(halo.h * unit));
    const w = Math.max(1, Math.round(halo.w * unit));
    ctx.drawImage(halo.canvas, Math.round(center * unit - w / 2), Math.round(y * unit - h / 2), w, h);
    if (plankY !== null) drawSpill(ctx, this.plank, center, plankY, unit);
    if (waterY !== null) {
      ctx.globalAlpha = glow * 0.74;
      drawSpill(ctx, this.water, center + breeze(time, stageX) * REFLECTION_SWAY / unit, waterY, unit);
    }
  }
}
