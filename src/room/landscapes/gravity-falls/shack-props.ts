/**
 * What stands around the Mystery Shack: where each prop goes (`shackLayout`) and how the vending machine, mailbox,
 * arrow sign, golf cart, fence, crates, bush and the string of bulbs are painted. Static work, built once.
 */
import { drawText } from '../../../render/pixel-font';
import { disc, ditherFill, ellipse, fenceRun, line, polygon, rect, rock, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { SHACK, paintShack, shackGeometry, type Rect, type ShackGeometry } from './shack-art';

/** Row where the props along the lot's back edge stand. */
const YARD_LINE = 228;
const POLE_TOP = 170;
const BULB_COUNT = 7;
const WIRE_SAG = 14;
const VENDING_W = 16;
const VENDING_H = 27;
const MAILBOX_FOOT = 232;
const CART_FOOT = 224;
const LEAF = { dark: '#2a5a42', mid: '#3d7a52', light: '#6aa467' } as const;
const STONE = { base: '#9a948a', light: '#c5beb0', dark: '#5f5a55' } as const;
const STEEL = '#8a96a0';

export interface ShackLayout {
  width: number;
  geometry: ShackGeometry;
  vending: Rect;
  /** The mailbox post's foot. */
  mailbox: Point;
  /** The foot of the tall pole that carries the arrow sign and one end of the bulbs. */
  pole: Point;
  fence: { x: number; length: number };
  /** The golf cart's bottom-centre. */
  cart: Point;
  /** The bush at the right edge where a page is caught. */
  bush: Point;
  /** Where the string of bulbs hangs, left to right. */
  bulbs: readonly Point[];
  /** Where the lawn flamingo and the stump with an axe stand. */
  flamingo: Point;
  stump: Point;
  /** Centre of the faint carved mark under the roof's left slope (the symbol clue). */
  symbol: Point;
  /** Centre of the dark gap between two far pines where something peeks out (the peek clue). */
  peek: Point;
}

export function shackLayout(width: number): ShackLayout {
  const geometry = shackGeometry(width);
  const pole = { x: Math.round(width * 0.668), y: YARD_LINE };
  const start = { x: geometry.rightEave.x, y: geometry.rightEave.y + 4 };
  const bulbs: Point[] = [];
  for (let i = 1; i <= BULB_COUNT; i++) {
    const t = i / (BULB_COUNT + 1);
    bulbs.push({
      x: Math.round(start.x + (pole.x - start.x) * t),
      y: Math.round(start.y + (POLE_TOP - start.y) * t + WIRE_SAG * 4 * t * (1 - t)),
    });
  }
  return {
    width, geometry, pole, bulbs,
    vending: { x: geometry.x1 + 8, y: YARD_LINE - VENDING_H, w: VENDING_W, h: VENDING_H },
    mailbox: { x: Math.round(width * 0.64), y: MAILBOX_FOOT },
    fence: { x: Math.round(width * 0.7), length: Math.max(20, Math.round(width * 0.3) - 26) },
    cart: { x: Math.round(width * 0.82), y: CART_FOOT },
    bush: { x: width - 14, y: YARD_LINE },
    flamingo: { x: Math.round(width * 0.045), y: 244 },
    stump: { x: Math.round(width * 0.37), y: 247 },
    symbol: { x: geometry.x0 + Math.round((geometry.x1 - geometry.x0) * 0.22), y: 166 },
    peek: { x: Math.round(width * 0.57), y: 186 },
  };
}

function paintVending(ctx: Ctx, r: Rect): void {
  const cans = [SHACK.red, SHACK.trimLight, SHACK.lamp];
  rect(ctx, SHACK.outline, r.x - 1, r.y - 1, r.w + 2, r.h + 1);
  rect(ctx, '#b8423a', r.x, r.y, r.w, r.h);
  rect(ctx, '#7d2a25', r.x + r.w - 2, r.y, 2, r.h);
  rect(ctx, SHACK.cream, r.x + 2, r.y + 2, r.w - 4, 6);
  drawText(ctx, 'POP', r.x + 3, r.y + 3, '#b8423a');
  rect(ctx, SHACK.outline, r.x + 2, r.y + 10, r.w - 6, 11);
  rect(ctx, SHACK.glassDark, r.x + 3, r.y + 11, r.w - 8, 9);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) rect(ctx, cans[(row + col) % cans.length], r.x + 4 + col * 3, r.y + 12 + row * 3, 2, 2);
  }
  rect(ctx, SHACK.cream, r.x + r.w - 4, r.y + 11, 2, 2);
  rect(ctx, SHACK.cream, r.x + r.w - 4, r.y + 15, 2, 2);
  rect(ctx, SHACK.outline, r.x + 2, r.y + r.h - 5, r.w - 6, 3);
  rect(ctx, SHACK.outline, r.x, r.y + r.h, 3, 1);
  rect(ctx, SHACK.outline, r.x + r.w - 3, r.y + r.h, 3, 1);
}

/** The mailbox on its post, with a red flag up and a small coded note pinned to the post. */
function paintMailbox(ctx: Ctx, at: Point): void {
  rect(ctx, SHACK.woodDark, at.x - 1, at.y - 14, 3, 14);
  rect(ctx, SHACK.wood, at.x - 1, at.y - 14, 1, 14);
  rect(ctx, SHACK.outline, at.x - 5, at.y - 21, 11, 7);
  rect(ctx, SHACK.trim, at.x - 4, at.y - 20, 9, 5);
  rect(ctx, SHACK.trimLight, at.x - 4, at.y - 20, 9, 1);
  rect(ctx, SHACK.red, at.x + 5, at.y - 25, 1, 5);
  rect(ctx, SHACK.red, at.x + 5, at.y - 25, 3, 2);
  rect(ctx, SHACK.paper, at.x - 2, at.y - 12, 5, 6);
  rect(ctx, SHACK.woodDark, at.x - 1, at.y - 10, 3, 1);
  rect(ctx, SHACK.woodDark, at.x - 1, at.y - 8, 2, 1);
  rect(ctx, SHACK.red, at.x, at.y - 12, 1, 1);
}

/** The tall pole with the hand-painted arrow sign pointing back at the shack. */
function paintArrowSign(ctx: Ctx, layout: ShackLayout): void {
  const { x, y } = layout.pole;
  rect(ctx, SHACK.woodDark, x - 1, POLE_TOP, 3, y - POLE_TOP);
  rect(ctx, SHACK.wood, x - 1, POLE_TOP, 1, y - POLE_TOP);
  rect(ctx, SHACK.outline, x - 2, POLE_TOP - 2, 5, 2);
  const w = 25;
  const left = x - w - 2;
  const top = 186;
  polygon(ctx, SHACK.outline, [{ x: left - 1, y: top + 5 }, { x: left + 6, y: top - 1 }, { x: x - 1, y: top - 1 }, { x: x - 1, y: top + 11 }, { x: left + 6, y: top + 11 }]);
  polygon(ctx, SHACK.paper, [{ x: left + 1, y: top + 5 }, { x: left + 6, y: top }, { x: x - 2, y: top }, { x: x - 2, y: top + 10 }, { x: left + 6, y: top + 10 }]);
  drawText(ctx, 'TOURS', left + 8, top + 3, SHACK.red);
}

function paintGolfCart(ctx: Ctx, at: Point): void {
  const { x, y } = at;
  rect(ctx, SHACK.outline, x - 12, y - 9, 24, 6);
  rect(ctx, SHACK.trim, x - 11, y - 8, 22, 4);
  rect(ctx, SHACK.trimLight, x - 11, y - 8, 22, 1);
  rect(ctx, SHACK.trimDark, x - 11, y - 5, 22, 1);
  rect(ctx, SHACK.red, x - 9, y - 12, 8, 4);
  rect(ctx, SHACK.red, x - 10, y - 16, 2, 8);
  rect(ctx, SHACK.outline, x + 5, y - 13, 1, 5);
  rect(ctx, SHACK.outline, x - 10, y - 22, 1, 7);
  rect(ctx, SHACK.outline, x + 10, y - 22, 1, 13);
  rect(ctx, SHACK.outline, x - 13, y - 24, 27, 3);
  rect(ctx, SHACK.cream, x - 12, y - 23, 25, 1);
  rect(ctx, SHACK.trim, x - 12, y - 22, 25, 1);
  for (const wx of [-7, 7]) {
    disc(ctx, SHACK.outline, x + wx, y - 3, 3);
    disc(ctx, '#5b6266', x + wx, y - 3, 2);
    rect(ctx, '#c9cfd2', x + wx, y - 3, 1, 1);
  }
}

function paintBarrelAndCrates(ctx: Ctx): void {
  const foot = YARD_LINE;
  rect(ctx, SHACK.outline, 5, foot - 12, 10, 12);
  rect(ctx, SHACK.wood, 6, foot - 11, 8, 10);
  rect(ctx, SHACK.woodLight, 6, foot - 11, 2, 10);
  rect(ctx, SHACK.outline, 5, foot - 9, 10, 1);
  rect(ctx, SHACK.outline, 5, foot - 4, 10, 1);
  ellipse(ctx, SHACK.woodLight, 9, foot - 12, 3, 1);
  rect(ctx, SHACK.outline, 15, foot - 10, 11, 10);
  rect(ctx, SHACK.woodLight, 16, foot - 9, 9, 8);
  line(ctx, SHACK.woodDark, 16, foot - 9, 24, foot - 2, 1);
  line(ctx, SHACK.woodDark, 24, foot - 9, 16, foot - 2, 1);
  rect(ctx, SHACK.outline, 17, foot - 18, 8, 8);
  rect(ctx, SHACK.wood, 18, foot - 17, 6, 6);
  rect(ctx, SHACK.woodDark, 18, foot - 14, 6, 1);
}

function paintBush(ctx: Ctx, at: Point): void {
  ellipse(ctx, LEAF.dark, at.x, at.y - 6, 9, 6);
  ellipse(ctx, LEAF.mid, at.x - 1, at.y - 7, 8, 5);
  ditherFill(ctx, at.x - 6, at.y - 11, 8, 3, LEAF.mid, LEAF.light, 0.45);
  for (const [dx, dy] of [[-5, -4], [2, -9], [6, -5]]) rect(ctx, SHACK.red, at.x + dx, at.y + dy, 1, 1);
  rect(ctx, SHACK.paper, at.x + 1, at.y - 10, 4, 5);
  rect(ctx, SHACK.woodDark, at.x + 2, at.y - 9, 2, 1);
  rect(ctx, SHACK.woodDark, at.x + 2, at.y - 7, 2, 1);
}

/** The wire of party bulbs from the eave to the pole, and the small bulbs along the roof sign; unlit by day. */
function paintBulbString(ctx: Ctx, layout: ShackLayout): void {
  const { geometry: g, bulbs } = layout;
  const points = [{ x: g.rightEave.x, y: g.rightEave.y + 4 }, ...bulbs, { x: layout.pole.x, y: POLE_TOP }];
  for (let i = 1; i < points.length; i++) line(ctx, SHACK.outline, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, 1);
  for (const b of bulbs) {
    rect(ctx, SHACK.outline, b.x - 1, b.y + 1, 3, 4);
    rect(ctx, '#e6d9a8', b.x, b.y + 2, 1, 2);
  }
  for (const b of g.signBulbs) {
    rect(ctx, SHACK.outline, b.x - 1, b.y - 1, 3, 3);
    rect(ctx, '#e6d9a8', b.x, b.y, 1, 1);
  }
}

/** A faint triangle-with-an-eye scratched into the boards, easy to miss: the shack's symbol. */
function paintCarvedSymbol(ctx: Ctx, at: Point): void {
  const left = at.x - 3;
  const top = at.y - 3;
  line(ctx, SHACK.woodDark, left + 3, top, left, top + 6, 1);
  line(ctx, SHACK.woodDark, left + 3, top, left + 6, top + 6, 1);
  rect(ctx, SHACK.woodDark, left, top + 6, 7, 1);
  rect(ctx, SHACK.woodDark, left + 2, top + 4, 3, 1);
  rect(ctx, SHACK.outline, left + 3, top + 4, 1, 1);
}

/** Everything that stands up in the yard, painted in one layer that is drawn over the swaying trees and under the cast. */
export function paintStructures(ctx: Ctx, layout: ShackLayout): void {
  paintGolfCart(ctx, layout.cart);
  fenceRun(ctx, layout.fence.x, YARD_LINE, layout.fence.length, { wood: SHACK.wood, light: SHACK.woodLight, dark: SHACK.woodDark });
  paintBarrelAndCrates(ctx);
  paintShack(ctx, layout.geometry);
  paintCarvedSymbol(ctx, layout.symbol);
  paintVending(ctx, layout.vending);
  paintMailbox(ctx, layout.mailbox);
  paintArrowSign(ctx, layout);
  paintBulbString(ctx, layout);
  paintBush(ctx, layout.bush);
}

/** The small things in front of where the cast stands: a lawn flamingo, a stump with an axe, and some stones. */
export function paintYardProps(ctx: Ctx, layout: ShackLayout): void {
  const f = layout.flamingo;
  rect(ctx, SHACK.outline, f.x, f.y - 12, 1, 12);
  ellipse(ctx, '#e58aa8', f.x - 1, f.y - 12, 3, 2);
  rect(ctx, '#f4b4c6', f.x - 3, f.y - 13, 2, 1);
  rect(ctx, '#e58aa8', f.x + 1, f.y - 16, 1, 5);
  rect(ctx, '#e58aa8', f.x + 1, f.y - 17, 3, 1);
  rect(ctx, SHACK.outline, f.x + 3, f.y - 16, 1, 1);
  const s = layout.stump;
  rect(ctx, SHACK.outline, s.x - 5, s.y - 8, 10, 8);
  rect(ctx, SHACK.woodDark, s.x - 4, s.y - 7, 8, 7);
  rect(ctx, SHACK.wood, s.x - 4, s.y - 7, 2, 7);
  ellipse(ctx, SHACK.woodLight, s.x, s.y - 8, 4, 1);
  rect(ctx, SHACK.wood, s.x - 1, s.y - 8, 2, 1);
  line(ctx, SHACK.woodDark, s.x + 1, s.y - 8, s.x + 7, s.y - 15, 1);
  rect(ctx, STEEL, s.x + 6, s.y - 17, 3, 3);
  ctx.drawImage(rock(9, 5, 3, STONE), s.x - 18, s.y - 5);
  ctx.drawImage(rock(6, 4, 8, STONE), s.x + 8, s.y - 4);
}
