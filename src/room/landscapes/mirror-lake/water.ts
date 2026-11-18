import { css, mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import { WATERLINE } from './scenes';

const MAX_RIPPLES = 24;
const RIPPLE_SECONDS = 3.6;
const MAX_SKIPS = 4;
const SKIP_SECONDS = 0.38;
const RING_POINTS = 48;
const SURFACE_MARKS = 45;
const LIGHT_BANDS = 44;
const REFLECTION_PADDING = 6;
const NIGHT_WATER: RGB = [40, 62, 85];

const LIGHT = {
  moon: { shade: '#658caa', mid: '#9dbdd0', core: '#ccdee0', start: 3, spread: 34 },
  lamp: { shade: '#926748', mid: '#d69457', core: '#f4c081', start: 2, spread: 18 },
  canoe: { shade: '#886c52', mid: '#cd985e', core: '#e7c38c', start: 2, spread: 13 },
};

const BANDS = Array.from({ length: LIGHT_BANDS }, (_, i) => ({
  span: hash(i + 42),
  offset: hash(i + 627) - 0.5,
  phase: hash(i + 131) * Math.PI * 2,
  break: hash(i + 771),
}));

const MARKS = Array.from({ length: SURFACE_MARKS }, (_, i) => ({
  u: hash(i + 771),
  v: hash(i + 908),
  span: 0.5 + hash(i + 241),
  phase: hash(i + 260) * Math.PI * 2,
}));

const RING = Array.from({ length: RING_POINTS }, (_, i) => {
  const angle = i / RING_POINTS * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) / 3 };
});

interface Ripple { x: number; y: number; age: number; small: boolean }
interface Skip { x: number; y: number; age: number; step: number; direction: number }

function rippleRadius(ripple: Ripple, unit: number): number {
  return (3 + ripple.age * (ripple.small ? 9 : 17)) * unit;
}

function rippleShift(ripple: Ripple, dy: number, unit: number): number {
  return Math.round(Math.sin(dy * 0.7 - ripple.age * 8) * 2 * unit * (1 - ripple.age / RIPPLE_SECONDS));
}

function surfaceShift(y: number, unit: number, time: number): number {
  return Math.round((Math.sin(y / unit * 0.17 + time * 0.68) * 2.5 + Math.sin(y / unit * 0.53 - time * 0.97)) * unit);
}

export class LakeWater {
  private readonly mirror = memoryCanvas(1, 1);
  private readonly ripples: Ripple[] = Array.from({ length: MAX_RIPPLES }, () => ({ x: 0, y: 0, age: RIPPLE_SECONDS, small: false }));
  private readonly skips: Skip[] = Array.from({ length: MAX_SKIPS }, () => ({ x: 0, y: 0, age: 0, step: 3, direction: 1 }));
  private cursor = 0;
  private skipCursor = 0;
  private padding = 1;

  resize(w: number, h: number, unit: number): void {
    this.padding = Math.ceil(REFLECTION_PADDING * unit) + 1;
    this.mirror.canvas.width = w + this.padding * 2;
    this.mirror.canvas.height = Math.max(1, Math.round(h * WATERLINE));
    this.mirror.ctx.imageSmoothingEnabled = false;
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
    if (horizon <= 0 || horizon >= h) return;
    const { canvas, ctx: mirror } = this.mirror;
    const pad = this.padding;
    // Repeat the edge pixels once so shifted rows and ripple patches can reach both banks.
    mirror.drawImage(upper, 0, 0, w, horizon, pad, 0, w, horizon);
    mirror.drawImage(upper, 0, 0, 1, horizon, 0, 0, pad, horizon);
    mirror.drawImage(upper, w - 1, 0, 1, horizon, w + pad, 0, pad, horizon);
    const depth = Math.max(1, h - horizon);
    const stretch = Math.max(0, horizon / depth - 1);
    for (let y = horizon; y < h; y++) {
      const fromShore = y - horizon;
      // Keep the far shore close to a true mirror and fit more of the upper sky near the bottom.
      const sourceY = Math.max(0, horizon - 1 - Math.round(fromShore * (1 + fromShore / depth * stretch)));
      const shift = surfaceShift(y, unit, time);
      ctx.drawImage(canvas, pad - shift, sourceY, w, 1, 0, y, w, 1);
      for (const r of this.ripples) {
        if (r.age >= RIPPLE_SECONDS) continue;
        const radius = rippleRadius(r, unit);
        const dy = (y - r.y) * 3;
        if (Math.abs(dy) > radius) continue;
        const half = Math.sqrt(radius * radius - dy * dy);
        const offset = shift + rippleShift(r, dy, unit);
        const left = Math.max(0, Math.floor(r.x - half));
        const right = Math.min(w, Math.ceil(r.x + half));
        if (right > left) ctx.drawImage(canvas, pad + left - offset, sourceY, right - left, 1, left, y, right - left, 1);
      }
    }
    ctx.fillStyle = css(mix(NIGHT_WATER, state.sky.water, state.day), 0.34 - state.day * 0.13);
    ctx.fillRect(0, horizon, w, h - horizon);
  }

  surface(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number, unit: number, time: number, state: SkyState): void {
    ctx.fillStyle = css(mix([112, 150, 173], state.sky.light, state.day * 0.45));
    for (const mark of MARKS) {
      const y = Math.round(horizon + (h - horizon) * (0.07 + mark.v * 0.89));
      const x = mark.u * w + surfaceShift(y, unit, time) + Math.sin(time * 0.24 + mark.phase) * 3 * unit;
      const length = Math.max(1, Math.round((3 + mark.v * 11) * mark.span * unit));
      ctx.globalAlpha = (0.05 + mark.span * 0.06) * (0.72 + 0.28 * Math.sin(time * 1.15 + mark.phase));
      ctx.fillRect(Math.round(x), y, length, 1);
    }
    ctx.globalAlpha = 1;
  }

  shimmer(ctx: CanvasRenderingContext2D, kind: keyof typeof LIGHT, x: number, top: number, length: number, unit: number, time: number, power: number): void {
    if (power < 0.015 || length <= 0) return;
    const light = LIGHT[kind];
    const step = Math.max(2, Math.round((kind === 'moon' ? 3 : 2) * unit));
    for (let i = 0; i < BANDS.length && i * step < length; i++) {
      const band = BANDS[i];
      const depth = i * step / length;
      const y = Math.round(top + i * step);
      const wave = Math.sin(time * 1.56 + band.phase);
      if (band.break + wave * 0.13 < 0.29 + depth * 0.24) continue;
      const spread = (light.start + depth * light.spread) * unit;
      let center = x + band.offset * spread + surfaceShift(y, unit, time) * (1 + depth);
      let breakUp = 0;
      for (const r of this.ripples) {
        if (r.age >= RIPPLE_SECONDS) continue;
        const dy = (y - r.y) * 3;
        const radius = rippleRadius(r, unit);
        if (Math.abs(dy) >= radius) continue;
        const half = Math.sqrt(radius * radius - dy * dy);
        if (Math.abs(center - r.x) >= half + spread * 0.5) continue;
        const displacement = rippleShift(r, dy, unit);
        center += displacement * 2;
        breakUp = Math.max(breakUp, Math.abs(displacement));
      }
      const span = Math.max(2, Math.round(spread * (0.45 + band.span * 0.9 + wave * 0.2) + breakUp * 2));
      const left = Math.round(center - span / 2);
      ctx.globalAlpha = power * (1 - depth * 0.82) * (0.66 + wave * 0.23);
      ctx.fillStyle = light.shade;
      ctx.fillRect(left, y, span, 1);
      ctx.fillStyle = light.mid;
      const gap = Math.min(span - 1, Math.ceil(span * (0.2 + band.span * 0.3) + breakUp));
      ctx.fillRect(left, y, Math.max(1, Math.round((span - gap) * 0.46)), 1);
      ctx.fillRect(left + gap, y, Math.max(1, Math.round((span - gap) * 0.82)), 1);
      if (band.span > 0.56 && depth < 0.8 && breakUp === 0) {
        ctx.fillStyle = light.core;
        ctx.fillRect(left + gap, y, Math.max(1, Math.round(span * 0.2)), 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx: CanvasRenderingContext2D, unit: number, state: SkyState): void {
    const ringWidth = Math.max(1, Math.round(unit));
    for (const r of this.ripples) {
      if (r.age >= RIPPLE_SECONDS) continue;
      ctx.fillStyle = css(mix(state.sky.horizon, state.sky.light, 0.4), 0.62 * (1 - r.age / RIPPLE_SECONDS));
      for (let ring = 0; ring < 3; ring++) {
        const radius = (2 + r.age * (r.small ? 9 : 17) - ring * 5) * unit;
        if (radius <= 0) continue;
        for (const point of RING) {
          ctx.fillRect(Math.round(r.x + point.x * radius), Math.round(r.y + point.y * radius), ringWidth, 1);
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
