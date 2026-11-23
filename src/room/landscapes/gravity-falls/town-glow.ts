/**
 * Every light of Water Tower Hill, added after the night tint so it stays bright: windows that come on one by one
 * through the evening, street lamps, the diner's neon, the sheriff's lantern, the patrol car's light bar, the red beacon
 * on the water tower (which also hums when clicked) and a few fireflies over the grass.
 */
import { drawText } from '../../../render/pixel-font';
import { drawHalo, rect, type Ctx } from '../../gravity-falls/art-kit';
import { hash } from '../../journeys/noise';
import { dinerNeon, dinerOpen, patrolBar, sheriffLamp } from './town-landmarks';
import type { TownWindow } from './town-buildings';
import type { TownStatics } from './town-art';
import type { TownLayout } from './town-layout';
import { beaconPoint } from './town-props';
import { litAmount } from './shack-life';

const WARM = '#ffcf6e';
const TV_BLUE = '#bfe0ff';
const HALO_WARM = '#ffa94a';
/** Windows this big (in pixels) cast a halo; the small house panes only glow. */
const HALO_MIN_AREA = 16;
const HALO_MIN_R = 6;
const HALO_MAX_R = 14;
/** How much of the evening the first and the last window take to come on (a window's seed spreads them out). */
const WINDOW_SPREAD = 0.6;
const WINDOW_RAMP = 0.4;
const LAMP_RADIUS = 20;
const FLICKER_SPEED = 2.1;
const NEON_PINK = '#ff7ab8';
const NEON_RED = '#ff5a4a';
/** A neon letter sputters for this long every so often. */
const NEON_PERIOD = 7;
const NEON_DIP = 0.35;
const NEON_SPUTTER = 0.35;
/** Pixels from one pixel-font letter to the next, so the second letter of DINER can be lit on its own. */
const LETTER_ADVANCE = 4;
const BEACON_PERIOD = 2.4;
const BEACON_ON = 0.7;
const BAR_PERIOD = 2;
const FIREFLIES = 9;
/** Seconds a click's hum on the tower takes to fade out. */
export const HUM_SECONDS = 2.5;
const HUM_LINES = 3;

const flicker = (time: number, seed: number): number => 0.88 + 0.12 * Math.sin(time * FLICKER_SPEED + seed * 5.3);

function glowRect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, alpha: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, alpha);
  rect(ctx, color, x, y, w, h);
  ctx.globalAlpha = before;
}

function glowWindow(ctx: Ctx, w: TownWindow, lit: number, time: number): void {
  const on = Math.min(1, Math.max(0, (lit - w.seed * WINDOW_SPREAD) / WINDOW_RAMP));
  if (on <= 0) return;
  glowRect(ctx, w.seed > 0.85 ? TV_BLUE : WARM, w.x, w.y, w.w, w.h, 0.9 * on);
  if (w.w * w.h >= HALO_MIN_AREA) {
    const radius = Math.min(HALO_MAX_R, Math.max(HALO_MIN_R, Math.round(Math.max(w.w, w.h) * 1.2)));
    drawHalo(ctx, w.x + w.w / 2, w.y + w.h / 2, radius, HALO_WARM, 0.45 * on * flicker(time, w.seed));
  }
}

function neon(ctx: Ctx, text: string, x: number, y: number, color: string, strength: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * strength;
  drawText(ctx, text, x, y, color);
  ctx.globalAlpha = before;
}

/** Fireflies blinking slowly over the grass at the sides, never over the radio in the middle. */
function drawFireflies(ctx: Ctx, width: number, time: number, lit: number): void {
  for (let i = 0; i < FIREFLIES; i++) {
    const side = i % 2 === 0 ? 0.1 + hash(i) * 0.27 : 0.64 + hash(i) * 0.26;
    const x = side * width + Math.sin(time * 0.3 + i * 2) * 10;
    const y = 205 + hash(i + 20) * 30 + Math.cos(time * 0.37 + i) * 5;
    const blink = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 3);
    if (blink < 0.3) continue;
    drawHalo(ctx, x, y, 5, '#e8f58a', 0.8 * lit * blink);
    rect(ctx, '#f6ffc4', x, y, 1, 1);
  }
}

/** Sound lines that ripple out from both sides of the tank, and a faint shine on it, for a second or two after a click. */
function drawHum(ctx: Ctx, layout: TownLayout, hum: number): void {
  const { tank } = layout;
  glowRect(ctx, '#ffffff', tank.x, tank.y, tank.w, tank.h, 0.25 * hum);
  for (let k = 0; k < HUM_LINES; k++) {
    const reach = 3 + k * 4 + Math.round((1 - hum) * 6);
    const alpha = hum * (1 - k * 0.25);
    glowRect(ctx, '#f6f2e0', tank.x - reach, tank.y + 4, 1, tank.h - 8, alpha);
    glowRect(ctx, '#f6f2e0', tank.x + tank.w + reach - 1, tank.y + 4, 1, tank.h - 8, alpha);
  }
}

/** Draws every light. `hum` is 1 right after a click on the water tower and falls to 0; `night` is 0 in daylight, 1 in deep night. */
export function drawTownGlow(ctx: Ctx, layout: TownLayout, statics: TownStatics, time: number, night: number, hum: number): void {
  const lit = litAmount(night);
  const beacon = beaconPoint(layout);
  const beaconOn = time % BEACON_PERIOD < BEACON_ON;
  if (beaconOn) {
    drawHalo(ctx, beacon.x, beacon.y, 8, '#ff5a5a', 0.35 + 0.55 * lit);
    rect(ctx, '#ff9a8a', beacon.x, beacon.y, 1, 2);
  }
  const neonLevel = 0.3 + 0.7 * lit;
  const dip = time % NEON_PERIOD < NEON_SPUTTER ? NEON_DIP : 1;
  const sign = dinerNeon(layout.diner);
  neon(ctx, 'DINER', sign.x, sign.y, NEON_PINK, neonLevel);
  neon(ctx, 'I', sign.x + LETTER_ADVANCE, sign.y, '#ffd0e6', neonLevel * dip);
  const open = dinerOpen(layout.diner);
  neon(ctx, 'OPEN', open.x, open.y, NEON_RED, 0.4 + 0.6 * lit);
  if (hum > 0) drawHum(ctx, layout, hum);
  if (lit <= 0) return;
  drawHalo(ctx, sign.x + 9, sign.y + 2, 18, '#ff6fb0', 0.5 * lit * flicker(time, 2));
  drawHalo(ctx, open.x + 7, open.y + 2, 9, '#ff6a5a', 0.4 * lit);
  for (const w of statics.lights.windows) glowWindow(ctx, w, lit, time);
  statics.lamps.forEach((lamp, i) => {
    drawHalo(ctx, lamp.x, lamp.y, LAMP_RADIUS, '#ffc060', 0.75 * lit * flicker(time, i + 7));
    rect(ctx, '#fff3c4', lamp.x - 1, lamp.y - 1, 3, 3);
  });
  const door = sheriffLamp(layout.sheriff);
  drawHalo(ctx, door.x, door.y, 12, '#ffc060', 0.7 * lit * flicker(time, 11));
  rect(ctx, '#fff3c4', door.x, door.y - 1, 1, 2);
  const bar = patrolBar(layout.patrol);
  const redPhase = time % BAR_PERIOD < BAR_PERIOD / 2;
  drawHalo(ctx, bar.x + (redPhase ? -2 : 2), bar.y, 5, redPhase ? '#ff4a4a' : '#5a8aff', 0.5 * lit);
  drawFireflies(ctx, layout.width, time, lit);
}
