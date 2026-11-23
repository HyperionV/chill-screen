/**
 * The Lake's lights, drawn after the night tint so they stay bright: the far lake house's panes and their long
 * reflection, the boathouse's porthole and open door, the dock lantern with its moths, fireflies over the banks, and
 * the glitter of stars and moon on the water.
 */
import { disc, drawHalo, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash } from '../../journeys/noise';
import { boathouseLights, lakeHousePanes, lanternOf } from './lake-art';
import { BEACH_TOP, DECK_TOP, HOUSE_W, WATERLINE, type Box, type LakeLayout } from './lake-layout';
import { litAmount } from './shack-life';

const WARM = '#ffcf6e';
const AMBER = '#ffa94a';
const FLICKER_SPEED = 2.1;
/** The radio hides the middle of the bottom; fireflies there stay above this row. */
const RADIO_SAFE_ROW = 215;
const RADIO_FROM = 0.39;
const RADIO_TO = 0.62;

const flicker = (time: number, seed: number): number => 0.88 + 0.12 * Math.sin(time * FLICKER_SPEED + seed * 5.3);

function glowRect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number, alpha: number): void {
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, alpha);
  rect(ctx, color, x, y, w, h);
  ctx.globalAlpha = before;
}

const GLITTER = 22;
const GLITTER_SPREAD_ROWS = 24;
const GLITTER_FROM = 0.15;
const GLITTER_COLOUR = '#e8f6ff';
const GLITTER_ALPHA = 0.85;
const GLITTER_MIN_BEAT = 0.2;
/** How far the glitter stays clear of the shore, the boathouse and the dock. */
const SHORE_CLEARANCE = 3;
const BOATHOUSE_CLEARANCE = 12;

/** Everything the glow needs that does not change between frames: where the lit panes, doors and lantern are. */
export interface LakeLights {
  panes: readonly Box[];
  porthole: Point;
  door: Box;
  lantern: Point;
  glitter: readonly Point[];
}

/** Works out the lights once for a layout. */
export function buildLights(width: number, layout: LakeLayout): LakeLights {
  const { porthole, door } = boathouseLights(layout.boathouse);
  return { panes: lakeHousePanes(layout.house), porthole, door, lantern: lanternOf(layout), glitter: buildGlitter(width, layout) };
}

/** Picks where stars and moonlight glitter on the open water. Built once for the width. */
function buildGlitter(width: number, layout: LakeLayout): Point[] {
  const { boathouse } = layout;
  const spots: Point[] = [];
  for (let i = 0; i < GLITTER * 3 && spots.length < GLITTER; i++) {
    const x = Math.round(hash(i * 2.3) * width);
    const y = WATERLINE + 8 + Math.round(hash(i * 5.1 + 1) * (BEACH_TOP - WATERLINE - GLITTER_SPREAD_ROWS));
    if (y > layout.landTop(x) - SHORE_CLEARANCE) continue;
    if (x < layout.dockEnd + 3 && y > DECK_TOP - 8) continue;
    if (x > boathouse.x - 3 && x < boathouse.x + boathouse.w + 3 && y > boathouse.y - BOATHOUSE_CLEARANCE) continue;
    spots.push({ x, y });
  }
  return spots;
}

/** Tiny light pricks on the water that come and go one by one once it is dark. */
function drawGlitter(ctx: Ctx, spots: readonly Point[], time: number, night: number): void {
  if (night < GLITTER_FROM) return;
  const before = ctx.globalAlpha;
  ctx.fillStyle = GLITTER_COLOUR;
  for (let i = 0; i < spots.length; i++) {
    const beat = Math.sin(time * 0.9 + i * 1.9);
    if (beat < GLITTER_MIN_BEAT) continue;
    ctx.globalAlpha = before * Math.min(1, night * 1.2) * beat * GLITTER_ALPHA;
    ctx.fillRect(spots[i].x, spots[i].y, 2, 1);
  }
  ctx.globalAlpha = before;
}

const REFLECTION_ROWS = 18;
const REFLECTION_ALPHA = 0.4;
const DIM_PANE_EVERY = 3;
const DIM_PANE = 0.6;
const BRIGHT_PANE = 0.9;

/** The lake house across the water: warm panes, a wide halo, and a wobbling streak of each pane in the water below. */
function drawLakeHouseGlow(ctx: Ctx, layout: LakeLayout, panes: readonly Box[], time: number, lit: number): void {
  for (let k = 0; k < panes.length; k++) {
    const p = panes[k];
    glowRect(ctx, WARM, p.x, p.y, p.w, p.h, (k % DIM_PANE_EVERY === DIM_PANE_EVERY - 1 ? DIM_PANE : BRIGHT_PANE) * lit);
  }
  drawHalo(ctx, layout.house.x + HOUSE_W / 2, layout.house.y + 8, 20, AMBER, 0.32 * lit * flicker(time, 2));
  const before = ctx.globalAlpha;
  ctx.fillStyle = WARM;
  for (let r = 0; r < REFLECTION_ROWS; r++) {
    ctx.globalAlpha = before * REFLECTION_ALPHA * lit * (1 - r / REFLECTION_ROWS);
    for (let k = 0; k < panes.length; k++) {
      ctx.fillRect(panes[k].x + 1 + Math.round(Math.sin(r * 1.1 + time * 1.1 + k) * 1.2), WATERLINE + 1 + r, 2, 1);
    }
  }
  ctx.globalAlpha = before;
}

/** The boathouse: a lit porthole in the gable and a warm glow inside the open door. */
function drawBoathouseGlow(ctx: Ctx, porthole: Point, door: Box, time: number, lit: number): void {
  disc(ctx, WARM, porthole.x, porthole.y, 1);
  drawHalo(ctx, porthole.x, porthole.y, 12, AMBER, 0.5 * lit * flicker(time, 5));
  glowRect(ctx, WARM, door.x + 1, door.y + 1, door.w - 2, door.h - 3, 0.28 * lit);
  drawHalo(ctx, door.x + door.w / 2, door.y + door.h - 3, 14, AMBER, 0.3 * lit * flicker(time, 6));
}

const MOTHS = 2;
const FIREFLIES = 12;
const FIREFLY_COLOUR = '#e8f58a';

/** The dock lantern's halo and the moths that circle it. */
function drawLanternGlow(ctx: Ctx, lantern: Point, time: number, lit: number): void {
  const { x, y } = lantern;
  drawHalo(ctx, x, y, 24, '#ffc060', 0.75 * lit * flicker(time, 7));
  rect(ctx, '#fff3c4', x - 1, y - 1, 3, 3);
  for (let i = 0; i < MOTHS; i++) {
    const a = time * (1.6 + i * 0.5) + i * 3;
    rect(ctx, '#f2ead0', x + Math.cos(a) * (6 + i * 2), y + Math.sin(a * 1.3) * 5, lit > 0.5 ? 2 : 1, 1);
  }
}

/** Fireflies blinking slowly over the reeds and the banks, never low in front of the radio. */
function drawFireflies(ctx: Ctx, layout: LakeLayout, time: number, lit: number): void {
  const { width } = layout;
  for (let i = 0; i < FIREFLIES; i++) {
    const x = width * (0.06 + 0.88 * hash(i * 1.7)) + Math.sin(time * 0.3 + i * 2) * 12;
    const rawY = 196 + hash(i + 20) * 36 + Math.cos(time * 0.37 + i) * 6;
    const y = x > width * RADIO_FROM && x < width * RADIO_TO ? Math.min(rawY, RADIO_SAFE_ROW) : rawY;
    const blink = 0.5 + 0.5 * Math.sin(time * 0.9 + i * 3);
    if (blink < 0.3) continue;
    drawHalo(ctx, x, y, 5, FIREFLY_COLOUR, 0.8 * lit * blink);
    rect(ctx, '#f6ffc4', x, y, 1, 1);
  }
}

/** Every light of the lake, in order: glitter first, then (as it gets dark) the houses, the lantern and the fireflies. */
export function drawLakeGlow(ctx: Ctx, layout: LakeLayout, lights: LakeLights, time: number, night: number): void {
  drawGlitter(ctx, lights.glitter, time, night);
  const lit = litAmount(night);
  if (lit <= 0) return;
  drawLakeHouseGlow(ctx, layout, lights.panes, time, lit);
  drawBoathouseGlow(ctx, lights.porthole, lights.door, time, lit);
  drawLanternGlow(ctx, lights.lantern, time, lit);
  drawFireflies(ctx, layout, time, lit);
}
