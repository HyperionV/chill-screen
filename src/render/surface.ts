import { SURFACE_Y } from '../world/geometry';
import type { Palette } from '../world/daylight';
import type { Tank } from '../world/types';
import { css, mix } from './color';

const SLICES = 12;

/** Height of the water line at x, rippling gently over time. */
export const surfaceAt = (x: number, time: number): number =>
  SURFACE_Y + Math.sin(x * 0.012 + time * 0.9) * 3 + Math.sin(x * 0.031 - time * 1.4) * 1.6;

/**
 * The underside of the water surface. Seen from just below, it mirrors the tank (total internal
 * reflection), so the band above the water line is the scene below it, flipped and rippling.
 */
export class Surface {
  private readonly mirror = document.createElement('canvas');
  private scale = 1;

  resize(canvasWidth: number, scale: number): void {
    this.scale = scale;
    this.mirror.width = canvasWidth;
    this.mirror.height = Math.ceil(SURFACE_Y * scale);
  }

  /** Call after everything under the water line is drawn, with the world transform set. */
  draw(ctx: CanvasRenderingContext2D, source: HTMLCanvasElement, tank: Tank, pal: Palette, time: number): void {
    const band = this.mirror.height;
    const m = this.mirror.getContext('2d');
    if (!m) return;
    m.setTransform(1, 0, 0, -1, 0, band);
    m.drawImage(source, 0, band, source.width, band, 0, 0, source.width, band);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sliceH = band / SLICES;
    for (let i = 0; i < SLICES; i++) {
      const wobble = Math.sin(time * 1.2 + i * 0.9) * 3 * this.scale * (0.4 + i / SLICES);
      ctx.drawImage(this.mirror, 0, i * sliceH, source.width, sliceH + 1, wobble, i * sliceH, source.width, sliceH + 1);
    }
    ctx.restore();

    const W = tank.width;
    const tint = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
    tint.addColorStop(0, css(pal.waterDeep, 0.72));
    tint.addColorStop(1, css(mix(pal.waterTop, [255, 255, 255], 0.1), 0.28));
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, SURFACE_Y + 4);

    const line = (): void => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        if (x === 0) ctx.moveTo(x, surfaceAt(x, time));
        else ctx.lineTo(x, surfaceAt(x, time));
      }
    };
    // Water below the line, drawn over the mirror's bottom edge so the line follows the ripples.
    ctx.fillStyle = css(mix(pal.waterTop, pal.rays, 0.12));
    line();
    ctx.lineTo(W, SURFACE_Y + 6);
    ctx.lineTo(0, SURFACE_Y + 6);
    ctx.closePath();
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;

    const shine = css(mix(pal.rays, [255, 255, 255], 0.6), 0.5 * (0.35 + pal.light * 0.65));
    ctx.strokeStyle = css(mix(pal.rays, [255, 255, 255], 0.5), 0.12 * (0.35 + pal.light * 0.65));
    ctx.lineWidth = 7;
    line();
    ctx.stroke();
    ctx.strokeStyle = shine;
    ctx.lineWidth = 1.5;
    line();
    ctx.stroke();

    // Glints where ripples catch the lamp.
    ctx.fillStyle = css([255, 255, 255], 0.55 * pal.light);
    for (let i = 0; i < 14; i++) {
      const x = ((i * 0.618 * W + time * (8 + (i % 4) * 5)) % W + W) % W;
      const glint = Math.max(0, Math.sin(time * 1.7 + i * 2.3));
      if (glint < 0.6) continue;
      ctx.fillRect(x, surfaceAt(x, time) - 0.8, 6 + glint * 10, 1.4);
    }
  }
}
