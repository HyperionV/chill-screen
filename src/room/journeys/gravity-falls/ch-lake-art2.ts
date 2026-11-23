/**
 * The Lakeshore, part two: the ground the cast stands on (bank, dirt path, the long boardwalk with the monster's
 * slip), the boathouse and every prop along the way, painted once onto one world-wide strip, plus the two pictures
 * that sway or bob in the wind (the willow and the rowboat). `buildGround` also says where the glowing and clickable
 * parts sit.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, disc, drawSign, ditherFill, ellipse, lampPost, line, mix, polygon, rect, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import type { Rect } from '../../landscapes/gravity-falls/shack-art';
import { hash, noise } from '../noise';
import { BOARD_BACK, type LakeLayout } from './ch-lake-art';
import { DESIGN_ROWS } from './world';

const GRASS = '#5f9468';
const GRASS_LIGHT = '#8cbf7a';
const GRASS_DARK = '#44704e';
const SAND = '#cdbd8f';
const SAND_DARK = '#a99a6c';
const DIRT = '#b59d6e';
const DIRT_LIGHT = '#d2bf8c';
const DIRT_DARK = '#8a7550';
const PEBBLE = '#8f8a80';
const FLOWERS = ['#f6f1e0', '#e58fb0', '#8ab4e8', '#f4d35e'] as const;
const WOOD = '#a97c4f';
const WOOD_LIGHT = '#d6aa6b';
const WOOD_DARK = '#6e4a2e';
const OUTLINE = '#3a2418';
const PAPER = '#ead9a8';
const METAL = '#3c4a50';
const STONE = { base: '#8f9a94', light: '#bcc7c0', dark: '#5a6560' };
const SLIP_WATER = '#3f7f8a';
const SLIP_DEEP = '#2f6672';
/** The dirt path's top edge, and the deck's bottom row (the front beam ends here). */
const PATH_TOP = 228;
const DECK_BOTTOM = 244;
const PLANK_ROWS = 4;
const POST_GAP = 38;
const POST_HEIGHT = 14;
const ROPE_SAG = 3;
const SLIP_HALF = 10;
const SLIP_ROWS = 8;
const LAMP_HEIGHT = 30;
const SEED_GROUND = 71;

/** Where the parts that glow, move or answer a click sit, in world pixels. */
export interface LakeAnchors {
  lamps: readonly Point[];
  boathouseWindow: Rect;
  rod: { tip: Point; bobber: Point };
  bell: Rect;
  /** The rowboat tied behind the boardwalk: centre x and the row of its waterline. */
  boat: Point;
  slip: Rect;
  fire: Point;
}

/** Bank, sand edge, grass, wildflowers and the dirt path with pebbles, all the way across the world. */
function paintLand(ctx: Ctx, layout: LakeLayout, width: number, rand: () => number): void {
  for (let x = 0; x < width; x++) {
    const top = layout.landTop(x);
    rect(ctx, GRASS, x, top, 1, DESIGN_ROWS - top);
    rect(ctx, SAND, x, top, 1, 2);
    if (bayer(x, top + 2) < 0.6) rect(ctx, SAND_DARK, x, top + 2, 1, 1);
    const edge = PATH_TOP + Math.round(noise(x / 13 + 4) * 3);
    rect(ctx, DIRT, x, edge, 1, DESIGN_ROWS - edge);
    if (bayer(x, edge - 1) < 0.5) rect(ctx, GRASS_DARK, x, edge - 1, 1, 1);
  }
  for (let i = 0; i < width / 6; i++) {
    const x = rand() * width;
    rect(ctx, GRASS_LIGHT, x, layout.landTop(x) + 4 + rand() * 8, 3 + rand() * 3, 1);
  }
  for (let i = 0; i < width * 0.5; i++) {
    const tone = rand();
    rect(ctx, tone < 0.45 ? DIRT_LIGHT : tone < 0.85 ? DIRT_DARK : PEBBLE, rand() * width, PATH_TOP + 4 + rand() * 14, 1 + (rand() < 0.3 ? 1 : 0), 1);
  }
  for (let x = 12; x < width; x += 18 + rand() * 14) {
    const y = layout.landTop(x) + 6 + rand() * 7;
    rect(ctx, GRASS_DARK, x, y + 1, 1, 3);
    rect(ctx, FLOWERS[Math.floor(rand() * FLOWERS.length)], x - 1, y - 1, 2, 2);
  }
}

function paintPost(ctx: Ctx, x: number): void {
  rect(ctx, WOOD, x - 1, BOARD_BACK - POST_HEIGHT, 3, POST_HEIGHT + 2);
  rect(ctx, WOOD_DARK, x + 1, BOARD_BACK - POST_HEIGHT, 1, POST_HEIGHT + 2);
  rect(ctx, WOOD_LIGHT, x - 1, BOARD_BACK - POST_HEIGHT - 1, 3, 1);
}

/** The boardwalk's planks, back posts and sagging rope, then the water slip cut into it where the monster surfaces. */
function paintBoardwalk(ctx: Ctx, layout: LakeLayout): Rect {
  const { boardStart: x0, boardEnd: x1, monsterX } = layout;
  const w = x1 - x0;
  for (let r = 0, y = BOARD_BACK; y < 240; r++, y += PLANK_ROWS) {
    rect(ctx, r % 2 === 0 ? WOOD : mix(WOOD, '#000000', 0.08), x0, y, w, PLANK_ROWS);
    rect(ctx, WOOD_DARK, x0, y + PLANK_ROWS - 1, w, 1);
    for (let x = x0 + hash(y) * 30; x < x1; x += 22 + hash(x + y) * 40) rect(ctx, WOOD_DARK, x, y, 1, PLANK_ROWS - 1);
    for (let x = x0 + hash(y * 3) * 17; x < x1; x += 31 + hash(x * 2 + y) * 30) rect(ctx, WOOD_LIGHT, x, y, 5, 1);
  }
  rect(ctx, WOOD_LIGHT, x0, BOARD_BACK, w, 1);
  rect(ctx, WOOD_DARK, x0, 240, w, DECK_BOTTOM - 240);
  rect(ctx, WOOD, x0, 240, w, 1);
  rect(ctx, OUTLINE, x0 - 1, BOARD_BACK, 1, DECK_BOTTOM - BOARD_BACK);
  rect(ctx, OUTLINE, x1, BOARD_BACK, 1, DECK_BOTTOM - BOARD_BACK);
  const posts: number[] = [];
  for (let x = x0 + 8; x <= x1 - 4; x += POST_GAP) if (Math.abs(x - monsterX) > SLIP_HALF + 8) posts.push(x);
  posts.push(monsterX - SLIP_HALF - 3, monsterX + SLIP_HALF + 3);
  posts.sort((a, b) => a - b);
  posts.forEach((x, i) => {
    paintPost(ctx, x);
    const next = posts[i + 1];
    if (next === undefined) return;
    for (let dx = 0; dx < next - x; dx++) rect(ctx, '#c9b27a', x + dx, BOARD_BACK - POST_HEIGHT + 3 + Math.round(ROPE_SAG * Math.sin((Math.PI * dx) / (next - x))), 1, 1);
  });
  const slip: Rect = { x: monsterX - SLIP_HALF, y: BOARD_BACK, w: SLIP_HALF * 2 + 1, h: SLIP_ROWS };
  rect(ctx, SLIP_WATER, slip.x, slip.y, slip.w, slip.h);
  ditherFill(ctx, slip.x, slip.y + 3, slip.w, slip.h - 3, SLIP_WATER, SLIP_DEEP, 0.5);
  rect(ctx, OUTLINE, slip.x - 1, slip.y, 1, slip.h + 1);
  rect(ctx, OUTLINE, slip.x + slip.w, slip.y, 1, slip.h + 1);
  rect(ctx, OUTLINE, slip.x, slip.y + slip.h, slip.w, 1);
  return slip;
}

/** The boathouse on the bank: weathered boards, a red-brown gable with a BOATS sign, a double door and a window. */
function paintBoathouse(ctx: Ctx, cx: number): Rect {
  const left = cx - 24;
  const base = 225;
  rect(ctx, OUTLINE, left - 1, 203, 50, base - 202);
  rect(ctx, '#8a9aa0', left, 204, 48, base - 204);
  for (let x = left + 4; x < left + 48; x += 4) rect(ctx, '#6c7c82', x, 204, 1, base - 204);
  rect(ctx, '#a9b8bd', left, 204, 1, base - 204);
  polygon(ctx, '#7a4a3a', [{ x: left - 5, y: 205 }, { x: cx, y: 186 }, { x: left + 53, y: 205 }]);
  polygon(ctx, '#a8694f', [{ x: left - 5, y: 205 }, { x: cx, y: 186 }, { x: cx - 2, y: 186 }, { x: left - 8, y: 205 }]);
  for (let y = 192; y < 205; y += 3) for (let x = left - 4 + (y % 2) * 3; x < left + 52; x += 6) if (bayer(x, y) < 0.5) rect(ctx, '#52302a', x, y, 2, 1);
  rect(ctx, OUTLINE, left - 5, 205, 58, 2);
  drawSign(ctx, 'BOATS', cx - 11, 196, 1, OUTLINE, PAPER);
  rect(ctx, OUTLINE, cx - 9, 209, 14, base - 209);
  rect(ctx, '#5f6f74', cx - 8, 210, 12, base - 210);
  rect(ctx, '#46565c', cx - 2, 210, 1, base - 210);
  rect(ctx, '#d6aa6b', cx + 1, 218, 1, 2);
  const pane: Rect = { x: cx - 21, y: 208, w: 8, h: 7 };
  rect(ctx, OUTLINE, pane.x - 1, pane.y - 1, pane.w + 2, pane.h + 2);
  rect(ctx, '#97c7cc', pane.x, pane.y, pane.w, pane.h);
  rect(ctx, '#46565c', pane.x + 4, pane.y, 1, pane.h);
  rect(ctx, '#d6eef0', pane.x, pane.y, 2, 1);
  rect(ctx, mix('#8a9aa0', '#ffffff', 0.25), cx + 8, 208, 12, 11);
  rect(ctx, '#6c7c82', cx + 8, 208, 12, 1);
  rect(ctx, '#6c7c82', cx + 8, 218, 12, 1);
  return pane;
}

/** A wooden bench facing the lake: seat, slatted back and two legs. */
function paintBench(ctx: Ctx, cx: number): void {
  rect(ctx, OUTLINE, cx - 12, 219, 25, 4);
  rect(ctx, WOOD, cx - 11, 220, 23, 2);
  rect(ctx, WOOD_LIGHT, cx - 11, 220, 23, 1);
  for (let k = 0; k < 2; k++) rect(ctx, WOOD, cx - 11, 212 + k * 3, 23, 2);
  rect(ctx, WOOD_DARK, cx - 11, 212, 1, 10);
  rect(ctx, WOOD_DARK, cx + 11, 212, 1, 10);
  rect(ctx, WOOD_DARK, cx - 9, 223, 2, 4);
  rect(ctx, WOOD_DARK, cx + 8, 223, 2, 4);
}

/** The trail sign on a post, and the notice board that stands near the start with its post and chalk lines. */
function paintSigns(ctx: Ctx, layout: LakeLayout): void {
  rect(ctx, WOOD_DARK, 119, 198, 3, 30);
  drawSign(ctx, 'LAKE TRAIL', 99, 196, 1, OUTLINE, PAPER);
  const x = layout.noteX;
  for (const px of [x - 22, x + 20]) {
    rect(ctx, WOOD_DARK, px, 196, 3, 32);
    rect(ctx, OUTLINE, px + 2, 196, 1, 32);
  }
  drawSign(ctx, 'NO SWIMMING', x - 24, 197, 1, OUTLINE, PAPER);
  rect(ctx, '#c4473b', x - 12, 207, 24, 1);
  rect(ctx, '#e9dcb0', x - 16, 208, 5, 6);
  rect(ctx, '#f4d35e', x + 12, 208, 5, 5);
  rect(ctx, '#c4473b', x - 14, 208, 1, 1);
  rect(ctx, '#c4473b', x + 14, 208, 1, 1);
}

/** A canoe turned over on two sawhorses, a paddle leaning on it. */
function paintCanoe(ctx: Ctx, cx: number): void {
  for (const dx of [-9, 9]) {
    line(ctx, WOOD_DARK, cx + dx - 4, 227, cx + dx, 219, 1);
    line(ctx, WOOD_DARK, cx + dx + 4, 227, cx + dx, 219, 1);
  }
  ellipse(ctx, '#2c6a64', cx, 216, 15, 4);
  ellipse(ctx, '#3f8f86', cx, 215, 14, 3);
  rect(ctx, '#e9dcb0', cx - 12, 216, 25, 1);
  rect(ctx, '#7fc4b8', cx - 8, 213, 8, 1);
  line(ctx, WOOD, cx + 17, 226, cx + 20, 208, 1);
  rect(ctx, WOOD_LIGHT, cx + 19, 205, 3, 6);
}

/** Wendy's fishing things: a rod on a forked stick (the line and float are drawn live), a tackle box, a cooler and a bucket. */
function paintFishing(ctx: Ctx, wendyX: number): LakeAnchors['rod'] {
  const tip = { x: wendyX - 34, y: 197 };
  line(ctx, WOOD_DARK, wendyX - 12, 227, wendyX - 12, 221, 1);
  line(ctx, WOOD_DARK, wendyX - 14, 222, wendyX - 12, 224, 1);
  line(ctx, '#3a2f22', wendyX - 5, 224, tip.x, tip.y, 1);
  rect(ctx, '#c4473b', wendyX - 6, 223, 3, 2);
  rect(ctx, OUTLINE, wendyX + 10, 220, 12, 7);
  rect(ctx, '#c4473b', wendyX + 11, 221, 10, 5);
  rect(ctx, '#e88a7e', wendyX + 11, 221, 10, 1);
  rect(ctx, '#d6aa6b', wendyX + 15, 219, 3, 1);
  rect(ctx, OUTLINE, wendyX + 24, 218, 13, 9);
  rect(ctx, '#4a9fd0', wendyX + 25, 219, 11, 7);
  rect(ctx, '#f1f1f1', wendyX + 25, 219, 11, 2);
  rect(ctx, OUTLINE, wendyX + 40, 221, 7, 6);
  rect(ctx, '#8a949a', wendyX + 41, 222, 5, 4);
  rect(ctx, '#e8b23a', wendyX + 42, 220, 3, 2);
  return { tip, bobber: { x: wendyX - 40, y: 208 } };
}

/** Pacifica's striped parasol on its stand, with a small white table and a pink drink. */
function paintParasol(ctx: Ctx, cx: number): void {
  rect(ctx, '#8a949a', cx, 205, 2, 22);
  for (let i = 0; i < 6; i++) {
    const half = 12 - Math.floor(i * 1.2);
    rect(ctx, i % 2 === 0 ? '#e58fb0' : '#f6f1e0', cx - half, 198 + i, half * 2 + 2, 1);
  }
  rect(ctx, '#b86a88', cx - 12, 204, 26, 1);
  rect(ctx, '#f6f1e0', cx - 9, 221, 12, 2);
  rect(ctx, '#d4d4d4', cx - 4, 223, 2, 4);
  rect(ctx, '#e58fb0', cx - 6, 217, 3, 4);
  rect(ctx, '#ffffff', cx - 6, 216, 3, 1);
}

/** A life ring on a post: red and white quarters round a hole, so the lake shows through. */
function paintLifeRing(ctx: Ctx, cx: number): void {
  rect(ctx, WOOD_DARK, cx - 1, 205, 3, 22);
  rect(ctx, OUTLINE, cx + 1, 205, 1, 22);
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dy);
      if (d > 5.2 || d < 2.6) continue;
      const quarter = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 2));
      rect(ctx, quarter % 2 === 0 ? '#c4473b' : '#f6f1e0', cx + dx, 208 + dy, 1, 1);
    }
  }
}

/** A brass bell hanging from an arm on a post; clicking it rings it. Returns its click box. */
function paintBell(ctx: Ctx, x: number): Rect {
  rect(ctx, WOOD_DARK, x - 1, 200, 3, 27);
  rect(ctx, WOOD_DARK, x - 1, 200, 12, 2);
  ellipse(ctx, '#c9a23a', x + 8, 208, 3, 4);
  rect(ctx, '#c9a23a', x + 4, 210, 9, 3);
  rect(ctx, '#f4d35e', x + 6, 205, 1, 4);
  rect(ctx, OUTLINE, x + 8, 214, 1, 2);
  return { x: x + 3, y: 202, w: 11, h: 14 };
}

function paintCrate(ctx: Ctx, x: number, y: number): void {
  rect(ctx, OUTLINE, x, y, 14, 12);
  rect(ctx, WOOD, x + 1, y + 1, 12, 10);
  rect(ctx, WOOD_LIGHT, x + 1, y + 1, 12, 1);
  rect(ctx, WOOD_DARK, x + 1, y + 5, 12, 1);
  rect(ctx, WOOD_DARK, x + 6, y + 1, 1, 10);
}

/** Cargo stacked at the back of the boardwalk: two crates with a third on top, and a hooped barrel. */
function paintCargo(ctx: Ctx, x: number): void {
  paintCrate(ctx, x, BOARD_BACK - 12);
  paintCrate(ctx, x + 15, BOARD_BACK - 12);
  paintCrate(ctx, x + 7, BOARD_BACK - 24);
  rect(ctx, OUTLINE, x + 34, BOARD_BACK - 16, 13, 17);
  rect(ctx, '#7b5a3a', x + 35, BOARD_BACK - 15, 11, 16);
  rect(ctx, '#9a7650', x + 35, BOARD_BACK - 15, 2, 16);
  rect(ctx, '#5a626a', x + 35, BOARD_BACK - 11, 11, 1);
  rect(ctx, '#5a626a', x + 35, BOARD_BACK - 4, 11, 1);
}

/** A fishing net drying over the rope: a mesh of dots in two tones. */
function paintNet(ctx: Ctx, x: number): void {
  for (let r = 0; r < 11; r++) {
    for (let c = 0; c < 20; c++) {
      if ((r + c) % 2 === 0) rect(ctx, r % 4 === 0 ? '#e0cd9a' : '#a8946a', x + c, BOARD_BACK - 12 + r, 1, 1);
    }
  }
  rect(ctx, '#e0cd9a', x, BOARD_BACK - 13, 20, 1);
}

/** The lamp posts on the boardwalk; returns each lantern's centre for the dusk halos. */
function paintLamps(ctx: Ctx, layout: LakeLayout): Point[] {
  return [layout.pacificaX + 36, layout.monsterX - 72, layout.monsterX + 104].map((x) => lampPost(ctx, x, BOARD_BACK + 2, LAMP_HEIGHT, METAL, '#ffe9b0'));
}

/** A fern: seven fronds fanning up from one point. */
function paintFern(ctx: Ctx, x: number, base: number): void {
  for (let k = -3; k <= 3; k++) {
    const len = 9 - Math.abs(k);
    line(ctx, k % 2 === 0 ? '#3d7a45' : '#5f9d55', x, base, x + k * 2, base - len, 1);
  }
}

/** A stone fire ring with two log seats, charcoal and a few embers; returns the glow's centre. */
function paintFire(ctx: Ctx, x: number): Point {
  for (let k = 0; k < 8; k++) {
    const angle = (k / 8) * Math.PI * 2;
    rect(ctx, k % 2 === 0 ? '#7a756c' : '#9a9588', x + Math.cos(angle) * 8 - 1, 228 + Math.sin(angle) * 2.5, 3, 2);
  }
  ellipse(ctx, '#2a2622', x, 228, 6, 2);
  for (const dx of [-3, 0, 3]) rect(ctx, '#e8743a', x + dx, 227, 1, 1);
  for (const dx of [-24, 18]) {
    rect(ctx, OUTLINE, x + dx - 1, 224, 17, 7);
    rect(ctx, '#8b5f37', x + dx, 225, 15, 5);
    rect(ctx, '#c99a5e', x + dx, 225, 15, 1);
    rect(ctx, '#c99a5e', x + dx + 14, 226, 1, 3);
  }
  return { x, y: 226 };
}

/** A cairn of balanced stones. */
function paintCairn(ctx: Ctx, x: number): void {
  const stones: readonly (readonly [number, number, number, string])[] = [[9, 4, 0, '#8f9a94'], [7, 3, 7, '#a7b0aa'], [5, 3, 13, '#7d8882'], [3, 2, 18, '#b9c2bc']];
  stones.forEach(([rx, ry, rise, color]) => {
    ellipse(ctx, OUTLINE, x, 227 - rise, rx + 1, ry + 1);
    ellipse(ctx, color, x, 227 - rise, rx, ry);
    rect(ctx, mix(color, '#ffffff', 0.4), x - rx + 2, 227 - rise - ry + 1, 2, 1);
  });
}

/** Everything past the boardwalk's far end: the fire ring, the cairn, mossy boulders and ferns on the path to the next place. */
function paintBeyond(ctx: Ctx, layout: LakeLayout): Point {
  const x = layout.boardEnd;
  const fire = paintFire(ctx, x + 125);
  paintCairn(ctx, x + 192);
  ctx.drawImage(rock(26, 14, 3, STONE), Math.round(x + 240), 217);
  ctx.drawImage(rock(18, 11, 4, STONE), Math.round(x + 296), 220);
  for (const dx of [20, 100, 160, 226, 270]) paintFern(ctx, x + dx, 224);
  return fire;
}

/** The whole ground strip for a view width, with the anchors of everything that glows, moves or is clicked. */
export function buildGround(layout: LakeLayout): { canvas: HTMLCanvasElement; anchors: LakeAnchors } {
  const { canvas, ctx } = memoryCanvas(layout.worldWidth, DESIGN_ROWS);
  paintLand(ctx, layout, layout.worldWidth, seeded(SEED_GROUND));
  paintSigns(ctx, layout);
  paintBench(ctx, 300);
  const boathouseWindow = paintBoathouse(ctx, layout.boathouseX);
  paintCanoe(ctx, layout.boathouseX + 66);
  const rod = paintFishing(ctx, layout.wendyX);
  const slip = paintBoardwalk(ctx, layout);
  paintParasol(ctx, layout.pacificaX - 18);
  paintNet(ctx, layout.boardStart + 84);
  paintCargo(ctx, layout.boardEnd - 80);
  paintLifeRing(ctx, layout.pageX);
  const bell = paintBell(ctx, layout.monsterX + 56);
  const lamps = paintLamps(ctx, layout);
  const fire = paintBeyond(ctx, layout);
  return { canvas, anchors: { lamps, boathouseWindow, rod, bell, boat: { x: layout.boardStart + 130, y: BOARD_BACK - 5 }, slip, fire } };
}

const WILLOW_W = 44;
const WILLOW_H = 64;
const WILLOW_CENTRE = 22;
const WILLOW_LEAF = ['#3f7a48', '#5f9d55', '#7fb870'] as const;

/** A weeping willow: a leaning trunk, a rounded crown and hanging fronds that blow out at their tips. The foot is the bottom-centre. */
export function buildWillow(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(WILLOW_W, WILLOW_H);
  rect(ctx, '#5b4030', WILLOW_CENTRE - 2, 26, 5, 38);
  rect(ctx, '#3d2a22', WILLOW_CENTRE + 1, 26, 2, 38);
  line(ctx, '#5b4030', WILLOW_CENTRE, 28, WILLOW_CENTRE - 10, 16, 2);
  line(ctx, '#5b4030', WILLOW_CENTRE, 30, WILLOW_CENTRE + 10, 14, 2);
  ellipse(ctx, '#2f5f3c', WILLOW_CENTRE, 14, 20, 11);
  ellipse(ctx, WILLOW_LEAF[0], WILLOW_CENTRE - 2, 12, 16, 8);
  for (let x = 2; x < WILLOW_W - 2; x += 2) {
    const top = 14 + Math.round(Math.sqrt(Math.max(0, 1 - ((x - WILLOW_CENTRE) / 21) ** 2)) * 10);
    const length = 18 + Math.round(hash(x * 1.7) * 18);
    for (let r = 0; r < length; r++) rect(ctx, WILLOW_LEAF[r % 5 === 4 ? 2 : (x / 2) % 2 === 0 ? 1 : 0], x + Math.round(Math.sin(r * 0.3 + x) * 0.8), top + r, 1, 1);
  }
  return canvas;
}

/** A small wooden rowboat seen from the side: a warm hull with a cream rim and stripe, a thwart and two oars resting up. */
export function buildRowboat(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(36, 14);
  line(ctx, WOOD_DARK, 12, 6, 5, 0, 1);
  line(ctx, WOOD_DARK, 22, 6, 29, 0, 1);
  rect(ctx, WOOD_LIGHT, 4, 0, 3, 1);
  rect(ctx, WOOD_LIGHT, 28, 0, 3, 1);
  polygon(ctx, '#a8573a', [{ x: 0, y: 5 }, { x: 35, y: 5 }, { x: 30, y: 12 }, { x: 5, y: 12 }]);
  rect(ctx, '#e9dcb0', 0, 5, 36, 2);
  rect(ctx, '#e9dcb0', 3, 9, 30, 1);
  rect(ctx, '#7a3a28', 6, 11, 24, 1);
  rect(ctx, WOOD_DARK, 16, 7, 4, 1);
  disc(ctx, '#e9dcb0', 34, 4, 1);
  return canvas;
}
