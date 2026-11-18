import { css, mix, type RGB } from '../../../render/color';
import { hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { breeze, gust } from '../../wind';
import { canoeX, canoeY, DESIGN_HEIGHT, LILY_COUNT, LILY_FLOWER_HEIGHT, LILY_FLOWER_SPACING, lilySway, lilyX, lilyY, SCENES, WATERLINE } from './scenes';
import { sprite, windSprite, type Sprites } from './sprites';

const BANK: RGB = [78, 91, 65];
const WOOD: RGB = [155, 117, 78];
/** Tip movement in stage pixels. */
const ISLAND_PINE_SWAY = 2;
const LILY_PAD_SWAY = 1;
/** One staggered pool for seeds and petals, with time between trips. */
const DRIFTER_COUNT = 6;
const DRIFTER_CYCLE = 13;
const DRIFTER_LIFE = 7;
const DRIFTER_FADE_SECONDS = 1;
/** Seed and petal travel in stage pixels. */
const DRIFTER_SPEED = 3;
const DRIFTER_GUST_SPEED = 5;
const SEED_LIFT = 14;
const PETAL_FALL = 8;
const DRIFTER_FLUTTER = 2;

export class LakeScenery {
  private w = 1;
  private h = 1;
  private unit = 1;
  private readonly blooms = new Float32Array(LILY_COUNT);
  private readonly drifters = Array.from({ length: DRIFTER_COUNT }, (_, i) => ({
    age: -i * DRIFTER_CYCLE / DRIFTER_COUNT,
    distance: 0,
    u: i % 2 ? 0.82 + hash(i + 811) * 0.09 : 0.025 + hash(i + 811) * 0.09,
    v: 0.92 + hash(i + 879) * 0.035,
  }));

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_HEIGHT;
    this.blooms.fill(0);
  }

  update(frame: ViewFrame, day: number, dt: number): void {
    const { pointer, time } = frame;
    for (let i = 0; i < LILY_COUNT; i += LILY_FLOWER_SPACING) {
      let near = false;
      if (pointer) {
        const root = lilyX(i, this.w);
        const x = root + lilySway(time, root);
        const y = lilyY(i, this.h) - LILY_FLOWER_HEIGHT * this.unit;
        near = Math.hypot(pointer.x - x, pointer.y - y) < 25 * this.unit;
      }
      const target = Math.min(1, day * 0.75 + (near ? 0.7 : 0));
      this.blooms[i] += (target - this.blooms[i]) * Math.min(1, frame.dt * 12);
    }
    const travel = dt * (DRIFTER_SPEED + DRIFTER_GUST_SPEED * gust(time));
    for (const drifter of this.drifters) {
      drifter.age += dt;
      if (drifter.age >= DRIFTER_CYCLE) {
        drifter.age -= DRIFTER_CYCLE;
        drifter.distance = 0;
      }
      if (drifter.age > 0 && drifter.age < DRIFTER_LIFE) drifter.distance += travel;
    }
  }

  private rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  private color(base: RGB, state: SkyState): string {
    const lit = mix(base, state.sky.light, (1 - Math.max(0, state.sun.up)) * state.day * 0.2);
    return css(mix([32, 49, 66], lit, 0.39 + state.day * 0.61));
  }

  upper(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number, sprites: Sprites): void {
    const { w, h, unit: u } = this;
    const horizon = Math.round(h * WATERLINE);
    const island = SCENES[scene].island * w;
    const islandSize = scene === 1 ? 1 : scene === 3 ? 0.38 : 0.58;
    ctx.fillStyle = this.color(BANK, state);
    for (let row = 0; row < 7; row++) {
      const half = (43 - Math.abs(row - 4) * 6) * u * islandSize;
      this.rect(ctx, island - half, horizon - (7 - row) * u, half * 2, u);
    }
    for (let i = 0; i < 3; i++) {
      const size = islandSize * (i === 1 ? 1 : 0.78) * u;
      const x = island + (i - 1) * 24 * u * islandSize;
      windSprite(ctx, sprites.pine, x, horizon - 5 * u, size, Math.round(breeze(time, x) * ISLAND_PINE_SWAY));
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

  foreground(ctx: CanvasRenderingContext2D, scene: number, state: SkyState, time: number, sprites: Sprites): void {
    const { w, h, unit: u } = this;
    if (scene === 0) this.dock(ctx, state);
    if (scene === 2) {
      for (let i = 0; i < LILY_COUNT; i++) {
        const x = lilyX(i, w);
        const y = lilyY(i, h);
        const padSway = Math.round(breeze(time, x) * LILY_PAD_SWAY);
        windSprite(ctx, sprites.lilyPad, x, y + 3 * u, u * (0.88 + hash(i + 241) * 0.28), padSway, i % 2 > 0);
        if (i % LILY_FLOWER_SPACING !== 0) continue;
        const open = this.blooms[i];
        const bloomX = x + lilySway(time, x);
        const centerY = y - LILY_FLOWER_HEIGHT * u;
        ctx.fillStyle = this.color([235, 172, 177], state);
        const bloomY = y - (6 + open * 3) * u;
        this.rect(ctx, bloomX - (1 + open * 5) * u, centerY, (2 + open * 10) * u, 2 * u);
        const stemY = Math.round(bloomY);
        const stemHeight = Math.max(1, Math.round(6 * u));
        const stemWidth = Math.max(1, Math.round(4 * u));
        const tipRows = Math.floor(stemHeight / 2);
        const middleRows = Math.floor(stemHeight / 3);
        ctx.fillRect(Math.round(bloomX - 2 * u), stemY, stemWidth, tipRows);
        ctx.fillRect(Math.round((bloomX + x) / 2 - 2 * u), stemY + tipRows, stemWidth, middleRows);
        ctx.fillRect(Math.round(x - 2 * u), stemY + tipRows + middleRows, stemWidth, stemHeight - tipRows - middleRows);
        ctx.fillStyle = this.color([255, 204, 203], state);
        this.rect(ctx, bloomX - u, bloomY, 2 * u, u);
        ctx.fillStyle = this.color([255, 222, 151], state);
        this.rect(ctx, bloomX - u, centerY, 2 * u, 2 * u);
      }
      const lx = w * 0.81;
      ctx.fillStyle = this.color([91, 74, 51], state);
      this.rect(ctx, lx - 37 * u, h * 0.82, 73 * u, 9 * u);
      ctx.fillStyle = this.color([161, 143, 91], state);
      for (let i = 0; i < 12; i++) this.rect(ctx, lx - 34 * u + i * 6 * u, h * 0.82, (2 + hash(i) * 3) * u, 2 * u);
    }
    if (scene === 4) {
      ctx.fillStyle = this.color([91, 104, 78], state);
      for (let row = 0; row < DESIGN_HEIGHT * 0.15; row++) {
        const left = w * 0.16 - (20 + row * 2) * u;
        this.rect(ctx, left, h * 0.85 + row * u, (40 + row * 4) * u, u);
      }
      ctx.fillStyle = this.color([166, 163, 132], state);
      for (let i = 0; i < 18; i++) {
        this.rect(ctx, w * 0.16 + (hash(i + 40) - 0.5) * 45 * u,
          h * 0.85 + hash(i + 24) * 12 * u, 2 * u, u);
      }
      const cx = canoeX(w, u, time);
      const cy = canoeY(h, u, time);
      ctx.save();
      ctx.translate(0, Math.round(cy * 2));
      ctx.scale(1, -1);
      ctx.globalAlpha = 0.58;
      sprite(ctx, sprites.reflections.canoe, cx, cy, u * 1.35);
      ctx.restore();
      sprite(ctx, sprites.canoe, cx, cy, u * 1.35);
    }
    this.windDrifters(ctx, scene === 2, state.day, time);
  }

  private windDrifters(ctx: CanvasRenderingContext2D, petals: boolean, day: number, time: number): void {
    ctx.fillStyle = petals ? '#e4a8ae' : '#a9a97a';
    for (let i = 0; i < this.drifters.length; i++) {
      const { age, distance, u, v } = this.drifters[i];
      if (age <= 0 || age >= DRIFTER_LIFE) continue;
      const lily = i * LILY_FLOWER_SPACING;
      const originX = petals ? lilyX(lily, this.w) : u * this.w;
      const originY = petals ? lilyY(lily, this.h) - LILY_FLOWER_HEIGHT * this.unit : v * this.h;
      const x = originX + distance;
      const y = originY + (petals ? PETAL_FALL : -SEED_LIFT) * age / DRIFTER_LIFE
        + breeze(time, x) * DRIFTER_FLUTTER;
      const fade = Math.min(1, Math.min(age, DRIFTER_LIFE - age) / DRIFTER_FADE_SECONDS);
      ctx.globalAlpha = (0.18 + day * 0.36) * fade;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  private dock(ctx: CanvasRenderingContext2D, state: SkyState): void {
    const { w, h, unit: u } = this;
    const x = w * 0.12;
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
