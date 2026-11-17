import { css, mix, shade, type RGB } from '../render/color';
import { memoryCanvas } from '../render/pixel-stage';
import { clamp, seededRandom } from '../world/math';
import type { Look } from '../wallpapers/look';
import type { NightSky } from './night-sky';
import type { ViewFrame } from './view';

/** Colours of sky, water and light through the day; the hour between two entries blends them. */
export interface SkyKey {
  zenith: RGB;
  horizon: RGB;
  water: RGB;
  light: RGB;
}

const NIGHT: SkyKey = { zenith: [6, 9, 26], horizon: [26, 34, 66], water: [8, 14, 34], light: [170, 186, 230] };
const KEYS: (SkyKey & { hour: number })[] = [
  { hour: 0, ...NIGHT },
  { hour: 4.8, ...NIGHT },
  { hour: 6, zenith: [44, 60, 110], horizon: [240, 150, 112], water: [44, 54, 88], light: [255, 172, 120] },
  { hour: 7.5, zenith: [72, 132, 204], horizon: [248, 214, 178], water: [44, 102, 140], light: [255, 228, 190] },
  { hour: 10, zenith: [40, 110, 196], horizon: [168, 212, 240], water: [22, 96, 142], light: [255, 250, 236] },
  { hour: 15.5, zenith: [44, 108, 190], horizon: [180, 214, 238], water: [24, 94, 138], light: [255, 246, 226] },
  { hour: 17.3, zenith: [62, 96, 172], horizon: [248, 196, 140], water: [42, 82, 118], light: [255, 202, 140] },
  { hour: 18.4, zenith: [54, 52, 112], horizon: [255, 128, 82], water: [60, 50, 84], light: [255, 140, 80] },
  { hour: 19.4, zenith: [18, 20, 54], horizon: [98, 62, 98], water: [20, 20, 46], light: [210, 160, 180] },
  { hour: 20.5, ...NIGHT },
  { hour: 24, ...NIGHT },
];

const WHITE: RGB = [255, 255, 255];
const CLOUDS = 6;
/** The view is designed for about 270 rows; lengths scale with the real row count. */
const DESIGN_ROWS = 270;

export const smooth = (t: number): number => t * t * (3 - 2 * t);
export const clamp01 = (v: number): number => clamp(v, 0, 1);

export function skyAt(hour: number): SkyKey {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (KEYS[i + 1].hour < h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth((h - a.hour) / (b.hour - a.hour));
  return { zenith: mix(a.zenith, b.zenith, t), horizon: mix(a.horizon, b.horizon, t), water: mix(a.water, b.water, t), light: mix(a.light, b.light, t) };
}

export interface Body {
  u: number;
  v: number;
  /** Above 0 when the body is over the horizon, 1 at its highest. */
  up: number;
}

/** Where the sun or moon is: it rises at `rise` o'clock and sets `length` hours later. */
function arc(hour: number, rise: number, length: number, horizon: number): Body {
  const t = ((((hour - rise) % 24) + 24) % 24) / length;
  const up = t <= 1 ? Math.sin(Math.PI * t) : -0.3;
  return { u: 0.12 + 0.76 * Math.min(1, t), v: horizon - up * 0.4, up };
}

/** A filled pixel disc. */
export function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** The sky at one moment: its colours, where the sun and moon are, and how daylit it is (0 night, 1 full day). */
export interface SkyState {
  sky: SkyKey;
  sun: Body;
  moon: Body;
  day: number;
}

interface Cloud {
  sprite: number;
  x: number;
  v: number;
  size: number;
  speed: number;
}

/**
 * The sky above a horizon, as pixels: a gradient that follows the hour, stars and the odd shooting star at night,
 * a sun and a moon crossing it, and clouds drifting by. Shared by every built-in view.
 */
export class SkyDome {
  private w = 0;
  private h = 0;
  private unit = 1;
  private readonly clouds: Cloud[] = [];
  private cloudSprites: HTMLCanvasElement[] = [];
  private cloudKey = '';

  /** `horizon` is where the sky ends, as a share of the view's height. */
  constructor(private readonly nightSky: NightSky, private readonly horizon: number) {
    const rnd = seededRandom(7);
    for (let i = 0; i < CLOUDS; i++) {
      const v = 0.06 + rnd() * 0.3;
      this.clouds.push({ sprite: i % 4, x: rnd(), v, size: 1.25 - v * 1.4 + rnd() * 0.2, speed: 0.004 + rnd() * 0.006 });
    }
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_ROWS;
    this.cloudKey = '';
  }

  stateAt(hour: number): SkyState {
    const sun = arc(hour, 6, 12.6, this.horizon);
    return { sky: skyAt(hour), sun, moon: arc(hour, 18.8, 11, this.horizon), day: clamp01((sun.up + 0.08) / 0.3) };
  }

  /** Open sky cells for a view's look, where stars can show. */
  fillSkyCells(look: Look): void {
    for (let y = 0; y < 18; y++) for (let x = 0; x < 64; x++) look.sky.push({ u: (x + 0.5) / 64, v: ((y + 0.5) / 18) * (this.horizon - 0.05) });
  }

  /** Draws the whole sky, from the top of the view down to the horizon. */
  draw(ctx: CanvasRenderingContext2D, state: SkyState, frame: ViewFrame, look: Look): void {
    this.drawGradient(ctx, state);
    this.nightSky.draw(ctx, look, (u, v) => [u * this.w, v * this.h], 1, frame.time);
    this.nightSky.drawMeteors(ctx, frame.dt, look.night, this.w, this.h * this.horizon);
    this.drawBodies(ctx, state);
    this.drawClouds(ctx, frame.dt, state);
  }

  private drawGradient(ctx: CanvasRenderingContext2D, { sky, sun, day }: SkyState): void {
    const hy = Math.round(this.h * this.horizon);
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, css(sky.zenith));
    g.addColorStop(0.6, css(mix(sky.zenith, sky.horizon, 0.5)));
    g.addColorStop(1, css(sky.horizon));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, hy);
    if (sun.up < -0.15) return;
    // A low sun warms the sky around it.
    const low = 1 - clamp01(sun.up / 0.5);
    const x = sun.u * this.w;
    const glow = ctx.createRadialGradient(x, hy, 0, x, hy, this.w * 0.55);
    glow.addColorStop(0, css(sky.light, 0.5 * low * (0.3 + day * 0.7)));
    glow.addColorStop(1, css(sky.light, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.w, hy);
  }

  private drawBodies(ctx: CanvasRenderingContext2D, { sky, sun, moon }: SkyState): void {
    const hy = Math.round(this.h * this.horizon);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-this.w, -this.h, this.w * 3, hy + this.h);
    ctx.clip();
    if (sun.up > -0.08) {
      const x = Math.round(sun.u * this.w);
      const y = Math.round(sun.v * this.h);
      const r = Math.round(8 * this.unit);
      const halo = ctx.createRadialGradient(x, y, r, x, y, r * 5);
      halo.addColorStop(0, css(sky.light, 0.55));
      halo.addColorStop(1, css(sky.light, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
      ctx.fillStyle = css(mix(sky.light, WHITE, 0.55));
      disc(ctx, x, y, r);
      ctx.fillStyle = css(mix(sky.light, WHITE, 0.9));
      disc(ctx, x - 1, y - 1, r - 2);
    }
    if (moon.up > -0.05) {
      const x = Math.round(moon.u * this.w);
      const y = Math.round(moon.v * this.h);
      const r = Math.round(6 * this.unit);
      const halo = ctx.createRadialGradient(x, y, r, x, y, r * 6);
      halo.addColorStop(0, 'rgba(200,214,255,0.22)');
      halo.addColorStop(1, 'rgba(200,214,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
      ctx.fillStyle = '#e9ebe4';
      disc(ctx, x, y, r);
      ctx.fillStyle = '#c4c8cc';
      for (const [dx, dy, s] of [[-2, -1, 2], [2, 1, 1], [-1, 3, 1], [1, -3, 1]]) ctx.fillRect(x + dx, y + dy, s, s);
    }
    ctx.restore();
  }

  private drawClouds(ctx: CanvasRenderingContext2D, dt: number, { sky, day }: SkyState): void {
    const lit = mix(mix(sky.light, WHITE, 0.5 * day), [44, 50, 80], (1 - day) * 0.85);
    const shadow = shade(mix(sky.zenith, sky.horizon, 0.55), 0.82 + 0.1 * day);
    const key = [...lit, ...shadow].map((v) => Math.round(v / 12)).join(',');
    if (key !== this.cloudKey) {
      this.cloudKey = key;
      this.cloudSprites = [0, 1, 2, 3].map((seed) => cloudSprite(seed, lit, shadow, this.unit));
    }
    for (const c of this.clouds) {
      c.x += c.speed * dt * 0.1;
      const sprite = this.cloudSprites[c.sprite];
      const cw = Math.round(sprite.width * c.size);
      const ch = Math.round(sprite.height * c.size);
      const span = this.w + cw * 2;
      const x = Math.round(((c.x * span) % span) - cw);
      ctx.drawImage(sprite, x, Math.round(c.v * this.h - ch / 2), cw, ch);
    }
  }
}

/** A small pixel cloud: a lit top and a flat shaded base, with hard edges. Made once per sky colour. */
function cloudSprite(seed: number, lit: RGB, shadow: RGB, unit: number): HTMLCanvasElement {
  const { canvas: c, ctx } = memoryCanvas(Math.round(70 * unit), Math.round(22 * unit));
  const rnd = seededRandom(seed * 131 + 17);
  ctx.fillStyle = css(lit);
  for (let i = 0; i < 9; i++) {
    const t = 0.1 + 0.8 * rnd();
    const hump = Math.sin(Math.PI * t);
    const r = Math.round(c.height * (0.18 + 0.24 * hump * (0.6 + 0.4 * rnd())));
    disc(ctx, Math.round(c.width * t), Math.round(c.height - r - 1), r);
  }
  ctx.fillRect(Math.round(c.width * 0.08), c.height - 3, Math.round(c.width * 0.84), 3);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = css(shadow);
  ctx.fillRect(0, Math.round(c.height * 0.68), c.width, c.height);
  ctx.fillStyle = css(mix(lit, shadow, 0.5));
  ctx.fillRect(0, Math.round(c.height * 0.68) - 1, c.width, 1);
  return c;
}
