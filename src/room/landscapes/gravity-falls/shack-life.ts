/**
 * The Mystery Shack's moving life: chimney smoke, birds, butterflies, falling needles, and every light that comes
 * up at dusk (windows, lantern, sign and party bulbs, the vending machine, fireflies and moths). Cheap per frame:
 * a handful of small shapes, no allocations.
 */
import { disc, drawHalo, rect, type Ctx } from '../../gravity-falls/art-kit';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import type { Rect } from './shack-art';
import type { ShackLayout } from './shack-props';

/** Night level (0 day .. 1 deep night) at which lights start to come on, and how long they take to reach full. */
const LIT_FROM = 0.12;
const LIT_SPAN = 0.4;
const PUFFS = 8;
/** Seconds one puff of smoke takes to rise and fade. */
const SMOKE_SECONDS = 12;
const SMOKE_RISE = 38;
const BIRDS = 3;
const BIRD_INK = '#3d4d4a';
const BUTTERFLIES = 3;
const LEAVES = 6;
const FIREFLIES = 10;
const MOTHS = 2;
const WARM = '#ffcf6e';
const BUTTERFLY_COLOURS = ['#f2d24a', '#f6f2e0', '#f08aa8'];
const PARTY = ['#ffd98a', '#ff9ab0', '#8fe6d2'];
/** The slowest flicker the brief allows is once a second; this one rises and falls about every 3 seconds. */
const FLICKER_SPEED = 2.1;

/** How lit the lights are: 0 in daylight, 1 once it is properly dark. */
export function litAmount(night: number): number {
  return Math.min(1, Math.max(0, (night - LIT_FROM) / LIT_SPAN));
}

/** Extra brightness (0..1) a click gave the vending machine and the roof sign, fading out over about a second. */
export interface Excite {
  vending: number;
  sign: number;
}

const flicker = (time: number, seed: number): number => 0.88 + 0.12 * Math.sin(time * FLICKER_SPEED + seed * 5.3);

function glowRect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, alpha: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, alpha);
  rect(ctx, color, x, y, w, h);
  ctx.globalAlpha = before;
}

/** A lit window: warm panes with a wide halo. */
function windowGlow(ctx: Ctx, r: Rect, time: number, seed: number, lit: number): void {
  glowRect(ctx, WARM, r.x, r.y, r.w, r.h, 0.9 * lit);
  drawHalo(ctx, r.x + r.w / 2, r.y + r.h / 2, 24, '#ffa94a', 0.5 * lit * flicker(time, seed));
}

/** Chimney smoke: soft puffs that rise, swell, fade and lean with the wind. */
export function drawSmoke(ctx: Ctx, layout: ShackLayout, time: number): void {
  const c = layout.geometry.chimney;
  const cx = c.x + c.w / 2;
  const before = ctx.globalAlpha;
  for (let i = 0; i < PUFFS; i++) {
    const age = (time / SMOKE_SECONDS + i / PUFFS) % 1;
    ctx.globalAlpha = before * 0.55 * (1 - age);
    disc(ctx, '#e7e4de', cx + breeze(time, cx) * age * 6 + age * age * 8, c.y - 4 - age * SMOKE_RISE, 1 + Math.round(age * 3));
  }
  ctx.globalAlpha = before;
}

/** A few small birds crossing the high sky by day, flapping between two poses. */
export function drawBirds(ctx: Ctx, width: number, time: number, night: number): void {
  if (night > 0.6) return;
  ctx.fillStyle = BIRD_INK;
  const span = width + 60;
  for (let i = 0; i < BIRDS; i++) {
    const x = Math.round(((time * (5 + i * 1.5) + (i * span) / BIRDS) % span) - 30);
    const y = 36 + i * 11 + Math.round(Math.sin(time * 0.5 + i) * 3);
    const up = Math.floor(time * 4 + i * 2) % 2 === 0 ? 1 : 0;
    ctx.fillRect(x - 2, y - up, 1, 1);
    ctx.fillRect(x - 1, y, 1, 1);
    ctx.fillRect(x, y + 1, 1, 1);
    ctx.fillRect(x + 1, y, 1, 1);
    ctx.fillRect(x + 2, y - up, 1, 1);
  }
}

/** Butterflies fluttering over the grass on bright days, wings opening and closing. */
export function drawButterflies(ctx: Ctx, width: number, time: number, night: number): void {
  if (night > 0.3) return;
  for (let i = 0; i < BUTTERFLIES; i++) {
    const x = Math.round(width * (0.1 + i * 0.4) + Math.sin(time * 0.7 + i * 3) * 14);
    const y = Math.round(214 + i * 4 + Math.sin(time * 1.3 + i) * 5);
    const open = Math.floor(time * 5 + i) % 2 === 0;
    rect(ctx, BUTTERFLY_COLOURS[i % BUTTERFLY_COLOURS.length], x - (open ? 1 : 0), y, open ? 3 : 1, 1);
    rect(ctx, '#3a2f2a', x, y, 1, 1);
  }
}

/** Golden needles and leaves drifting down on the wind, one pixel each. */
export function drawFallingLeaves(ctx: Ctx, width: number, time: number): void {
  ctx.fillStyle = '#d9b85a';
  for (let i = 0; i < LEAVES; i++) {
    const x = (hash(i) * width + time * (3 + i) + breeze(time, i * 40) * 8 + width) % width;
    const y = (time * (6 + i) + hash(i + 9) * 270) % 270;
    ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
  }
}

/** Lights that come on at dusk: windows, lantern, roof-sign bulbs, party bulbs, vending machine, then fireflies and moths. */
export function drawShackGlow(ctx: Ctx, layout: ShackLayout, time: number, night: number, excite: Excite): void {
  const lit = litAmount(night);
  if (lit <= 0 && excite.sign <= 0 && excite.vending <= 0) return;
  const g = layout.geometry;
  if (lit > 0) {
    windowGlow(ctx, g.leftWindow, time, 0, lit);
    windowGlow(ctx, g.shopWindow, time, 1, lit);
    disc(ctx, WARM, g.atticWindow.x, g.atticWindow.y, 4);
    drawHalo(ctx, g.atticWindow.x, g.atticWindow.y, 14, '#ffa94a', 0.55 * lit * flicker(time, 4));
    drawHalo(ctx, g.lantern.x, g.lantern.y, 20, '#ffc060', 0.75 * lit * flicker(time, 7));
    rect(ctx, '#fff3c4', g.lantern.x - 1, g.lantern.y - 1, 3, 3);
    for (let i = 0; i < layout.bulbs.length; i++) {
      const b = layout.bulbs[i];
      const color = PARTY[i % PARTY.length];
      drawHalo(ctx, b.x, b.y + 3, 9, color, 0.6 * lit * flicker(time, i + 9));
      rect(ctx, color, b.x, b.y + 2, 1, 2);
    }
    drawFireflies(ctx, layout, time, lit);
    drawMoths(ctx, layout, time, lit);
  }
  for (let i = 0; i < g.signBulbs.length; i++) {
    const b = g.signBulbs[i];
    const chase = excite.sign > 0 ? ((Math.floor(time * 8) + i) % 2) * excite.sign : 0;
    const strength = Math.max(lit * (0.55 + 0.45 * Math.sin(time * 1.3 + i * 1.7)), chase);
    drawHalo(ctx, b.x, b.y, 7, '#ffe9a0', 0.6 * strength);
    if (strength > 0.3) rect(ctx, '#fff6d0', b.x, b.y, 1, 1);
  }
  const v = layout.vending;
  const face = Math.min(1, 0.6 * lit + excite.vending);
  glowRect(ctx, '#d8f4ff', v.x + 2, v.y + 2, v.w - 4, 6, face);
  glowRect(ctx, '#bfe6f5', v.x + 3, v.y + 11, v.w - 8, 9, 0.35 * lit + excite.vending * 0.6);
  drawHalo(ctx, v.x + v.w / 2, v.y + 12, 16, '#9fdcff', 0.25 * lit + excite.vending * 0.4);
}

/** Fireflies blinking slowly over the grass at the sides (never over the radio in the middle). */
function drawFireflies(ctx: Ctx, layout: ShackLayout, time: number, lit: number): void {
  const { width } = layout;
  for (let i = 0; i < FIREFLIES; i++) {
    const side = i % 2 === 0 ? 0.03 + hash(i) * 0.3 : 0.66 + hash(i) * 0.3;
    const x = side * width + Math.sin(time * 0.3 + i * 2) * 12;
    const y = 205 + hash(i + 20) * 45 + Math.cos(time * 0.37 + i) * 6;
    const blink = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 3);
    if (blink < 0.3) continue;
    drawHalo(ctx, x, y, 5, '#e8f58a', 0.8 * lit * blink);
    rect(ctx, '#f6ffc4', x, y, 1, 1);
  }
}

/** Two moths circling the porch lantern. */
function drawMoths(ctx: Ctx, layout: ShackLayout, time: number, lit: number): void {
  const { x, y } = layout.geometry.lantern;
  for (let i = 0; i < MOTHS; i++) {
    const a = time * (1.6 + i * 0.5) + i * 3;
    rect(ctx, '#f2ead0', x + Math.cos(a) * (6 + i * 2), y + Math.sin(a * 1.3) * 5, lit > 0.5 ? 2 : 1, 1);
  }
}
