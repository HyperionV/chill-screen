/**
 * The water of the Lake: a dithered blue-green mirror (still layer), the dithered reflection of the far shore, wind
 * ripples that come and go with the gusts, the rings round the monster, and rings where a click lands.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, rect, seeded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash } from '../../journeys/noise';
import { breeze, gust } from '../../wind';
import { BEACH_TOP, WATERLINE } from './lake-layout';
import { DESIGN_HEIGHT } from './scene-art';

/** Water colours from the pale sky mirror at the far shore down to the deep blue in front. */
const WATER = ['#a9d9dc', '#8cc9d0', '#6fb6c3', '#559fb3', '#42869f', '#356f8c', '#2c5c78'];
/** Rows below the beach line over which the colour keeps deepening before it stops. */
const DEPTH_EXTRA = 8;
const STREAKS = 14;
const STREAK_LIGHT = '#c9ecec';
/** How many rows of the far shore are mirrored, and how strongly the mirror fades out by dithering. */
const REFLECT_ROWS = 44;
const REFLECT_FADE = 0.95;
const REFLECT_TINT = 'rgba(30, 84, 108, 0.42)';
const REFLECT_ALPHA = 0.85;
/** Every few rows a gap in the mirror, where a ripple breaks it. */
const BREAK_EVERY = 4;
const BREAKS_PER_ROW = 3;
const TAU = Math.PI * 2;

/** The still water from the far shore to the bottom of the picture: seven blues with ordered dither between them. */
export function paintWater(ctx: Ctx, width: number): void {
  const depth = BEACH_TOP + DEPTH_EXTRA - WATERLINE;
  for (let y = WATERLINE; y < DESIGN_HEIGHT; y++) {
    const f = (Math.min(1, (y - WATERLINE) / depth)) * (WATER.length - 1);
    const colourAt = (x: number): number => Math.min(WATER.length - 1, Math.floor(f + bayer(x, y)));
    let runStart = 0;
    let runColour = colourAt(0);
    for (let x = 1; x <= width; x++) {
      const next = x < width ? colourAt(x) : -1;
      if (next === runColour) continue;
      rect(ctx, WATER[runColour], runStart, y, x - runStart, 1);
      runStart = x;
      runColour = next;
    }
  }
  const rand = seeded(9);
  ctx.fillStyle = STREAK_LIGHT;
  for (let i = 0; i < STREAKS; i++) {
    const y = WATERLINE + 3 + Math.floor(rand() * 40);
    const x = Math.floor(rand() * width);
    const length = 14 + Math.floor(rand() * 50);
    for (let px = x; px < Math.min(width, x + length); px++) if (bayer(px, y) < 0.6) ctx.fillRect(px, y, 1, 1);
  }
}

/**
 * Mirrors the far shore into the water: each row of the shore is copied upside down below the waterline with a wavy
 * sideways shift, tinted toward the water's blue, then thinned out by dither with distance and broken by ripple gaps.
 */
export function paintReflection(dest: Ctx, far: HTMLCanvasElement, width: number): void {
  const { canvas, ctx } = memoryCanvas(width, REFLECT_ROWS);
  for (let r = 0; r < REFLECT_ROWS; r++) {
    const wobble = Math.round(Math.sin(r * 0.9) * (1 + r / 14));
    ctx.drawImage(far, 0, WATERLINE - 1 - r, width, 1, wobble, r, width, 1);
  }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = REFLECT_TINT;
  ctx.fillRect(0, 0, width, REFLECT_ROWS);
  ctx.globalCompositeOperation = 'destination-out';
  for (let r = 0; r < REFLECT_ROWS; r++) {
    const fade = (r / REFLECT_ROWS) * REFLECT_FADE;
    for (let x = 0; x < width; x++) if (bayer(x, r) < fade) ctx.fillRect(x, r, 1, 1);
  }
  for (let r = BREAK_EVERY - 1; r < REFLECT_ROWS; r += BREAK_EVERY) {
    for (let k = 0; k < BREAKS_PER_ROW; k++) {
      ctx.fillRect(Math.floor(hash(r * 3.1 + k * 17) * width), r, 4 + Math.floor(hash(r + k * 5.3) * 12), 1);
    }
  }
  dest.save();
  dest.globalAlpha = REFLECT_ALPHA;
  dest.drawImage(canvas, 0, WATERLINE);
  dest.restore();
}

/** A short dash of light or shade on the water: where it is, how long, and when in its slow cycle it shows. */
export interface Glint {
  x: number;
  y: number;
  length: number;
  phase: number;
  dark: boolean;
}

const GLINT_PER_COLUMN = 0.09;
const GLINT_MIN = 18;
const GLINT_MAX = 60;
/** Glints stay above the beach and the dock, which are drawn over the water anyway. */
const GLINT_BOTTOM_MARGIN = 14;
const GLINT_LIGHT = '#e3f6f6';
const GLINT_SHADE = '#2f6f88';
const GLINT_LIGHT_ALPHA = 0.55;
const GLINT_SHADE_ALPHA = 0.35;
const GLINT_SPEED = 0.7;
/** The calmest the water gets still shows this share of its glints; a full gust shows nearly all of them. */
const GLINT_CALM_SHARE = 0.25;
const GLINT_GUST_SHARE = 0.6;
const GLINT_DRIFT = 2;

/** Scatters the wind ripples over the lake; dashes are longer the nearer they are to the viewer. Built once. */
export function buildGlints(width: number): Glint[] {
  const rand = seeded(31);
  const count = Math.max(GLINT_MIN, Math.min(GLINT_MAX, Math.round(width * GLINT_PER_COLUMN)));
  return Array.from({ length: count }, () => {
    const y = WATERLINE + 4 + Math.floor(rand() * (BEACH_TOP - WATERLINE - GLINT_BOTTOM_MARGIN));
    const depth = (y - WATERLINE) / (BEACH_TOP - WATERLINE);
    return {
      x: Math.floor(rand() * width),
      y,
      length: 3 + Math.round(depth * 9 * (0.5 + rand())),
      phase: rand() * TAU,
      dark: rand() < 0.4,
    };
  });
}

/** Draws the ripples: each fades in and out on its own beat, and more of them show while the wind is up. */
export function drawGlints(ctx: Ctx, glints: readonly Glint[], time: number): void {
  const before = ctx.globalAlpha;
  const threshold = 1 - (GLINT_CALM_SHARE + GLINT_GUST_SHARE * gust(time));
  for (const g of glints) {
    const beat = 0.5 + 0.5 * Math.sin(time * GLINT_SPEED + g.phase);
    if (beat < threshold) continue;
    ctx.globalAlpha = before * (g.dark ? GLINT_SHADE_ALPHA : GLINT_LIGHT_ALPHA);
    ctx.fillStyle = g.dark ? GLINT_SHADE : GLINT_LIGHT;
    ctx.fillRect(g.x + Math.round(breeze(time, g.x) * GLINT_DRIFT), g.y, g.length, 1);
  }
  ctx.globalAlpha = before;
}

const RING_COLOUR = '#dff4f4';
const RING_SQUASH = 0.2;
const RING_SECONDS = 7;
const RINGS = 3;
const RING_START = 6;
const RING_GROWTH = 20;
const RING_ALPHA = 0.7;
/** The monster's body is a little right of the middle of its picture; the rings centre there. */
const RING_OFFSET_X = 4;
const RING_DOT = 0.75;

/** One ring on the water: a dotted, flattened ellipse of half-width `radius` centred on (cx, cy). */
export function drawRing(ctx: Ctx, cx: number, cy: number, radius: number, squash: number, alpha: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * alpha;
  ctx.fillStyle = RING_COLOUR;
  const r = Math.max(1, Math.round(radius));
  const ry = Math.max(1, Math.round(r * squash));
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let dx = -r; dx <= r; dx++) {
    const rise = Math.round(ry * Math.sqrt(1 - (dx / r) * (dx / r)));
    if (bayer(x0 + dx, y0 + rise) < RING_DOT) ctx.fillRect(x0 + dx, y0 + rise, 1, 1);
    if (rise > 0 && bayer(x0 + dx, y0 - rise) < RING_DOT) ctx.fillRect(x0 + dx, y0 - rise, 1, 1);
  }
  ctx.globalAlpha = before;
}

/** Three rings widening and fading in turn round the place where the monster surfaces. */
export function drawMonsterRings(ctx: Ctx, monster: Point, time: number): void {
  for (let k = 0; k < RINGS; k++) {
    const p = (time / RING_SECONDS + k / RINGS) % 1;
    drawRing(ctx, monster.x + RING_OFFSET_X, monster.y - 1, RING_START + p * RING_GROWTH, RING_SQUASH, RING_ALPHA * (1 - p));
  }
}

/** A ring started by a click: where, and at what time. */
export interface PressRing {
  x: number;
  y: number;
  at: number;
}

const PRESS_LIFE = 2.2;
const PRESS_START = 2;
const PRESS_SPEED = 9;
const PRESS_SQUASH = 0.3;
const PRESS_ALPHA = 0.8;

/** Draws every click ring that is still spreading. */
export function drawPressRings(ctx: Ctx, rings: readonly PressRing[], time: number): void {
  for (const ring of rings) {
    const age = time - ring.at;
    if (age < 0 || age >= PRESS_LIFE) continue;
    drawRing(ctx, ring.x, ring.y, PRESS_START + age * PRESS_SPEED, PRESS_SQUASH, PRESS_ALPHA * (1 - age / PRESS_LIFE));
  }
}
