import { memoryCanvas } from '../../../render/pixel-stage';
import type { SkyState } from '../../sky';
import { disc } from '../../sky';
import { hash, ramp } from '../noise';
import { picture } from './sprites';

// Separate banks leave blue channels between the three moving cloud shelves.
const ROWS = [185, 219, 253];
const SPEEDS = [0.12, 0.38, 0.86];
const SPACING = 126;
const BANK_WIDTH = 114;
const BANK_HEIGHT = 62;
const PALETTES = [
  ['#fff9e9', '#e9eff0', '#a3bdce', '#7196b3'],
  ['#ffe7b5', '#e8be9f', '#9e9cae', '#657f9e'],
  ['#afc5df', '#718aa9', '#425b7d', '#263e60'],
  ['#9299ad', '#626c85', '#424d68', '#303c57'],
];
const HAZE = ['#5884ac', '#8e879c', '#1b304e', '#333e59'];

function bank(palette: readonly string[], depth: number, tower: boolean): HTMLCanvasElement {
  const width = tower ? 70 : BANK_WIDTH;
  const height = tower ? 112 : BANK_HEIGHT;
  const { canvas, ctx } = memoryCanvas(width, height);
  const body = palette[depth === 0 ? 2 : depth === 2 ? 0 : 1];
  const light = palette[depth === 0 ? 1 : 0];
  ctx.fillStyle = body;
  const lobes = tower ? 9 : 7;
  for (let i = 0; i < lobes; i++) {
    const radius = tower ? 12 + Math.round(hash(i + 3) * 9) : 16 + Math.round(hash(i + depth * 7) * 10);
    const x = tower ? 35 + Math.round(Math.sin(i * 2) * i * 1.6) : 15 + i * 14;
    const y = tower ? 17 + i * 10 : 31 + Math.round(hash(i + depth * 17) * 8);
    disc(ctx, x, y, radius);
    // Each lobe keeps its own lit rim rather than one line across the whole sea.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = light;
    for (let dx = -radius + 3; dx <= radius - 3; dx++) {
      const edge = Math.round(Math.sqrt(radius * radius - dx * dx));
      if ((dx + i) % 4 !== 0) ctx.fillRect(x + dx, y - edge + 1, 1, 1);
    }
    ctx.restore();
    ctx.fillStyle = body;
  }
  ctx.globalCompositeOperation = 'source-atop';
  const shadeRow = tower ? 70 : 36 + depth * 2;
  ctx.fillStyle = palette[depth === 0 ? 3 : 2];
  ctx.fillRect(0, shadeRow + 5, width, height);
  for (let y = shadeRow - 5; y < shadeRow + 9; y++) {
    for (let x = y % 2; x < width; x += 2) {
      if ((x * 3 + y * 5) % 13 < y - shadeRow + 6) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = palette[3];
  for (let x = 0; x < width; x += 2) {
    ctx.fillRect(x, height - 11 + Math.round(Math.sin(x * 0.13) * 3), 1, 4);
  }
  return canvas;
}

export class CloudSea {
  private readonly banks: HTMLCanvasElement[][] = [];
  private readonly towers: HTMLCanvasElement[] = [];
  private readonly weights = new Float32Array(4);

  prepare(): void {
    if (this.banks.length) return;
    for (const palette of PALETTES) {
      this.banks.push([bank(palette, 0, false), bank(palette, 1, false), bank(palette, 2, false)]);
      this.towers.push(bank(palette, 0, true));
    }
  }

  colors(state: SkyState, storm: number): void {
    const warm = Math.max(0, 1 - state.sun.up / 0.55) * state.day;
    this.weights[1] = warm * (1 - storm);
    this.weights[2] = (1 - state.day) * (1 - storm);
    this.weights[3] = storm;
  }

  haze(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.save();
    ctx.fillStyle = HAZE[0];
    // Fade the distant blue into the sky before it becomes the floor of the gaps.
    for (let y = 174; y < 204; y += 3) {
      ctx.globalAlpha = (y - 171) / 33;
      ctx.fillRect(0, y, width, 3);
    }
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 204, width, 66);
    for (let palette = 1; palette < HAZE.length; palette++) {
      ctx.fillStyle = HAZE[palette];
      ctx.globalAlpha = this.weights[palette];
      ctx.fillRect(0, 204, width, 66);
    }
    ctx.restore();
  }

  drawTowers(ctx: CanvasRenderingContext2D, width: number, scroll: number, time: number, lift: number): void {
    const spacing = 210;
    const drift = scroll * 0.055 + time * 0.2;
    for (let i = Math.floor(drift / spacing) - 1; i <= Math.ceil((drift + width) / spacing); i++) {
      const x = i * spacing - drift + 18;
      // Towers crossing the clock become shorter distant silhouettes.
      const behindClock = ramp(width * 0.1, width * 0.25, x) * (1 - ramp(width * 0.7, width * 0.85, x));
      const scale = 0.65 - behindClock * 0.27 + hash(i + 17) * 0.3;
      const y = 188 - 112 * scale + lift;
      this.paint(ctx, this.towers, x, y, scale, 0.75);
    }
  }

  drawLayer(ctx: CanvasRenderingContext2D, width: number, depth: number, scroll: number,
    time: number, lift: number, parted: Float32Array): void {
    const drift = scroll * SPEEDS[depth] + time * (0.6 + depth * 0.25);
    const first = Math.floor(drift / SPACING) - 1;
    const last = Math.ceil((drift + width) / SPACING);
    for (let i = first; i <= last; i++) {
      const x = Math.round(i * SPACING - drift + depth * 39);
      if (x > width || x + BANK_WIDTH < 0) continue;
      const at = Math.min(parted.length - 1, Math.max(0, Math.floor((x + BANK_WIDTH / 2) / 3)));
      const y = ROWS[depth] - BANK_HEIGHT / 2 + hash(i + depth * 51) * 10 + lift + parted[at] * 17;
      ctx.save();
      for (let palette = 0; palette < this.banks.length; palette++) {
        const weight = palette === 0 ? 1 : this.weights[palette];
        if (weight < 0.005) continue;
        ctx.globalAlpha = weight;
        picture(ctx, this.banks[palette][depth], x, y);
      }
      ctx.restore();
    }
  }

  private paint(ctx: CanvasRenderingContext2D, sprites: readonly HTMLCanvasElement[], x: number,
    y: number, scale: number, opacity: number): void {
    ctx.save();
    for (let palette = 0; palette < sprites.length; palette++) {
      const weight = palette === 0 ? 1 : this.weights[palette];
      if (weight < 0.005) continue;
      ctx.globalAlpha = weight * opacity;
      picture(ctx, sprites[palette], x, y, scale);
    }
    ctx.restore();
  }
}
