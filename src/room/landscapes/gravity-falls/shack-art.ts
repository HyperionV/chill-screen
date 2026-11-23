/**
 * The Mystery Shack building: where everything stands (`shackGeometry`) and how the crooked wooden house, its roof
 * sign, porch, awning, door and windows are painted (`paintShack`). Static work, run once when the scene is built.
 */
import { textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, disc, drawSign, line, polygon, rect, shaded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { hash } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Sun-baked wood, teal trim and a rust-brown roof: the Shack's daylight colours, shared with its props. */
export const SHACK = {
  wood: '#b98a4f', woodLight: '#d6aa6b', woodDark: '#8b5f37', outline: '#4a2f20',
  trim: '#2f8f86', trimDark: '#1f5f5c', trimLight: '#5bb8aa',
  roof: '#7b4636', roofDark: '#52302a', roofLight: '#a8694f',
  paper: '#ead39b', cream: '#eadfc2', brick: '#9a4a3a', brickDark: '#6b3128',
  glass: '#97c7cc', glassDark: '#5f8f98', glassLight: '#d6eef0', lamp: '#ffd27a', red: '#c4473b',
} as const;

/** Row of the highest roof point, where the sign stands. */
export const PEAK_Y = 128;
/** Row where the gable meets the wall (the eave line). */
export const WALL_TOP = 172;
/** Row where the wall meets the porch floor. */
export const BASE = 224;
/** Bottom row of the porch's front board. */
export const PORCH_FRONT = 233;
const SIGN_TEXT = 'MYSTERY SHACK';
const EAVE_OUT = 7;
/** The far roof plane is shifted this far up and right from the front slope, which gives the roof depth. */
const PLANE_DX = 14;
const PLANE_DY = 9;
const PLANK = 7;
const AWNING_TOP = 188;
const AWNING_ROWS = 9;
const STRIPE = 6;
const DOOR_W = 16;
const DOOR_H = 27;
const WINDOW_H = 14;
const CHIMNEY_W = 8;
const CHIMNEY_H = 17;
const BULB_GAP = 9;

export interface ShackGeometry {
  x0: number;
  x1: number;
  peakX: number;
  doorX: number;
  leftEave: Point;
  rightEave: Point;
  chimney: Rect;
  signSize: number;
  sign: Rect;
  signBulbs: readonly Point[];
  leftWindow: Rect;
  shopWindow: Rect;
  atticWindow: Point;
  lantern: Point;
  awningLeft: number;
  awningRight: number;
}

/** The height of the line from `from` to `to` at horizontal position `x`. */
function edgeY(from: Point, to: Point, x: number): number {
  return from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x);
}

/** Works out where every part of the shack goes for a design width: about 28% of the width, standing at the left. */
export function shackGeometry(width: number): ShackGeometry {
  const bw = Math.min(150, Math.max(84, Math.round(width * 0.28)));
  const x0 = Math.round(width * 0.06);
  const x1 = x0 + bw;
  const peakX = x0 + Math.round(bw * 0.46);
  const doorX = x0 + Math.round(bw * 0.5);
  const leftEave = { x: x0 - EAVE_OUT, y: WALL_TOP + 2 };
  const rightEave = { x: x1 + EAVE_OUT, y: WALL_TOP - 2 };
  const peak = { x: peakX, y: PEAK_Y };
  const signSize = bw >= 130 ? 2 : 1;
  const signW = textWidth(SIGN_TEXT) * signSize + 2 * (signSize + 1);
  const signH = 5 * signSize + 2 * (signSize + 1);
  const sign = { x: peakX - Math.round(signW / 2), y: PEAK_Y + 6 - signH, w: signW, h: signH };
  const chimneyX = peakX + Math.max(Math.round(bw * 0.38), Math.round(signW / 2) + 6);
  const planeMid = (edgeY(peak, rightEave, chimneyX) + edgeY(peak, rightEave, chimneyX - PLANE_DX) - PLANE_DY) / 2;
  const chimneyBottom = Math.round(planeMid) + 3;
  const signBulbs: Point[] = [];
  for (let bx = sign.x + 4; bx < sign.x + sign.w - 2; bx += BULB_GAP) signBulbs.push({ x: bx, y: sign.y - 2 });
  return {
    x0, x1, peakX, doorX, leftEave, rightEave, signSize, sign, signBulbs,
    chimney: { x: chimneyX - CHIMNEY_W / 2, y: chimneyBottom - CHIMNEY_H, w: CHIMNEY_W, h: CHIMNEY_H },
    leftWindow: { x: x0 + Math.round(bw * 0.17) - 9, y: 200, w: 18, h: WINDOW_H },
    shopWindow: { x: x0 + Math.round(bw * 0.8) - 10, y: 208, w: 20, h: 12 },
    atticWindow: { x: peakX, y: 158 },
    lantern: { x: doorX - 13, y: BASE - 20 },
    awningLeft: x0 - 3,
    awningRight: x1 + 3,
  };
}

/** Darkens a band of pixels in an ordered dither that thins out downward: the soft shadow under an eave or awning. */
function underShadow(ctx: Ctx, x: number, y: number, w: number, rows: number, color: string): void {
  ctx.fillStyle = color;
  for (let r = 0; r < rows; r++) {
    for (let px = x; px < x + w; px++) if (bayer(px, y + r) < 0.7 * (1 - r / rows)) ctx.fillRect(px, y + r, 1, 1);
  }
}

function paintWall(ctx: Ctx, g: ShackGeometry): void {
  const w = g.x1 - g.x0;
  const h = BASE - PEAK_Y + 1;
  const outline: Point[] = [
    { x: g.x0, y: BASE }, { x: g.x1, y: BASE }, { x: g.x1, y: WALL_TOP }, { x: g.peakX, y: PEAK_Y }, { x: g.x0, y: WALL_TOP },
  ];
  shaded(ctx, g.x0, PEAK_Y, w, h, (c) => polygon(c, SHACK.wood, outline), (c) => {
    for (let px = g.x0; px < g.x1; px += PLANK) {
      rect(c, SHACK.woodDark, px, PEAK_Y, 1, h);
      rect(c, SHACK.woodLight, px + 1, PEAK_Y, 1, h);
    }
    for (let py = PEAK_Y; py <= BASE; py++) {
      for (let px = g.x0; px < g.x1; px++) {
        const n = hash(px * 3.1 + py * 7.7);
        if (n < 0.035) rect(c, SHACK.woodLight, px, py, 1, 1);
        else if (n > 0.975) rect(c, SHACK.woodDark, px, py, 2, 1);
      }
    }
    // Board ends: short dark seams at staggered heights, so the planks do not look like one stripe.
    for (let px = g.x0; px < g.x1; px += PLANK) {
      rect(c, SHACK.woodDark, px + 1, PEAK_Y + Math.round(hash(px) * h), 5, 1);
    }
    rect(c, SHACK.woodLight, g.x0, WALL_TOP, 1, BASE - WALL_TOP);
    rect(c, SHACK.woodDark, g.x1 - 1, WALL_TOP, 2, BASE - WALL_TOP);
    underShadow(c, g.x0, WALL_TOP + 3, w, 6, SHACK.outline);
    for (let py = BASE - 6; py < BASE; py++) {
      for (let px = g.x0; px < g.x1; px++) if (bayer(px, py) < ((py - BASE + 6) / 6) * 0.6) rect(c, SHACK.woodDark, px, py, 1, 1);
    }
  });
}

/** The far side of the roof, seen behind the front gable: shingle rows and a lit ridge. */
function paintRoofPlane(ctx: Ctx, g: ShackGeometry): void {
  const peak = { x: g.peakX, y: PEAK_Y };
  const far = [
    peak, g.rightEave, { x: g.rightEave.x + PLANE_DX, y: g.rightEave.y - PLANE_DY }, { x: peak.x + PLANE_DX, y: PEAK_Y - PLANE_DY },
  ];
  const left = peak.x;
  const top = PEAK_Y - PLANE_DY;
  const w = g.rightEave.x + PLANE_DX - left + 1;
  const h = g.rightEave.y - top + 1;
  shaded(ctx, left, top, w, h, (c) => polygon(c, SHACK.roof, far), (c) => {
    for (let y = top; y < top + h; y += 3) {
      rect(c, SHACK.roofDark, left, y, w, 1);
      for (let x = left + (((y - top) / 3) % 2) * 3; x < left + w; x += 6) rect(c, SHACK.roofDark, x, y + 1, 1, 2);
    }
    for (let i = 0; i < 60; i++) rect(c, SHACK.roofLight, left + hash(i) * w, top + hash(i + 71) * h, 2, 1);
  });
  line(ctx, SHACK.roofLight, peak.x + PLANE_DX, PEAK_Y - PLANE_DY, g.rightEave.x + PLANE_DX, g.rightEave.y - PLANE_DY, 1);
  line(ctx, SHACK.roofDark, g.rightEave.x, g.rightEave.y, g.rightEave.x + PLANE_DX, g.rightEave.y - PLANE_DY, 2);
}

/** Thick roof edge boards along both slopes and the tilted board under the gable, with a lit top edge on the left. */
function paintTrim(ctx: Ctx, g: ShackGeometry): void {
  line(ctx, SHACK.roofDark, g.leftEave.x, g.leftEave.y, g.peakX, PEAK_Y, 3);
  line(ctx, SHACK.roofDark, g.peakX, PEAK_Y, g.rightEave.x, g.rightEave.y, 3);
  line(ctx, SHACK.roofLight, g.leftEave.x, g.leftEave.y - 1, g.peakX, PEAK_Y - 1, 1);
  line(ctx, SHACK.roofDark, g.leftEave.x, g.leftEave.y, g.rightEave.x, g.rightEave.y, 3);
  line(ctx, SHACK.roofLight, g.leftEave.x + 1, g.leftEave.y, g.rightEave.x - 1, g.rightEave.y - 1, 1);
}

function paintWindow(ctx: Ctx, r: Rect): void {
  rect(ctx, SHACK.outline, r.x - 2, r.y - 2, r.w + 4, r.h + 4);
  rect(ctx, SHACK.woodLight, r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  rect(ctx, SHACK.glass, r.x, r.y, r.w, r.h);
  for (let px = r.x; px < r.x + r.w; px++) if (bayer(px, r.y) < 0.5) rect(ctx, SHACK.glassDark, px, r.y + r.h - 3, 1, 3);
  rect(ctx, SHACK.woodDark, r.x + Math.floor(r.w / 2), r.y, 1, r.h);
  rect(ctx, SHACK.woodDark, r.x, r.y + Math.floor(r.h / 2), r.w, 1);
  line(ctx, SHACK.glassLight, r.x + 1, r.y + 4, r.x + 4, r.y + 1, 1);
  rect(ctx, SHACK.outline, r.x - 3, r.y + r.h + 1, r.w + 6, 2);
  rect(ctx, SHACK.red, r.x, r.y, 2, r.h - 4);
  rect(ctx, SHACK.red, r.x + r.w - 2, r.y, 2, r.h - 4);
}

/** Shelves of souvenirs behind the shop window: mugs, plush animals and a tiny tour hat, as coloured blocks. */
function paintSouvenirs(ctx: Ctx, r: Rect): void {
  const goods = [SHACK.red, SHACK.trimLight, SHACK.lamp, '#d88fb0', SHACK.cream];
  rect(ctx, SHACK.woodDark, r.x, r.y + 5, r.w, 1);
  rect(ctx, SHACK.woodDark, r.x, r.y + 10, r.w, 1);
  for (let i = 0; i < 4; i++) {
    rect(ctx, goods[i % goods.length], r.x + 2 + i * 5, r.y + 2, 3, 3);
    rect(ctx, goods[(i + 2) % goods.length], r.x + 3 + i * 5, r.y + 7, 3, 3);
  }
}

function paintDoor(ctx: Ctx, g: ShackGeometry): void {
  const left = g.doorX - DOOR_W / 2;
  const top = BASE - DOOR_H;
  rect(ctx, SHACK.outline, left - 1, top - 1, DOOR_W + 2, DOOR_H + 1);
  rect(ctx, SHACK.trim, left, top, DOOR_W, DOOR_H);
  rect(ctx, SHACK.trimLight, left, top, 1, DOOR_H);
  rect(ctx, SHACK.trimDark, left + DOOR_W - 2, top, 2, DOOR_H);
  rect(ctx, SHACK.glass, left + 3, top + 3, DOOR_W - 6, 7);
  rect(ctx, SHACK.trimDark, left + DOOR_W / 2 - 1, top + 3, 1, 7);
  rect(ctx, SHACK.trimDark, left + 3, top + 13, DOOR_W - 6, 1);
  rect(ctx, SHACK.trimDark, left + 3, top + 15, DOOR_W - 6, 8);
  rect(ctx, SHACK.trim, left + 4, top + 16, DOOR_W - 8, 6);
  rect(ctx, SHACK.lamp, left + DOOR_W - 4, top + 14, 2, 2);
}

/** Striped teal and cream awning over the gift shop, scalloped along its lower edge, with two porch posts. */
function paintAwning(ctx: Ctx, g: ShackGeometry): void {
  const { awningLeft: a, awningRight: b } = g;
  underShadow(ctx, a + 2, AWNING_TOP + AWNING_ROWS, b - a - 4, 6, SHACK.outline);
  for (let x = a; x < b; x++) {
    const stripe = Math.floor((x - a) / STRIPE);
    const color = stripe % 2 === 0 ? SHACK.trim : SHACK.cream;
    const edge = (x - a) % STRIPE;
    const rows = edge === 0 || edge === STRIPE - 1 ? AWNING_ROWS - 2 : edge === 1 || edge === STRIPE - 2 ? AWNING_ROWS - 1 : AWNING_ROWS;
    rect(ctx, color, x, AWNING_TOP, 1, rows);
    rect(ctx, stripe % 2 === 0 ? SHACK.trimLight : '#ffffff', x, AWNING_TOP, 1, 1);
    rect(ctx, stripe % 2 === 0 ? SHACK.trimDark : '#bfae8a', x, AWNING_TOP + rows - 1, 1, 1);
  }
  for (const px of [a + 2, b - 3]) {
    rect(ctx, SHACK.wood, px, AWNING_TOP + AWNING_ROWS, 2, BASE + 5 - AWNING_TOP - AWNING_ROWS);
    rect(ctx, SHACK.woodDark, px + 1, AWNING_TOP + AWNING_ROWS, 1, BASE + 5 - AWNING_TOP - AWNING_ROWS);
  }
}

/** Porch deck: planked top, dark front board with shadow on the ground, two steps and a doormat. */
function paintPorch(ctx: Ctx, g: ShackGeometry): void {
  const left = g.awningLeft;
  const w = g.awningRight - left;
  rect(ctx, SHACK.woodLight, left, BASE, w, 6);
  for (let y = BASE + 2; y < BASE + 6; y += 2) rect(ctx, SHACK.wood, left, y, w, 1);
  for (let px = left; px < left + w; px += 11) rect(ctx, SHACK.woodDark, px, BASE, 1, 6);
  rect(ctx, SHACK.woodDark, left, BASE + 6, w, PORCH_FRONT - BASE - 5);
  rect(ctx, SHACK.outline, left, PORCH_FRONT, w, 1);
  for (let px = left + 4; px < left + w; px += 12) rect(ctx, SHACK.wood, px, BASE + 7, 1, 3);
  underShadow(ctx, left + 2, PORCH_FRONT + 1, w, 4, '#6e5e49');
  rect(ctx, SHACK.woodLight, g.doorX - 12, BASE + 6, 24, 2);
  rect(ctx, SHACK.wood, g.doorX - 12, BASE + 8, 24, 1);
  rect(ctx, SHACK.red, g.doorX - 6, BASE + 2, 12, 2);
  rect(ctx, SHACK.cream, g.doorX - 5, BASE + 3, 10, 1);
}

/** A leaning ladder against the right end of the front, left by Soos for the sign. */
function paintLadder(ctx: Ctx, g: ShackGeometry): void {
  const foot = g.x1 - 9;
  const reach = 8;
  const top = WALL_TOP + 6;
  const bottom = BASE + 7;
  line(ctx, SHACK.woodDark, foot, bottom, foot + reach, top, 1);
  line(ctx, SHACK.woodLight, foot + 5, bottom, foot + reach + 5, top, 1);
  for (let y = top + 4; y < bottom; y += 6) {
    const lean = Math.round((reach * (bottom - y)) / (bottom - top));
    rect(ctx, SHACK.wood, foot + reach - lean, y, 6, 1);
  }
}

function paintChimney(ctx: Ctx, g: ShackGeometry): void {
  const { x, y, w, h } = g.chimney;
  rect(ctx, SHACK.brickDark, x - 1, y - 1, w + 2, h + 1);
  rect(ctx, SHACK.brick, x, y, w, h);
  for (let row = 2; row < h; row += 3) {
    rect(ctx, SHACK.brickDark, x, y + row, w, 1);
    rect(ctx, SHACK.brickDark, x + (row % 2 ? 2 : 5), y + row - 2, 1, 2);
  }
  rect(ctx, SHACK.roofLight, x, y, 1, h);
  rect(ctx, SHACK.woodDark, x - 2, y - 3, w + 4, 3);
  rect(ctx, SHACK.roofLight, x - 2, y - 3, w + 4, 1);
}

/** The ornament over the roof sign: a golden question mark. */
const QUESTION = pixmap([
  '.ooooo.', 'oyyyyyo', 'oyyoyyo', 'ooo.oyo', '....oyo', '...oyyo', '..oyyo.', '..oyo..', '..ooo..', '.......', '..ooo..', '..oyo..', '..ooo..',
], { o: SHACK.outline, y: SHACK.lamp });

/** The big hand-painted roof sign, drawn a pixel crooked (its left half sits a row higher), on two posts, with the ornament. */
function paintRoofSign(ctx: Ctx, g: ShackGeometry): void {
  const { sign, signSize: s } = g;
  const slopeY = (x: number): number => (x < g.peakX ? edgeY(g.leftEave, { x: g.peakX, y: PEAK_Y }, x) : edgeY({ x: g.peakX, y: PEAK_Y }, g.rightEave, x));
  for (const px of [sign.x + 6, sign.x + sign.w - 9]) {
    const bottom = Math.round(slopeY(px)) + 2;
    rect(ctx, SHACK.woodDark, px, sign.y + sign.h, 3, Math.max(1, bottom - sign.y - sign.h));
    rect(ctx, SHACK.wood, px, sign.y + sign.h, 1, Math.max(1, bottom - sign.y - sign.h));
  }
  const { canvas: board, ctx: boardCtx } = memoryCanvas(sign.w, sign.h);
  drawSign(boardCtx, SIGN_TEXT, 0, 0, s, SHACK.outline, SHACK.paper);
  const half = Math.floor(sign.w / 2);
  ctx.drawImage(board, 0, 0, half, sign.h, sign.x, sign.y - 1, half, sign.h);
  ctx.drawImage(board, half, 0, sign.w - half, sign.h, sign.x + half, sign.y, sign.w - half, sign.h);
  ctx.drawImage(QUESTION, Math.round(g.peakX - QUESTION.width / 2), sign.y - QUESTION.height - 3);
  rect(ctx, SHACK.outline, g.peakX - 1, sign.y - 3, 3, 3);
}

function paintLantern(ctx: Ctx, g: ShackGeometry): void {
  const { x, y } = g.lantern;
  rect(ctx, SHACK.outline, x, y - 8, 1, 4);
  rect(ctx, SHACK.outline, x - 3, y - 4, 7, 1);
  rect(ctx, SHACK.outline, x - 3, y - 3, 7, 7);
  rect(ctx, SHACK.lamp, x - 2, y - 2, 5, 5);
  rect(ctx, '#fff3c4', x - 1, y - 1, 2, 2);
  rect(ctx, SHACK.outline, x, y - 2, 1, 5);
}

/** Paints the whole building into `ctx` (the back layer), back to front. */
export function paintShack(ctx: Ctx, g: ShackGeometry): void {
  paintWall(ctx, g);
  paintRoofPlane(ctx, g);
  paintTrim(ctx, g);
  paintWindow(ctx, g.leftWindow);
  paintWindow(ctx, g.shopWindow);
  paintSouvenirs(ctx, g.shopWindow);
  paintDoor(ctx, g);
  const attic = g.atticWindow;
  disc(ctx, SHACK.outline, attic.x, attic.y, 6);
  disc(ctx, SHACK.woodLight, attic.x, attic.y, 5);
  disc(ctx, SHACK.glassDark, attic.x, attic.y, 4);
  rect(ctx, SHACK.outline, attic.x, attic.y - 4, 1, 9);
  rect(ctx, SHACK.outline, attic.x - 4, attic.y, 9, 1);
  paintAwning(ctx, g);
  paintPorch(ctx, g);
  const shopSign = g.x1 - g.x0 >= 120 ? 'GIFT SHOP' : 'SHOP';
  const shopW = textWidth(shopSign) + 4;
  drawSign(ctx, shopSign, g.shopWindow.x + g.shopWindow.w / 2 - shopW / 2, AWNING_TOP + AWNING_ROWS + 1, 1, SHACK.outline, SHACK.paper);
  paintLadder(ctx, g);
  paintChimney(ctx, g);
  paintRoofSign(ctx, g);
  paintLantern(ctx, g);
}
