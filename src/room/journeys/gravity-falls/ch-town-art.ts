/**
 * Main Street, part one: where the street sits, the far-to-near strips (hills with the water tower, far rooftops,
 * middle houses, back gardens) and the paved ground the cast stands on. Everything is painted once when the chapter
 * is built; the shopfronts and the little things on the pavement are in ch-town-art2.ts.
 */
import { drawText } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ellipse, fenceRun, line, mix, polygon, rect, ridge, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { OUTLINE, emptyLights, paintHouseRow } from '../../landscapes/gravity-falls/town-buildings';
import { hash, noise } from '../noise';
import { DESIGN_ROWS } from './world';

/** Late-afternoon haze that far things sink into. */
export const HAZE = '#e3cbbd';
/** Rows: shop walls stand on SIDEWALK_TOP, the pavement ends at the curb, the road starts at ROAD_TOP. */
export const SIDEWALK_TOP = 216;
export const CURB_TOP = 230;
export const ROAD_TOP = 233;

const FAR_BASE = 200;
const MID_BASE = 210;
const BACK_TOP = 206;
const BACK_BASE = 214;
const SEED_GROUND = 12;
const SEED_BACK = 29;
const SEED_LEAF = 5;

/** The water tower: its feet stand on a mound at this row, the tank sits LEG_ROWS above, and the beacon on the roof tip. */
const TOWER_GROUND = 136;
const LEG_ROWS = 26;
const TANK_ROWS = 20;
const TANK_HALF = 15;
const TOWER_HAZE = 0.4;
const MOUND_HALF = 44;
const MOUND_DROP = 30;
const MOUND = '#bba5ae';
const ROOF_RISE = 9;
const BEACON_LIFT = 13;
/** Row of the red light on the tower's tip, for the dusk glow. */
export const TOWER_BEACON_ROW = TOWER_GROUND - LEG_ROWS - TANK_ROWS - BEACON_LIFT;

const FAR_HAZE_AMOUNT = 0.58;
const MID_HAZE_AMOUNT = 0.3;
const STEEPLE_HALF = 3;
const STEEPLE_ROWS = 30;
const SPIRE_ROWS = 8;

const LEAF = { dark: '#3d6b45', mid: '#5f8f52', light: '#9bbd62', trunk: '#6b4a3a', trunkShade: '#4a3228' };
/** The crowns of a street tree: sideways shift and height as shares of the crown, and size as a share of its half width. */
const LUMPS = [
  { dx: 0, dy: 0.5, r: 0.62 }, { dx: -0.5, dy: 0.62, r: 0.46 }, { dx: 0.5, dy: 0.62, r: 0.46 },
  { dx: -0.22, dy: 0.3, r: 0.44 }, { dx: 0.26, dy: 0.32, r: 0.4 },
] as const;
const CROWN_SHARE = 0.68;
const HALF_SHARE = 0.36;
const THICK_TRUNK_HEIGHT = 40;
const LEAF_FLECKS = 14;

const PAVEMENT = '#d9cfbf';
const PAVEMENT_DARK = '#b9ac9a';
const COBBLES = ['#cfc3b1', '#c2b5a3', '#d6ccbb', '#b9ac9b'] as const;
const CURB_LIGHT = '#eee4d3';
const CURB_FACE = '#b8a99a';
const ASPHALT = '#8c8493';
const ASPHALT_LIGHT = '#a39ba8';
const ASPHALT_DARK = '#6d6575';
const ZEBRA = '#efe6d0';
const SLAB = 16;
const COBBLE_W = 5;
const COBBLE_H = 3;
const ZEBRA_STRIPES = 9;
const ZEBRA_GAP = 6;
const ZEBRA_ROWS = 10;
const SHADOW_ROWS = 5;
const WEED_GAP = 38;
const MANHOLE_GAP = 190;

export interface GroundSpec {
  /** The cobbled square: from and to, in world pixels. */
  squareFrom: number;
  squareTo: number;
  /** Left end of the zebra crossing in front of the sheriff. */
  crosswalk: number;
}

/** Paints `paint` onto a scratch layer, washes it toward haze by `amount` and lays it on `ctx`: far things sink into the afternoon air. */
function hazed(ctx: Ctx, width: number, amount: number, paint: (c: Ctx) => void): void {
  const layer = memoryCanvas(width, DESIGN_ROWS);
  paint(layer.ctx);
  layer.ctx.globalCompositeOperation = 'source-atop';
  layer.ctx.globalAlpha = amount;
  layer.ctx.fillStyle = HAZE;
  layer.ctx.fillRect(0, 0, width, DESIGN_ROWS);
  ctx.drawImage(layer.canvas, 0, 0);
}

/** A broad-leaved street tree `height` rows tall, trunk foot at the bottom centre, `wash` (0..1) pulling it toward haze. Build once, draw with `drawSwayTree`. */
export function leafyTree(height: number, variant: number, wash: number): HTMLCanvasElement {
  const tone = (color: string): string => mix(color, HAZE, wash);
  const crown = Math.round(height * CROWN_SHARE);
  const half = Math.round(height * HALF_SHARE);
  const { canvas, ctx } = memoryCanvas(half * 2 + 3, height);
  const cx = half + 1;
  const trunkW = height >= THICK_TRUNK_HEIGHT ? 3 : 2;
  rect(ctx, tone(LEAF.trunk), cx - 1, crown - 4, trunkW, height - crown + 4);
  rect(ctx, tone(LEAF.trunkShade), cx + trunkW - 2, crown - 4, 1, height - crown + 4);
  const rand = seeded(variant + SEED_LEAF);
  const spots = LUMPS.map((l) => ({ x: cx + (l.dx + (rand() - 0.5) * 0.12) * half, y: l.dy * crown, rx: l.r * half, ry: l.r * half * 0.85 }));
  for (const s of spots) ellipse(ctx, tone(LEAF.dark), s.x + 1, s.y + 1, s.rx, s.ry);
  for (const s of spots) ellipse(ctx, tone(LEAF.mid), s.x, s.y, s.rx - 1, s.ry - 1);
  for (const s of spots) ellipse(ctx, tone(LEAF.light), s.x - s.rx * 0.3, s.y - s.ry * 0.3, s.rx * 0.5, s.ry * 0.45);
  ctx.globalCompositeOperation = 'source-atop';
  for (let py = 0; py < crown + 2; py++) {
    for (let px = cx + 1; px < cx + half + 2; px++) if (bayer(px, py) < 0.45) rect(ctx, tone(LEAF.dark), px, py, 1, 1);
  }
  for (let i = 0; i < LEAF_FLECKS; i++) rect(ctx, tone(LEAF.light), cx - half * 0.8 + rand() * half * 1.3, rand() * crown * 0.7, 2, 1);
  return canvas;
}

/** The water tower on its far hill: four braced legs, a banded tank with the town's name, a roof and a beacon pole. */
function paintTower(ctx: Ctx, cx: number): void {
  const wash = (color: string): string => mix(color, HAZE, TOWER_HAZE);
  const bottom = TOWER_GROUND - LEG_ROWS;
  const top = bottom - TANK_ROWS;
  const frame = wash('#6d5668');
  for (const [dx, spread] of [[-13, -4], [-4, -1], [4, 1], [13, 4]] as const) line(ctx, frame, cx + dx, bottom, cx + dx + spread, TOWER_GROUND);
  line(ctx, frame, cx - 13, bottom + 4, cx + 13, TOWER_GROUND - 4);
  line(ctx, frame, cx + 13, bottom + 4, cx - 13, TOWER_GROUND - 4);
  rect(ctx, frame, cx - TANK_HALF - 1, bottom, TANK_HALF * 2 + 3, 2);
  rect(ctx, frame, cx + 16, bottom, 1, LEG_ROWS);
  rect(ctx, wash('#d8b9a8'), cx - TANK_HALF, top, TANK_HALF * 2 + 1, TANK_ROWS);
  rect(ctx, wash('#f0dccb'), cx - TANK_HALF, top, 2, TANK_ROWS);
  rect(ctx, wash('#a98a88'), cx + TANK_HALF - 2, top, 3, TANK_ROWS);
  rect(ctx, wash('#8a7a86'), cx - TANK_HALF, top + 2, TANK_HALF * 2 + 1, 1);
  rect(ctx, wash('#8a7a86'), cx - TANK_HALF, top + TANK_ROWS - 2, TANK_HALF * 2 + 1, 1);
  drawText(ctx, 'GRAVITY', cx - 13, top + 4, wash(OUTLINE));
  drawText(ctx, 'FALLS', cx - 9, top + 11, wash(OUTLINE));
  polygon(ctx, wash('#8a5a6b'), [{ x: cx - TANK_HALF - 2, y: top + 1 }, { x: cx, y: top - ROOF_RISE }, { x: cx + TANK_HALF + 2, y: top + 1 }]);
  rect(ctx, frame, cx, top - BEACON_LIFT + 2, 1, BEACON_LIFT - ROOF_RISE + 1);
}

/** A rounded knoll of hill under the tower, joined to the far ridge, so the tower stands high above the street. */
function paintMound(ctx: Ctx, cx: number): void {
  for (let dx = -MOUND_HALF; dx <= MOUND_HALF; dx++) {
    const top = TOWER_GROUND + Math.round(((dx * dx) / (MOUND_HALF * MOUND_HALF)) * MOUND_DROP);
    rect(ctx, MOUND, cx + dx, top, 1, FAR_BASE - top);
    if (bayer(cx + dx, top) < 0.5) rect(ctx, mix(MOUND, '#ffffff', 0.25), cx + dx, top, 1, 1);
  }
}

/** Far hills sunk in haze with the water tower standing on one of them. `towerX` is the tower's centre in this strip. */
export function buildFarHills(width: number, towerX: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  ridge(ctx, width, { base: 190, top: 112, scale: 100, seed: 31, color: '#cdb3bd', mist: HAZE });
  ridge(ctx, width, { base: FAR_BASE, top: 138, scale: 58, seed: 8, color: MOUND, mist: HAZE });
  rect(ctx, mix(HAZE, MOUND, 0.45), 0, FAR_BASE, width, DESIGN_ROWS - FAR_BASE);
  paintMound(ctx, towerX);
  paintTower(ctx, towerX);
  return canvas;
}

/** A tall thin church tower with a clock face and a spire, for the far town. */
function paintSteeple(ctx: Ctx, x: number): void {
  const base = FAR_BASE;
  const width = STEEPLE_HALF * 2 + 1;
  rect(ctx, OUTLINE, x - STEEPLE_HALF - 1, base - STEEPLE_ROWS, width + 2, STEEPLE_ROWS + 1);
  rect(ctx, '#e8d9b8', x - STEEPLE_HALF, base - STEEPLE_ROWS + 1, width, STEEPLE_ROWS);
  rect(ctx, '#7a6a8a', x + 1, base - STEEPLE_ROWS + 1, STEEPLE_HALF, STEEPLE_ROWS);
  rect(ctx, '#f6f1e0', x - 1, base - 24, 3, 3);
  rect(ctx, OUTLINE, x, base - 23, 1, 1);
  for (let r = 0; r < SPIRE_ROWS; r++) {
    const spread = Math.floor(r / 2);
    rect(ctx, r % 2 ? '#8a5a6b' : OUTLINE, x - spread, base - STEEPLE_ROWS - SPIRE_ROWS + r, 1 + spread * 2, 1);
  }
}

/** The far town: a hazy row of small rooftops with a steeple at `steepleX`, on a solid haze floor so no sky shows beneath. */
export function buildFarRoofs(width: number, steepleX: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  rect(ctx, mix(HAZE, '#a98fa0', 0.45), 0, FAR_BASE - 2, width, DESIGN_ROWS - FAR_BASE + 2);
  hazed(ctx, width, FAR_HAZE_AMOUNT, (c) => {
    paintHouseRow(c, emptyLights(), FAR_BASE, 0, width, { minW: 9, maxW: 15, minH: 8, maxH: 14 }, 11);
    paintSteeple(c, steepleX);
  });
  return canvas;
}

/** The middle distance: pastel houses with chimneys and pitched roofs in the haze, with a few round trees among them. */
export function buildMidHouses(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  rect(ctx, mix(HAZE, '#9a8a98', 0.4), 0, MID_BASE - 2, width, DESIGN_ROWS - MID_BASE + 2);
  hazed(ctx, width, MID_HAZE_AMOUNT, (c) => paintHouseRow(c, emptyLights(), MID_BASE, -10, width, { minW: 16, maxW: 26, minH: 18, maxH: 30 }, 23));
  const rand = seeded(SEED_LEAF + 1);
  const tree = leafyTree(34, 2, 0.35);
  for (let x = 30; x < width; x += 90 + rand() * 80) ctx.drawImage(tree, Math.round(x), MID_BASE + 2 - tree.height);
  return canvas;
}

/** The back gardens seen through the gaps between shops: hedges, street trees and a pale picket fence on a solid green floor. */
export function buildBackRow(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(SEED_BACK);
  const trees = [0, 1, 2, 3].map((v) => leafyTree(46 + v * 6, v, 0.12));
  rect(ctx, '#46603f', 0, BACK_TOP, width, DESIGN_ROWS - BACK_TOP);
  for (let x = 0; x < width; x += 26 + rand() * 30) {
    ellipse(ctx, '#3d5a3a', x, BACK_TOP + 2, 16 + rand() * 8, 5);
    ellipse(ctx, '#5f8f52', x - 2, BACK_TOP, 11 + rand() * 5, 3);
  }
  for (let x = 10; x < width; x += 46 + rand() * 40) {
    const tree = trees[Math.floor(rand() * trees.length)];
    ctx.drawImage(tree, Math.round(x - tree.width / 2), BACK_BASE - tree.height);
  }
  fenceRun(ctx, 0, BACK_BASE, width, { wood: '#efe6d2', light: '#ffffff', dark: '#b9ad94' }, 8, 7);
  return canvas;
}

/** Stone slabs joined by thin seams, with scattered chips and a soft shadow under the shop fronts. */
function paintPavement(ctx: Ctx, width: number, rand: () => number): void {
  rect(ctx, PAVEMENT, 0, SIDEWALK_TOP, width, CURB_TOP - SIDEWALK_TOP);
  for (let x = 0; x < width; x += SLAB) rect(ctx, PAVEMENT_DARK, x, SIDEWALK_TOP, 1, CURB_TOP - SIDEWALK_TOP);
  rect(ctx, PAVEMENT_DARK, 0, SIDEWALK_TOP + 7, width, 1);
  for (let i = 0; i < width * 0.35; i++) rect(ctx, rand() < 0.5 ? CURB_LIGHT : PAVEMENT_DARK, rand() * width, SIDEWALK_TOP + 1 + rand() * (CURB_TOP - SIDEWALK_TOP - 2), 1 + (rand() < 0.3 ? 1 : 0), 1);
  ctx.fillStyle = '#9a8c7a';
  for (let r = 0; r < SHADOW_ROWS; r++) {
    for (let x = 0; x < width; x++) if (bayer(x, SIDEWALK_TOP + r) < 0.55 * (1 - r / SHADOW_ROWS)) ctx.fillRect(x, SIDEWALK_TOP + r, 1, 1);
  }
  for (let x = 20; x < width; x += WEED_GAP + rand() * WEED_GAP) {
    const y = SIDEWALK_TOP + 7;
    rect(ctx, LEAF.mid, x, y - 2, 1, 2);
    rect(ctx, LEAF.light, x + 1, y - 3, 1, 1);
    rect(ctx, LEAF.dark, x - 1, y - 1, 1, 1);
  }
}

/** The square: small staggered cobbles in four tones, and a darker ring of paving round the fountain. */
function paintSquare(ctx: Ctx, from: number, to: number): void {
  for (let y = SIDEWALK_TOP, row = 0; y < CURB_TOP; y += COBBLE_H, row++) {
    for (let x = from - (row % 2) * 2; x < to; x += COBBLE_W) {
      rect(ctx, COBBLES[Math.floor(hash(x * 1.3 + y * 7.1) * COBBLES.length)], x, y, COBBLE_W - 1, COBBLE_H - 1);
    }
  }
  const middle = (from + to) / 2;
  ellipse(ctx, PAVEMENT_DARK, middle, CURB_TOP - 3, 52, 4);
  ellipse(ctx, COBBLES[2], middle, CURB_TOP - 4, 49, 3);
}

/** The kerb and the asphalt: gutter leaves, tar cracks, manholes and the zebra crossing. Only rows down to about 242 are ever seen. */
function paintRoad(ctx: Ctx, width: number, spec: GroundSpec, rand: () => number): void {
  rect(ctx, CURB_LIGHT, 0, CURB_TOP, width, 1);
  rect(ctx, CURB_FACE, 0, CURB_TOP + 1, width, ROAD_TOP - CURB_TOP - 1);
  rect(ctx, ASPHALT_DARK, 0, ROAD_TOP, width, 1);
  rect(ctx, ASPHALT, 0, ROAD_TOP + 1, width, DESIGN_ROWS - ROAD_TOP - 1);
  for (let i = 0; i < width * 0.8; i++) rect(ctx, rand() < 0.5 ? ASPHALT_LIGHT : ASPHALT_DARK, rand() * width, ROAD_TOP + 1 + rand() * 14, 1, 1);
  for (let x = 0; x < width; x++) if (noise(x / 23 + 61) > 0.72) rect(ctx, ASPHALT_DARK, x, ROAD_TOP + 5 + Math.round(noise(x / 9) * 3), 1, 1);
  for (let x = 14; x < width; x += 41 + rand() * 30) rect(ctx, rand() < 0.5 ? '#c9a24a' : '#b0683f', x, ROAD_TOP + 1, 2 + (rand() < 0.4 ? 1 : 0), 1);
  for (let x = MANHOLE_GAP / 2; x < width; x += MANHOLE_GAP) {
    ellipse(ctx, ASPHALT_DARK, x, ROAD_TOP + 7, 5, 1);
    rect(ctx, ASPHALT_LIGHT, x - 3, ROAD_TOP + 7, 6, 1);
  }
  for (let i = 0; i < ZEBRA_STRIPES; i++) rect(ctx, ZEBRA, spec.crosswalk + i * ZEBRA_GAP, ROAD_TOP + 1, 3, ZEBRA_ROWS);
}

/** The ground the cast stands on: pavement, the cobbled square, the kerb and the road. */
export function buildGround(width: number, spec: GroundSpec): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(SEED_GROUND);
  paintPavement(ctx, width, rand);
  paintSquare(ctx, spec.squareFrom, spec.squareTo);
  paintRoad(ctx, width, spec, rand);
  return canvas;
}
