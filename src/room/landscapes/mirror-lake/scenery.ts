import { css, mix, type RGB } from '../../../render/color';
import { hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { canoeX, canoeY, DESIGN_HEIGHT, LILY_COUNT, lilyX, lilyY, SCENES, WATERLINE } from './scenes';
import { sprite, type Sprites } from './sprites';

const BANK: RGB = [78, 91, 65];
const WOOD: RGB = [155, 117, 78];

export class LakeScenery {
  private w = 1;
  private h = 1;
  private unit = 1;
  private readonly blooms = new Float32Array(LILY_COUNT);

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_HEIGHT;
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

  private color(base: RGB, state: SkyState): string {
    const lit = mix(base, state.sky.light, (1 - Math.max(0, state.sun.up)) * state.day * 0.2);
    return css(mix([32, 49, 66], lit, 0.39 + state.day * 0.61));
  }

  upper(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number, px: number, sprites: Sprites): void {
    const { w, h, unit: u } = this;
    const horizon = Math.round(h * WATERLINE);
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
    if (scene === 0) this.dock(ctx, state, px);
    if (scene === 2) {
      for (let i = 0; i < LILY_COUNT; i++) {
        const x = lilyX(i, w) + px * 3;
        const y = lilyY(i, h);
        sprite(ctx, sprites.lilyPad, x, y + 3 * u, u * (0.88 + hash(i + 241) * 0.28), i % 2 > 0);
        if (i % 3 !== 0) continue;
        const open = this.blooms[i];
        ctx.fillStyle = this.color([235, 172, 177], state);
        this.rect(ctx, x - (1 + open * 5) * u, y - 5 * u, (2 + open * 10) * u, 2 * u);
        this.rect(ctx, x - 2 * u, y - (6 + open * 3) * u, 4 * u, 6 * u);
        ctx.fillStyle = this.color([255, 204, 203], state);
        this.rect(ctx, x - u, y - (6 + open * 3) * u, 2 * u, u);
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
      for (let row = 0; row < DESIGN_HEIGHT * 0.15; row++) {
        const left = w * 0.16 - (20 + row * 2) * u + px * 3;
        this.rect(ctx, left, h * 0.85 + row * u, (40 + row * 4) * u, u);
      }
      ctx.fillStyle = this.color([166, 163, 132], state);
      for (let i = 0; i < 18; i++) {
        this.rect(ctx, w * 0.16 + (hash(i + 40) - 0.5) * 45 * u + px * 3,
          h * 0.85 + hash(i + 24) * 12 * u, 2 * u, u);
      }
      const cx = canoeX(w, u, time, px);
      const cy = canoeY(h, u, time);
      ctx.save();
      ctx.translate(0, Math.round(cy * 2));
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.58;
      sprite(ctx, sprites.reflections.canoe, cx, cy, u * 1.35);
      ctx.restore();
      sprite(ctx, sprites.canoe, cx, cy, u * 1.35);
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
}
