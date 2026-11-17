import { css, mix, type RGB } from '../../../render/color';
import { hash, noise } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { DESIGN_HEIGHT, SCENES, WATERLINE } from './scenes';
import { sprite, type Sprites } from './sprites';

const MOUNTAIN: RGB = [113, 143, 153];
const SNOW: RGB = [224, 232, 222];
const FOREST: RGB = [53, 91, 78];
const BANK: RGB = [78, 91, 65];
const WOOD: RGB = [155, 117, 78];
const LILY_COUNT = 22;

/** Shared flower positions also keep pointer reactions aligned with the drawn flowers. */
export function lilyX(i: number, w: number): number {
  return w * (i % 2 === 0 ? 0.06 + hash(i + 3) * 0.26 : 0.69 + hash(i + 3) * 0.25);
}
export function lilyY(i: number, h: number): number { return h * (0.72 + hash(i + 33) * 0.2); }

export class LakeScenery {
  private w = 1;
  private h = 1;
  private unit = 1;
  private ridges: Int16Array[] = [];
  private readonly blooms = new Float32Array(LILY_COUNT);

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_HEIGHT;
    this.ridges = SCENES.map((scene, index) => {
      const columns = new Int16Array(w);
      for (let x = 0; x < w; x++) {
        const u = x / w;
        const leftPeak = Math.max(0, 1 - Math.abs(u - 0.17 - index * 0.014) * 3.7);
        const rightPeak = Math.max(0, 1 - Math.abs(u - 0.76) * 4.5);
        const centerPeak = Math.max(0, 1 - Math.abs(u - 0.48) * 5.3) * 0.55;
        columns[x] = Math.round(h * (0.49 - Math.max(leftPeak, rightPeak, centerPeak) * (0.17 + scene.peak)) - noise(x * 0.045) * 3 * this.unit);
      }
      return columns;
    });
    this.blooms.fill(0);
  }

  update(frame: ViewFrame, day: number, parallax: number): void {
    for (let i = 0; i < LILY_COUNT; i++) {
      const x = lilyX(i, this.w) + parallax * 3;
      const y = lilyY(i, this.h);
      const near = frame.pointer && Math.hypot(frame.pointer.x - x, frame.pointer.y - (y - 5 * this.unit)) < 25 * this.unit;
      const target = Math.min(1, day * 0.75 + (near ? 0.7 : 0));
      this.blooms[i] += (target - this.blooms[i]) * Math.min(1, frame.dt * 12);
    }
  }

  private rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  private color(base: RGB, state: SkyState, haze = 0): string {
    const lit = mix(base, state.sky.light, (1 - Math.max(0, state.sun.up)) * state.day * 0.2);
    return css(mix(mix([15, 29, 43], lit, 0.22 + state.day * 0.78), state.sky.horizon, haze));
  }

  upper(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number, px: number, py: number, sprites: Sprites): void {
    const { w, h, unit: u } = this;
    const horizon = Math.round(h * WATERLINE);
    const ridge = this.ridges[scene];
    // Three ridges grow darker as they approach, while the clock's centre stays hazy.
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = this.color(MOUNTAIN, state, 0.56 - layer * 0.16);
      const shift = Math.round(px * (0.5 + layer * 0.5));
      for (let x = -4; x < w + 4; x++) {
        const source = Math.max(0, Math.min(w - 1, x));
        const top = ridge[source] + Math.round(layer * 13 * u + noise(x * 0.02 + layer * 17) * layer * 5 * u + py * layer * 0.3);
        ctx.fillRect(x + shift, top, 1, Math.max(0, horizon - top));
        if (layer === 0) {
          const cap = Math.max(0, h * 0.34 - top);
          if (cap > 0) {
            ctx.fillStyle = this.color(SNOW, state, 0.34);
            const snow = Math.min(cap * 0.48, (4 + hash(x * 3) * 6) * u);
            ctx.fillRect(x + shift, top, 1, Math.round(snow));
            ctx.fillStyle = this.color(MOUNTAIN, state, 0.56);
          }
        }
      }
    }
    ctx.fillStyle = this.color(FOREST, state, 0.26);
    for (let x = -4; x < w + 4; x += 2) {
      const top = horizon - (4 + noise(x * 0.04) * 8 + hash(x) * 5) * u;
      this.rect(ctx, x + px * 1.8, top, 2, horizon - top);
    }
    const island = SCENES[scene].island * w + px * 2.5;
    const islandSize = scene === 1 ? 1 : scene === 3 ? 0.38 : 0.58;
    ctx.fillStyle = this.color(BANK, state);
    for (let row = 0; row < 7; row++) {
      const half = (43 - Math.abs(row - 4) * 6) * u * islandSize;
      this.rect(ctx, island - half, horizon - (7 - row) * u, half * 2, u);
    }
    for (let i = 0; i < 3; i++) {
      const size = islandSize * (i === 1 ? 1 : 0.78) * u;
      sprite(ctx, sprites.pine, island + (i - 1) * 24 * u * islandSize + Math.sin(time * 0.42 + i) * u * 0.6, horizon - 5 * u, size);
    }
    if (scene === 1) {
      const bx = island - 9 * u;
      const by = horizon - 8 * u;
      ctx.fillStyle = this.color(WOOD, state);
      this.rect(ctx, bx, by - 9 * u, 23 * u, 3 * u);
      this.rect(ctx, bx, by - 4 * u, 23 * u, 2 * u);
      this.rect(ctx, bx + 3 * u, by - 6 * u, 2 * u, 9 * u);
      this.rect(ctx, bx + 18 * u, by - 6 * u, 2 * u, 9 * u);
    }
  }

  foreground(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number, px: number, sprites: Sprites): void {
    const { w, h, unit: u } = this;
    // Stony banks frame the water, leaving the radio's centre open.
    const bankDepth = scene === 3 ? 0.035 : 0.09;
    for (let x = 0; x < w; x += 2) {
      const side = Math.abs(x / w - 0.5) * 2;
      const top = h * (1 - bankDepth * side * side) - noise(x * 0.05) * 3 * u;
      ctx.fillStyle = this.color(BANK, state);
      this.rect(ctx, x, top, 2, h - top);
      if (hash(x) > 0.56 && side > 0.36) {
        ctx.fillStyle = this.color([149, 152, 128], state);
        this.rect(ctx, x + px * 4, top - 2 * u, (2 + hash(x + 1) * 4) * u, 2 * u);
        ctx.fillStyle = this.color([75, 87, 73], state);
        this.rect(ctx, x + px * 4, top, 4 * u, 2 * u);
      }
    }
    if (scene === 0) this.dock(ctx, state, px);
    if (scene === 2) {
      for (let i = 0; i < LILY_COUNT; i++) {
        const x = lilyX(i, w) + px * 3;
        const y = lilyY(i, h);
        ctx.fillStyle = this.color([50, 99, 68], state);
        this.rect(ctx, x - 8 * u, y - 2 * u, 16 * u, 4 * u);
        this.rect(ctx, x - 5 * u, y - 3 * u, 11 * u, 6 * u);
        ctx.fillStyle = this.color([116, 153, 83], state);
        this.rect(ctx, x - 5 * u, y - 3 * u, 8 * u, u);
        ctx.fillStyle = css(state.sky.water);
        this.rect(ctx, x + u, y, 7 * u, u);
        if (i % 3 !== 0) continue;
        const open = this.blooms[i];
        ctx.fillStyle = this.color([235, 172, 177], state);
        this.rect(ctx, x - (1 + open * 5) * u, y - 5 * u, (2 + open * 10) * u, 2 * u);
        this.rect(ctx, x - 2 * u, y - (6 + open * 3) * u, 4 * u, 6 * u);
        ctx.fillStyle = this.color([255, 222, 151], state);
        this.rect(ctx, x - u, y - 5 * u, 2 * u, 2 * u);
      }
      const lx = w * 0.81 + px * 3;
      ctx.fillStyle = this.color([91, 74, 51], state);
      this.rect(ctx, lx - 37 * u, h * 0.82, 73 * u, 9 * u);
      ctx.fillStyle = this.color([161, 143, 91], state);
      for (let i = 0; i < 12; i++) this.rect(ctx, lx - 34 * u + i * 6 * u, h * 0.82, (2 + hash(i) * 3) * u, 2 * u);
    }
    if (scene === 4) {
      ctx.fillStyle = this.color([91, 104, 78], state);
      for (let row = 0; row < h * 0.15; row++) {
        const left = w * 0.16 - (20 + row * 2) * u + px * 3;
        this.rect(ctx, left, h * 0.85 + row * u, (40 + row * 4) * u, u);
      }
      ctx.fillStyle = this.color([166, 163, 132], state);
      for (let i = 0; i < 18; i++) {
        this.rect(ctx, w * 0.16 + (hash(i + 40) - 0.5) * 45 * u + px * 3,
          h * 0.85 + hash(i + 24) * 12 * u, 2 * u, u);
      }
      const cx = w * 0.76 + px * 3 + Math.sin(time * 0.15) * 3 * u;
      const cy = h * 0.79 + Math.sin(time * 0.7) * u;
      ctx.save();
      ctx.translate(0, Math.round(cy * 2));
      ctx.scale(1, -1);
      sprite(ctx, sprites.reflections.canoe, cx, cy, u * 1.35);
      ctx.restore();
      sprite(ctx, sprites.canoe, cx, cy, u * 1.35);
      ctx.fillStyle = css([255, 213, 125], (1 - state.day) * 0.15);
      this.rect(ctx, cx - 9 * u, cy - 22 * u, 24 * u, 18 * u);
      ctx.fillStyle = '#ffe5a3';
      this.rect(ctx, cx + 4 * u, cy - 12 * u, 2 * u, 4 * u);
    }
    const reedCount = scene === 3 ? 14 : 44;
    for (let i = 0; i < reedCount; i++) {
      const side = i % 2 === 0;
      const x = (side ? hash(i + 9) * 0.15 : 0.86 + hash(i + 9) * 0.14) * w + px * 4;
      const base = h * (0.95 + hash(i + 5) * 0.05);
      const tall = (12 + hash(i + 4) * 27) * u;
      const bend = Math.sin(time * 0.65 + i) * 1.3 * u;
      ctx.fillStyle = this.color(i % 3 === 0 ? [100, 124, 70] : [37, 65, 51], state);
      for (let row = 0; row < tall; row += 2) this.rect(ctx, x + bend * (1 - row / tall), base - tall + row, u, 2);
      if (i % 4 === 0) {
        ctx.fillStyle = this.color([111, 79, 50], state);
        this.rect(ctx, x + bend - u, base - tall, 3 * u, 6 * u);
      }
    }
  }

  private dock(ctx: CanvasRenderingContext2D, state: SkyState, px: number): void {
    const { w, h, unit: u } = this;
    const x = w * 0.12 + px * 3;
    const y = h * 0.78;
    ctx.fillStyle = this.color([67, 64, 51], state);
    this.rect(ctx, x - 22 * u, y + 2 * u, 47 * u, h - y);
    for (let i = 0; i < 12; i++) {
      const row = y + i * 5 * u;
      ctx.fillStyle = this.color(i % 3 === 0 ? [166, 133, 89] : WOOD, state);
      this.rect(ctx, x - 24 * u, row, 50 * u, 4 * u);
      ctx.fillStyle = this.color([99, 79, 56], state);
      this.rect(ctx, x - 19 * u + hash(i) * 14 * u, row + 2 * u, 16 * u, u);
      ctx.fillStyle = this.color([57, 64, 58], state);
      this.rect(ctx, x - 19 * u, row + u, u, u);
      this.rect(ctx, x + 21 * u, row + u, u, u);
    }
    ctx.fillStyle = this.color([114, 90, 62], state);
    for (const side of [-1, 1]) {
      this.rect(ctx, x + side * 24 * u, y - 11 * u, 4 * u, 22 * u);
      ctx.fillStyle = this.color([211, 183, 129], state);
      this.rect(ctx, x + side * 24 * u, y - 11 * u, 4 * u, 2 * u);
      ctx.fillStyle = this.color([114, 90, 62], state);
    }
    ctx.fillStyle = this.color([199, 176, 126], state);
    this.rect(ctx, x - 8 * u, y + 12 * u, 30 * u, 2 * u);
    this.rect(ctx, x + 16 * u, y + 10 * u, 9 * u, 6 * u);
  }

  atmosphere(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number): void {
    const { w, h, unit: u } = this;
    if (scene === 0) {
      ctx.fillStyle = css(mix(state.sky.horizon, [213, 226, 222], 0.35), 0.13);
      for (let i = 0; i < 8; i++) {
        const x = ((i * w * 0.17 + time * u * 0.65) % (w * 1.3)) - w * 0.15;
        this.rect(ctx, x, h * (0.58 + i % 3 * 0.025), w * 0.24, (i % 2 + 1) * u);
      }
    }
    if (scene !== 4 || state.day > 0.8) return;
    for (let i = 0; i < 18; i++) {
      const glow = (0.5 + 0.5 * Math.sin(time * 0.8 + i * 2)) ** 2 * (1 - state.day);
      const x = w * (i % 2 ? 0.69 + hash(i) * 0.25 : 0.04 + hash(i) * 0.24) + Math.sin(time * 0.3 + i) * 6 * u;
      const y = h * (0.71 + hash(i + 5) * 0.21) + Math.cos(time * 0.45 + i) * 4 * u;
      ctx.fillStyle = css([218, 231, 145], glow * 0.18);
      this.rect(ctx, x - u, y - u, 3 * u, 3 * u);
      ctx.fillStyle = css([244, 244, 176], glow);
      this.rect(ctx, x, y, u, u);
    }
  }
}
