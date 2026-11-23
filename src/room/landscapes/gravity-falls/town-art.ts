/**
 * The painted picture of Water Tower Hill, built once per size: hazy far hills and far rooftops, the meadow, the
 * grassy hill under the tower, the winding street, every building and prop, plus the small ground detail. The
 * swaying trees and the foreground frame are built here too. Painting order is back to front.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ditherFill, ellipse, mix, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_FOREST, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import { hash, noise } from '../../journeys/noise';
import { DESIGN_HEIGHT } from './scene-art';
import { OUTLINE, emptyLights, paintHouseRow, paintShop, type TownLights } from './town-buildings';
import { paintCart, paintDiner, paintPatrolCar, paintSheriff } from './town-landmarks';
import { FAR_BASE, MEADOW_TOP, MID_BASE, SHOP_BASE, DINER_BASE, SHERIFF_BASE, hillHeight, type TownLayout } from './town-layout';
import { paintBoard, paintBush, paintHedge, paintLamps, paintStreetBits, paintTower, type LampLights } from './town-props';

const HAZE = '#dccbc6';
const GRASS = { base: '#9bb061', dark: '#6f8c55', light: '#c2c779' } as const;
const HILL = { base: '#a8b064', dark: '#7f9658', light: '#d0d085' } as const;
const ROAD = { body: '#cdbfa5', shoulder: '#b09c82', dash: '#f2e6bf' } as const;
const PAVEMENT = '#d7cdbd';
const STONE = { base: '#9a948a', light: '#c5beb0', dark: '#5f5a55' } as const;
const FLOWERS = ['#f2d24a', '#f6f2e0', '#b28ad8', '#f08aa8'];
const FAR_ROW = { minW: 8, maxW: 14, minH: 7, maxH: 12 };
const MID_ROW = { minW: 12, maxW: 20, minH: 12, maxH: 18 };
const FAR_HAZE = 0.62;
const MID_HAZE = 0.28;
/** How many rows the road shrinks for each row it climbs into the distance, and its width at the horizon. */
const ROAD_TAPER = 0.085;
const ROAD_FAR_Y = 170;
const ROAD_MIN_R = 2;
/** The road's ellipses are this much flatter than wide, as a street seen from above at a slant. */
const ROAD_SQUASH = 0.55;
const DASH_EVERY = 9;
const CREST_ROWS = 14;
const FLOWER_COUNT = 70;
const GROUND_ROWS_FROM = 233;
const GROUND_ROWS_TO = 243;
const SPIRE_ROWS = 8;
/** Where the church tower stands, as a share of the width: left of the clock so its dark roof stays out of that box. */
const STEEPLE_AT = 0.22;
/** Hill columns whose surface is lower than this row are left to the meadow, so the hill has no hard edge far from its top. */
const HILL_VISIBLE_ABOVE = 230;
/** The frame hides the sides; flowers and stones stay inside this share of the width. */
const EDGE = 0.085;

export interface TownStatics {
  lights: TownLights;
  lamps: LampLights;
}

/** Draws `paint` into a scratch layer, washes it toward haze, and lays it on `ctx`: far things sink into the afternoon air. */
function hazed(ctx: Ctx, width: number, amount: number, paint: (c: Ctx) => void): void {
  const layer = memoryCanvas(width, DESIGN_HEIGHT);
  layer.ctx.imageSmoothingEnabled = false;
  paint(layer.ctx);
  layer.ctx.globalCompositeOperation = 'source-atop';
  layer.ctx.globalAlpha = amount;
  layer.ctx.fillStyle = HAZE;
  layer.ctx.fillRect(0, 0, width, DESIGN_HEIGHT);
  ctx.drawImage(layer.canvas, 0, 0);
}

/** A tall thin church tower among the far roofs, so the distant town has a landmark. */
function paintSteeple(ctx: Ctx, x: number): void {
  rect(ctx, OUTLINE, x - 1, FAR_BASE - 30, 7, 31);
  rect(ctx, '#e8d9b8', x, FAR_BASE - 29, 5, 29);
  rect(ctx, '#7a6a8a', x + 3, FAR_BASE - 29, 2, 29);
  rect(ctx, OUTLINE, x + 1, FAR_BASE - 24, 3, 4);
  rect(ctx, '#f2d24a', x + 2, FAR_BASE - 23, 1, 2);
  for (let r = 0; r < SPIRE_ROWS; r++) {
    const half = Math.floor(r / 2);
    rect(ctx, r % 2 ? '#8a5a6b' : OUTLINE, x + 2 - half, FAR_BASE - 30 - SPIRE_ROWS + r, 1 + half * 2, 1);
  }
}

/** Hills, far hazy rooftops, the meadow and the row of middle houses. */
function paintDistance(ctx: Ctx, layout: TownLayout, lights: TownLights): void {
  const { width } = layout;
  ridge(ctx, width, { base: 184, top: 128, scale: 95, seed: 21, color: '#cdb6bf', mist: HAZE });
  ridge(ctx, width, { base: 194, top: 150, scale: 60, seed: 5, color: '#bda8b0', mist: '#d4c2bb' });
  const far = emptyLights();
  hazed(ctx, width, FAR_HAZE, (c) => {
    paintHouseRow(c, far, FAR_BASE, -4, width, FAR_ROW, 11);
    paintSteeple(c, Math.round(width * STEEPLE_AT));
  });
  lights.windows.push(...far.windows);
  for (let x = 0; x < width; x++) {
    const top = MEADOW_TOP + Math.round(noise(x / 35 + 4) * 4);
    rect(ctx, GRASS.base, x, top, 1, DESIGN_HEIGHT - top);
    if (hash(x * 1.9) < 0.4) rect(ctx, GRASS.light, x, top, 1, 1);
  }
  ditherFill(ctx, 0, MEADOW_TOP + 2, width, 6, GRASS.base, GRASS.light, 0.3);
  for (let y = MEADOW_TOP + 14; y < DESIGN_HEIGHT; y += 9) ditherFill(ctx, 0, y, width, 3, GRASS.base, GRASS.dark, 0.2);
  const mid = emptyLights();
  hazed(ctx, width, MID_HAZE, (c) => paintHouseRow(c, mid, MID_BASE, 2, Math.round(width * 0.62), MID_ROW, 7));
  lights.windows.push(...mid.windows);
}

/** The grassy hill: a lit crest, a dithered shadow side facing the town and a few stones and flowers. */
function paintHill(ctx: Ctx, layout: TownLayout): void {
  const { width } = layout;
  for (let x = 0; x < width; x++) {
    const top = hillHeight(width, x);
    if (top > HILL_VISIBLE_ABOVE) continue;
    rect(ctx, HILL.base, x, top, 1, DESIGN_HEIGHT - top);
    rect(ctx, HILL.light, x, top, 1, 1);
    const level = x > layout.tower.x ? 0.4 : 0.15;
    for (let y = top + 1; y < top + CREST_ROWS; y++) if (bayer(x, y) < level * (1 - (y - top) / CREST_ROWS)) rect(ctx, HILL.light, x, y, 1, 1);
    for (let y = top + 6; y < Math.min(DESIGN_HEIGHT, top + 40); y++) if (bayer(x, y) < 0.12) rect(ctx, HILL.dark, x, y, 1, 1);
  }
  const rand = seeded(9);
  for (let i = 0; i < 10; i++) {
    const x = Math.round(layout.tower.x + (rand() - 0.5) * width * 0.3);
    ctx.drawImage(rock(3 + Math.round(rand() * 3), 3, i, STONE), x, hillHeight(width, x) + 5 + Math.round(rand() * 10));
  }
}

/** The winding street: pale road on a darker shoulder that narrows into the distance, with a dashed centre line. */
function paintRoad(ctx: Ctx, layout: TownLayout): void {
  const radius = (y: number): number => Math.max(ROAD_MIN_R, Math.round(1 + (y - ROAD_FAR_Y) * ROAD_TAPER));
  const dab = (x: number, y: number, extra: number, color: string): void => ellipse(ctx, color, x, y, radius(y) + extra, (radius(y) + extra) * ROAD_SQUASH);
  const walk = (visit: (x: number, y: number, step: number) => void): void => {
    let step = 0;
    layout.road.forEach((a, i) => {
      const b = layout.road[i + 1];
      if (!b) return;
      const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      for (let k = 0; k < n; k++) visit(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, step++);
    });
  };
  walk((x, y) => dab(x, y, 1, ROAD.shoulder));
  walk((x, y) => dab(x, y, 0, ROAD.body));
  walk((x, y, step) => {
    if (step % DASH_EVERY < 4 && radius(y) > 4) rect(ctx, ROAD.dash, x, y, 2, 1);
  });
}

/** Pavement strips under the shops and the diner, then every building in order, then the props. */
function paintTown(ctx: Ctx, layout: TownLayout, lights: TownLights): LampLights {
  const { diner, sheriff } = layout;
  rect(ctx, PAVEMENT, diner.x - 6, SHOP_BASE, sheriff.x - diner.x + 6, 3);
  rect(ctx, PAVEMENT, diner.x - 6, DINER_BASE, diner.w + 12, 2);
  rect(ctx, PAVEMENT, sheriff.x - 4, SHERIFF_BASE, sheriff.w + 8, 2);
  layout.shops.forEach((shop) => paintShop(ctx, lights, shop));
  paintDiner(ctx, lights, diner);
  paintSheriff(ctx, lights, sheriff);
  paintStreetBits(ctx, layout);
  paintHedge(ctx, layout);
  paintBush(ctx, layout);
  const lamps = paintLamps(ctx, layout);
  paintPatrolCar(ctx, layout.patrol);
  paintCart(ctx, layout.cart);
  return lamps;
}

/** Wildflowers, dandelion heads and pebbles on the grass in front of the street, clear of the sides and the radio. */
function paintGroundDetail(ctx: Ctx, layout: TownLayout): void {
  const { width } = layout;
  const rand = seeded(31);
  for (let i = 0; i < FLOWER_COUNT; i++) {
    const x = Math.round(width * (EDGE + rand() * (1 - EDGE * 2)));
    const y = GROUND_ROWS_FROM + Math.round(rand() * (GROUND_ROWS_TO - GROUND_ROWS_FROM));
    rect(ctx, GRASS.dark, x, y, 1, 3);
    rect(ctx, FLOWERS[i % FLOWERS.length], x - 1, y - 1, 3, 1);
    rect(ctx, '#fff3a8', x, y - 1, 1, 1);
  }
  for (let i = 0; i < 12; i++) {
    const x = Math.round(width * (EDGE + rand() * (1 - EDGE * 2)));
    ctx.drawImage(rock(3 + Math.round(rand() * 2), 2, i, STONE), x, GROUND_ROWS_FROM + 2 + Math.round(rand() * 8));
  }
}

/** Paints the whole static picture into the back layer and returns the lights the glow needs. */
export function paintTownBack(ctx: Ctx, layout: TownLayout): TownStatics {
  const lights = emptyLights();
  paintDistance(ctx, layout, lights);
  paintHill(ctx, layout);
  paintRoad(ctx, layout);
  paintTower(ctx, layout);
  paintBoard(ctx, layout);
  const lamps = paintTown(ctx, layout, lights);
  paintGroundDetail(ctx, layout);
  return { lights, lamps };
}

export interface SwayTree {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  amount: number;
}

const LEAF = { dark: '#3d6a45', mid: '#5f9450', light: '#9fc468', trunk: '#6b4636' } as const;
const TREE_BLOBS: readonly (readonly [number, number, number])[] = [[0, 0.35, 0.34], [-0.26, 0.55, 0.26], [0.26, 0.55, 0.26], [0, 0.18, 0.26]];
const TREE_SPOTS: readonly (readonly [number, number, number])[] = [[0.285, 32, 223], [0.5, 26, 208], [0.6, 30, 212]];
const PINE_SPOTS: readonly (readonly [number, number, number, number])[] = [[0.11, 32, 185, 0], [0.19, 38, 186, 1], [0.52, 26, 187, 3], [0.58, 30, 188, 2]];
const TREE_SWAY = 1.5;
const PINE_SWAY = 1;
const PINE_HAZE = 0.4;
const TREE_HAZE = 0.12;

/** A round-crowned street tree, `height` rows tall: trunk foot at the bottom centre, crown of overlapping blobs with a lit top-left. */
function leafyTree(height: number, tint: number): HTMLCanvasElement {
  const w = Math.round(height * 0.9);
  const { canvas, ctx } = memoryCanvas(w, height);
  const cx = Math.floor(w / 2);
  const mid = mix(LEAF.mid, HAZE, tint);
  const dark = mix(LEAF.dark, HAZE, tint);
  const light = mix(LEAF.light, HAZE, tint);
  rect(ctx, LEAF.trunk, cx - 1, Math.round(height * 0.5), 2, Math.round(height * 0.5));
  rect(ctx, '#3d2a22', cx, Math.round(height * 0.5), 1, Math.round(height * 0.5));
  for (const [dx, dy, r] of TREE_BLOBS) ellipse(ctx, dark, cx + dx * w, height * dy + 1, r * w, r * w * 0.85);
  for (const [dx, dy, r] of TREE_BLOBS) ellipse(ctx, mid, cx + dx * w - 1, height * dy, r * w - 1, r * w * 0.8);
  for (const [dx, dy, r] of TREE_BLOBS) {
    ellipse(ctx, light, cx + dx * w - r * w * 0.3, height * dy - r * w * 0.35, r * w * 0.35, r * w * 0.22);
  }
  ctx.globalCompositeOperation = 'source-atop';
  ditherFill(ctx, Math.round(w * 0.55), Math.round(height * 0.35), Math.ceil(w * 0.45), Math.round(height * 0.45), mid, dark, 0.45);
  return canvas;
}

/** The swaying trees: round street trees among the buildings and hazy pines on the far slope behind them. */
export function buildTrees(width: number): SwayTree[] {
  const hazyPine = fadePalette(PINE_FOREST, HAZE, PINE_HAZE);
  const pines = PINE_SPOTS.map(([share, height, foot, variant]) => ({ sprite: pineTree(variant, height, hazyPine), x: Math.round(share * width), y: foot, amount: PINE_SWAY }));
  const trees = TREE_SPOTS.map(([share, height, foot]) => ({ sprite: leafyTree(height, TREE_HAZE), x: Math.round(share * width), y: foot, amount: TREE_SWAY }));
  return [...pines, ...trees];
}
