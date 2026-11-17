import { css, mix } from '../../../render/color';
import type { SkyState } from '../../sky';

const MAX_RIPPLES = 24;
const RIPPLE_SECONDS = 3.6;
const MAX_SKIPS = 4;
const SKIP_SECONDS = 0.38;
const RING_POINTS = 48;

interface Ripple { x: number; y: number; age: number; small: boolean }
interface Skip { x: number; y: number; age: number; step: number; direction: number }

export class LakeWater {
  private readonly ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, y: 0, age: RIPPLE_SECONDS, small: false }));
  private readonly skips: Skip[] = Array.from({ length: MAX_SKIPS }, () => ({ x: 0, y: 0, age: 0, step: 3, direction: 1 }));
  private cursor = 0;
  private skipCursor = 0;

  reset(): void {
    for (const ripple of this.ripples) ripple.age = RIPPLE_SECONDS;
    for (const skip of this.skips) skip.step = 3;
  }

  ripple(x: number, y: number, small = false): void {
    const r = this.ripples[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_RIPPLES;
    r.x = x;
    r.y = y;
    r.age = 0;
    r.small = small;
  }

  press(x: number, y: number, w: number, h: number): void {
    this.ripple(x, y);
    if (y < h * 0.72) return;
    const skip = this.skips[this.skipCursor];
    this.skipCursor = (this.skipCursor + 1) % MAX_SKIPS;
    Object.assign(skip, { x, y, age: 0, step: 0, direction: x < w / 2 ? 1 : -1 });
  }

  update(dt: number, unit: number): void {
    for (const r of this.ripples) r.age += dt;
    for (const s of this.skips) {
      if (s.step >= 3) continue;
      s.age += dt;
      if (s.age < SKIP_SECONDS) continue;
      s.age -= SKIP_SECONDS;
      s.x += s.direction * (24 - s.step * 5) * unit;
      s.y -= (8 - s.step * 2) * unit;
      this.ripple(s.x, s.y, true);
      s.step++;
    }
  }

  reflect(ctx: CanvasRenderingContext2D, upper: HTMLCanvasElement, horizon: number, unit: number, time: number, state: SkyState): void {
    const w = upper.width;
    const h = upper.height;
    for (let y = horizon; y < h; y++) {
      const sourceY = Math.max(0, 2 * horizon - y - 1);
      const shift = Math.round(Math.sin(y * 0.12 + time * 0.55) * 0.7 * unit);
      ctx.drawImage(upper, 0, sourceY, w, 1, shift, y, w, 1);
      for (const r of this.ripples) {
        if (r.age >= RIPPLE_SECONDS) continue;
        const radius = (3 + r.age * (r.small ? 9 : 17)) * unit;
        const dy = (y - r.y) * 3;
        if (Math.abs(dy) > radius) continue;
        const half = Math.sqrt(radius * radius - dy * dy);
        const left = Math.max(3, Math.floor(r.x - half));
        const right = Math.min(w - 3, Math.ceil(r.x + half));
        if (right <= left) continue;
        const wobble = Math.round(Math.sin(dy * 0.7 - r.age * 8) * 2 * unit * (1 - r.age / RIPPLE_SECONDS));
        ctx.drawImage(upper, Math.max(0, left - wobble), sourceY, right - left, 1, left, y, right - left, 1);
      }
    }
    ctx.fillStyle = css(mix(state.sky.water, [12, 32, 40], 0.3), 0.24);
    ctx.fillRect(0, horizon, w, h - horizon);
  }

  draw(ctx: CanvasRenderingContext2D, unit: number, state: SkyState): void {
    for (const r of this.ripples) {
      if (r.age >= RIPPLE_SECONDS) continue;
      ctx.fillStyle = css(mix(state.sky.horizon, state.sky.light, 0.4), 0.62 * (1 - r.age / RIPPLE_SECONDS));
      for (let ring = 0; ring < 3; ring++) {
        const radius = (2 + r.age * (r.small ? 9 : 17) - ring * 5) * unit;
        if (radius <= 0) continue;
        for (let i = 0; i < RING_POINTS; i++) {
          const angle = i / RING_POINTS * Math.PI * 2;
          ctx.fillRect(Math.round(r.x + Math.cos(angle) * radius), Math.round(r.y + Math.sin(angle) * radius / 3), Math.max(1, Math.round(unit)), 1);
        }
      }
    }
    ctx.fillStyle = '#d7d1bb';
    for (const s of this.skips) {
      if (s.step >= 3) continue;
      const t = s.age / SKIP_SECONDS;
      const span = (24 - s.step * 5) * unit;
      ctx.fillRect(Math.round(s.x + s.direction * span * t), Math.round(s.y - 8 * unit * Math.sin(Math.PI * t) - t * (8 - s.step * 2) * unit), 2, 1);
    }
  }
}
