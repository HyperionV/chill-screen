/**
 * Journey chapter 1, "Morning at the Shack": a warm, sun-baked walk along the gravel road, past the lot and the golf
 * cart, along the Shack's long front and round the side to the woodpile, the laundry line, the water barrel and the
 * shed. This file puts the strips, the moving parts, the lights, the cast's places and the clues together; the
 * pictures themselves are painted in ch-shack-art.ts and ch-shack-art2.ts.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { drawHalo, ellipse, rect, seeded } from '../../gravity-falls/art-kit';
import { PINE_FOREST, PINE_VARIANTS, buildGrass, drawGrass, drawSwayTree, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import type { Clue, PerformerHome, Point, ScenePlan } from '../../gravity-falls/types';
import { SHACK } from '../../landscapes/gravity-falls/shack-art';
import { breeze, gust } from '../../wind';
import { hash, ramp } from '../noise';
import { HAZE, X, buildGround, buildHedge, buildHills, buildTreeLine, stripWidth } from './ch-shack-art';
import { anchorsFor, paintProps, type Anchors } from './ch-shack-art2';
import { DESIGN_ROWS, type ChapterWorld, type Station, type WorldBuilder, type WorldLayer } from './world';

/** Camera x where the walk rests at the porch and at the woodpile (9 px a second from the start, and from the porch). */
const AT_PORCH = 353;
const AT_WOODPILE = 749;
const STATIONS: readonly Station[] = [
  { at: AT_PORCH, from: 0.18, to: 0.4 },
  { at: AT_WOODPILE, from: 0.6, to: 0.82 },
];
/** The camera still walks this far after the woodpile pause before the chapter ends (9 px a second for 43 s). */
const WALK_AFTER_LAST = 372;
/** Station locals stand this share of the view width right of the camera; the porch centre sits at the same place. */
const LOCAL_SHARE = 0.8;
const MIN_WORLD_WIDTH = 1800;
const WORLD_MARGIN = 40;
const FAR_FACTORS = { hills: 0.15, farTrees: 0.3, midTrees: 0.5, hedge: 0.75 } as const;

/** The party (dipper, mabel, waddles) keeps these shares of the view width right of the camera. */
const PARTY_SHARES = [{ id: 'dipper', share: 0.12, y: 233 }, { id: 'mabel', share: 0.2, y: 235 }, { id: 'waddles', share: 0.26, y: 237 }] as const;
const SPOT_SHARES = [0.68, 0.8, 0.92] as const;
const SPOT_ROWS = [234, 236, 234] as const;
const CLUE_SIZE = 12;

/** Big swaying pines standing on the verge behind the lot (they scroll at the hedge's speed). */
const TREE_GAP = 88;
const TREE_MIN = 62;
const TREE_MAX = 80;
const TREE_BASE = 217;
const TREE_SWAY = 2;
const TREE_REACH = 50;

/** Chimney smoke. */
const PUFFS = 7;
const PUFF_SECONDS = 9;
const PUFF_RISE = 34;
const SMOKE = '#efeae0';

/** Birds cross the high sky by day; each has two wing poses (offsets from its body pixel). */
const BIRD_COUNT = 4;
const BIRD_SPEED = 6;
const BIRD_MARGIN = 40;
const WINGS_UP: readonly (readonly [number, number])[] = [[-2, -2], [-1, -1], [0, 0], [1, -1], [2, -2]];
const WINGS_FLAT: readonly (readonly [number, number])[] = [[-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0]];

/** Butterflies loop over the verge: offsets from the porch centre, a row and a wing colour. */
const BUTTERFLIES = [{ dx: -190, y: 214, wing: '#f4d35e' }, { dx: 270, y: 212, wing: '#e58fb0' }, { dx: 520, y: 215, wing: '#8ab4e8' }] as const;

/** The laundry: where each piece hangs along the line (0..1), its size and colours. */
const CLOTHES = [
  { at: 0.12, w: 8, h: 11, color: SHACK.red, shade: '#8a2a2e' },
  { at: 0.3, w: 7, h: 14, color: '#4a6fa5', shade: '#34507a' },
  { at: 0.52, w: 14, h: 16, color: SHACK.cream, shade: '#bfae8a' },
  { at: 0.74, w: 4, h: 6, color: '#7fb85a', shade: '#4f8a3a' },
  { at: 0.88, w: 9, h: 11, color: SHACK.trim, shade: SHACK.trimDark },
] as const;
const CLOTH_SWAY = 3;

/** Wind chimes: five tubes of these lengths, spaced 3 px, swinging in the breeze and when clicked. */
const TUBES = [9, 12, 8, 11, 7] as const;
const TUBE_GAP = 3;
const RING_SECONDS = 4;
const HONK_SECONDS = 1.3;
const HONK_TEXT = 'BEEP BEEP!';
const HIT_PAD = 2;

/** Dusk lights: they come up between these two levels of `night` and breathe very slowly. */
const LIGHT_FROM = 0.1;
const LIGHT_FULL = 0.6;
const LIGHT = '#ffcf6e';
const LIGHT_CORE = '#ffe9b0';

const FOREGROUND_GAP = 30;
const FOREGROUND_ROW = 241;
const PEEK_BUSH_X = 700;
const PEEK_BUSH_BASE = 234;

interface Tree {
  x: number;
  sprite: HTMLCanvasElement;
}

/** Whole-pixel box test in world pixels. */
function inside(x: number, y: number, box: { x: number; y: number; w: number; h: number }): boolean {
  return x >= box.x - HIT_PAD && x <= box.x + box.w + HIT_PAD && y >= box.y - HIT_PAD && y <= box.y + box.h + HIT_PAD;
}

function buildPeekBush(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(30, 15);
  ellipse(ctx, '#27432f', 15, 9, 14, 5);
  ellipse(ctx, '#27432f', 9, 7, 8, 6);
  ellipse(ctx, '#27432f', 21, 8, 8, 5);
  ellipse(ctx, '#3d6a45', 14, 8, 11, 4);
  ellipse(ctx, '#3d6a45', 8, 6, 6, 4);
  for (const [fx, fy] of [[6, 3], [10, 2], [20, 4], [14, 6], [24, 7]]) rect(ctx, '#8fb85f', fx, fy, 2, 1);
  return canvas;
}

function buildTrees(width: number, rand: () => number): Tree[] {
  const palette = fadePalette(PINE_FOREST, HAZE, 0.25);
  const trees: Tree[] = [];
  for (let x = 30; x < width; x += TREE_GAP * (0.7 + rand() * 0.6)) {
    const size = Math.round(TREE_MIN + rand() * (TREE_MAX - TREE_MIN));
    trees.push({ x, sprite: pineTree(Math.floor(rand() * PINE_VARIANTS), size, palette) });
  }
  return trees;
}

function buildTufts(worldWidth: number): number[] {
  const tufts: number[] = [];
  for (let x = 10; x < worldWidth; x += FOREGROUND_GAP * (1 + hash(x * 0.37))) tufts.push(x);
  return tufts;
}

/** The people's places, the meeting spots and the four clues, all in world pixels. */
function buildPlan(width: number, pc: number): ScenePlan {
  const homes: PerformerHome[] = [
    { id: 'stan', x: AT_PORCH + Math.round(width * 0.7), y: 227, facing: -1 },
    { id: 'soos', x: AT_PORCH + Math.round(width * 0.86), y: 229, facing: -1 },
    { id: 'wendy', x: AT_WOODPILE + Math.round(width * 0.78), y: 230, facing: -1 },
    ...PARTY_SHARES.map((p): PerformerHome => ({ id: p.id, x: Math.round(width * p.share), y: p.y, facing: 1, followDx: Math.round(width * p.share) })),
  ];
  const spots: Point[] = [AT_PORCH, AT_WOODPILE].flatMap((at) => SPOT_SHARES.map((share, i) => ({ x: at + Math.round(width * share), y: SPOT_ROWS[i] })));
  const clue = (id: string, kind: Clue['kind'], dx: number, y: number): Clue => ({ id, kind, place: 'shack', x: pc + dx, y, w: CLUE_SIZE, h: CLUE_SIZE });
  const clues: Clue[] = [
    clue('shack-symbol', 'symbol', -96, 200),
    clue('shack-note', 'note', X.cart - 8, 213),
    clue('shack-page', 'page', X.woodpile - 6, 205),
    clue('shack-peek', 'peek', PEEK_BUSH_X, 218),
  ];
  return { homes, spots, clues };
}

function drawSmoke(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  for (let i = 0; i < PUFFS; i++) {
    const age = (time / PUFF_SECONDS + i / PUFFS) % 1;
    const size = 2 + Math.floor(age * 3);
    ctx.globalAlpha = 0.55 * (1 - age);
    rect(ctx, SMOKE, x + (3 + gust(time) * 9) * age + breeze(time + i, x) * 2 * age - size / 2, y - age * PUFF_RISE, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawBirds(ctx: CanvasRenderingContext2D, time: number, night: number, width: number): void {
  if (night > 0.9) return;
  ctx.globalAlpha = 1 - night;
  ctx.fillStyle = '#3b3b40';
  const span = width + 2 * BIRD_MARGIN;
  for (let i = 0; i < BIRD_COUNT; i++) {
    const x = Math.round(((time * BIRD_SPEED + i * 53) % span) - BIRD_MARGIN);
    const y = 64 + i * 8 + Math.round(Math.sin(time * 0.6 + i * 2) * 3);
    const pose = Math.floor(time * 2.5 + i) % 2 === 0 ? WINGS_UP : WINGS_FLAT;
    for (let k = 0; k < pose.length; k++) ctx.fillRect(x + pose[k][0], y + pose[k][1], 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawButterflies(ctx: CanvasRenderingContext2D, pc: number, cameraX: number, time: number, night: number): void {
  if (night > 0.7) return;
  ctx.globalAlpha = 1 - night;
  for (let i = 0; i < BUTTERFLIES.length; i++) {
    const b = BUTTERFLIES[i];
    const x = pc + b.dx + Math.sin(time * 0.35 + i * 2) * 18 - cameraX;
    const y = b.y + Math.sin(time * 0.9 + i) * 5;
    rect(ctx, '#4a2f20', x, y - 1, 1, 2);
    if (Math.floor(time * 3 + i) % 2 === 0) {
      rect(ctx, b.wing, x - 2, y - 1, 2, 2);
      rect(ctx, b.wing, x + 1, y - 1, 2, 2);
    } else {
      rect(ctx, b.wing, x, y - 1, 1, 2);
    }
  }
  ctx.globalAlpha = 1;
}

/** The washing: each piece hangs from the line and blows out at its hem with the wind, in whole pixels. */
function drawClothes(ctx: CanvasRenderingContext2D, laundry: Anchors['laundry'], cameraX: number, time: number): void {
  const span = laundry.x1 - laundry.x0;
  for (let i = 0; i < CLOTHES.length; i++) {
    const c = CLOTHES[i];
    const x = laundry.x0 + span * c.at;
    const top = laundry.y + 3 * Math.sin(Math.PI * c.at) + 1;
    const lean = breeze(time, x) * CLOTH_SWAY;
    for (let r = 0; r < c.h; r++) {
      const shift = lean * (r / c.h);
      rect(ctx, r >= c.h - 2 ? c.shade : c.color, x - c.w / 2 + shift - cameraX, top + r, c.w, 1);
      rect(ctx, c.shade, x + c.w / 2 - 1 + shift - cameraX, top + r, 1, 1);
    }
    rect(ctx, '#6e4a2e', x - cameraX, top - 1, 1, 2);
  }
}

function drawChimes(ctx: CanvasRenderingContext2D, anchor: Point, cameraX: number, time: number, ringAge: number): void {
  const ring = ringAge < RING_SECONDS ? 1 - ringAge / RING_SECONDS : 0;
  const x = anchor.x - cameraX;
  rect(ctx, '#6e4a2e', x - 7, anchor.y, 15, 1);
  for (let i = 0; i < TUBES.length; i++) {
    const swing = breeze(time + i * 0.7, x) * 1.5 + ring * 2.5 * Math.sin(ringAge * 9 + i);
    const tx = x - 6 + i * TUBE_GAP;
    const half = Math.floor(TUBES[i] / 2);
    rect(ctx, '#cfd8dc', tx, anchor.y + 1, 1, half);
    rect(ctx, '#8a949a', tx + Math.round(swing), anchor.y + 1 + half, 1, TUBES[i] - half);
  }
}

function drawHonk(ctx: CanvasRenderingContext2D, cart: Anchors['cart'], cameraX: number, age: number): void {
  const x = cart.x + cart.w / 2 - textWidth(HONK_TEXT) / 2 - cameraX;
  const y = cart.y - 8 - Math.min(6, age * 10);
  drawText(ctx, HONK_TEXT, x + 1, y + 1, SHACK.outline);
  drawText(ctx, HONK_TEXT, x, y, '#fff3c4');
}

/** Every light of the place at dusk: the side window, the gift shop, the porch lantern, the soda machine and the sign bulbs. */
function drawLights(ctx: CanvasRenderingContext2D, a: Anchors, cameraX: number, time: number, lit: number): void {
  const breath = 1 + Math.sin(time * 1.1) * 0.04 + Math.sin(time * 0.37 + 1) * 0.03;
  const side = a.sideWindow;
  const shop = a.shopWindow;
  const glass = a.vendingGlass;
  ctx.globalAlpha = lit * 0.85;
  rect(ctx, LIGHT, side.x - cameraX, side.y, side.w, side.h);
  ctx.globalAlpha = lit * 0.6;
  rect(ctx, LIGHT, shop.x - cameraX, shop.y, shop.w, shop.h);
  rect(ctx, '#bfe6ff', glass.x - cameraX, glass.y, glass.w, glass.h);
  ctx.globalAlpha = 1;
  const strength = lit * breath;
  drawHalo(ctx, side.x + side.w / 2 - cameraX, side.y + side.h / 2, 56, LIGHT, strength * 0.5);
  drawHalo(ctx, side.x + side.w / 2 - cameraX, side.y + side.h / 2, 32, LIGHT, strength * 0.9);
  drawHalo(ctx, shop.x + shop.w / 2 - cameraX, shop.y + shop.h / 2, 36, LIGHT, strength * 0.6);
  drawHalo(ctx, a.lantern.x - cameraX, a.lantern.y, 28, LIGHT, strength);
  rect(ctx, LIGHT_CORE, a.lantern.x - 1 - cameraX, a.lantern.y - 1, 3, 3);
  drawHalo(ctx, glass.x + glass.w / 2 - cameraX, glass.y + glass.h / 2, 30, '#bfe6ff', strength * 0.5);
  for (let bx = a.sign.x + 4; bx < a.sign.x + a.sign.w - 2; bx += 9) {
    drawHalo(ctx, bx + 1 - cameraX, a.sign.y - 2, 7, LIGHT, strength);
    rect(ctx, LIGHT_CORE, bx - cameraX, a.sign.y - 3, 2, 2);
  }
}

export const buildShackWorld: WorldBuilder = (designWidth): ChapterWorld => {
  const pc = AT_PORCH + Math.round(designWidth * LOCAL_SHARE);
  const worldWidth = Math.max(MIN_WORLD_WIDTH, AT_WOODPILE + WALK_AFTER_LAST + designWidth + WORLD_MARGIN);
  const scale = designWidth >= 300 ? 2 : 1;
  const anchors = anchorsFor(pc, scale);
  const layerOf = (canvas: HTMLCanvasElement, factor: number): WorldLayer => ({ canvas, factor });
  const stripFor = (factor: number): number => stripWidth(worldWidth, factor, designWidth);
  const layers: WorldLayer[] = [
    layerOf(buildHills(stripFor(FAR_FACTORS.hills)), FAR_FACTORS.hills),
    layerOf(buildTreeLine(stripFor(FAR_FACTORS.farTrees), { base: 208, sizeMin: 26, sizeMax: 40, gap: 15, fade: 0.6, seed: 5 }), FAR_FACTORS.farTrees),
    layerOf(buildTreeLine(stripFor(FAR_FACTORS.midTrees), { base: 214, sizeMin: 52, sizeMax: 80, gap: 40, fade: 0.4, seed: 9 }), FAR_FACTORS.midTrees),
    layerOf(buildHedge(stripFor(FAR_FACTORS.hedge)), FAR_FACTORS.hedge),
    layerOf(buildGround(worldWidth), 1),
  ];
  const props = paintProps(worldWidth, pc, scale);
  const trees = buildTrees(stripFor(FAR_FACTORS.hedge), seeded(23));
  const tufts = buildTufts(worldWidth);
  const grass = buildGrass('#7d8a3e', '#c9c96a');
  const peekBush = buildPeekBush();
  const chimesBox = { x: anchors.chimes.x - 8, y: anchors.chimes.y, w: 16, h: 16 };
  let honkAt = -100;
  let ringAt = -100;

  return {
    worldWidth,
    layers,
    stations: STATIONS,
    plan: buildPlan(designWidth, pc),
    drawBehind(ctx, cameraX, time, night) {
      const treeShift = Math.round(cameraX * FAR_FACTORS.hedge);
      for (let i = 0; i < trees.length; i++) {
        const x = trees[i].x - treeShift;
        if (x > -TREE_REACH && x < designWidth + TREE_REACH) drawSwayTree(ctx, trees[i].sprite, x, TREE_BASE, time, TREE_SWAY);
      }
      const left = Math.max(0, Math.min(Math.round(cameraX), worldWidth - designWidth));
      ctx.drawImage(props, left, 0, designWidth, DESIGN_ROWS, 0, 0, designWidth, DESIGN_ROWS);
      drawSmoke(ctx, anchors.chimney.x - cameraX, anchors.chimney.y, time);
      drawClothes(ctx, anchors.laundry, cameraX, time);
      drawChimes(ctx, anchors.chimes, cameraX, time, time - ringAt);
      drawButterflies(ctx, pc, cameraX, time, night);
      drawBirds(ctx, time, night, designWidth);
      if (time - honkAt < HONK_SECONDS) drawHonk(ctx, anchors.cart, cameraX, time - honkAt);
    },
    drawAhead(ctx, cameraX, time) {
      for (let i = 0; i < tufts.length; i++) {
        const x = tufts[i] - cameraX;
        if (x > -10 && x < designWidth + 10) drawGrass(ctx, grass, x, FOREGROUND_ROW, i, time, 2);
      }
      drawSwayTree(ctx, peekBush, pc + PEEK_BUSH_X - cameraX, PEEK_BUSH_BASE, time, 1);
    },
    drawGlow(ctx, cameraX, time, night) {
      const lit = ramp(LIGHT_FROM, LIGHT_FULL, night);
      if (lit > 0) drawLights(ctx, anchors, cameraX, time, lit);
    },
    press(x, y, time) {
      if (inside(x, y, anchors.cart)) {
        honkAt = time;
        return true;
      }
      if (inside(x, y, chimesBox)) {
        ringAt = time;
        return true;
      }
      return false;
    },
  };
};
