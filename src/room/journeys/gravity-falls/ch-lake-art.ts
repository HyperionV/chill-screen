/**
 * The Lakeshore, part one: where things stand (the layout), and the four far-to-near strips behind the ground: blue
 * hills, the far shore with the glassy lake house and the water with its mirror, floating things on the water, and the
 * reed bed along the bank. Everything is painted once when the chapter is built.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { ditherFill, ellipse, mix, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_FOREST, PINE_VARIANTS, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import type { Rect } from '../../landscapes/gravity-falls/shack-art';
import { noise, ramp } from '../noise';
import { DESIGN_ROWS } from './world';

/** Camera x where the walk rests at the shore path and at the dock end (9 px a second from the start, and from the first rest). */
export const AT_SHORE = 353;
export const AT_DOCK = 749;
/** The camera still walks this far after the dock pause before the chapter ends (9 px a second for 43 s). */
export const WALK_AFTER_LAST = 372;
const MIN_WORLD_WIDTH = 1800;
const WORLD_MARGIN = 40;

/** Where the locals and the monster stand, as shares of the view width right of the camera at their rest. */
const WENDY_SHARE = 0.72;
const PACIFICA_SHARE = 0.88;
const MONSTER_SHARE = 0.8;
const BOATHOUSE_SHARE = 0.36;
/** The boardwalk starts this far before Pacifica and runs this far past the monster's slip. */
const BOARD_LEAD = 50;
const BOARD_TAIL = 190;
const BOARD_SLOPE = 36;
/** Clues: the notice board near the start, how far the life ring stands left of the slip, how far the peeking reeds are right of it. */
const NOTE_X = 230;
const PAGE_LEFT_OF_SLIP = 34;
const PEEK_RIGHT_OF_SLIP = 260;

/** Rows: the far shore meets the water here; the bank's edge; how far the bank dips where the boardwalk stands over the water. */
export const SHORE_FAR = 160;
export const BANK_EDGE = 214;
export const BOARD_DEPTH = 10;
export const BOARD_BACK = BANK_EDGE + BOARD_DEPTH;
const BANK_WOBBLE = 2;
const BANK_WOBBLE_SCALE = 9;

/** Cool haze that far things sink into. */
export const HAZE = '#c3dbd8';
const EDGE_SLACK = 8;
const SEED_SHORE = 61;
const SEED_MID = 83;
const SEED_REEDS = 97;

export interface LakeLayout {
  viewWidth: number;
  worldWidth: number;
  wendyX: number;
  pacificaX: number;
  monsterX: number;
  boardStart: number;
  boardEnd: number;
  boathouseX: number;
  noteX: number;
  pageX: number;
  peekX: number;
  /** First land row at column `x`: the lake lies above it. The bank dips to the boardwalk's back edge along the boardwalk. */
  landTop(x: number): number;
}

export function layoutLake(viewWidth: number): LakeLayout {
  const wendyX = AT_SHORE + Math.round(viewWidth * WENDY_SHARE);
  const pacificaX = AT_SHORE + Math.round(viewWidth * PACIFICA_SHARE);
  const monsterX = AT_DOCK + Math.round(viewWidth * MONSTER_SHARE);
  const boardStart = pacificaX - BOARD_LEAD;
  const boardEnd = monsterX + BOARD_TAIL;
  const onBoard = (x: number): number => ramp(boardStart - BOARD_SLOPE, boardStart, x) * (1 - ramp(boardEnd, boardEnd + BOARD_SLOPE, x));
  return {
    viewWidth,
    worldWidth: Math.max(MIN_WORLD_WIDTH, AT_DOCK + WALK_AFTER_LAST + viewWidth + WORLD_MARGIN),
    wendyX, pacificaX, monsterX, boardStart, boardEnd,
    boathouseX: AT_SHORE + Math.round(viewWidth * BOATHOUSE_SHARE),
    noteX: NOTE_X,
    pageX: monsterX - PAGE_LEFT_OF_SLIP,
    peekX: monsterX + PEEK_RIGHT_OF_SLIP,
    landTop: (x) => {
      const board = onBoard(x);
      return Math.round(BANK_EDGE + BOARD_DEPTH * board + (1 - board) * noise(x / BANK_WOBBLE_SCALE) * BANK_WOBBLE);
    },
  };
}

/** Width of a strip that scrolls at `factor` of the camera: enough to cover the whole walk without repeating. */
export function stripWidth(worldWidth: number, factor: number, viewWidth: number): number {
  return Math.ceil(worldWidth * factor) + viewWidth + EDGE_SLACK;
}

/** Far blue hills across the lake, sunk in haze, with a solid haze foot so no sky shows between them and the far shore. */
export function buildHills(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  ridge(ctx, width, { base: 150, top: 92, scale: 120, seed: 11, color: '#b3cdd6', mist: HAZE });
  ridge(ctx, width, { base: SHORE_FAR, top: 120, scale: 64, seed: 29, color: '#97b9c3', mist: HAZE });
  rect(ctx, mix(HAZE, '#97b9c3', 0.45), 0, SHORE_FAR, width, DESIGN_ROWS - SHORE_FAR);
  return canvas;
}

/** The glassy lake house across the water: a flat roof, a long glass front, a balcony rail and a little pier. */
export const LAKE_HOUSE = { w: 38, h: 18 };
const HOUSE_ROOF = '#5d6b76';
const HOUSE_GLASS = '#7fb5cf';

/** The house's lit window in strip pixels, where the dusk light goes. */
export function houseWindow(x: number): Rect {
  return { x: x + 6, y: SHORE_FAR - LAKE_HOUSE.h + 5, w: 12, h: 8 };
}

function paintLakeHouse(ctx: Ctx, x: number): void {
  const top = SHORE_FAR - LAKE_HOUSE.h;
  const { w } = LAKE_HOUSE;
  rect(ctx, '#3f5a52', x - 8, SHORE_FAR - 3, w + 16, 3);
  rect(ctx, '#dfe7ea', x, top + 4, w, LAKE_HOUSE.h - 4);
  rect(ctx, '#c0cdd3', x + w - 8, top + 4, 8, LAKE_HOUSE.h - 4);
  rect(ctx, HOUSE_ROOF, x - 3, top, w + 6, 3);
  rect(ctx, '#3f4b55', x - 3, top + 3, w + 6, 1);
  const glass = houseWindow(x);
  rect(ctx, HOUSE_GLASS, glass.x, glass.y, glass.w, glass.h);
  rect(ctx, '#b8dcec', glass.x, glass.y, glass.w, 2);
  rect(ctx, HOUSE_ROOF, glass.x + 6, glass.y, 1, glass.h);
  rect(ctx, HOUSE_GLASS, x + 22, glass.y, 10, glass.h);
  rect(ctx, HOUSE_ROOF, x + 27, glass.y, 1, glass.h);
  rect(ctx, '#8795a0', x + 20, SHORE_FAR - 5, 14, 1);
  for (let px = x + 20; px < x + 34; px += 3) rect(ctx, '#8795a0', px, SHORE_FAR - 5, 1, 3);
  rect(ctx, '#b6a58a', x - 22, SHORE_FAR - 2, 16, 1);
  for (let px = x - 22; px < x - 6; px += 5) rect(ctx, '#6b5a44', px, SHORE_FAR - 2, 1, 3);
}

/** A shore of tiny far pines on a dark bank, one lake house at each of `houseXs`. */
function paintFarShore(ctx: Ctx, width: number, houseXs: readonly number[]): void {
  const palette = fadePalette(PINE_FOREST, HAZE, 0.5);
  const rand = seeded(SEED_SHORE);
  rect(ctx, palette.dark, 0, SHORE_FAR - 4, width, 4);
  for (let x = -8; x < width + 8; x += 9 * (0.7 + rand() * 0.6)) {
    const tree = pineTree(Math.floor(rand() * PINE_VARIANTS), Math.round(12 + rand() * 14), palette);
    ctx.drawImage(tree, Math.round(x - tree.width / 2), SHORE_FAR - tree.height);
  }
  for (const x of houseXs) paintLakeHouse(ctx, x);
}

/** Six blues from the pale far water to the deep water near the bank; the lake is `WATER_ROWS` rows from the far shore down. */
const WATER_COLORS = ['#8fc7c8', '#7cb9bf', '#68a7b0', '#54949f', '#45838f', '#38727f'];
const WATER_BAND = 12;
const WATER_BLEND_ROWS = 4;
const WATER_ROWS = WATER_COLORS.length * WATER_BAND;
const WATER_STREAK = '#c4e6e4';
const WATER_STREAK_DARK = '#2f6672';
const MIRROR_ROWS = 44;
const MIRROR_STRONG = 0.3;
const MIRROR_WEAK = 0.15;
const MIRROR_WOBBLE = 3;

/** The still water: bands of blue blended by dither, short bright and dark ripple dashes, and the shore's reflection. */
function paintWater(ctx: Ctx, width: number, shore: HTMLCanvasElement): void {
  WATER_COLORS.forEach((color, i) => {
    const y0 = SHORE_FAR + i * WATER_BAND;
    rect(ctx, color, 0, y0, width, WATER_BAND);
    if (i === WATER_COLORS.length - 1) return;
    for (let r = 0; r < WATER_BLEND_ROWS; r++) {
      ditherFill(ctx, 0, y0 + WATER_BAND - WATER_BLEND_ROWS + r, width, 1, color, WATER_COLORS[i + 1], (r + 1) / (WATER_BLEND_ROWS + 1));
    }
  });
  for (let r = 0; r < MIRROR_ROWS; r++) {
    const wobble = Math.round((noise(Math.floor(r / 2) * 1.7 + 3) - 0.5) * MIRROR_WOBBLE);
    ctx.globalAlpha = r < MIRROR_ROWS * 0.55 ? MIRROR_STRONG : MIRROR_WEAK;
    ctx.drawImage(shore, 0, SHORE_FAR - 1 - r, width, 1, wobble, SHORE_FAR + r, width, 1);
  }
  ctx.globalAlpha = 1;
  const rand = seeded(SEED_SHORE + 1);
  for (let i = 0; i < width / 2.5; i++) {
    const depth = rand();
    const y = SHORE_FAR + 2 + depth * (WATER_ROWS - 6);
    rect(ctx, rand() < 0.6 ? WATER_STREAK : WATER_STREAK_DARK, rand() * width, y, 2 + depth * 5 + rand() * 3, 1);
  }
}

/** The far shore and the lake in one strip (they must move together so the mirror stays under the trees). */
export function buildFarShore(width: number, houseXs: readonly number[]): HTMLCanvasElement {
  const shore = memoryCanvas(width, DESIGN_ROWS);
  paintFarShore(shore.ctx, width, houseXs);
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  ctx.drawImage(shore.canvas, 0, 0);
  paintWater(ctx, width, shore.canvas);
  return canvas;
}

const REED = '#4f7a3a';
const REED_LIGHT = '#8fb85f';
const CATTAIL_HEAD = '#6b4630';
const MUD = '#6b6a4e';
const PAD = '#4f8f55';
const PAD_LIGHT = '#7fbf6a';
const LOG = '#6e5638';
const PILE = '#5b4a38';

/** One reed blade of `h` rows leaning `lean` pixels at the tip; a cattail head sits on every third. */
function blade(ctx: Ctx, x: number, base: number, h: number, lean: number, head: boolean): void {
  for (let r = 0; r < h; r++) rect(ctx, r % 4 === 3 ? REED_LIGHT : REED, x + Math.round((lean * r) / h), base - r - 1, 1, 1);
  if (head) rect(ctx, CATTAIL_HEAD, x + lean, base - h - 3, 2, 4);
}

/** A reed islet: a bank of mud with a clump of reeds, its shadow on the water below. */
function paintIslet(ctx: Ctx, x: number, base: number, rand: () => number): void {
  ellipse(ctx, '#3f7f8a', x, base + 2, 17, 2);
  ellipse(ctx, MUD, x, base, 14, 3);
  rect(ctx, '#8a8868', x - 8, base - 3, 8, 1);
  for (let i = 0; i < 9; i++) blade(ctx, x - 10 + i * 2.5, base - 1, 8 + Math.round(rand() * 10), Math.round(rand() * 4 - 2), i % 3 === 0);
}

/** A patch of lily pads with one pink flower. */
function paintLilies(ctx: Ctx, x: number, base: number, rand: () => number): void {
  for (let i = 0; i < 7; i++) {
    const px = x + (rand() - 0.5) * 36;
    const py = base + (rand() - 0.5) * 8;
    ellipse(ctx, PAD, px, py, 3, 1);
    rect(ctx, PAD_LIGHT, px - 1, py - 1, 2, 1);
  }
  rect(ctx, '#e58fb0', x + 3, base - 2, 2, 2);
}

/** A floating log with a turtle sunning itself on it. */
function paintLog(ctx: Ctx, x: number, base: number): void {
  rect(ctx, '#2f6672', x - 11, base + 1, 24, 1);
  ellipse(ctx, LOG, x, base, 11, 2);
  rect(ctx, '#8a6e48', x - 8, base - 2, 14, 1);
  ellipse(ctx, '#6b8f4e', x + 2, base - 3, 3, 2);
  rect(ctx, '#4f6a38', x, base - 3, 5, 1);
  rect(ctx, '#8aa86a', x + 5, base - 4, 2, 2);
}

/** Two marker buoys, red and white, with dark reflections. */
function paintBuoys(ctx: Ctx, x: number, base: number): void {
  for (const [dx, color] of [[-10, '#c4473b'], [9, '#f1e6c4']] as const) {
    rect(ctx, '#2f6672', x + dx - 2, base + 2, 5, 1);
    ellipse(ctx, color, x + dx, base, 2, 2);
    rect(ctx, '#ffffff', x + dx - 1, base - 2, 1, 1);
    rect(ctx, '#3a3a3a', x + dx, base - 5, 1, 3);
  }
}

/** Three old pier stumps standing in the water, their tops green with moss. */
function paintStumps(ctx: Ctx, x: number, base: number): void {
  [[-6, 9], [0, 12], [6, 7]].forEach(([dx, h]) => {
    rect(ctx, PILE, x + dx - 1, base - h, 3, h);
    rect(ctx, '#3d2f24', x + dx + 1, base - h, 1, h);
    rect(ctx, '#6f9d52', x + dx - 1, base - h, 3, 1);
    rect(ctx, '#2f6672', x + dx - 1, base, 3, 1);
  });
}

const MID_KINDS = ['islet', 'lilies', 'log', 'islet', 'buoys', 'stumps'] as const;
const MID_GAP = 170;

/** Things that float on the lake between the far shore and the bank; they drift past at half the walker's speed. */
export function buildMidWater(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(SEED_MID);
  for (let i = 0, x = 60; x < width + 40; i++, x += MID_GAP * (0.75 + rand() * 0.5)) {
    const base = 196 + Math.round(rand() * 12);
    const kind = MID_KINDS[i % MID_KINDS.length];
    if (kind === 'islet') paintIslet(ctx, x, base, rand);
    else if (kind === 'lilies') paintLilies(ctx, x, base + 4, rand);
    else if (kind === 'log') paintLog(ctx, x, base);
    else if (kind === 'buoys') paintBuoys(ctx, x, base);
    else paintStumps(ctx, x, base);
  }
  return canvas;
}

const BUSH_DARK = '#27432f';
const BUSH_MID = '#3d6a45';
const REED_BASE = 222;
const REED_CLUMP_GAP = 15;
const BUSH_GAP = 70;
const STONE = { base: '#8f9a94', light: '#bcc7c0', dark: '#5a6560' };

/** The reed bed along the bank: dense static blades, round bushes and wet boulders. The bank's grass hides its foot. */
export function buildReedBed(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(SEED_REEDS);
  const stones = [rock(16, 10, 1, STONE), rock(24, 13, 2, STONE)];
  for (let x = 0; x < width; x += BUSH_GAP * (0.7 + rand() * 0.6)) {
    const rx = 9 + rand() * 8;
    const ry = 5 + rand() * 4;
    ellipse(ctx, BUSH_DARK, x, REED_BASE - ry, rx, ry);
    ellipse(ctx, BUSH_MID, x - 1, REED_BASE - ry - 1, rx - 2, ry - 2);
    rect(ctx, '#8fb85f', x - rx / 2, REED_BASE - ry * 1.6, 2, 1);
  }
  for (let x = 4; x < width; x += REED_CLUMP_GAP * (0.6 + rand() * 0.8)) {
    for (let k = 0; k < 4; k++) blade(ctx, x + k * 2, REED_BASE, 8 + Math.round(rand() * 12), Math.round(rand() * 4 - 2), rand() < 0.3);
  }
  for (let x = 80; x < width; x += 210 * (0.8 + rand() * 0.4)) ctx.drawImage(stones[Math.floor(rand() * stones.length)], Math.round(x), REED_BASE - 8);
  return canvas;
}

/** A tall cattail picture that sways in the wind (drawn with `drawSwayTree`): 14 to 26 rows, stem and brown head. */
export function buildCattail(rows: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(9, rows);
  for (let i = 0; i < 3; i++) blade(ctx, 2 + i * 2, rows, rows - 5 - i * 3, i - 1, i === 1);
  rect(ctx, CATTAIL_HEAD, 4, 1, 2, 5);
  rect(ctx, '#8a6240', 4, 1, 1, 5);
  rect(ctx, '#d8c9a0', 4, 0, 1, 1);
  return canvas;
}
