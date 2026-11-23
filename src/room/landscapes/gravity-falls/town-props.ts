/**
 * The standing props of Water Tower Hill: the water tower with its painted star, the town-name board on the
 * hillside, the street lamps (one carries a coded note), the bush that holds a journal page, the dark hedge,
 * and small street furniture. Static work, built once per size.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { ditherFill, ellipse, line, lampPost, mix, polygon, rect, shaded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { CREAM, OUTLINE, PLUM } from './town-buildings';
import { BOARD_PAD, BOARD_ROWS_GAP, hillHeight, type TownLayout } from './town-layout';

const STEEL = '#9fb0c2';
const STEEL_LIGHT = '#d3dde6';
const STEEL_DARK = '#5f6b7c';
const RUST = '#a65d4a';
const STAR_GOLD = '#f3d56b';
/** The painted shooting star: pixel offsets inside a 7 x 7 box (head at the top right, tail to the bottom left). */
const SHOOTING_STAR: readonly (readonly [number, number])[] = [[5, 1], [4, 2], [5, 2], [6, 2], [5, 3], [4, 3], [3, 4], [2, 5], [1, 6], [0, 6]];
const BOARD_GREEN = '#2f5a44';
const WOOD = '#8a6a48';
const WOOD_DARK = '#6b4f35';
const LAMP_HEIGHT = 24;
const LAMP_METAL = '#3f4a55';
const LAMP_GLASS = '#ffd98a';
/** Where along the tower legs (0 top, 1 ground) the two cross braces meet them. */
const BRACE_HIGH = 0.35;
const BRACE_LOW = 0.72;
const ROOF_RISE = 8;
const FLOWER_COLOURS = ['#f08aa8', '#f2d24a', '#b28ad8'];

/** The lantern centres of the lamp posts, in the order of `layout.lamps`, found while painting. */
export type LampLights = Point[];

export const beaconPoint = (layout: TownLayout): Point => ({ x: layout.tank.x + Math.floor(layout.tank.w / 2), y: layout.tank.y - ROOF_RISE - 3 });
/** Centre of the painted star on the tank (the symbol clue). */
export const starCentre = (layout: TownLayout): Point => ({ x: layout.tank.x + Math.floor(layout.tank.w / 2), y: layout.tank.y + 8 });
/** Centre of the note pinned to the second lamp post, of the page in the bush and of the hedge's hollow. */
export const noteCentre = (layout: TownLayout): Point => ({ x: layout.lamps[1].x + 4, y: layout.lamps[1].y - 13 });
export const pageCentre = (layout: TownLayout): Point => ({ x: layout.bush.x + 4, y: layout.bush.y - 8 });
export const hollowCentre = (layout: TownLayout): Point => ({ x: layout.hedge.x, y: layout.hedge.y - 5 });

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The water tower: splayed steel legs with cross braces and a ladder, a riveted tank with rust hoops, a cone roof, a painted star. */
export function paintTower(ctx: Ctx, layout: TownLayout): void {
  const { tank, tower } = layout;
  const bottom = tank.y + tank.h;
  const ground = tower.y + 2;
  const cx = tank.x + Math.floor(tank.w / 2);
  const leftFoot = tank.x - 2;
  const rightFoot = tank.x + tank.w + 1;
  const legAt = (side: 'l' | 'r', t: number): Point =>
    side === 'l' ? { x: lerp(tank.x + 3, leftFoot, t), y: lerp(bottom, ground, t) } : { x: lerp(tank.x + tank.w - 4, rightFoot, t), y: lerp(bottom, ground, t) };
  line(ctx, STEEL_DARK, cx, bottom, cx, ground, 1);
  for (const side of ['l', 'r'] as const) {
    const a = legAt(side, 0);
    const b = legAt(side, 1);
    line(ctx, OUTLINE, a.x - 1, a.y, b.x - 1, b.y, 3);
    line(ctx, STEEL_DARK, a.x, a.y, b.x, b.y, 1);
    line(ctx, STEEL, a.x - 1, a.y, b.x - 1, b.y, 1);
  }
  line(ctx, STEEL_DARK, legAt('l', BRACE_HIGH).x, legAt('l', BRACE_HIGH).y, legAt('r', BRACE_LOW).x, legAt('r', BRACE_LOW).y);
  line(ctx, STEEL_DARK, legAt('r', BRACE_HIGH).x, legAt('r', BRACE_HIGH).y, legAt('l', BRACE_LOW).x, legAt('l', BRACE_LOW).y);
  for (const t of [BRACE_HIGH, BRACE_LOW]) rect(ctx, STEEL_DARK, legAt('l', t).x, legAt('l', t).y, legAt('r', t).x - legAt('l', t).x, 1);
  for (let t = 0.1; t < 1; t += 0.12) rect(ctx, STEEL_LIGHT, legAt('r', t).x + 1, legAt('r', t).y, 2, 1);
  rect(ctx, OUTLINE, tank.x - 1, tank.y - 1, tank.w + 2, tank.h + 2);
  shaded(ctx, tank.x, tank.y, tank.w, tank.h, (c) => rect(c, STEEL, tank.x, tank.y, tank.w, tank.h), (c) => {
    ditherFill(c, tank.x + Math.round(tank.w * 0.6), tank.y, Math.ceil(tank.w * 0.4), tank.h, STEEL, mix(STEEL, PLUM, 0.5), 0.5);
    rect(c, STEEL_LIGHT, tank.x + 2, tank.y, 2, tank.h);
    rect(c, RUST, tank.x, tank.y + 4, tank.w, 1);
    rect(c, RUST, tank.x, tank.y + tank.h - 5, tank.w, 1);
    for (let rx = tank.x + 2; rx < tank.x + tank.w; rx += 4) rect(c, STEEL_DARK, rx, tank.y + 8, 1, 1);
    ditherFill(c, tank.x, tank.y + tank.h - 3, tank.w, 3, STEEL, RUST, 0.3);
  });
  for (const [px, py] of [[tank.x, tank.y], [tank.x + tank.w - 1, tank.y], [tank.x, bottom - 1], [tank.x + tank.w - 1, bottom - 1]]) rect(ctx, OUTLINE, px, py, 1, 1);
  polygon(ctx, OUTLINE, [{ x: tank.x - 2, y: tank.y }, { x: cx, y: tank.y - ROOF_RISE - 1 }, { x: tank.x + tank.w + 2, y: tank.y }]);
  polygon(ctx, RUST, [{ x: tank.x - 1, y: tank.y - 1 }, { x: cx, y: tank.y - ROOF_RISE }, { x: tank.x + tank.w, y: tank.y - 1 }]);
  line(ctx, mix(RUST, '#ffffff', 0.4), tank.x, tank.y - 2, cx - 1, tank.y - ROOF_RISE + 1);
  rect(ctx, OUTLINE, cx, tank.y - ROOF_RISE - 3, 1, 3);
  const star = starCentre(layout);
  for (const [dx, dy] of SHOOTING_STAR) {
    rect(ctx, STEEL_DARK, star.x - 3 + dx + 1, star.y - 3 + dy + 1, 1, 1);
    rect(ctx, STAR_GOLD, star.x - 3 + dx, star.y - 3 + dy, 1, 1);
  }
}

/** The hillside board with the town's name on dark green, on two short posts that reach down to the grass. */
export function paintBoard(ctx: Ctx, layout: TownLayout): void {
  const { board, boardLines, width } = layout;
  for (const px of [board.x + 4, board.x + board.w - 6]) {
    const foot = Math.max(board.y + board.h + 3, hillHeight(width, px) + 3);
    rect(ctx, OUTLINE, px - 1, board.y + board.h, 4, foot - board.y - board.h);
    rect(ctx, WOOD, px, board.y + board.h, 2, foot - board.y - board.h);
  }
  rect(ctx, OUTLINE, board.x - 1, board.y - 1, board.w + 2, board.h + 2);
  rect(ctx, BOARD_GREEN, board.x, board.y, board.w, board.h);
  rect(ctx, mix(BOARD_GREEN, '#ffffff', 0.25), board.x, board.y, board.w, 1);
  boardLines.forEach((text, i) => {
    drawText(ctx, text, board.x + Math.floor((board.w - textWidth(text)) / 2), board.y + BOARD_PAD + i * (5 + BOARD_ROWS_GAP), CREAM);
  });
}

/** Street lamps along the road; the second carries a pinned note. Returns each lantern's centre for the dusk glow. */
export function paintLamps(ctx: Ctx, layout: TownLayout): LampLights {
  const lanterns = layout.lamps.map((p) => lampPost(ctx, p.x, p.y, LAMP_HEIGHT, LAMP_METAL, LAMP_GLASS));
  const note = noteCentre(layout);
  rect(ctx, OUTLINE, note.x - 3, note.y - 4, 7, 8);
  rect(ctx, CREAM, note.x - 2, note.y - 3, 5, 6);
  rect(ctx, OUTLINE, note.x - 1, note.y - 1, 3, 1);
  rect(ctx, OUTLINE, note.x - 1, note.y + 1, 2, 1);
  rect(ctx, '#c9473f', note.x, note.y - 3, 1, 1);
  return lanterns;
}

/** A leafy bush on the slope with a journal page caught in its twigs. */
export function paintBush(ctx: Ctx, layout: TownLayout): void {
  const { x, y } = layout.bush;
  ellipse(ctx, '#2f5a44', x, y - 5, 9, 5);
  ellipse(ctx, '#4a8456', x - 1, y - 6, 7, 4);
  ditherFill(ctx, x - 6, y - 4, 12, 4, '#4a8456', '#2f5a44', 0.45);
  for (const [dx, dy, color] of [[-4, -8, '#8bc27a'], [2, -9, '#8bc27a'], [-6, -5, '#f08aa8'], [6, -4, '#f2d24a'], [0, -3, '#f6f2e0']] as const) rect(ctx, color, x + dx, y + dy, 1, 1);
  const page = pageCentre(layout);
  rect(ctx, OUTLINE, page.x - 3, page.y - 4, 7, 8);
  rect(ctx, CREAM, page.x - 2, page.y - 3, 5, 6);
  rect(ctx, '#7a6a5a', page.x - 1, page.y - 2, 3, 1);
  rect(ctx, '#7a6a5a', page.x - 1, page.y, 2, 1);
}

/** A dense dark hedge with a hollow in the middle (the eyes that watch from it are drawn by the moving layer). */
export function paintHedge(ctx: Ctx, layout: TownLayout): void {
  const { x, y } = layout.hedge;
  ellipse(ctx, '#27402f', x, y - 5, 9, 6);
  ellipse(ctx, '#3a6048', x - 1, y - 7, 7, 4);
  ditherFill(ctx, x - 7, y - 5, 14, 5, '#3a6048', '#27402f', 0.5);
  ellipse(ctx, '#121c1a', x, y - 5, 4, 3);
  for (const dx of [-8, -3, 4, 7]) rect(ctx, '#7fb56a', x + dx, y - 10 + (dx & 1), 1, 1);
}

/** Small street furniture along the sidewalks: a bench by the diner, a fire hydrant, a bin and flower planters. */
export function paintStreetBits(ctx: Ctx, layout: TownLayout): void {
  const { diner, sheriff } = layout;
  const bx = diner.x + diner.w + 3;
  rect(ctx, OUTLINE, bx - 1, 215, 11, 3);
  rect(ctx, WOOD, bx, 216, 9, 1);
  rect(ctx, OUTLINE, bx, 218, 1, 3);
  rect(ctx, OUTLINE, bx + 8, 218, 1, 3);
  rect(ctx, WOOD_DARK, bx, 213, 9, 1);
  const hx = sheriff.x - 6;
  rect(ctx, OUTLINE, hx - 1, 210, 6, 9);
  rect(ctx, '#d4524e', hx, 211, 4, 7);
  rect(ctx, '#f0a49a', hx, 211, 1, 7);
  rect(ctx, '#d4524e', hx - 1, 213, 6, 2);
  const tx = diner.x - 4;
  rect(ctx, OUTLINE, tx - 1, 214, 6, 8);
  rect(ctx, '#7d8a94', tx, 215, 4, 6);
  rect(ctx, '#b4c0c8', tx, 215, 1, 6);
  for (const shop of layout.shops) {
    const px = shop.rect.x + 1;
    rect(ctx, OUTLINE, px, shop.rect.y + shop.rect.h - 3, 5, 3);
    rect(ctx, '#a86a45', px + 1, shop.rect.y + shop.rect.h - 2, 3, 2);
    for (let i = 0; i < FLOWER_COLOURS.length; i++) rect(ctx, FLOWER_COLOURS[(i + shop.seed) % FLOWER_COLOURS.length], px + 1 + i, shop.rect.y + shop.rect.h - 4, 1, 1);
  }
}
