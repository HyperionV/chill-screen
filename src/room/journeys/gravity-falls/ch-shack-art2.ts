/**
 * Morning at the Shack, part two: the building and the yard, painted once onto one world-wide "props" picture that
 * scrolls with the ground. `anchorsFor` says where the moving and glowing parts (smoke, chimes, lit windows) belong.
 */
import { textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, drawSign, ellipse, fenceRun, line, polygon, rect, shaded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { SHACK, type Rect } from '../../landscapes/gravity-falls/shack-art';
import { hash } from '../noise';
import {
  BASE, FRONT_HALF, PORCH_BOTTOM, SIDE_END, WALL_TOP, X,
  paintBarrel, paintBarrow, paintBlock, paintCans, paintCart, paintCrates, paintFlamingo, paintMailbox, paintTyres,
  paintVending, paintWoodpile,
} from './ch-shack-art';
import { DESIGN_ROWS } from './world';

const SIGN_TEXT = 'MYSTERY SHACK';
const PLANK = 7;
const RIDGE_ROW = 157;
const DECK_FRONT = 230;
const AWNING_TOP = 184;
const AWNING_ROWS = 9;
const STRIPE = 6;
const SHED_W = 78;
const SHED_TOP = 182;
const PAPER = '#ead39b';
const SIDE_WOOD = '#9b7243';
const SHED_WOOD = '#8a7050';
const TIN = '#6e8a8c';
const LINE_ROW = 174;
const LINE_SAG = 3;
const SHOP_ROW = 204;
const VENDING_TOP = 190;
const SIGN_BOTTOM = 150;
const BILLBOARD_TEXT = 'TOURISTS WELCOME!';
const SOUVENIRS = [SHACK.red, SHACK.trimLight, SHACK.lamp, '#d88fb0', SHACK.cream] as const;

/** Where the parts that move or glow sit, in world pixels. */
export interface Anchors {
  sign: Rect;
  chimney: Point;
  sideWindow: Rect;
  shopWindow: Rect;
  lantern: Point;
  vendingGlass: Rect;
  chimes: Point;
  cart: Rect;
  laundry: { x0: number; x1: number; y: number };
}

/** The roof sign's board: `scale` is how many pixels each letter pixel covers. */
export function signRect(pc: number, scale: number): Rect {
  const w = textWidth(SIGN_TEXT) * scale + 2 * (scale + 1);
  const h = 5 * scale + 2 * (scale + 1);
  return { x: pc + X.peak - Math.round(w / 2), y: SIGN_BOTTOM - h, w, h };
}

export function anchorsFor(pc: number, scale: number): Anchors {
  return {
    sign: signRect(pc, scale),
    chimney: { x: pc + X.chimney, y: 130 },
    sideWindow: { x: pc + X.sideWindow - 8, y: 196, w: 16, h: 14 },
    shopWindow: { x: pc + X.shopWindow - 25, y: SHOP_ROW, w: 50, h: 14 },
    lantern: { x: pc + X.lantern, y: 204 },
    vendingGlass: { x: pc + X.vending - 8, y: VENDING_TOP + 9, w: 13, h: 18 },
    chimes: { x: pc + X.awningLeft - 2, y: AWNING_TOP + AWNING_ROWS },
    cart: { x: pc + X.cart - 19, y: 202, w: 38, h: 28 },
    laundry: { x0: pc + X.laundryLeft, x1: pc + X.laundryRight, y: LINE_ROW },
  };
}

/** A band of dithered shadow that thins out downward: under eaves, awnings and the porch. */
function fadeShadow(ctx: Ctx, x: number, y: number, w: number, rows: number, color: string): void {
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let px = x; px < x + w; px++) if (bayer(px, y + r) < 0.7 * (1 - r / rows)) ctx.fillRect(px, y + r, 1, 1);
  }
}

/** Planked wall with seams, board ends and knots; `base` and `dark`/`light` tint the boards. */
function paintPlanks(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, dark: string, light: string): void {
  rect(ctx, base, x, y, w, h);
  for (let px = x; px < x + w; px += PLANK) {
    rect(ctx, dark, px, y, 1, h);
    rect(ctx, light, px + 1, y, 1, h);
    rect(ctx, dark, px + 1, y + Math.round(hash(px * 1.7 + y) * h), 4, 1);
  }
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const n = hash(px * 3.1 + py * 7.7);
      if (n < 0.03) rect(ctx, light, px, py, 1, 1);
      else if (n > 0.978) rect(ctx, dark, px, py, 2, 1);
    }
  }
}

function paintWindow(ctx: Ctx, r: Rect, shutters: boolean): void {
  rect(ctx, SHACK.outline, r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  rect(ctx, SHACK.woodLight, r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  rect(ctx, SHACK.glass, r.x, r.y, r.w, r.h);
  for (let px = r.x; px < r.x + r.w; px++) if (bayer(px, r.y) < 0.5) rect(ctx, SHACK.glassDark, px, r.y + r.h - 3, 1, 3);
  rect(ctx, SHACK.woodDark, r.x + Math.floor(r.w / 2), r.y, 1, r.h);
  rect(ctx, SHACK.woodDark, r.x, r.y + Math.floor(r.h / 2), r.w, 1);
  line(ctx, SHACK.glassLight, r.x + 1, r.y + 4, r.x + 4, r.y + 1, 1);
  rect(ctx, SHACK.outline, r.x - 3, r.y + r.h + 1, r.w + 6, 2);
  if (!shutters) return;
  rect(ctx, SHACK.red, r.x - 4, r.y - 2, 3, r.h + 4);
  rect(ctx, SHACK.red, r.x + r.w + 1, r.y - 2, 3, r.h + 4);
}

/** The long crooked roof: shingle rows on a flat trapezoid with a lit ridge and a thick edge board. */
function paintRoof(ctx: Ctx, x0: number, w: number): void {
  const eaveL = { x: x0 - 14, y: WALL_TOP + 4 };
  const eaveR = { x: x0 + w + 14, y: WALL_TOP + 2 };
  const ridgeL = { x: x0 + 10, y: RIDGE_ROW + 2 };
  const ridgeR = { x: x0 + w - 10, y: RIDGE_ROW };
  const top = RIDGE_ROW - 1;
  const rows = eaveL.y - top + 2;
  shaded(ctx, eaveL.x, top, eaveR.x - eaveL.x + 1, rows, (c) => polygon(c, SHACK.roof, [eaveL, ridgeL, ridgeR, eaveR]), (c) => {
    for (let y = top; y < top + rows; y += 3) {
      rect(c, SHACK.roofDark, eaveL.x, y, eaveR.x - eaveL.x, 1);
      for (let x = eaveL.x + (((y - top) / 3) % 2) * 3; x < eaveR.x; x += 6) rect(c, SHACK.roofDark, x, y + 1, 1, 2);
    }
    for (let i = 0; i < 90; i++) rect(c, SHACK.roofLight, eaveL.x + hash(i) * (eaveR.x - eaveL.x), top + hash(i + 71) * rows, 2, 1);
  });
  line(ctx, SHACK.roofLight, ridgeL.x, ridgeL.y, ridgeR.x, ridgeR.y, 1);
  line(ctx, SHACK.roofDark, eaveL.x, eaveL.y, eaveR.x, eaveR.y, 3);
  line(ctx, SHACK.roofLight, eaveL.x + 1, eaveL.y - 1, eaveR.x - 1, eaveR.y - 2, 1);
  fadeShadow(ctx, eaveL.x + 14, eaveL.y + 2, eaveR.x - eaveL.x - 28, 6, SHACK.outline);
}

/** The big hand-painted roof sign: its left half sits a row higher, so it looks hung by Soos; bulbs along the top. */
function paintRoofSign(ctx: Ctx, pc: number, scale: number): void {
  const sign = signRect(pc, scale);
  for (const px of [sign.x + 6, sign.x + sign.w - 9]) {
    rect(ctx, SHACK.woodDark, px, sign.y + sign.h, 3, RIDGE_ROW + 4 - sign.y - sign.h);
    rect(ctx, SHACK.wood, px, sign.y + sign.h, 1, RIDGE_ROW + 4 - sign.y - sign.h);
  }
  const { canvas: board, ctx: boardCtx } = memoryCanvas(sign.w, sign.h);
  drawSign(boardCtx, SIGN_TEXT, 0, 0, scale, SHACK.outline, PAPER);
  const half = Math.floor(sign.w / 2);
  ctx.drawImage(board, 0, 0, half, sign.h, sign.x, sign.y - 1, half, sign.h);
  ctx.drawImage(board, half, 0, sign.w - half, sign.h, sign.x + half, sign.y, sign.w - half, sign.h);
  for (let bx = sign.x + 4; bx < sign.x + sign.w - 2; bx += 9) rect(ctx, SHACK.lamp, bx, sign.y - 3, 2, 2);
}

function paintChimney(ctx: Ctx, pc: number): void {
  const x = pc + X.chimney - 4;
  const y = 132;
  const h = 28;
  rect(ctx, SHACK.brickDark, x - 1, y - 1, 10, h + 1);
  rect(ctx, SHACK.brick, x, y, 8, h);
  for (let row = 2; row < h; row += 3) {
    rect(ctx, SHACK.brickDark, x, y + row, 8, 1);
    rect(ctx, SHACK.brickDark, x + (row % 2 ? 2 : 5), y + row - 2, 1, 2);
  }
  rect(ctx, SHACK.roofLight, x, y, 1, h);
  rect(ctx, SHACK.woodDark, x - 2, y - 3, 12, 3);
  rect(ctx, SHACK.roofLight, x - 2, y - 3, 12, 1);
}

function paintDoor(ctx: Ctx, pc: number): void {
  const left = pc + X.door - 8;
  const top = BASE - 27;
  rect(ctx, SHACK.outline, left - 1, top - 1, 18, 28);
  rect(ctx, SHACK.trim, left, top, 16, 27);
  rect(ctx, SHACK.trimLight, left, top, 1, 27);
  rect(ctx, SHACK.trimDark, left + 14, top, 2, 27);
  rect(ctx, SHACK.glass, left + 3, top + 3, 10, 7);
  rect(ctx, SHACK.trimDark, left + 7, top + 3, 1, 7);
  rect(ctx, SHACK.trimDark, left + 3, top + 13, 10, 1);
  rect(ctx, SHACK.trimDark, left + 3, top + 15, 10, 8);
  rect(ctx, SHACK.trim, left + 4, top + 16, 8, 6);
  rect(ctx, SHACK.lamp, left + 12, top + 14, 2, 2);
}

/** The gift shop: striped awning on two posts, a hanging GIFT SHOP board, a window of souvenirs on two shelves. */
function paintGiftShop(ctx: Ctx, pc: number): void {
  const win = anchorsFor(pc, 1).shopWindow;
  paintWindow(ctx, win, false);
  rect(ctx, SHACK.woodDark, win.x, win.y + 5, win.w, 1);
  rect(ctx, SHACK.woodDark, win.x, win.y + 10, win.w, 1);
  for (let i = 0; i < 9; i++) {
    rect(ctx, SOUVENIRS[i % SOUVENIRS.length], win.x + 2 + i * 5, win.y + 2, 3, 3);
    rect(ctx, SOUVENIRS[(i + 2) % SOUVENIRS.length], win.x + 3 + i * 5, win.y + 7, 3, 3);
  }
  const a = pc + X.awningLeft;
  const b = pc + X.awningRight;
  fadeShadow(ctx, a + 2, AWNING_TOP + AWNING_ROWS, b - a - 4, 6, SHACK.outline);
  for (let x = a; x < b; x++) {
    const stripe = Math.floor((x - a) / STRIPE);
    const edge = (x - a) % STRIPE;
    const rows = edge === 0 || edge === STRIPE - 1 ? AWNING_ROWS - 2 : edge === 1 || edge === STRIPE - 2 ? AWNING_ROWS - 1 : AWNING_ROWS;
    rect(ctx, stripe % 2 === 0 ? SHACK.trim : SHACK.cream, x, AWNING_TOP, 1, rows);
    rect(ctx, stripe % 2 === 0 ? SHACK.trimLight : '#ffffff', x, AWNING_TOP, 1, 1);
    rect(ctx, stripe % 2 === 0 ? SHACK.trimDark : '#bfae8a', x, AWNING_TOP + rows - 1, 1, 1);
  }
  for (const px of [a + 3, b - 4]) {
    rect(ctx, SHACK.wood, px, AWNING_TOP + AWNING_ROWS, 2, BASE + 4 - AWNING_TOP - AWNING_ROWS);
    rect(ctx, SHACK.woodDark, px + 1, AWNING_TOP + AWNING_ROWS, 1, BASE + 4 - AWNING_TOP - AWNING_ROWS);
  }
  const shopW = textWidth('GIFT SHOP') + 4;
  drawSign(ctx, 'GIFT SHOP', win.x + win.w / 2 - shopW / 2, AWNING_TOP + AWNING_ROWS + 1, 1, SHACK.outline, PAPER);
}

/** The porch deck with its planks, dark front board, two steps, doormat, a rocking chair and a hanging lantern. */
function paintPorch(ctx: Ctx, pc: number): void {
  const left = pc - FRONT_HALF - 6;
  const w = FRONT_HALF * 2 + 12;
  rect(ctx, SHACK.woodLight, left, BASE, w, DECK_FRONT - BASE);
  for (let y = BASE + 2; y < DECK_FRONT; y += 2) rect(ctx, SHACK.wood, left, y, w, 1);
  for (let px = left; px < left + w; px += 11) rect(ctx, SHACK.woodDark, px, BASE, 1, DECK_FRONT - BASE);
  rect(ctx, SHACK.woodDark, left, DECK_FRONT, w, PORCH_BOTTOM - DECK_FRONT);
  rect(ctx, SHACK.outline, left, PORCH_BOTTOM, w, 1);
  for (let px = left + 4; px < left + w; px += 12) rect(ctx, SHACK.wood, px, DECK_FRONT + 2, 1, 3);
  fadeShadow(ctx, left + 2, PORCH_BOTTOM + 1, w, 4, '#6e5e49');
  rect(ctx, SHACK.woodLight, pc - 34, DECK_FRONT, 28, 3);
  rect(ctx, SHACK.wood, pc - 36, DECK_FRONT + 3, 32, 3);
  rect(ctx, SHACK.outline, pc - 36, DECK_FRONT + 6, 32, 1);
  rect(ctx, SHACK.red, pc + X.door - 8, BASE + 2, 16, 2);
  rect(ctx, SHACK.cream, pc + X.door - 7, BASE + 3, 14, 1);
  const chair = pc - 104;
  rect(ctx, SHACK.woodDark, chair, BASE - 15, 2, 15);
  rect(ctx, SHACK.wood, chair + 2, BASE - 7, 10, 2);
  rect(ctx, SHACK.woodDark, chair + 10, BASE - 12, 2, 5);
  rect(ctx, SHACK.outline, chair - 2, BASE, 16, 1);
  rect(ctx, SHACK.outline, pc + X.lantern, BASE - 28, 1, 4);
  rect(ctx, SHACK.outline, pc + X.lantern - 3, BASE - 24, 7, 1);
  rect(ctx, SHACK.outline, pc + X.lantern - 3, BASE - 23, 7, 7);
  rect(ctx, SHACK.lamp, pc + X.lantern - 2, BASE - 22, 5, 5);
  rect(ctx, '#fff3c4', pc + X.lantern - 1, BASE - 21, 2, 2);
}

/** The front of the Shack: wall, roof, windows, door, notice, gift shop, vending machine, chimney and sign. */
function paintFront(ctx: Ctx, pc: number, scale: number): void {
  const x0 = pc - FRONT_HALF;
  const w = FRONT_HALF * 2;
  paintPlanks(ctx, x0, WALL_TOP, w, BASE - WALL_TOP, SHACK.wood, SHACK.woodDark, SHACK.woodLight);
  fadeShadow(ctx, x0, WALL_TOP + 4, w, 6, SHACK.outline);
  rect(ctx, SHACK.woodDark, x0, WALL_TOP, 3, BASE - WALL_TOP);
  rect(ctx, SHACK.woodDark, x0 + w - 3, WALL_TOP, 3, BASE - WALL_TOP);
  paintRoof(ctx, x0, w);
  paintChimney(ctx, pc);
  paintWindow(ctx, { x: pc + X.leftWindow - 9, y: 194, w: 18, h: 14 }, true);
  paintDoor(ctx, pc);
  drawSign(ctx, 'OPEN', pc + X.openSign, 201, 1, SHACK.outline, '#f1d98a');
  paintGiftShop(ctx, pc);
  paintVending(ctx, pc + X.vending - 10, VENDING_TOP);
  paintRoofSign(ctx, pc, scale);
}

/** The side of the Shack seen from the road: darker boards, a low roof, a window with curtains, a drainpipe and a puddle. */
function paintSide(ctx: Ctx, pc: number): void {
  const x0 = pc + FRONT_HALF - 2;
  const w = pc + SIDE_END - x0;
  paintPlanks(ctx, x0, WALL_TOP + 8, w, BASE - WALL_TOP - 8, SIDE_WOOD, '#74512f', '#b58a56');
  shaded(ctx, x0 + 8, 166, w + 8, 20, (c) => polygon(c, SHACK.roofDark, [{ x: x0 + 8, y: 176 }, { x: x0 + 16, y: 166 }, { x: pc + SIDE_END + 4, y: 170 }, { x: pc + SIDE_END + 8, y: 184 }, { x: x0 + 8, y: 184 }]), (c) => {
    for (let y = 168; y < 186; y += 3) rect(c, SHACK.roof, x0, y, w + 20, 1);
  });
  fadeShadow(ctx, x0, WALL_TOP + 8, w, 6, SHACK.outline);
  paintWindow(ctx, anchorsFor(pc, 1).sideWindow, false);
  rect(ctx, '#e8e0c8', pc + X.sideWindow - 7, 197, 4, 7);
  rect(ctx, '#e8e0c8', pc + X.sideWindow + 3, 197, 4, 7);
  rect(ctx, '#8a949a', pc + X.drainpipe, WALL_TOP + 4, 2, BASE - WALL_TOP - 4);
  rect(ctx, '#aab4ba', pc + X.drainpipe, WALL_TOP + 4, 1, BASE - WALL_TOP - 4);
  rect(ctx, '#8a949a', pc + X.drainpipe - 2, BASE - 3, 4, 2);
  ellipse(ctx, '#9fc4d4', pc + X.drainpipe + 5, BASE + 6, 8, 1);
  for (let px = x0; px < x0 + w; px += 5) rect(ctx, '#7a7568', px, BASE - 4, 3, 4);
}

/** Two laundry poles with a sagging line; the clothes are drawn each frame so they can blow in the wind. */
function paintLaundryPoles(ctx: Ctx, pc: number): void {
  const left = pc + X.laundryLeft;
  const right = pc + X.laundryRight;
  for (const px of [left, right]) {
    rect(ctx, SHACK.woodDark, px - 1, LINE_ROW - 4, 3, 56);
    rect(ctx, SHACK.wood, px - 1, LINE_ROW - 4, 1, 56);
    rect(ctx, SHACK.woodDark, px - 4, LINE_ROW - 4, 9, 2);
  }
  for (let x = left; x <= right; x++) rect(ctx, '#e8e0c8', x, LINE_ROW + Math.round(LINE_SAG * Math.sin((Math.PI * (x - left)) / (right - left))), 1, 1);
}

/** The storage shed: weathered boards, a tin roof, a window, double doors with a brace and padlock, a KEEP OUT board, a shovel. */
function paintShed(ctx: Ctx, pc: number): void {
  const x0 = pc + X.shed - SHED_W / 2;
  paintPlanks(ctx, x0, SHED_TOP, SHED_W, BASE - SHED_TOP, SHED_WOOD, '#6b553a', '#a38a66');
  shaded(ctx, x0 - 5, 166, SHED_W + 10, 19, (c) => polygon(c, TIN, [{ x: x0 - 5, y: 175 }, { x: x0 - 5, y: 184 }, { x: x0 + SHED_W + 5, y: 184 }, { x: x0 + SHED_W + 5, y: 166 }]), (c) => {
    for (let px = x0 - 5; px < x0 + SHED_W + 5; px += 4) {
      rect(c, '#587274', px, 166, 1, 19);
      rect(c, '#9ab4b4', px + 1, 166, 1, 19);
    }
  });
  rect(ctx, SHACK.outline, x0 - 5, 183, SHED_W + 10, 1);
  fadeShadow(ctx, x0, SHED_TOP + 2, SHED_W, 5, SHACK.outline);
  paintWindow(ctx, { x: x0 + 8, y: 196, w: 16, h: 12 }, false);
  const door = x0 + 36;
  rect(ctx, SHACK.outline, door - 1, 193, 36, 32);
  rect(ctx, '#6f5a3c', door, 194, 34, 30);
  rect(ctx, SHACK.outline, door + 16, 194, 2, 30);
  line(ctx, '#a38a66', door + 2, 196, door + 14, 222, 1);
  line(ctx, '#a38a66', door + 20, 196, door + 32, 222, 1);
  rect(ctx, '#c0b060', door + 14, 207, 5, 4);
  rect(ctx, SHACK.outline, door + 15, 205, 3, 2);
  drawSign(ctx, 'KEEP OUT', door - 1, 184, 1, SHACK.outline, '#e8c4a0');
  line(ctx, SHACK.woodDark, x0 + SHED_W + 1, BASE + 2, x0 + SHED_W + 6, 198, 1);
  rect(ctx, '#aab4ba', x0 + SHED_W + 5, 195, 4, 5);
}

/** The roadside billboard and the parking sign: boards on posts, with the Shack's own wording. */
function paintRoadSigns(ctx: Ctx, pc: number): void {
  const board = drawSign(ctx, BILLBOARD_TEXT, pc + X.billboard, 190, 1, SHACK.outline, PAPER);
  for (const dx of [6, board.w - 9]) {
    rect(ctx, SHACK.woodDark, pc + X.billboard + dx, 190 + board.h, 3, 226 - 190 - board.h);
    rect(ctx, SHACK.wood, pc + X.billboard + dx, 190 + board.h, 1, 226 - 190 - board.h);
  }
  rect(ctx, SHACK.red, pc + X.billboard + 2, 190 + board.h - 4, board.w - 4, 1);
  const post = pc + X.parking;
  drawSign(ctx, 'PARKING', post - 15, 204, 1, SHACK.outline, '#e9e2c8');
  rect(ctx, SHACK.woodDark, post - 1, 213, 3, 15);
}

/** Paints the whole chapter's standing things onto one picture `worldWidth` wide, back to front. */
export function paintProps(worldWidth: number, pc: number, scale: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(worldWidth, DESIGN_ROWS);
  const fenceLeft = pc + X.fence;
  fenceRun(ctx, fenceLeft, 222, worldWidth - fenceLeft, { wood: SHACK.wood, light: SHACK.woodLight, dark: SHACK.woodDark }, 12, 11);
  paintShed(ctx, pc);
  paintSide(ctx, pc);
  paintFront(ctx, pc, scale);
  paintPorch(ctx, pc);
  paintLaundryPoles(ctx, pc);
  paintRoadSigns(ctx, pc);
  paintMailbox(ctx, pc + X.mailbox, 228);
  paintCans(ctx, pc + X.cans, 230);
  paintTyres(ctx, pc + X.tyres, 232);
  ellipse(ctx, '#b79a68', pc + X.cart + 4, 232, 14, 2);
  paintCart(ctx, pc + X.cart, 231);
  paintFlamingo(ctx, pc + X.flamingo, 228);
  paintWoodpile(ctx, pc + X.woodpile, 226);
  paintBlock(ctx, pc + X.block, 229);
  paintBarrel(ctx, pc + X.barrel, 231);
  paintCrates(ctx, pc + X.crates, 229);
  paintBarrow(ctx, pc + X.barrow, 230);
  return canvas;
}
