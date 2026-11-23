/**
 * The four set pieces people gather at: the diner with its neon sign, the sheriff's office, the patrol car and the
 * old inventor's junk cart. Also where their lights and flagpoles are, so the moving layers can use the same spots.
 * Static work, built once per size.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { disc, ditherFill, line, mix, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { CREAM, OUTLINE, PLUM, addPane, type TownLights } from './town-buildings';
import type { Rect } from './shack-art';

const DINER_RED = '#c9473f';
const DINER_TEAL = '#5aa5a3';
const CHROME = '#cdd6de';
const SHERIFF_WALL = '#d3b48a';
const GOLD = '#e8c26a';
const WOOD = '#8a6a48';
const WOOD_DARK = '#6b4f35';
const NEON_OFF = '#8a4a6a';
const STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.'];
const SHADE = 0.3;

/** Top-left of the roof sign's neon letters. */
export const dinerNeon = (d: Rect): Point => ({ x: d.x + 5, y: d.y - 8 });
/** Top-left of the small red OPEN letters in the diner window. */
export const dinerOpen = (d: Rect): Point => ({ x: d.x + d.w - 19, y: d.y + 15 });
/** The lantern over the sheriff's wall, and the tops of the two flagpoles. */
export const sheriffLamp = (s: Rect): Point => ({ x: s.x + 3, y: s.y + 13 });
export const sheriffPole = (s: Rect): Point => ({ x: s.x + s.w - 2, y: s.y - 12 });
export const dinerPole = (d: Rect): Point => ({ x: d.x + d.w - 4, y: d.y - 9 });
/** Where the patrol car's light bar is. */
export const patrolBar = (at: Point): Point => ({ x: at.x, y: at.y - 14 });
/** The door the waitress stands at. */
export const dinerDoorX = (d: Rect): number => d.x + 11;

function pole(ctx: Ctx, top: Point, bottom: number): void {
  rect(ctx, OUTLINE, top.x, top.y, 1, bottom - top.y);
  rect(ctx, GOLD, top.x, top.y - 1, 1, 1);
}

/** The retro diner: roof sign, red roof band, chrome stripe, a teal lower wall, a door and a long window with stools. */
export function paintDiner(ctx: Ctx, lights: TownLights, d: Rect): void {
  const { x, y, w, h } = d;
  const base = y + h;
  const neon = dinerNeon(d);
  rect(ctx, OUTLINE, x - 1, y + 5, w + 2, h - 4);
  rect(ctx, CREAM, x, y + 5, w, 6);
  rect(ctx, CHROME, x, y + 11, w, 2);
  rect(ctx, '#ffffff', x + 2, y + 11, w - 6, 1);
  rect(ctx, DINER_TEAL, x, y + 13, w, h - 13);
  ditherFill(ctx, x, base - 4, w, 4, DINER_TEAL, mix(DINER_TEAL, PLUM, SHADE), 0.4);
  rect(ctx, mix(DINER_TEAL, PLUM, SHADE), x + w - 2, y + 5, 2, h - 5);
  rect(ctx, OUTLINE, x - 2, y, w + 4, 5);
  rect(ctx, DINER_RED, x - 1, y + 1, w + 2, 3);
  rect(ctx, mix(DINER_RED, '#ffffff', 0.4), x - 1, y + 1, w - 4, 1);
  rect(ctx, OUTLINE, x + 2, neon.y - 2, textWidth('DINER') + 4, 9);
  rect(ctx, '#2f2a3e', x + 3, neon.y - 1, textWidth('DINER') + 2, 7);
  drawText(ctx, 'DINER', neon.x, neon.y, NEON_OFF);
  rect(ctx, OUTLINE, x + 5, y - 1, 2, 2);
  rect(ctx, OUTLINE, x + textWidth('DINER'), y - 1, 2, 2);
  rect(ctx, OUTLINE, x + 7, base - 13, 8, 13);
  rect(ctx, DINER_RED, x + 8, base - 12, 6, 12);
  rect(ctx, '#b5ced8', x + 9, base - 11, 4, 4);
  rect(ctx, GOLD, x + 12, base - 5, 1, 1);
  addPane(ctx, lights, x + 17, base - 13, w - 20, 8);
  for (let sx = x + 19; sx < x + w - 5; sx += 5) rect(ctx, OUTLINE, sx, base - 8, 2, 2);
  pole(ctx, dinerPole(d), y + 1);
  rect(ctx, OUTLINE, x + 26, y - 7, 5, 8);
  rect(ctx, CHROME, x + 27, y - 6, 3, 7);
  lights.chimneys.push({ x: x + 28, y: y - 7 });
  rect(ctx, '#9a948a', x + 5, base, 11, 1);
}

/** The sheriff's office: tan walls, a stepped roof edge, a sign, a gold badge over the door, two barred windows. */
export function paintSheriff(ctx: Ctx, lights: TownLights, s: Rect): void {
  const { x, y, w, h } = s;
  const base = y + h;
  const label = textWidth('SHERIFF') + 4 <= w - 2 ? 'SHERIFF' : 'OFFICE';
  const boardW = textWidth(label) + 4;
  rect(ctx, OUTLINE, x - 1, y - 1, w + 2, h + 2);
  rect(ctx, SHERIFF_WALL, x, y, w, h);
  rect(ctx, mix(SHERIFF_WALL, PLUM, SHADE), x + w - 2, y, 2, h);
  ditherFill(ctx, x, base - 3, w - 2, 3, SHERIFF_WALL, mix(SHERIFF_WALL, PLUM, SHADE), 0.5);
  rect(ctx, OUTLINE, x - 2, y - 4, w + 4, 5);
  rect(ctx, '#8a6a58', x - 1, y - 3, w + 2, 3);
  rect(ctx, mix('#8a6a58', '#ffffff', 0.35), x - 1, y - 3, w - 4, 1);
  for (let mx = x; mx < x + w - 2; mx += 6) rect(ctx, OUTLINE, mx, y - 6, 3, 2);
  const boardX = x + Math.floor((w - boardW) / 2);
  rect(ctx, OUTLINE, boardX, y + 3, boardW, 7);
  drawText(ctx, label, boardX + 2, y + 4, GOLD);
  const cx = x + Math.floor(w / 2);
  STAR.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) if (row[dx] === '#') rect(ctx, GOLD, cx - 2 + dx, y + 12 + dy, 1, 1);
  });
  rect(ctx, OUTLINE, cx - 3, base - 11, 7, 11);
  rect(ctx, '#6b4636', cx - 2, base - 10, 5, 10);
  rect(ctx, GOLD, cx + 1, base - 5, 1, 1);
  addPane(ctx, lights, x + 4, y + 17, 4, 5);
  addPane(ctx, lights, x + w - 8, y + 17, 4, 5);
  const lamp = sheriffLamp(s);
  rect(ctx, OUTLINE, lamp.x - 1, lamp.y - 2, 3, 4);
  rect(ctx, '#cfd8dc', lamp.x, lamp.y - 1, 1, 2);
  pole(ctx, sheriffPole(s), y - 4);
  rect(ctx, '#9a948a', cx - 5, base, 11, 1);
}

/** The patrol car, side on, with its feet (wheels) on row `at.y` and its body centred on `at.x`. */
export function paintPatrolCar(ctx: Ctx, at: Point): void {
  const { x, y } = at;
  const bar = patrolBar(at);
  rect(ctx, OUTLINE, x - 13, y - 9, 27, 8);
  rect(ctx, '#e9e9ef', x - 12, y - 8, 25, 6);
  rect(ctx, '#2f2f3a', x - 12, y - 5, 25, 3);
  rect(ctx, '#ffffff', x - 12, y - 8, 25, 1);
  rect(ctx, OUTLINE, x - 8, y - 14, 16, 6);
  rect(ctx, '#e9e9ef', x - 7, y - 13, 14, 5);
  rect(ctx, '#587a8e', x - 6, y - 12, 5, 3);
  rect(ctx, '#587a8e', x, y - 12, 6, 3);
  rect(ctx, OUTLINE, bar.x - 4, bar.y, 9, 2);
  rect(ctx, '#d4524e', bar.x - 3, bar.y, 3, 1);
  rect(ctx, '#4a7fd4', bar.x + 1, bar.y, 3, 1);
  rect(ctx, GOLD, x - 2, y - 7, 3, 1);
  rect(ctx, '#ffe9a0', x + 12, y - 7, 2, 2);
  for (const wx of [-7, 7]) {
    disc(ctx, OUTLINE, x + wx, y - 1, 3);
    disc(ctx, '#9aa3ad', x + wx, y - 1, 1);
  }
}

/** The inventor's cart: a plank bed on two wheels with a pull handle, a green jug, a barrel and a pipe with a dial. */
export function paintCart(ctx: Ctx, at: Point): void {
  const { x, y } = at;
  rect(ctx, OUTLINE, x - 11, y - 11, 22, 6);
  rect(ctx, WOOD, x - 10, y - 10, 20, 4);
  rect(ctx, WOOD_DARK, x - 10, y - 8, 20, 1);
  rect(ctx, mix(WOOD, '#ffffff', 0.3), x - 10, y - 10, 20, 1);
  line(ctx, OUTLINE, x + 11, y - 9, x + 18, y - 4, 2);
  rect(ctx, OUTLINE, x - 7, y - 19, 6, 9);
  rect(ctx, '#6faa6a', x - 6, y - 17, 4, 7);
  rect(ctx, '#b9e0a8', x - 6, y - 16, 1, 3);
  rect(ctx, '#d9c7a0', x - 5, y - 20, 2, 2);
  rect(ctx, OUTLINE, x + 1, y - 18, 8, 8);
  rect(ctx, '#9a6a3f', x + 2, y - 17, 6, 6);
  rect(ctx, WOOD_DARK, x + 2, y - 15, 6, 1);
  rect(ctx, OUTLINE, x + 8, y - 24, 3, 8);
  rect(ctx, '#8a96a0', x + 9, y - 23, 1, 7);
  disc(ctx, OUTLINE, x + 9, y - 25, 3);
  disc(ctx, '#e9eef2', x + 9, y - 25, 2);
  for (const wx of [-6, 6]) {
    disc(ctx, OUTLINE, x + wx, y - 4, 5);
    disc(ctx, WOOD, x + wx, y - 4, 4);
    disc(ctx, OUTLINE, x + wx, y - 4, 1);
    rect(ctx, mix(WOOD, '#ffffff', 0.3), x + wx - 3, y - 6, 2, 1);
  }
}
