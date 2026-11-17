import { css, mix, shade, type RGB } from '../../../render/color';
import { hash } from '../../journeys/noise';
import { clamp01, smooth, type Body, type SkyKey } from '../../sky';
import type { SeasideSprites } from './sprites';
import {
  HORIZON,
  SAND_COLOR,
  SHALLOWS_COLOR,
  SURF_PERIOD,
  WHITE,
  drawRippleRing,
  drawSprite,
  type FishLeap,
  type WaterRipple,
} from './types';

const GLINTS = 120;

/** Open water gradient and animated wave dashes, matching the original Sea view. */
export function drawOpenWater(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  sky: SkyKey,
  day: number,
  time: number,
  shoreShare: number,
  bottomShare = 1,
  roughness = 1,
  panX = 0,
): void {
  const hy = Math.round(h * HORIZON);
  const shore = Math.round(h * shoreShare);
  const bot = Math.round(h * bottomShare);
  const g = ctx.createLinearGradient(0, hy, 0, shore);
  g.addColorStop(0, css(mix(sky.horizon, sky.water, 0.5)));
  g.addColorStop(0.25, css(sky.water));
  g.addColorStop(1, css(shade(sky.water, 0.8)));
  ctx.fillStyle = g;
  ctx.fillRect(0, hy, w, Math.max(0, bot - hy));

  const crest = css(mix(mix(sky.zenith, sky.water, 0.4), WHITE, 0.08 + 0.22 * day), 0.45 + 0.3 * day);
  const trough = css(shade(sky.water, 0.8), 0.7);
  const span = w;
  for (let y = hy + 1; y < shore; y++) {
    const f = (y - hy) / Math.max(1, shore - hy);
    const spacing = 7 + 34 * f * f;
    const length = Math.max(1, Math.round((1 + 7 * f * f) * unit * (0.85 + 0.15 * roughness)));
    const drift = (hash(y) - 0.5) * 4 * unit * roughness;
    const count = Math.ceil(span / spacing) + 1;
    const rowPan = panX * (0.15 + 0.35 * f);
    for (let j = 0; j < count; j++) {
      const seed = y * 131 + j;
      if (Math.sin(time * (0.7 + hash(seed) * 0.9) * roughness + hash(seed + 0.3) * 6.28) < 0.15) continue;
      const x = (((((j + hash(seed + 0.7)) * spacing + time * drift + rowPan) % span) + span) % span);
      ctx.fillStyle = hash(seed + 0.9) < 0.35 ? trough : crest;
      ctx.fillRect(Math.round(x), y, length, 1);
    }
  }
}

/** Sun or moon glitter path across the water, matching the original Sea view. */
export function drawGlitter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  sky: SkyKey,
  sun: Body,
  moon: Body,
  day: number,
  time: number,
  shoreShare: number,
  panX = 0,
): void {
  const useSun = sun.up > -0.02;
  const body = useSun ? sun : moon;
  if (body.up <= -0.02) return;
  const strength = useSun ? 0.8 + 0.2 * (1 - body.up) : 0.7 * clamp01(body.up * 4) * (1 - day);
  const color = useSun ? mix(sky.light, WHITE, 0.6) : ([226, 232, 255] satisfies RGB);
  const hy = Math.round(h * HORIZON);
  const shore = Math.round(h * shoreShare);
  const cx = body.u * w + panX * 0.2;

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
    const spread = w * (0.01 + 0.13 * f) * (0.6 + body.up);
    const x = cx + (hash(seed + 1) + hash(seed + 2) + hash(seed + 3) - 1.5) * 1.3 * spread;
    const len = Math.max(1, Math.round((1 + 5 * f) * unit * (0.5 + hash(seed + 4))));
    ctx.globalAlpha = Math.sin(Math.PI * (clock - n)) ** 2 * (0.5 + 0.5 * hash(seed + 5)) * strength;
    ctx.fillRect(Math.round(x - len / 2), y, len, 1);
  }
  ctx.restore();
}

/** Dry sand, wet sand, surging surf wash with foam lace, and rolling breakers. */
export function drawBeachSurf(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  sky: SkyKey,
  day: number,
  time: number,
  shoreShare: number,
  curveAmount = 0,
  panX = 0,
): RGB {
  const shore = Math.round(h * shoreShare);
  const reach = h * 0.045;
  const surge = smooth(0.5 - 0.5 * Math.cos((time / SURF_PERIOD) * Math.PI * 2));
  const sand = shade(mix(SAND_COLOR, sky.light, 0.25), 0.2 + 0.8 * day);
  const sandTop = Math.max(0, shore - Math.round(h * curveAmount));

  const g = ctx.createLinearGradient(0, sandTop, 0, h);
  g.addColorStop(0, css(shade(sand, 0.6)));
  g.addColorStop(0.4, css(sand));
  g.addColorStop(1, css(shade(sand, 0.9)));
  ctx.fillStyle = g;
  if (curveAmount === 0) {
    ctx.fillRect(0, shore, w, h - shore);
  }

  const wet = css(mix(shade(sand, 0.62), sky.horizon, 0.2));
  const wash = css(mix(shade(sky.water, 0.9), mix(sky.water, SHALLOWS_COLOR, 0.45 * day), 0.6));
  const foam = mix(sky.light, WHITE, 0.75);
  const foamAlpha = 0.35 + 0.65 * day;
  const wetDepth = Math.round(reach * (1.1 - surge) + 2);

  for (let x = 0; x < w; x += 2) {
    const nx = x / Math.max(1, w) - 0.5;
    const curveDrop = curveAmount > 0 ? Math.round((nx * nx * 4 - 0.35) * h * curveAmount) : 0;
    const colShore = shore + curveDrop;
    if (curveAmount > 0) {
      ctx.fillStyle = g;
      ctx.fillRect(x, colShore, 2, h - colShore);
    }
    const wx = x - panX * 0.65;
    const e = Math.round(
      colShore + reach * surge + 2.5 * unit * Math.sin(wx / (40 * unit) + time * 0.2) + 1.5 * unit * Math.sin(wx / (13 * unit) - 1.3),
    );
    ctx.fillStyle = wet;
    ctx.fillRect(x, e, 2, wetDepth);
    ctx.fillStyle = wash;
    ctx.fillRect(x, colShore - 1, 2, Math.max(1, e - colShore + 1));
    ctx.fillStyle = css(foam, foamAlpha * (0.85 - 0.3 * surge));
    ctx.fillRect(x, e - 1, 2, 1);
    if (hash(x * 0.37) < 0.35) ctx.fillRect(x, e - 2 - Math.round(hash(x * 0.71) * 4 * unit * (1.2 - surge)), 1, 1);
  }

  // Rolling breakers further out, timed with the wash
  const hy = h * HORIZON;
  for (const offset of [0.45, 0.8]) {
    const t = (time / SURF_PERIOD + offset) % 1;
    const y0 = hy + (shore - hy) * (0.5 + 0.5 * t ** 1.3);
    ctx.fillStyle = css(foam, foamAlpha * 0.7 * Math.sin(Math.PI * t));
    for (let x = 0; x < w; x += 3) {
      if (hash(Math.floor(x / 9) + offset * 17) < 0.3) continue;
      ctx.fillRect(x, Math.round(y0 + 1.5 * unit * Math.sin((x - panX * 0.4) / (30 * unit) + offset * 9)), 3, Math.max(1, Math.round(t * 2)));
    }
  }
  return sand;
}

/** Draws interactive water ripple rings and leaping silver fish with splash droplets. */
export function drawRipplesAndFish(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  ripples: readonly WaterRipple[],
  fishLeaps: readonly FishLeap[],
  sprites: SeasideSprites,
  sky: SkyKey,
  day: number,
): void {
  const ringCol = mix(sky.light, WHITE, 0.7);
  for (const r of ripples) {
    const t = clamp01(r.age / r.duration);
    const alpha = (1 - t) * (0.45 + 0.45 * day);
    if (alpha < 0.03) continue;
    const rx = (2 + r.maxRadius * t) * unit;
    const ry = rx * 0.36;
    ctx.fillStyle = css(ringCol, alpha);
    drawRippleRing(ctx, r.u * w, r.v * h, rx, ry);
    if (t > 0.25) {
      const innerT = (t - 0.25) / 0.75;
      ctx.fillStyle = css(ringCol, alpha * 0.55);
      drawRippleRing(ctx, r.u * w, r.v * h, (1 + r.maxRadius * 0.65 * innerT) * unit, (1 + r.maxRadius * 0.65 * innerT) * 0.36 * unit);
    }
  }

  for (const f of fishLeaps) {
    const t = clamp01(f.age / f.duration);
    if (t >= 1) continue;
    const arc = Math.sin(Math.PI * t);
    const fx = f.u * w + f.dir * (t - 0.5) * f.span * unit;
    const fy = f.v * h - arc * f.height * unit;
    drawSprite(ctx, sprites.fishLeap, fx - (sprites.fishLeap.width * unit) / 2, fy - (sprites.fishLeap.height * unit) / 2, unit, f.dir < 0);

    // Entry and exit splash droplets
    if (t < 0.25 || t > 0.75) {
      const splashT = t < 0.25 ? t / 0.25 : (1 - t) / 0.25;
      ctx.fillStyle = css(ringCol, 0.85 * splashT);
      const sx = Math.round(fx);
      const sy = Math.round(f.v * h);
      const spread = Math.round((1 - splashT) * 4 * unit + 1);
      ctx.fillRect(sx - spread, sy - Math.round(splashT * 4 * unit), 1, 1);
      ctx.fillRect(sx + spread, sy - Math.round(splashT * 3 * unit), 1, 1);
      ctx.fillRect(sx, sy - Math.round(splashT * 5 * unit), 1, 1);
    }
  }
}
