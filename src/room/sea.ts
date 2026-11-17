import { css, mix, shade, type RGB } from '../render/color';
import { hourNow } from '../scene/clock';
import { seededRandom } from '../world/math';
import type { Look } from '../wallpapers/look';
import type { NightSky } from './night-sky';
import { SkyDome, clamp01, smooth, type Body, type SkyKey } from './sky';
import type { OutsideView, ViewFrame } from './view';

const WHITE: RGB = [255, 255, 255];
const SAND: RGB = [222, 196, 152];
const SHALLOWS: RGB = [74, 186, 184];
/** Rows as a share of the view's height: where the sea meets the sky, and where the waves reach the sand. */
const HORIZON = 0.52;
const SHORE = 0.69;
/** The view is designed for about 270 rows; lengths scale with the real row count. */
const DESIGN_ROWS = 270;
const GLINTS = 120;
const SURF_PERIOD = 9.5;
const GULLS = 3;
/** Gull wing poses, as pixels around the body: wings up, level, down. */
const GULL_POSES: [number, number][][] = [
  [[-3, -2], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -2]],
  [[-3, 0], [-2, -1], [-1, -1], [0, 0], [1, -1], [2, -1], [3, 0]],
  [[-3, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 1]],
];

const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const hash = (n: number): number => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

interface Gull {
  x: number;
  y: number;
  vx: number;
  flap: number;
  wait: number;
}

/**
 * The sea seen from the room, as a pixel scene: sky and clouds by the hour, a sun or moon with its path of
 * * glints on the water, waves rolling up the beach, gulls by day and a lighthouse on the point at night.
 */
export class Sea implements OutsideView {
  private w = 0;
  private h = 0;
  private unit = 1;
  /** Kept as one object so the star field built for it is reused frame to frame. */
  private readonly look: Look = { mean: 0.5, sun: null, sky: [], night: 0, tint: [128, 128, 128] };
  private readonly dome: SkyDome;
  private readonly gulls: Gull[] = [];
  private headland: [number, number][] = [];

  constructor(nightSky: NightSky) {
    this.dome = new SkyDome(nightSky, HORIZON);
    this.dome.fillSkyCells(this.look);
    const rnd = seededRandom(7);
    for (let i = 0; i < GULLS; i++) this.gulls.push({ x: -1, y: 0, vx: 0, flap: rnd() * 6, wait: 3 + rnd() * 15 });
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_ROWS;
    this.dome.resize(w, h);
    const rnd = seededRandom(31);
    this.headland = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const rise = Math.sin(Math.PI * Math.min(1, t * 1.25)) * (0.75 + rnd() * 0.25) * (1 - t * 0.6);
      this.headland.push([-0.05 + t * 0.38, rise * 0.04]);
    }
  }

  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look {
    const state = this.dome.stateAt(hourNow());
    const { sky, sun, moon, day } = state;
    this.updateLook(sky, sun, day);
    this.dome.draw(ctx, state, frame, this.look);
    this.drawHeadland(ctx, sky, day, frame.time);
    this.drawWater(ctx, sky, day, frame.time);
    this.drawGlitter(ctx, sky, sun, moon, day, frame.time);
    this.drawBeach(ctx, sky, day, frame.time);
    this.drawGulls(ctx, frame.dt, day, frame.time);
    return this.look;
  }

  private updateLook(sky: SkyKey, sun: Body, day: number): void {
    const air = mix(sky.zenith, sky.horizon, 0.55);
    this.look.mean = luma(air) * 0.6 + luma(sky.water) * 0.4;
    this.look.night = 1 - day;
    this.look.tint = mix(air, sky.water, 0.3);
    this.look.sun = sun.up > -0.02 ? { u: sun.u, v: sun.v, strength: 0.75, color: sky.light } : null;
  }

  private drawHeadland(ctx: CanvasRenderingContext2D, sky: SkyKey, day: number, time: number): void {
    const hy = Math.round(this.h * HORIZON);
    ctx.fillStyle = css(shade(mix(sky.horizon, sky.zenith, 0.5), 0.62));
    ctx.beginPath();
    ctx.moveTo(this.headland[0][0] * this.w, hy);
    for (const [u, rise] of this.headland) ctx.lineTo(u * this.w, hy - rise * this.h);
    ctx.lineTo(this.headland[this.headland.length - 1][0] * this.w, hy);
    ctx.closePath();
    ctx.fill();

    // The lighthouse on the point: a striped tower whose lamp turns at night.
    const x = Math.round(this.w * 0.255);
    const tall = Math.round(7 * this.unit);
    const top = Math.round(hy - this.h * 0.03 - tall);
    ctx.fillStyle = css(shade(mix(WHITE, sky.horizon, 0.3), 0.55 + 0.45 * day));
    ctx.fillRect(x, top, 2, tall);
    ctx.fillStyle = css(shade([190, 64, 56], 0.5 + 0.5 * day));
    ctx.fillRect(x, top + 2, 2, 1);
    ctx.fillRect(x, top + 5, 2, 1);
    if (day > 0.7) return;
    const beam = Math.max(0, Math.sin((time / 5) * Math.PI * 2)) ** 8 * (1 - day / 0.7);
    ctx.fillStyle = `rgba(255,232,170,${(0.5 + 0.5 * beam).toFixed(3)})`;
    ctx.fillRect(x, top - 1, 2, 1);
    if (beam < 0.05) return;
    const r = this.w * 0.12 * beam;
    const g = ctx.createRadialGradient(x + 1, top - 1, 0, x + 1, top - 1, r);
    g.addColorStop(0, `rgba(255,232,170,${(0.45 * beam).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,232,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 1 - r, top - 1 - r * 0.25, r * 2, r * 0.5);
  }

  /** The open water: a gradient to the shore, with short dashes of light and shadow that come and go like waves. */
  private drawWater(ctx: CanvasRenderingContext2D, sky: SkyKey, day: number, time: number): void {
    const hy = Math.round(this.h * HORIZON);
    const shore = Math.round(this.h * SHORE);
    const g = ctx.createLinearGradient(0, hy, 0, shore);
    g.addColorStop(0, css(mix(sky.horizon, sky.water, 0.5)));
    g.addColorStop(0.25, css(sky.water));
    g.addColorStop(1, css(shade(sky.water, 0.8)));
    ctx.fillStyle = g;
    ctx.fillRect(0, hy, this.w, this.h - hy);

    // Crests catch daylight; at night they only just lift off the dark water.
    const crest = css(mix(mix(sky.zenith, sky.water, 0.4), WHITE, 0.08 + 0.22 * day), 0.45 + 0.3 * day);
    const trough = css(shade(sky.water, 0.8), 0.7);
    const span = this.w;
    for (let y = hy + 1; y < shore; y++) {
      const f = (y - hy) / (shore - hy);
      const spacing = 7 + 34 * f * f;
      const length = Math.max(1, Math.round((1 + 7 * f * f) * this.unit));
      const drift = (hash(y) - 0.5) * 4 * this.unit;
      const count = Math.ceil(span / spacing) + 1;
      for (let j = 0; j < count; j++) {
        const seed = y * 131 + j;
        if (Math.sin(time * (0.7 + hash(seed) * 0.9) + hash(seed + 0.3) * 6.28) < 0.15) continue;
        const x = (((((j + hash(seed + 0.7)) * spacing + time * drift) % span) + span) % span);
        ctx.fillStyle = hash(seed + 0.9) < 0.35 ? trough : crest;
        ctx.fillRect(Math.round(x), y, length, 1);
      }
    }
  }

  /** The path of light on the water under the sun or the moon: glints that flash and fade. */
  private drawGlitter(ctx: CanvasRenderingContext2D, sky: SkyKey, sun: Body, moon: Body, day: number, time: number): void {
    const useSun = sun.up > -0.02;
    const body = useSun ? sun : moon;
    if (body.up <= -0.02) return;
    const strength = useSun ? 0.8 + 0.2 * (1 - body.up) : 0.7 * clamp01(body.up * 4) * (1 - day);
    const color = useSun ? mix(sky.light, WHITE, 0.6) : ([226, 232, 255] satisfies RGB);
    const hy = Math.round(this.h * HORIZON);
    const shore = Math.round(this.h * SHORE);
    const cx = body.u * this.w;

    ctx.save();
    ctx.fillStyle = css(color);
    const count = useSun ? GLINTS : GLINTS * 0.6;
    for (let i = 0; i < count; i++) {
      const period = 0.5 + hash(i) * 0.9;
      const clock = time / period + hash(i + 0.5);
      const n = Math.floor(clock);
      const seed = i * 7919 + n * 104729;
      const f = hash(seed) ** 0.8;
      const y = Math.round(hy + 1 + (shore - hy - 2) * f * f);
      const spread = this.w * (0.01 + 0.13 * f) * (0.6 + body.up);
      const x = cx + (hash(seed + 1) + hash(seed + 2) + hash(seed + 3) - 1.5) * 1.3 * spread;
      const len = Math.max(1, Math.round((1 + 5 * f) * this.unit * (0.5 + hash(seed + 4))));
      ctx.globalAlpha = Math.sin(Math.PI * (clock - n)) ** 2 * (0.5 + 0.5 * hash(seed + 5)) * strength;
      ctx.fillRect(Math.round(x - len / 2), y, len, 1);
    }
    ctx.restore();
  }

  /** The beach: dry sand, a band of wet sand, and the wash running up and back with a lace of foam. */
  private drawBeach(ctx: CanvasRenderingContext2D, sky: SkyKey, day: number, time: number): void {
    const shore = Math.round(this.h * SHORE);
    const reach = this.h * 0.045;
    const surge = smooth(0.5 - 0.5 * Math.cos((time / SURF_PERIOD) * Math.PI * 2));
    const sand = shade(mix(SAND, sky.light, 0.25), 0.2 + 0.8 * day);
    const u = this.unit;
    const edge = (x: number): number =>
      Math.round(shore + reach * surge + 2.5 * u * Math.sin(x / (40 * u) + time * 0.2) + 1.5 * u * Math.sin(x / (13 * u) - 1.3));

    const g = ctx.createLinearGradient(0, shore, 0, this.h);
    g.addColorStop(0, css(shade(sand, 0.6)));
    g.addColorStop(0.4, css(sand));
    g.addColorStop(1, css(shade(sand, 0.9)));
    ctx.fillStyle = g;
    ctx.fillRect(0, shore, this.w, this.h - shore);

    const wet = css(mix(shade(sand, 0.62), sky.horizon, 0.2));
    const wash = css(mix(shade(sky.water, 0.9), mix(sky.water, SHALLOWS, 0.45 * day), 0.6));
    const foam = mix(sky.light, WHITE, 0.75);
    const foamAlpha = 0.35 + 0.65 * day;
    const wetDepth = Math.round(reach * (1.1 - surge) + 2);
    for (let x = 0; x < this.w; x += 2) {
      const e = edge(x);
      // Wet sand left by the last wave, darker and catching the sky.
      ctx.fillStyle = wet;
      ctx.fillRect(x, e, 2, wetDepth);
      ctx.fillStyle = wash;
      ctx.fillRect(x, shore - 1, 2, e - shore + 1);
      ctx.fillStyle = css(foam, foamAlpha * (0.85 - 0.3 * surge));
      ctx.fillRect(x, e - 1, 2, 1);
      if (hash(x * 0.37) < 0.35) ctx.fillRect(x, e - 2 - Math.round(hash(x * 0.71) * 4 * u * (1.2 - surge)), 1, 1);
    }

    // Breakers rolling in from further out, timed with the wash.
    const hy = this.h * HORIZON;
    for (const offset of [0.45, 0.8]) {
      const t = (time / SURF_PERIOD + offset) % 1;
      const y0 = hy + (shore - hy) * (0.5 + 0.5 * t ** 1.3);
      ctx.fillStyle = css(foam, foamAlpha * 0.7 * Math.sin(Math.PI * t));
      for (let x = 0; x < this.w; x += 3) {
        if (hash(Math.floor(x / 9) + offset * 17) < 0.3) continue;
        ctx.fillRect(x, Math.round(y0 + 1.5 * u * Math.sin(x / (30 * u) + offset * 9)), 3, Math.max(1, Math.round(t * 2)));
      }
    }
  }

  private drawGulls(ctx: CanvasRenderingContext2D, dt: number, day: number, time: number): void {
    if (day < 0.5) return;
    ctx.fillStyle = `rgba(36,40,50,${(0.8 * day).toFixed(3)})`;
    for (const g of this.gulls) {
      if (g.x < -0.1 || g.x > 1.1) {
        g.wait -= dt;
        if (g.wait > 0) continue;
        const dir = Math.random() < 0.5 ? 1 : -1;
        Object.assign(g, { x: dir > 0 ? -0.05 : 1.05, y: 0.16 + Math.random() * 0.22, vx: dir * (0.014 + Math.random() * 0.012), wait: 12 + Math.random() * 35 });
      }
      g.x += g.vx * dt;
      g.y += Math.sin(time * 0.4 + g.flap) * 0.0005;
      const gliding = Math.sin(time * 0.3 + g.flap) > 0.3;
      // Flapping runs up, level, down, level.
      const beat = Math.floor((((time * 4 + g.flap) % 4) + 4) % 4);
      const pose = gliding || beat === 3 ? 1 : beat;
      const x = Math.round(g.x * this.w);
      const y = Math.round(g.y * this.h);
      for (const [dx, dy] of GULL_POSES[pose]) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
}
