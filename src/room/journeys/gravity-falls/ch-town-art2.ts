/**
 * Main Street, part two: the shopfronts and landmark buildings (hardware, bakery, diner, gift shop, sheriff, bookshop,
 * town hall, cinema, post office) and the whole street picture they stand on, painted once onto one world-wide canvas
 * that scrolls with the ground. `buildStreet` also reports where the lit windows, lamps, signs, flag and other moving
 * or glowing parts belong, so ch-town.ts can animate them.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ditherFill, lampPost, line, mix, polygon, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import type { Rect } from '../../landscapes/gravity-falls/shack-art';
import { CREAM, GLASS, OUTLINE, PLUM, type TownWindow } from '../../landscapes/gravity-falls/town-buildings';
import { hash } from '../noise';
import { SIDEWALK_TOP } from './ch-town-art';
import {
  fountainNozzle, paintBench, paintBike, paintFountainBasin, paintGnome, paintHardwareStock, paintHydrant, paintJunkCart, paintNewsBox,
  paintNoticeBoard, paintPatrolCar, paintPlanter, paintPostBox, paintPostcardRack, paintSpecialsBoard, paintTrashCan,
} from './ch-town-art3';
import { DESIGN_ROWS } from './world';

/** The row every shop wall stands on. */
const BASE = SIDEWALK_TOP;
const CURB_BASE = 229;
const PAVE_BASE = 227;
const SQUARE_BASE = 232;
const CAR_BASE = 240;
const SQUARE_LAMP_BASE = 226;
const LAMP_HEIGHT = 42;
const LAMP_IRON = '#3f3a4a';
const LAMP_GLASS = '#f4e2a0';
const IRON = '#4a4655';
const STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.'] as const;
const GOLD = '#e8c26a';
const DINER_RED = '#c9473f';
const DINER_TEAL = '#5aa5a3';
const CHROME = '#cdd6de';
const NEON_OFF = '#8a4a6a';
const STONE_STEP = ['#d9cfbf', '#c2b5a3', '#a89a88'] as const;
const WOOD_DARK = '#6b4a2f';
const BRICK_SPACING = 7;
const FLOWER_TONES = ['#f4d35e', '#e58fb0', '#b28ad8'] as const;

/** Where the shops and the things between them stand: the centre x of each, in world pixels. */
export interface Spots {
  hardware: number;
  bakery: number;
  diner: number;
  cart: number;
  gift: number;
  sheriff: number;
  car: number;
  notice: number;
  books: number;
  hall: number;
  fountain: number;
  cinema: number;
  post: number;
}

/** A shop sign that hangs from a bracket; `x`, `y` is its top-left corner. */
export interface HangingSign {
  x: number;
  y: number;
  kind: 'loaf' | 'cog';
}

/** What `buildStreet` paints, and where its moving and glowing parts sit (world pixels, rows). */
export interface Street {
  canvas: HTMLCanvasElement;
  lit: TownWindow[];
  /** Lantern centres, sorted left to right: halos at dusk, bunting strung between neighbours. */
  lamps: Point[];
  /** Lanterns on walls (the sheriff's): a halo at dusk, no bunting. */
  wallLamps: Point[];
  /** Top-left of the DINER letters and of the small OPEN letters. */
  neon: Point;
  open: Point;
  /** Top of the sheriff's flagpole, where the cloth starts. */
  flag: Point;
  /** Top of the bakery's chimney. */
  chimney: Point;
  signs: HangingSign[];
  /** Cinema sign bulbs. */
  bulbs: Point[];
  /** Centre of the patrol car's light bar. */
  bar: Point;
  carBox: Rect;
  nozzle: Point;
  fountainBox: Rect;
}

type Shape = 'boxes' | 'loaves' | 'spines';
type ShopKey = 'hardware' | 'bakery' | 'gift' | 'books' | 'post' | 'cinema';

interface ShopSpec {
  w: number;
  h: number;
  wall: string;
  trim: string;
  awning: readonly [string, string];
  sign: string;
  goods: readonly string[];
  shape: Shape;
}

const SHOPS: Readonly<Record<ShopKey, ShopSpec>> = {
  hardware: { w: 84, h: 66, wall: '#c3b08e', trim: '#4f7a58', awning: ['#4f8a5a', '#efe6d0'], sign: 'HARDWARE', goods: ['#d4524e', '#e8b23a', '#8a949a', '#4a6fa5'], shape: 'boxes' },
  bakery: { w: 76, h: 72, wall: '#f0d2c0', trim: '#c9604f', awning: ['#e58fb0', '#fbf2e2'], sign: 'BAKERY', goods: ['#b0703a', '#d9964a', '#f2d6a8', '#e58fb0'], shape: 'loaves' },
  gift: { w: 80, h: 70, wall: '#a9c0cf', trim: '#6b5f9a', awning: ['#8a67b0', '#efe6d0'], sign: 'GIFTS', goods: ['#e58fb0', '#f4d35e', '#7fb85a', '#d4524e', '#8ab4e8'], shape: 'boxes' },
  books: { w: 74, h: 64, wall: '#b8cc9f', trim: '#7a5a8a', awning: ['#7a5a8a', '#efe6d0'], sign: 'BOOKS', goods: ['#c9604f', '#4a6fa5', '#e8b23a', '#4f7a58', '#8a5a6b'], shape: 'spines' },
  post: { w: 64, h: 62, wall: '#ecd9b0', trim: '#4a6fa5', awning: ['#4a6fa5', '#efe6d0'], sign: 'POST', goods: ['#b0703a', '#c9a07a', '#d9c4a0'], shape: 'boxes' },
  cinema: { w: 76, h: 78, wall: '#e2a79c', trim: '#8a5a6b', awning: ['#c9473f', '#f1e6cf'], sign: 'MOVIES', goods: ['#3f4a6a', '#8a3a5a', '#2f5a5a', '#c9a24a'], shape: 'boxes' },
};

/** A thin dithered shadow that fades out downward: under cornices and awnings. */
function fadeShadow(ctx: Ctx, x: number, y: number, w: number, rows: number): void {
  ctx.fillStyle = OUTLINE;
  for (let r = 0; r < rows; r++) {
    for (let px = x; px < x + w; px++) if (bayer(px, y + r) < 0.6 * (1 - r / rows)) ctx.fillRect(px, y + r, 1, 1);
  }
}

function centred(ctx: Ctx, text: string, cx: number, y: number, color: string): void {
  drawText(ctx, text, Math.round(cx - textWidth(text) / 2), y, color);
}

/** Brick walls: running courses of darker mortar lines with staggered joints, a lit left edge and a shaded right edge. */
function paintWall(ctx: Ctx, x: number, y: number, w: number, h: number, wall: string): void {
  const mortar = mix(wall, PLUM, 0.22);
  rect(ctx, OUTLINE, x - 1, y, w + 2, h + 1);
  rect(ctx, wall, x, y, w, h);
  for (let r = 3; r < h; r += 4) {
    rect(ctx, mortar, x, y + r, w, 1);
    for (let px = x + (((r - 3) / 4) % 2) * 3; px < x + w; px += BRICK_SPACING) rect(ctx, mortar, px, y + r - 3, 1, 3);
  }
  rect(ctx, mix(wall, '#ffffff', 0.3), x, y, 1, h);
  rect(ctx, mix(wall, PLUM, 0.35), x + w - 3, y, 3, h);
}

/** A framed glass pane with a glint, remembered so it can light up at dusk. */
function pane(ctx: Ctx, lit: TownWindow[], x: number, y: number, w: number, h: number): void {
  rect(ctx, OUTLINE, x - 1, y - 1, w + 2, h + 2);
  rect(ctx, GLASS, x, y, w, h);
  rect(ctx, '#b5ced8', x, y, 2, 1);
  line(ctx, '#8fb3c2', x + 2, y + h - 2, x + Math.min(6, w - 2), y + 1, 1);
  lit.push({ x, y, w, h, seed: hash(x * 3.1 + y * 1.7) });
}

/** Two shelves (or more) of goods behind the glass: boxes, loaves or book spines. */
function stock(ctx: Ctx, win: Rect, goods: readonly string[], shape: Shape): void {
  const shelves = Math.max(1, Math.floor(win.h / 10));
  for (let s = 0; s < shelves; s++) {
    const y = win.y + 9 + s * 10;
    rect(ctx, WOOD_DARK, win.x, y, win.w, 1);
    let x = win.x + 2;
    for (let i = 0; x < win.x + win.w - 4; i++) {
      const color = goods[(i + s * 2) % goods.length];
      if (shape === 'spines') {
        const tall = 5 + Math.floor(hash(i * 3 + s) * 3);
        rect(ctx, color, x, y - tall, 2, tall);
        x += 2;
      } else if (shape === 'loaves') {
        rect(ctx, color, x, y - 3, 6, 3);
        rect(ctx, mix(color, '#ffffff', 0.35), x + 1, y - 4, 4, 1);
        x += 8;
      } else {
        rect(ctx, color, x, y - 4, 4, 4);
        rect(ctx, mix(color, '#ffffff', 0.4), x, y - 4, 4, 1);
        x += 6;
      }
    }
  }
}

/** Awning with alternate stripes and a scalloped hem, with a soft shadow under it. */
function paintAwning(ctx: Ctx, x0: number, y: number, w: number, colors: readonly [string, string]): void {
  for (let px = x0 + 1; px < x0 + w - 1; px++) {
    const stripe = Math.floor((px - x0) / 5) % 2;
    const edge = (px - x0) % 5;
    const rows = edge === 0 || edge === 4 ? 7 : 8;
    rect(ctx, colors[stripe], px, y, 1, rows);
    rect(ctx, mix(colors[stripe], PLUM, 0.35), px, y + rows - 1, 1, 1);
    rect(ctx, mix(colors[stripe], '#ffffff', 0.35), px, y, 1, 1);
  }
  rect(ctx, OUTLINE, x0, y - 1, w, 1);
  fadeShadow(ctx, x0 + 2, y + 8, w - 4, 5);
}

/** A hanging sign's bracket on the wall's left edge: an arm out to the left and a small brace. */
function paintBracket(ctx: Ctx, x0: number, y: number): void {
  rect(ctx, IRON, x0 - 18, y, 19, 1);
  line(ctx, IRON, x0 - 1, y + 5, x0 - 7, y, 1);
}

/** One ordinary shopfront: brick wall, cornice, sign board, awning, window with stock, a glazed door. */
function paintShop(ctx: Ctx, lit: TownWindow[], cx: number, spec: ShopSpec): { x0: number; top: number } {
  const { w, h } = spec;
  const x0 = Math.round(cx - w / 2);
  const top = BASE - h;
  const awningTop = top + 22;
  paintWall(ctx, x0, top, w, h, spec.wall);
  rect(ctx, OUTLINE, x0 - 3, top - 1, w + 6, 6);
  rect(ctx, spec.trim, x0 - 2, top, w + 4, 4);
  rect(ctx, mix(spec.trim, '#ffffff', 0.4), x0 - 2, top, w + 4, 1);
  rect(ctx, OUTLINE, x0 + 4, top + 7, w - 8, 12);
  rect(ctx, mix(spec.trim, OUTLINE, 0.25), x0 + 5, top + 8, w - 10, 10);
  centred(ctx, spec.sign, x0 + w / 2, top + 11, CREAM);
  paintAwning(ctx, x0, awningTop, w, spec.awning);
  const win = { x: x0 + 6, y: awningTop + 9, w: w - 32, h: BASE - 14 - (awningTop + 9) };
  pane(ctx, lit, win.x, win.y, win.w, win.h);
  stock(ctx, win, spec.goods, spec.shape);
  rect(ctx, mix(spec.wall, PLUM, 0.3), x0 + 5, BASE - 13, win.w + 2, 13);
  const door = x0 + w - 22;
  rect(ctx, OUTLINE, door - 1, BASE - 29, 16, 29);
  rect(ctx, spec.trim, door, BASE - 28, 14, 28);
  rect(ctx, mix(spec.trim, '#ffffff', 0.3), door, BASE - 28, 1, 28);
  pane(ctx, lit, door + 2, BASE - 26, 10, 12);
  rect(ctx, '#e8c26a', door + 11, BASE - 12, 2, 2);
  rect(ctx, mix(spec.trim, OUTLINE, 0.3), door + 2, BASE - 12, 8, 11);
  return { x0, top };
}

/** The diner: red roof band over a cream stripe, a chrome line and teal lower wall; a long window with stools, a door, a neon sign. */
function paintDiner(ctx: Ctx, lit: TownWindow[], cx: number, out: Street): void {
  const w = 104;
  const x0 = cx - w / 2;
  const top = BASE - 54;
  rect(ctx, OUTLINE, x0 - 1, top + 5, w + 2, BASE - top - 4);
  rect(ctx, CREAM, x0, top + 6, w, 9);
  rect(ctx, CHROME, x0, top + 15, w, 2);
  rect(ctx, '#ffffff', x0 + 2, top + 15, w - 6, 1);
  rect(ctx, DINER_TEAL, x0, top + 17, w, BASE - top - 17);
  ditherFill(ctx, x0, BASE - 5, w, 5, DINER_TEAL, mix(DINER_TEAL, PLUM, 0.35), 0.45);
  rect(ctx, mix(DINER_TEAL, PLUM, 0.3), x0 + w - 3, top + 6, 3, BASE - top - 6);
  rect(ctx, OUTLINE, x0 - 3, top, w + 6, 6);
  rect(ctx, DINER_RED, x0 - 2, top + 1, w + 4, 4);
  rect(ctx, mix(DINER_RED, '#ffffff', 0.4), x0 - 2, top + 1, w - 6, 1);
  rect(ctx, OUTLINE, x0 + 4, top - 9, textWidth('DINER') + 6, 10);
  rect(ctx, '#2f2a3e', x0 + 5, top - 8, textWidth('DINER') + 4, 8);
  drawText(ctx, 'DINER', x0 + 7, top - 6, NEON_OFF);
  out.neon = { x: x0 + 7, y: top - 6 };
  fadeShadow(ctx, x0, top + 6, w, 4);
  const win = { x: x0 + 24, y: top + 22, w: w - 30, h: 17 };
  pane(ctx, lit, win.x, win.y, win.w, win.h);
  rect(ctx, '#8f6a52', win.x, win.y + 11, win.w, 2);
  for (let sx = win.x + 3; sx < win.x + win.w - 4; sx += 7) {
    rect(ctx, DINER_RED, sx, win.y + 8, 4, 2);
    rect(ctx, CHROME, sx + 1, win.y + 10, 1, 1);
  }
  drawText(ctx, 'OPEN', win.x + win.w - 19, win.y + 2, mix(DINER_RED, GLASS, 0.3));
  out.open = { x: win.x + win.w - 19, y: win.y + 2 };
  rect(ctx, OUTLINE, x0 + 6, BASE - 29, 15, 29);
  rect(ctx, DINER_RED, x0 + 7, BASE - 28, 13, 28);
  pane(ctx, lit, x0 + 9, BASE - 26, 9, 13);
  rect(ctx, GOLD, x0 + 18, BASE - 12, 1, 2);
}

/** The sheriff's office: tan wall, a stepped cornice, a board, a gold badge over the door, two barred windows, a wall lantern, a flagpole. */
function paintSheriff(ctx: Ctx, lit: TownWindow[], cx: number, out: Street): void {
  const w = 92;
  const x0 = cx - w / 2;
  const top = BASE - 56;
  paintWall(ctx, x0, top, w, 56, '#d3b48a');
  rect(ctx, OUTLINE, x0 - 3, top - 1, w + 6, 6);
  rect(ctx, '#8a6a58', x0 - 2, top, w + 4, 4);
  rect(ctx, mix('#8a6a58', '#ffffff', 0.4), x0 - 2, top, w + 4, 1);
  for (let mx = x0; mx < x0 + w - 4; mx += 8) rect(ctx, OUTLINE, mx, top - 4, 4, 3);
  rect(ctx, OUTLINE, x0 + 14, top + 7, w - 28, 10);
  rect(ctx, '#4a3a4a', x0 + 15, top + 8, w - 30, 8);
  centred(ctx, 'SHERIFF', cx, top + 10, GOLD);
  const mid = Math.round(cx);
  STAR.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) if (row[dx] === '#') rect(ctx, GOLD, mid - 2 + dx, top + 21 + dy, 1, 1);
  });
  rect(ctx, OUTLINE, mid - 8, BASE - 29, 17, 29);
  rect(ctx, '#6b4636', mid - 7, BASE - 28, 15, 28);
  pane(ctx, lit, mid - 5, BASE - 26, 11, 13);
  rect(ctx, GOLD, mid + 5, BASE - 12, 1, 2);
  for (const wx of [x0 + 8, x0 + w - 22]) {
    pane(ctx, lit, wx, top + 27, 14, 15);
    for (let bx = wx + 3; bx < wx + 14; bx += 4) rect(ctx, OUTLINE, bx, top + 27, 1, 15);
  }
  const lamp = { x: mid - 12, y: top + 24 };
  rect(ctx, OUTLINE, lamp.x - 2, lamp.y - 3, 5, 7);
  rect(ctx, '#cfd8dc', lamp.x - 1, lamp.y - 2, 3, 5);
  out.wallLamps.push(lamp);
  rect(ctx, OUTLINE, x0 + w - 5, top - 22, 1, 22);
  rect(ctx, GOLD, x0 + w - 6, top - 24, 3, 2);
  out.flag = { x: x0 + w - 4, y: top - 22 };
}

/** The town hall behind the square: four columns, a pediment with a clock, a name frieze, steps, two tall windows and a double door. */
function paintHall(ctx: Ctx, lit: TownWindow[], cx: number): void {
  const w = 112;
  const h = 84;
  const x0 = cx - w / 2;
  const top = BASE - h;
  const stone = '#e8dcc4';
  paintWall(ctx, x0, top + 28, w, h - 28, stone);
  polygon(ctx, OUTLINE, [{ x: x0 - 5, y: top + 15 }, { x: cx, y: top - 8 }, { x: x0 + w + 5, y: top + 15 }]);
  polygon(ctx, stone, [{ x: x0 - 3, y: top + 14 }, { x: cx, y: top - 5 }, { x: x0 + w + 3, y: top + 14 }]);
  polygon(ctx, mix(stone, PLUM, 0.2), [{ x: cx + 2, y: top - 3 }, { x: x0 + w + 3, y: top + 14 }, { x: cx + 2, y: top + 14 }]);
  rect(ctx, OUTLINE, cx - 7, top + 1, 15, 13);
  rect(ctx, CREAM, cx - 6, top + 2, 13, 11);
  rect(ctx, OUTLINE, cx, top + 4, 1, 4);
  rect(ctx, OUTLINE, cx, top + 7, 3, 1);
  rect(ctx, OUTLINE, x0 - 5, top + 14, w + 10, 5);
  rect(ctx, '#8a6a58', x0 - 4, top + 15, w + 8, 3);
  rect(ctx, '#5b3f5a', x0, top + 19, w, 9);
  centred(ctx, 'TOWN HALL', cx, top + 21, CREAM);
  for (let i = 0; i < 4; i++) {
    const colX = x0 + 4 + i * 32;
    rect(ctx, OUTLINE, colX - 1, top + 28, 9, h - 31);
    rect(ctx, '#f6efdf', colX, top + 29, 7, h - 31);
    rect(ctx, mix(stone, PLUM, 0.3), colX + 5, top + 29, 2, h - 31);
    rect(ctx, '#d9ccb4', colX - 1, top + 28, 9, 2);
    if (i < 3 && i !== 1) pane(ctx, lit, colX + 13, top + 36, 12, 22);
  }
  const door = x0 + 4 + 32 + 12;
  rect(ctx, OUTLINE, door - 1, BASE - 31, 16, 31);
  rect(ctx, '#6b4636', door, BASE - 30, 14, 30);
  rect(ctx, OUTLINE, door + 6, BASE - 30, 1, 30);
  pane(ctx, lit, door + 2, BASE - 27, 4, 8);
  pane(ctx, lit, door + 8, BASE - 27, 4, 8);
  for (let k = 0; k < STONE_STEP.length; k++) rect(ctx, STONE_STEP[k], x0 + 2 - k * 2, BASE + k * 2, w - 4 + k * 4, 2);
}

/** Cinema bulbs along its sign's top edge; their places are returned so they can twinkle at dusk. */
function paintBulbs(ctx: Ctx, x0: number, w: number, y: number, out: Point[]): void {
  for (let bx = x0 + 6; bx < x0 + w - 4; bx += 8) {
    rect(ctx, '#f4e2a0', bx, y, 2, 2);
    out.push({ x: bx + 1, y: y + 1 });
  }
}

/** Street lamps with a lantern each: wall lanterns from the buildings were added first, the poles are added here. */
function paintLamps(ctx: Ctx, xs: readonly { x: number; base: number }[], out: Point[]): void {
  for (const lamp of xs) out.push(lampPost(ctx, lamp.x, lamp.base, LAMP_HEIGHT, LAMP_IRON, LAMP_GLASS));
  out.sort((a, b) => a.x - b.x);
}

/** Everything standing on the street, painted back to front onto one picture `worldWidth` wide. */
export function buildStreet(worldWidth: number, s: Spots): Street {
  const { canvas, ctx } = memoryCanvas(worldWidth, DESIGN_ROWS);
  const lit: TownWindow[] = [];
  const out: Street = {
    canvas, lit, lamps: [], wallLamps: [], neon: { x: 0, y: 0 }, open: { x: 0, y: 0 }, flag: { x: 0, y: 0 }, chimney: { x: 0, y: 0 }, signs: [], bulbs: [], bar: { x: s.car, y: CAR_BASE - 24 },
    carBox: { x: s.car - 26, y: CAR_BASE - 26, w: 53, h: 28 }, nozzle: fountainNozzle(s.fountain, SQUARE_BASE),
    fountainBox: { x: s.fountain - 30, y: SQUARE_BASE - 32, w: 60, h: 32 },
  };
  paintHall(ctx, lit, s.hall);
  const hardware = paintShop(ctx, lit, s.hardware, SHOPS.hardware);
  const bakery = paintShop(ctx, lit, s.bakery, SHOPS.bakery);
  paintShop(ctx, lit, s.gift, SHOPS.gift);
  paintShop(ctx, lit, s.books, SHOPS.books);
  const cinema = paintShop(ctx, lit, s.cinema, SHOPS.cinema);
  paintShop(ctx, lit, s.post, SHOPS.post);
  paintDiner(ctx, lit, s.diner, out);
  paintSheriff(ctx, lit, s.sheriff, out);
  paintBulbs(ctx, cinema.x0, SHOPS.cinema.w, cinema.top + 6, out.bulbs);
  rect(ctx, '#7a3a2a', bakery.x0 + SHOPS.bakery.w - 16, bakery.top - 14, 8, 15);
  rect(ctx, '#5a2a22', bakery.x0 + SHOPS.bakery.w - 10, bakery.top - 14, 2, 15);
  rect(ctx, OUTLINE, bakery.x0 + SHOPS.bakery.w - 17, bakery.top - 16, 10, 2);
  out.chimney = { x: bakery.x0 + SHOPS.bakery.w - 12, y: bakery.top - 16 };
  for (const [shop, kind] of [[bakery, 'loaf'], [hardware, 'cog']] as const) {
    paintBracket(ctx, shop.x0, shop.top + 24);
    out.signs.push({ x: shop.x0 - 17, y: shop.top + 25, kind });
  }
  paintHardwareStock(ctx, s.hardware - 30, PAVE_BASE);
  paintPlanter(ctx, s.bakery - 46, PAVE_BASE, FLOWER_TONES[1]);
  paintPlanter(ctx, s.books + SHOPS.books.w / 2 + 8, PAVE_BASE, FLOWER_TONES[0]);
  paintSpecialsBoard(ctx, s.diner + 12, CURB_BASE, 'SOUP:', 'GUESS!');
  paintJunkCart(ctx, s.cart, CURB_BASE + 1);
  paintPostcardRack(ctx, s.gift - 24, PAVE_BASE);
  paintGnome(ctx, s.gift + 26, PAVE_BASE);
  paintHydrant(ctx, s.gift + 52, CURB_BASE - 1);
  paintNewsBox(ctx, s.gift + 63, CURB_BASE - 1);
  paintNoticeBoard(ctx, s.notice, PAVE_BASE - 1);
  paintBike(ctx, s.cinema - 56, PAVE_BASE);
  paintTrashCan(ctx, s.cinema + 46, PAVE_BASE);
  paintPostBox(ctx, s.post - 26, PAVE_BASE);
  paintBench(ctx, s.fountain - 88, SQUARE_LAMP_BASE - 2);
  paintBench(ctx, s.fountain + 88, SQUARE_LAMP_BASE - 2);
  paintFountainBasin(ctx, s.fountain, SQUARE_BASE);
  paintPatrolCar(ctx, s.car, CAR_BASE);
  paintLamps(ctx, [
    { x: s.hardware - 54, base: CURB_BASE },
    { x: (s.hardware + s.bakery) / 2, base: CURB_BASE },
    { x: s.diner - 84, base: CURB_BASE },
    { x: s.sheriff - 58, base: CURB_BASE },
    { x: s.fountain - 62, base: SQUARE_LAMP_BASE },
    { x: s.fountain + 62, base: SQUARE_LAMP_BASE },
    { x: s.post + 56, base: CURB_BASE },
  ], out.lamps);
  return out;
}
