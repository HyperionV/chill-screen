/**
 * Journey chapter 3, "Main Street": a late-afternoon walk down the high street past the hardware shop, the bakery,
 * the diner terrace, the gift shop, the sheriff's office and its patrol car, the bookshop, the town hall and its
 * fountain square, the cinema and the post office, with the water tower on the far hill. This file puts the strips,
 * the moving parts, the dusk lights, the cast's places and the clues together; the pictures are painted in
 * ch-town-art.ts (strips and ground), ch-town-art2.ts (buildings) and ch-town-art3.ts (street furniture).
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { drawHalo, rect } from '../../gravity-falls/art-kit';
import { drawSwayTree } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, Point, ScenePlan } from '../../gravity-falls/types';
import { breeze, gust } from '../../wind';
import { hash, ramp } from '../noise';
import { stripWidth } from './ch-shack-art';
import { TOWER_BEACON_ROW, buildBackRow, buildFarHills, buildFarRoofs, buildGround, buildMidHouses, leafyTree } from './ch-town-art';
import { buildStreet, type Spots, type Street } from './ch-town-art2';
import { buildHangingSign } from './ch-town-art3';
import { DESIGN_ROWS, type ChapterWorld, type Station, type WorldBuilder, type WorldLayer } from './world';

/** Camera x where the walk rests at the diner, the patrol car and the fountain (9 px a second from the start and between pauses). */
const AT_DINER = 245;
const AT_PATROL = 555;
const AT_FOUNTAIN = 778;
const STATIONS: readonly Station[] = [
  { at: AT_DINER, from: 0.13, to: 0.31 },
  { at: AT_PATROL, from: 0.47, to: 0.65 },
  { at: AT_FOUNTAIN, from: 0.77, to: 0.93 },
];
/** The camera still walks this far after the fountain pause before the chapter ends (9 px a second for 15 s, after the ease). */
const WALK_AFTER_LAST = 134;
const MIN_WORLD_WIDTH = 1800;
const WORLD_MARGIN = 40;
const FAR_FACTORS = { hills: 0.15, roofs: 0.3, houses: 0.5, gardens: 0.75 } as const;
/** Each scene's centre sits this share of the view width right of its station's camera, so its people stand around it. */
const DINER_SHARE = 0.8;
const PATROL_SHARE = 0.76;
const FOUNTAIN_SHARE = 0.8;
const TOWER_SHARE = 0.75;
const TOWER_OFFSET = 40;
const STEEPLE_SHARE = 0.5;
const SQUARE_HALF = 82;
const CROSSWALK_DX = 40;

/** The locals: which station, how far across the view they stand, and their feet row. */
const LOCALS = [
  { id: 'susan', station: 0, share: 0.7, y: 229 }, { id: 'mcgucket', station: 0, share: 0.88, y: 231 },
  { id: 'blubs', station: 1, share: 0.68, y: 229 }, { id: 'durland', station: 1, share: 0.8, y: 232 },
  { id: 'pacifica', station: 2, share: 0.7, y: 228 }, { id: 'gideon', station: 2, share: 0.9, y: 232 },
] as const;
const STATION_ATS = [AT_DINER, AT_PATROL, AT_FOUNTAIN] as const;
const PARTY_SHARES = [{ id: 'dipper', share: 0.12, y: 233 }, { id: 'mabel', share: 0.2, y: 235 }, { id: 'waddles', share: 0.26, y: 237 }] as const;
const SPOT_SHARES = [0.68, 0.8, 0.92] as const;
const SPOT_ROWS = [234, 236, 234] as const;
const CLUE_SIZE = 12;
const PEEK_SHARE = 0.92;
const PEEK_BUSH_BASE = 234;
const PEEK_ROW = 218;

/** Street trees at the kerb: their trunk feet row and sprite heights. */
const TREE_BASE = 229;
const TREE_HEIGHTS = [52, 56, 60] as const;
const TREE_SWAY = 1;
const TREE_REACH = 36;

const HIT_PAD = 2;
const SIREN_SECONDS = 1.6;
const SIREN_TEXT = 'WEE-OO!';
const SIREN_FLASH_SECONDS = 0.6;
const BAR_FLASH_SECONDS = 1.2;
const SPLASH_SECONDS = 3;

/** Chimney smoke. */
const PUFFS = 6;
const PUFF_SECONDS = 9;
const PUFF_RISE = 30;
const SMOKE = '#f0e8e0';

/** The sheriff's flag: its length grows with the gusts. */
const FLAG_MIN = 9;
const FLAG_GUST = 5;
const FLAG_ROWS = 7;
const FLAG_RED = '#c9473f';
const FLAG_RED_DARK = '#a3342f';
const FLAG_BLUE = '#3f5a9a';
const FLAG_WHITE = '#f6f1e0';

/** Bunting: strung between lamp lanterns that are no further apart than this. */
const BUNTING_MAX_SPAN = 260;
const BUNTING_DROP = 3;
const BUNTING_SAG = 6;
const BUNTING_GAP = 8;
const BUNTING_COLORS = ['#d4524e', '#f4d35e', '#4a9a98', '#e58fb0', '#8a67b0'] as const;
const STRING = '#e8e0c8';

/** The fountain's spray: drops per jet, the jet's height, extra height when clicked, the spill's drops and how far below the nozzle the basin water lies. */
const JET_DROPS = 7;
const JET_HEIGHT = 12;
const JET_EXTRA = 12;
const SPILL_DROPS = 8;
const BASIN_DROP = 16;
const RIPPLES = 2;
const RIPPLE_STEPS = 18;
const RIPPLE_REACH = 22;
const WATER_LIGHT = '#d4f0f6';
const WATER = '#8cc3d8';

/** Pigeons peck on the pavement; three more cross the high sky. */
const PIGEON_BODY = '#8a8f9c';
const PIGEON_CHEST = '#aab0be';
const PIGEON_HEAD = '#6f7480';
const FLYERS = 3;
const FLYER_SPEED = 8;
const FLYER_MARGIN = 30;
const SKY_ROW = 68;

/** A newspaper page hops along the road when the wind picks up. */
const PAPER_ROW = 240;
const PAPER_SPEED = 18;
const PAPER_GUST_FROM = 0.25;
const PAPER_GUST_FULL = 0.5;

/** Leaves drift down in front of everything, but not across the clock's box. */
const LEAVES = 4;
const LEAF_COLORS = ['#c9843a', '#9bbd62', '#d4a84a', '#b0683f'] as const;
const CLOCK_TOP = 105;
const CLOCK_BOTTOM = 175;
const CLOCK_FROM = 0.3;
const CLOCK_TO = 0.7;

/** Dusk lights come up between these two levels of `night`; each window follows at its own moment. */
const LIGHT_FROM = 0.1;
const LIGHT_FULL = 0.6;
const LIGHT = '#ffcf6e';
const LIGHT_CORE = '#ffe9b0';
const TV_BLUE = '#bfe6ff';
const TV_SEED = 0.85;
const NEON = '#ff7ab8';
const NEON_OPEN = '#ff5a4e';
const BAR_RED = '#ff4a4a';
const BAR_BLUE = '#5a8aff';
const WINDOW_HALO_MIN_WIDTH = 12;
const BULB_CHASE_SECONDS = 0.7;

interface Tree {
  x: number;
  sprite: HTMLCanvasElement;
}

/** Whole-pixel box test in world pixels. */
function inside(x: number, y: number, box: { x: number; y: number; w: number; h: number }): boolean {
  return x >= box.x - HIT_PAD && x <= box.x + box.w + HIT_PAD && y >= box.y - HIT_PAD && y <= box.y + box.h + HIT_PAD;
}

/** The shops, the square and the furniture, placed around the three scene centres. */
function placesFor(diner: number, patrol: number, fountain: number): Spots {
  return {
    hardware: diner - 330, bakery: diner - 190, diner, cart: diner + 76, gift: diner + 140,
    sheriff: patrol, car: patrol, notice: patrol + 70, books: patrol + 130,
    hall: fountain, fountain, cinema: fountain + 130, post: fountain + 215,
  };
}

/** The people's places, the meeting spots and the four clues, all in world pixels. */
function buildPlan(width: number, places: Spots): ScenePlan {
  const homes: PerformerHome[] = [
    ...LOCALS.map((l): PerformerHome => ({ id: l.id, x: STATION_ATS[l.station] + Math.round(width * l.share), y: l.y, facing: -1 })),
    ...PARTY_SHARES.map((p): PerformerHome => ({ id: p.id, x: Math.round(width * p.share), y: p.y, facing: 1, followDx: Math.round(width * p.share) })),
  ];
  const spots: Point[] = STATION_ATS.flatMap((at) => SPOT_SHARES.map((share, i) => ({ x: at + Math.round(width * share), y: SPOT_ROWS[i] })));
  const clue = (id: string, kind: Clue['kind'], x: number, y: number): Clue => ({ id, kind, place: 'town', x, y, w: CLUE_SIZE, h: CLUE_SIZE });
  const clues: Clue[] = [
    clue('town-symbol', 'symbol', places.hardware - 8, 209),
    clue('town-note', 'note', places.notice, 202),
    clue('town-page', 'page', places.fountain + 22, 222),
    clue('town-peek', 'peek', AT_PATROL + Math.round(width * PEEK_SHARE), PEEK_ROW),
  ];
  return { homes, spots, clues };
}

/** A clipped boxwood hedge in a planter at the kerb: the monster's hiding place. */
function buildPeekBush(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(30, 15);
  rect(ctx, '#2f2a3e', 1, 11, 28, 4);
  rect(ctx, '#6b5f9a', 2, 11, 26, 1);
  rect(ctx, '#27432f', 2, 3, 26, 9);
  rect(ctx, '#3d6a45', 3, 3, 22, 7);
  for (const [fx, fy] of [[5, 4], [10, 6], [16, 4], [21, 7], [13, 8]]) rect(ctx, '#8fb85f', fx, fy, 2, 1);
  return canvas;
}

function drawSmoke(ctx: CanvasRenderingContext2D, at: Point, cameraX: number, time: number): void {
  for (let i = 0; i < PUFFS; i++) {
    const age = (time / PUFF_SECONDS + i / PUFFS) % 1;
    const size = 2 + Math.floor(age * 3);
    ctx.globalAlpha = 0.5 * (1 - age);
    rect(ctx, SMOKE, at.x - cameraX + (2 + gust(time) * 8) * age + breeze(time + i, at.x) * 2 * age - size / 2, at.y - age * PUFF_RISE, size, size);
  }
  ctx.globalAlpha = 1;
}

/** The sheriff's flag: it flutters more toward the tip and streams out further in a gust. */
function drawFlag(ctx: CanvasRenderingContext2D, pole: Point, cameraX: number, time: number): void {
  const length = FLAG_MIN + Math.round(gust(time) * FLAG_GUST);
  for (let i = 0; i < length; i++) {
    const x = pole.x - cameraX + i;
    const y = pole.y + 1 + Math.round(Math.sin(time * 3 + i * 0.7) * (0.4 + i / length) * 1.2);
    rect(ctx, Math.floor(i / 3) % 2 === 0 ? FLAG_RED : FLAG_RED_DARK, x, y, 1, FLAG_ROWS);
    if (i < 5) rect(ctx, FLAG_BLUE, x, y, 1, 4);
    else rect(ctx, FLAG_WHITE, x, y + 3, 1, 1);
  }
  rect(ctx, FLAG_WHITE, pole.x - cameraX + 2, pole.y + 2, 1, 1);
}

/** Strings of little triangular flags between the lamps, blowing in the wind. */
function drawBunting(ctx: CanvasRenderingContext2D, lamps: readonly Point[], cameraX: number, width: number, time: number): void {
  for (let i = 0; i + 1 < lamps.length; i++) {
    const a = lamps[i];
    const b = lamps[i + 1];
    const span = b.x - a.x;
    if (span > BUNTING_MAX_SPAN || b.x - cameraX < 0 || a.x - cameraX > width) continue;
    const sag = (x: number): number => a.y + BUNTING_DROP + BUNTING_SAG * Math.sin((Math.PI * (x - a.x)) / span);
    for (let x = a.x; x < b.x; x += 3) {
      if (x - cameraX > -3 && x - cameraX < width) rect(ctx, STRING, x - cameraX, sag(x), 3, 1);
    }
    for (let x = a.x + 6, k = 0; x < b.x - 4; x += BUNTING_GAP, k++) {
      if (x - cameraX < -4 || x - cameraX > width + 4) continue;
      const sway = Math.round(breeze(time, x) * 1.2);
      const color = BUNTING_COLORS[k % BUNTING_COLORS.length];
      const y = sag(x);
      rect(ctx, color, x - cameraX - 2 + sway, y + 1, 5, 1);
      rect(ctx, color, x - cameraX - 1 + sway, y + 2, 3, 1);
      rect(ctx, color, x - cameraX + sway, y + 3, 1, 1);
    }
  }
}

/** The fountain: a jet from the top bowl, water spilling over its rim into the basin, and ripples on the basin. `splash` is 0..1 after a click. */
function drawFountain(ctx: CanvasRenderingContext2D, nozzle: Point, cameraX: number, time: number, splash: number): void {
  const nx = nozzle.x - cameraX;
  const height = JET_HEIGHT + JET_EXTRA * splash;
  for (let k = 0; k < JET_DROPS; k++) {
    const p = (time * 0.8 + k / JET_DROPS) % 1;
    const drift = ((k % 5) - 2) * (1 + splash);
    rect(ctx, k % 2 === 0 ? WATER_LIGHT : WATER, nx + drift * p * 3, nozzle.y - 4 * height * p * (1 - p), 1, 2);
  }
  for (let k = 0; k < SPILL_DROPS; k++) {
    const p = (time * 0.7 + k / SPILL_DROPS) % 1;
    const side = k % 2 === 0 ? 1 : -1;
    rect(ctx, k % 3 === 0 ? WATER_LIGHT : WATER, nx + side * (9 + (k % 3) * 2 + p * 3), nozzle.y + 1 + p * p * (BASIN_DROP - 2), 1, 2);
  }
  const waterRow = nozzle.y + BASIN_DROP;
  for (let r = 0; r < RIPPLES; r++) {
    const age = (time * 0.5 + r / RIPPLES) % 1;
    ctx.globalAlpha = 1 - age;
    for (let s = 0; s < RIPPLE_STEPS; s++) {
      const angle = (s / RIPPLE_STEPS) * Math.PI * 2;
      rect(ctx, WATER_LIGHT, nx + Math.cos(angle) * age * RIPPLE_REACH, waterRow + Math.sin(angle) * age * 2, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

/** One pigeon with its feet on (x, y); it pecks now and then. `seed` varies the beat. */
function drawPigeon(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seed: number): void {
  const pecking = Math.floor(time * 2 + seed * 9) % 5 === 0;
  rect(ctx, PIGEON_BODY, x, y - 4, 6, 3);
  rect(ctx, PIGEON_CHEST, x + 4, y - 4, 2, 2);
  rect(ctx, PIGEON_HEAD, x + 6, pecking ? y - 3 : y - 6, 2, 2);
  rect(ctx, '#e8c26a', x + 8, pecking ? y - 2 : y - 5, 1, 1);
  rect(ctx, PIGEON_HEAD, x - 2, y - 4, 2, 1);
  rect(ctx, '#c4584a', x + 2, y - 1, 1, 1);
  rect(ctx, '#c4584a', x + 4, y - 1, 1, 1);
}

/** Pigeons far up cross the sky by day, flapping between two wing poses. */
function drawFlyers(ctx: CanvasRenderingContext2D, time: number, night: number, width: number): void {
  if (night > 0.9) return;
  ctx.globalAlpha = 1 - night;
  const span = width + 2 * FLYER_MARGIN;
  for (let i = 0; i < FLYERS; i++) {
    const x = Math.round(((time * FLYER_SPEED + i * 71) % span) - FLYER_MARGIN);
    const y = SKY_ROW + i * 9 + Math.round(Math.sin(time * 0.5 + i * 2) * 3);
    const up = Math.floor(time * 3 + i) % 2 === 0;
    rect(ctx, PIGEON_HEAD, x - 2, y + (up ? -2 : 0), 1, 1);
    rect(ctx, PIGEON_HEAD, x - 1, y - 1, 3, 1);
    rect(ctx, PIGEON_HEAD, x + 2, y + (up ? -2 : 0), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** A page of newspaper tumbling along the road: it only shows while the wind is up. */
function drawPaper(ctx: CanvasRenderingContext2D, width: number, time: number): void {
  const alpha = ramp(PAPER_GUST_FROM, PAPER_GUST_FULL, gust(time));
  if (alpha <= 0) return;
  const x = ((time * PAPER_SPEED + 90) % (width + 80)) - 40;
  const y = PAPER_ROW - Math.abs(Math.sin(time * 3.2)) * 5;
  ctx.globalAlpha = alpha;
  if (Math.floor(time * 4) % 2 === 0) {
    rect(ctx, '#f1ecdc', x, y, 5, 2);
    rect(ctx, '#bfb7a2', x + 1, y, 3, 1);
  } else {
    rect(ctx, '#f1ecdc', x + 1, y - 2, 3, 4);
    rect(ctx, '#bfb7a2', x + 2, y - 1, 1, 2);
  }
  ctx.globalAlpha = 1;
}

/** Autumn-coloured leaves drift down through the street, swaying side to side, but skip the clock's box. */
function drawLeaves(ctx: CanvasRenderingContext2D, width: number, time: number): void {
  for (let i = 0; i < LEAVES; i++) {
    const fall = (time * 6 + i * 61) % (DESIGN_ROWS - 40);
    const x = Math.round((((i * 97 + time * 7) % width) + Math.sin(time * 0.8 + i) * 10 + width) % width);
    const y = 30 + fall;
    const inClock = x > width * CLOCK_FROM && x < width * CLOCK_TO && y > CLOCK_TOP && y < CLOCK_BOTTOM;
    if (!inClock) rect(ctx, LEAF_COLORS[i % LEAF_COLORS.length], x, y, 2, 1);
  }
}

/** One lantern: a wide faint halo, a tighter bright one and a hot core. `strength` is 0..1 and already includes the slow breathing. */
function drawLantern(ctx: CanvasRenderingContext2D, lamp: Point, cameraX: number, width: number, strength: number): void {
  const x = lamp.x - cameraX;
  if (x < -32 || x > width + 32) return;
  drawHalo(ctx, x, lamp.y, 30, LIGHT, strength * 0.8);
  drawHalo(ctx, x, lamp.y, 15, LIGHT, strength);
  rect(ctx, LIGHT_CORE, x - 1, lamp.y - 1, 3, 3);
}

/** Lamp and window lights of the evening, in the order they come on. */
function drawLights(ctx: CanvasRenderingContext2D, street: Street, cameraX: number, width: number, time: number, lit: number, siren: number): void {
  const breath = 1 + Math.sin(time * 1.1) * 0.04 + Math.sin(time * 0.37 + 1) * 0.03;
  for (const w of street.lit) {
    const x = w.x - cameraX;
    if (x + w.w < 0 || x > width) continue;
    const on = ramp(w.seed * 0.5, w.seed * 0.5 + 0.4, lit);
    if (on <= 0) continue;
    ctx.globalAlpha = on * 0.85;
    rect(ctx, w.seed > TV_SEED ? TV_BLUE : LIGHT, x, w.y, w.w, w.h);
    ctx.globalAlpha = 1;
    if (w.w >= WINDOW_HALO_MIN_WIDTH) drawHalo(ctx, x + w.w / 2, w.y + w.h / 2, 24, LIGHT, on * 0.4 * breath);
  }
  for (const lamp of street.lamps) drawLantern(ctx, lamp, cameraX, width, lit * breath);
  for (const lamp of street.wallLamps) drawLantern(ctx, lamp, cameraX, width, lit * breath);
  const neonX = street.neon.x - cameraX;
  if (neonX > -40 && neonX < width + 40) {
    const flicker = lit * (0.9 + 0.1 * Math.sin(time * 1.3));
    ctx.globalAlpha = flicker;
    drawText(ctx, 'DINER', neonX, street.neon.y, NEON);
    drawText(ctx, 'OPEN', street.open.x - cameraX, street.open.y, NEON_OPEN);
    ctx.globalAlpha = 1;
    drawHalo(ctx, neonX + textWidth('DINER') / 2, street.neon.y + 2, 22, NEON, flicker * 0.6);
    drawHalo(ctx, street.open.x - cameraX + textWidth('OPEN') / 2, street.open.y + 2, 11, NEON_OPEN, flicker * 0.5);
  }
  const chase = Math.floor(time / BULB_CHASE_SECONDS);
  for (let i = 0; i < street.bulbs.length; i++) {
    const x = street.bulbs[i].x - cameraX;
    if (x < -8 || x > width + 8 || (chase + i) % 3 === 0) continue;
    drawHalo(ctx, x, street.bulbs[i].y, 5, LIGHT, lit);
  }
  const barX = street.bar.x - cameraX;
  const flashing = lit > 0.3 || siren > 0;
  if (flashing && barX > -30 && barX < width + 30) {
    const beat = siren > 0 ? SIREN_FLASH_SECONDS : BAR_FLASH_SECONDS;
    const red = Math.floor(time / beat) % 2 === 0;
    const color = red ? BAR_RED : BAR_BLUE;
    rect(ctx, color, barX + (red ? -3 : 1), street.bar.y - 1, 3, 2);
    drawHalo(ctx, barX + (red ? -2 : 2), street.bar.y, 14, color, Math.max(lit, siren));
  }
}

export const buildTownWorld: WorldBuilder = (designWidth): ChapterWorld => {
  const diner = AT_DINER + Math.round(designWidth * DINER_SHARE);
  const patrol = AT_PATROL + Math.round(designWidth * PATROL_SHARE);
  const fountain = AT_FOUNTAIN + Math.round(designWidth * FOUNTAIN_SHARE);
  const worldWidth = Math.max(MIN_WORLD_WIDTH, AT_FOUNTAIN + WALK_AFTER_LAST + designWidth + WORLD_MARGIN);
  const places = placesFor(diner, patrol, fountain);
  const stripFor = (factor: number): number => stripWidth(worldWidth, factor, designWidth);
  const towerX = Math.round(designWidth * TOWER_SHARE) + TOWER_OFFSET;
  const layerOf = (canvas: HTMLCanvasElement, factor: number): WorldLayer => ({ canvas, factor });
  const ground = buildGround(worldWidth, { squareFrom: fountain - SQUARE_HALF, squareTo: fountain + SQUARE_HALF, crosswalk: patrol + CROSSWALK_DX });
  const layers: WorldLayer[] = [
    layerOf(buildFarHills(stripFor(FAR_FACTORS.hills), towerX), FAR_FACTORS.hills),
    layerOf(buildFarRoofs(stripFor(FAR_FACTORS.roofs), Math.round(designWidth * STEEPLE_SHARE)), FAR_FACTORS.roofs),
    layerOf(buildMidHouses(stripFor(FAR_FACTORS.houses)), FAR_FACTORS.houses),
    layerOf(buildBackRow(stripFor(FAR_FACTORS.gardens)), FAR_FACTORS.gardens),
    layerOf(ground, 1),
  ];
  const street = buildStreet(worldWidth, places);
  const trees: Tree[] = [places.hardware - 230, places.hardware - 120, (places.bakery + places.diner) / 2 - 6, places.post + 62]
    .filter((x) => x > TREE_REACH)
    .map((x, i) => ({ x, sprite: leafyTree(TREE_HEIGHTS[i % TREE_HEIGHTS.length], i, 0) }));
  const signs = street.signs.map((s) => buildHangingSign(s.kind));
  const pigeons: Point[] = [{ x: places.hardware - 90, y: 224 }, { x: places.diner - 100, y: 226 }, { x: places.fountain + 34, y: 230 }, { x: places.cinema + 22, y: 226 }, { x: places.sheriff - 60, y: 227 }];
  const peekBush = buildPeekBush();
  const peekX = AT_PATROL + Math.round(designWidth * PEEK_SHARE);
  let sirenAt = -100;
  let splashAt = -100;

  return {
    worldWidth,
    layers,
    stations: STATIONS,
    plan: buildPlan(designWidth, places),
    drawBehind(ctx, cameraX, time, night) {
      const left = Math.max(0, Math.min(Math.round(cameraX), worldWidth - designWidth));
      ctx.drawImage(street.canvas, left, 0, designWidth, DESIGN_ROWS, 0, 0, designWidth, DESIGN_ROWS);
      for (let i = 0; i < trees.length; i++) {
        const x = trees[i].x - cameraX;
        if (x > -TREE_REACH && x < designWidth + TREE_REACH) drawSwayTree(ctx, trees[i].sprite, x, TREE_BASE, time, TREE_SWAY);
      }
      for (let i = 0; i < signs.length; i++) {
        const swing = Math.round(breeze(time + i * 1.7, street.signs[i].x) * 1.2);
        ctx.drawImage(signs[i], Math.round(street.signs[i].x - cameraX + swing), street.signs[i].y);
      }
      drawBunting(ctx, street.lamps, cameraX, designWidth, time);
      drawSmoke(ctx, street.chimney, cameraX, time);
      drawFlag(ctx, street.flag, cameraX, time);
      drawFountain(ctx, street.nozzle, cameraX, time, Math.max(0, 1 - (time - splashAt) / SPLASH_SECONDS));
      for (let i = 0; i < pigeons.length; i++) {
        const x = pigeons[i].x - cameraX;
        if (x > -10 && x < designWidth + 10) drawPigeon(ctx, Math.round(x), pigeons[i].y, time, hash(i * 7.3));
      }
      drawFlyers(ctx, time, night, designWidth);
      drawPaper(ctx, designWidth, time);
      if (time - sirenAt < SIREN_SECONDS) {
        const x = street.carBox.x + street.carBox.w / 2 - textWidth(SIREN_TEXT) / 2 - cameraX;
        const y = street.carBox.y - 8 - Math.min(6, (time - sirenAt) * 10);
        drawText(ctx, SIREN_TEXT, x + 1, y + 1, '#2f2a3e');
        drawText(ctx, SIREN_TEXT, x, y, '#fff3c4');
      }
    },
    drawAhead(ctx, cameraX, time) {
      drawSwayTree(ctx, peekBush, peekX - cameraX, PEEK_BUSH_BASE, time, 1);
      drawLeaves(ctx, designWidth, time);
    },
    drawGlow(ctx, cameraX, time, night) {
      const lit = ramp(LIGHT_FROM, LIGHT_FULL, night);
      const siren = time - sirenAt < SIREN_SECONDS ? 1 : 0;
      if (lit > 0 || siren > 0) drawLights(ctx, street, cameraX, designWidth, time, lit, siren);
      if (lit > 0) {
        const beaconX = towerX - Math.round(cameraX * FAR_FACTORS.hills);
        if (beaconX > -10 && beaconX < designWidth + 10 && time % 2.4 < 0.5) drawHalo(ctx, beaconX, TOWER_BEACON_ROW, 8, BAR_RED, lit);
      }
    },
    press(x, y, time) {
      if (inside(x, y, street.carBox)) {
        sirenAt = time;
        return true;
      }
      if (inside(x, y, street.fountainBox)) {
        splashAt = time;
        return true;
      }
      return false;
    },
  };
};
