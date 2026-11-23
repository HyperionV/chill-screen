/**
 * The Lake's moving life: mist drifting along the far shore, a duck family, swallows skimming the water, dragonflies,
 * a leaping fish and the bobber. Cheap per frame: a handful of small blits, no allocations.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, rect, type Ctx } from '../../gravity-falls/art-kit';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { bobberOf } from './lake-art';
import { ISLET_BASE, type LakeLayout } from './lake-layout';
import type { Ducks } from './lake-nature';
import { drawRing } from './lake-water';

const MIST_W = 96;
const MIST_H = 8;
const MIST_COLOUR = '#e6f4f2';
/** The mist bands: row, drift speed in pixels a second, and a head start so they never line up. */
const MIST_BANDS: readonly (readonly [number, number, number])[] = [[158, 1.6, 0], [165, 1, 0.37], [171, 2.2, 0.71]];
const MIST_ALPHA = 0.32;
const MIST_NIGHT_BOOST = 0.1;

/** One wisp of mist: a long, low lump of pale pixels, thickest in the middle and thinned out by dither at the edges. */
export function buildMist(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(MIST_W, MIST_H);
  ctx.fillStyle = MIST_COLOUR;
  for (let y = 0; y < MIST_H; y++) {
    for (let x = 0; x < MIST_W; x++) {
      const across = 1 - Math.abs((x - MIST_W / 2) / (MIST_W / 2));
      const down = 1 - Math.abs((y - MIST_H / 2 + 0.5) / (MIST_H / 2));
      if (bayer(x, y) < across * down * 1.4) ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Draws three bands of mist drifting slowly across the foot of the far shore; a little thicker at night. */
export function drawMist(ctx: Ctx, mist: HTMLCanvasElement, width: number, time: number, night: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * (MIST_ALPHA + MIST_NIGHT_BOOST * night);
  const span = width + MIST_W;
  for (const [row, speed, head] of MIST_BANDS) {
    ctx.drawImage(mist, Math.round(((time * speed + head * span) % span) - MIST_W), row);
  }
  ctx.globalAlpha = before;
}

const DUCK_ROW = 196;
const DUCK_SPEED = 3.2;
const DUCK_MARGIN = 40;
/** Ducklings trail behind the mother by these many pixels, each a row lower than the one before. */
const DUCKLING_GAPS = [11, 18];
const DUCKS_ASLEEP_FROM = 0.75;
const WAKE_COLOUR = '#e3f6f6';
const WAKE_ALPHA = 0.5;

/** The duck family paddling slowly across the lake, each duckling bobbing a little out of step; they roost at night. */
export function drawDucks(ctx: Ctx, ducks: Ducks, width: number, time: number, night: number): void {
  if (night > DUCKS_ASLEEP_FROM) return;
  const span = width + DUCK_MARGIN * 2;
  const x = ((time * DUCK_SPEED) % span) - DUCK_MARGIN;
  const y = DUCK_ROW + Math.round(Math.sin(time * 0.4));
  ctx.drawImage(ducks.mother, Math.round(x), y);
  DUCKLING_GAPS.forEach((gap, i) => {
    ctx.drawImage(ducks.duckling, Math.round(x - gap), y + 2 + i + Math.round(Math.sin(time * 1.1 + i * 2)));
  });
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * WAKE_ALPHA;
  rect(ctx, WAKE_COLOUR, x - 22, y + 5, 3, 1);
  rect(ctx, WAKE_COLOUR, x - 28, y + 6, 2, 1);
  ctx.globalAlpha = before;
}

const SWALLOWS = 2;
const SWALLOW_INK = '#2f3d44';
const SWALLOW_ROW = 200;
const SWALLOW_NIGHT_LIMIT = 0.5;

/** Two swallows skimming low over the water by day, darting up and down, wings flicking between two poses. */
export function drawSwallows(ctx: Ctx, width: number, time: number, night: number): void {
  if (night > SWALLOW_NIGHT_LIMIT) return;
  ctx.fillStyle = SWALLOW_INK;
  const span = width + 60;
  for (let i = 0; i < SWALLOWS; i++) {
    const x = Math.round(((time * (15 + i * 5) + (i * span) / SWALLOWS) % span) - 30);
    const y = SWALLOW_ROW + i * 9 + Math.round(Math.sin(time * 0.9 + i * 2) * 7);
    const up = Math.floor(time * 6 + i) % 2 === 0 ? 1 : 0;
    ctx.fillRect(x - 2, y - up, 2, 1);
    ctx.fillRect(x, y, 2, 1);
    ctx.fillRect(x + 2, y - up, 2, 1);
    ctx.fillRect(x - 3, y + 1, 1, 1);
  }
}

const DRAGONFLIES = 3;
const DRAGONFLY_BODY = '#35b3a6';
const DRAGONFLY_WING = '#e8f6f6';
const DRAGONFLY_NIGHT_LIMIT = 0.45;
const WING_FLICKS = 8;
/** The rows each dragonfly hovers around: above the islet, over the right shore's reeds, over the water by the dock. */
const DRAGONFLY_ROWS = [ISLET_BASE - 22, ISLET_BASE, ISLET_BASE + 8];

/** Dragonflies hovering over the reed islet, the right shore and the dock, hopping between spots by day. */
export function drawDragonflies(ctx: Ctx, layout: LakeLayout, time: number, night: number): void {
  if (night > DRAGONFLY_NIGHT_LIMIT) return;
  for (let i = 0; i < DRAGONFLIES; i++) {
    const homeX = i === 0 ? layout.islet.x : i === 1 ? layout.width * 0.64 : layout.dockEnd + 8;
    const x = Math.round(homeX + Math.sin(time * 0.6 + i * 2.1) * 16);
    const y = Math.round(DRAGONFLY_ROWS[i] + Math.sin(time * 1.1 + i) * 5);
    const open = Math.floor(time * WING_FLICKS + i) % 2 === 0;
    rect(ctx, DRAGONFLY_BODY, x, y, 4, 1);
    rect(ctx, '#1d3a3a', x + 4, y, 1, 1);
    rect(ctx, DRAGONFLY_WING, x + 1, y + (open ? -1 : 1), 2, 1);
  }
}

const FISH_PERIOD = 11;
const FISH_LEAP_SECONDS = 0.9;
const FISH_HEIGHT = 9;
const FISH_TRAVEL = 8;
const FISH_FROM = 0.28;
const FISH_SPREAD = 0.3;
const FISH_ROW = 206;
const FISH_ROW_SPREAD = 10;
const SPLASH_SECONDS = 0.7;

/** Every so often a small fish leaps out of the lake in a little arc, with a ring where it leaves and where it lands. */
export function drawFish(ctx: Ctx, width: number, time: number): void {
  const index = Math.floor(time / FISH_PERIOD);
  const age = time - index * FISH_PERIOD;
  const x0 = width * (FISH_FROM + FISH_SPREAD * hash(index * 3.7));
  const y0 = FISH_ROW + hash(index * 1.3) * FISH_ROW_SPREAD;
  if (age < FISH_LEAP_SECONDS) {
    const u = age / FISH_LEAP_SECONDS;
    const x = Math.round(x0 + u * FISH_TRAVEL);
    const y = Math.round(y0 - FISH_HEIGHT * Math.sin(Math.PI * u));
    rect(ctx, '#dfeaea', x, y, 3, 1);
    rect(ctx, '#9fb4bd', x, y + 1, 2, 1);
    rect(ctx, '#dfeaea', x + 3, y - 1, 1, 3);
  }
  const takeoff = Math.min(1, age / SPLASH_SECONDS);
  const landing = Math.min(1, Math.max(0, (age - FISH_LEAP_SECONDS) / SPLASH_SECONDS));
  if (takeoff < 1) drawRing(ctx, x0, y0, 2 + takeoff * 6, 0.3, 1 - takeoff);
  if (age >= FISH_LEAP_SECONDS && landing < 1) drawRing(ctx, x0 + FISH_TRAVEL, y0, 2 + landing * 6, 0.3, 1 - landing);
}

const BOBBER_DIP = 3;
const BOBBER_RED = '#d8453a';

/** The fishing bobber: it rides a swell now and then, and `dip` (1 straight after a click, easing to 0) pulls it under. */
export function drawBobber(ctx: Ctx, layout: LakeLayout, time: number, dip: number): void {
  const { x, y: rest } = bobberOf(layout);
  const y = rest + Math.round(Math.sin(time * 1.6) * 0.6 + breeze(time, x) * 0.4 + dip * BOBBER_DIP);
  rect(ctx, '#f4f4f4', x, y, 2, 1);
  rect(ctx, BOBBER_RED, x, y + 1, 2, Math.max(0, 2 - Math.round(dip * 2)));
  drawRing(ctx, x + 1, rest + 3, 3, 0.3, 0.6);
}
