import { css, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function threshold(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / BAYER.length;
}

/** The brightest pixels stay near the source and the outer ring fades into stipple. */
export function halo(rx: number, ry: number, color: RGB, clearCenter = 0): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(rx * 2 + 1, ry * 2 + 1);
  const outer = css(color, 0.11);
  const middle = css(color, 0.22);
  const inner = css(color, 0.44);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const dx = x - rx;
      const dy = y - ry;
      if (dx * dx + dy * dy < clearCenter * clearCenter) continue;
      const distance = Math.hypot(dx / rx, dy / ry);
      const dither = threshold(x, y);
      if (distance + dither * 0.22 > 1) continue;
      ctx.fillStyle = distance + dither * 0.1 < 0.25 ? inner : distance + dither * 0.18 < 0.59 ? middle : outer;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export function glow(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, x: number, y: number, unit: number, strength: number): void {
  const w = Math.max(1, Math.round(image.width * unit));
  const h = Math.max(1, Math.round(image.height * unit));
  ctx.globalAlpha = strength;
  ctx.drawImage(image, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  ctx.globalAlpha = 1;
}

/** All lamps change strength over several seconds. */
export function flicker(time: number, phase = 0): number {
  return 0.86 + Math.sin(time * 0.74 + phase) * 0.09 + Math.sin(time * 1.31 + phase) * 0.05;
}
