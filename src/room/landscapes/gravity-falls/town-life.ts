/**
 * The small life of Water Tower Hill that moves by day: chimney smoke, flags on the diner and the sheriff's office,
 * a flock of birds, pigeons on the rooftops (they flutter off and come back, all at once when clicked), grass tufts
 * and the eyes that blink in the hedge. Cheap per frame: a few small shapes, no allocations.
 */
import { disc, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { dinerPole, sheriffPole } from './town-landmarks';
import { hollowCentre } from './town-props';
import type { TownLayout } from './town-layout';

const PUFFS = 5;
const SMOKE_SECONDS = 11;
const SMOKE_RISE = 30;
const MAX_CHIMNEYS = 5;
const FLAG_W = 8;
const FLAG_H = 4;
/** Share of the flag's length that the wind can lift or drop its far end. */
const FLAG_LIFT = 1.6;
const FLOCK = 4;
const FLOCK_SPEED = 6;
const FLOCK_ROW = 54;
const BIRD_INK = '#5b4a5e';
/** Night level above which the birds have gone to roost. */
const ROOST_FROM = 0.6;
const PIGEON_BODY = '#9aa3b5';
const PIGEON_NECK = '#6fa59a';
const PIGEONS = 5;
/** Perches outside this share of the width are behind the window frame. */
const PERCH_FROM = 0.1;
const PERCH_TO = 0.9;
const FLIGHT_SECONDS = 14;
const FLIGHT_RANGE = 70;
const FLIGHT_LIFT = 32;
const PERIOD_BASE = 70;
const PERIOD_STEP = 17;
const SCARE_STAGGER = 0.25;
const EYE_PERIOD = 9;
const EYE_OPEN = 6;
const BLINK_PERIOD = 3;
const BLINK_SECONDS = 0.25;
const EYE_DAY = '#e8c26a';
const EYE_NIGHT = '#fff3a8';

export interface Pigeon {
  x: number;
  y: number;
  /** Flies off to the left (-1) or right (1). */
  dir: 1 | -1;
  offset: number;
  period: number;
}

/** Perches on the sheriff's roof edge, the diner's sign and the first shop roofs; each pigeon gets its own timing. */
export function buildPigeons(layout: TownLayout): Pigeon[] {
  const { width, sheriff, diner } = layout;
  const perches: Point[] = [
    { x: sheriff.x + 5, y: sheriff.y - 4 },
    { x: diner.x + 12, y: diner.y - 10 },
    ...layout.shops.slice(0, 3).map((s) => ({ x: s.rect.x + 6 + (s.seed % 5), y: s.rect.y - 2 })),
  ];
  return perches
    .filter((p) => p.x > width * PERCH_FROM && p.x < width * PERCH_TO)
    .slice(0, PIGEONS)
    .map((p, i) => ({ x: p.x, y: p.y, dir: i % 2 === 0 ? 1 : -1, offset: hash(i + 5) * PERIOD_BASE, period: PERIOD_BASE + i * PERIOD_STEP }));
}

/** Soft puffs of smoke that rise, swell, fade and lean with the wind from each chimney. */
export function drawSmoke(ctx: Ctx, chimneys: readonly Point[], time: number): void {
  const before = ctx.globalAlpha;
  const count = Math.min(MAX_CHIMNEYS, chimneys.length);
  for (let c = 0; c < count; c++) {
    const { x, y } = chimneys[c];
    for (let i = 0; i < PUFFS; i++) {
      const age = (time / SMOKE_SECONDS + i / PUFFS + c * 0.3) % 1;
      ctx.globalAlpha = before * 0.5 * (1 - age);
      disc(ctx, '#ece6e2', x + breeze(time, x) * age * 6 + age * age * 6, y - 2 - age * SMOKE_RISE, 1 + Math.round(age * 2));
    }
  }
  ctx.globalAlpha = before;
}

function flag(ctx: Ctx, pole: Point, top: string, bottom: string, time: number): void {
  for (let col = 0; col < FLAG_W; col++) {
    const dy = Math.round(breeze(time, pole.x + col * 5) * FLAG_LIFT * (col / (FLAG_W - 1)));
    rect(ctx, top, pole.x + 1 + col, pole.y + dy, 1, FLAG_H / 2);
    rect(ctx, bottom, pole.x + 1 + col, pole.y + dy + FLAG_H / 2, 1, FLAG_H / 2);
  }
}

/** The diner's red pennant and the sheriff's blue-and-gold flag, rippling. */
export function drawFlags(ctx: Ctx, layout: TownLayout, time: number): void {
  flag(ctx, dinerPole(layout.diner), '#c9473f', '#f1e6cf', time);
  flag(ctx, sheriffPole(layout.sheriff), '#4a7fd4', '#e8c26a', time);
}

/** A small flock drifting right to left high in the sky in a loose V, wings flapping slowly. */
export function drawFlock(ctx: Ctx, width: number, time: number, night: number): void {
  if (night > ROOST_FROM) return;
  ctx.fillStyle = BIRD_INK;
  const lead = Math.round(width + 40 - ((time * FLOCK_SPEED) % (width + 80)));
  for (let i = 0; i < FLOCK; i++) {
    const x = lead + i * 7;
    const y = FLOCK_ROW + Math.abs(i - 1.5) * 3 + Math.round(Math.sin(time * 0.6 + i) * 2);
    const up = Math.floor(time * 2.5 + i) % 2 === 0 ? 1 : 0;
    ctx.fillRect(x - 2, Math.round(y) - up, 1, 1);
    ctx.fillRect(x - 1, Math.round(y), 1, 1);
    ctx.fillRect(x, Math.round(y) + 1, 1, 1);
    ctx.fillRect(x + 1, Math.round(y), 1, 1);
    ctx.fillRect(x + 2, Math.round(y) - up, 1, 1);
  }
}

/** One pigeon sitting: a plump body, a head that bobs now and then, a green neck patch and a tail. */
function sitting(ctx: Ctx, p: Pigeon, time: number): void {
  const bob = Math.floor(time * 1.5 + p.offset) % 5 === 0 ? 1 : 0;
  rect(ctx, PIGEON_BODY, p.x - 2, p.y - 2, 4, 2);
  rect(ctx, PIGEON_BODY, p.x + 1 * p.dir, p.y - 3 + bob, 2, 2);
  rect(ctx, PIGEON_NECK, p.x, p.y - 2, 1, 1);
  rect(ctx, BIRD_INK, p.x - 3 * p.dir, p.y - 1, 1, 1);
}

/** One pigeon in flight: a wide pair of wings that beat, over a looping arc away from the perch and back. */
function flying(ctx: Ctx, p: Pigeon, progress: number, time: number): void {
  const arc = Math.sin(progress * Math.PI);
  const x = Math.round(p.x + p.dir * arc * FLIGHT_RANGE);
  const y = Math.round(p.y - arc * FLIGHT_LIFT - Math.sin(progress * Math.PI * 3) * 2);
  const up = Math.floor(time * 6) % 2 === 0;
  rect(ctx, PIGEON_BODY, x - 1, y, 3, 1);
  rect(ctx, PIGEON_BODY, x - 3, up ? y - 2 : y + 1, 2, 1);
  rect(ctx, PIGEON_BODY, x + 2, up ? y - 2 : y + 1, 2, 1);
}

/** Pigeons on the roofs. Each flies a lap every minute or so; `scaredAt` (a click) sends them all up at once. */
export function drawPigeons(ctx: Ctx, pigeons: readonly Pigeon[], time: number, scaredAt: number): void {
  pigeons.forEach((p, i) => {
    const scare = (time - scaredAt - i * SCARE_STAGGER) / FLIGHT_SECONDS;
    const lap = ((time + p.offset) % p.period) - (p.period - FLIGHT_SECONDS);
    if (scare >= 0 && scare < 1) flying(ctx, p, scare, time);
    else if (lap >= 0) flying(ctx, p, lap / FLIGHT_SECONDS, time);
    else sitting(ctx, p, time);
  });
}

/** Two bright eyes in the hedge's hollow, open for a while, then gone, blinking now and then; brighter at night. */
export function drawHedgeEyes(ctx: Ctx, layout: TownLayout, time: number, night: number): void {
  if (time % EYE_PERIOD > EYE_OPEN) return;
  if (time % BLINK_PERIOD < BLINK_SECONDS) return;
  const c = hollowCentre(layout);
  const color = night > 0.4 ? EYE_NIGHT : EYE_DAY;
  rect(ctx, color, c.x - 3, c.y - 1, 2, 1);
  rect(ctx, color, c.x + 2, c.y - 1, 2, 1);
}

export interface Tuft {
  x: number;
  y: number;
  variant: number;
}

const TUFT_GAP = 6;
/** Rows the tufts stand on: just below the cast's feet, and low enough in front that they only brush them. */
const TUFT_BEHIND_ROW = 236;
const TUFT_AHEAD_ROW = 242;
const TUFT_SIDE = 0.085;
const RADIO_FROM = 0.38;
const RADIO_TO = 0.63;

/** Where grass tufts grow: a row in front of the street (drawn behind the cast) and a low row in front (drawn over it), none by the radio or the frame. */
export function scatterTufts(width: number): { behind: Tuft[]; ahead: Tuft[] } {
  const behind: Tuft[] = [];
  const ahead: Tuft[] = [];
  for (let x = Math.round(width * TUFT_SIDE), i = 0; x < width * (1 - TUFT_SIDE); x += TUFT_GAP, i++) {
    const share = x / width;
    if (share > RADIO_FROM && share < RADIO_TO) continue;
    const variant = Math.floor(hash(i + 70) * 6);
    behind.push({ x, y: TUFT_BEHIND_ROW + Math.round(hash(i * 2.1) * 4), variant });
    ahead.push({ x: x + 3, y: TUFT_AHEAD_ROW + Math.round(hash(i * 4.3) * 2), variant });
  }
  return { behind, ahead };
}
