/**
 * Where everything stands on Water Tower Hill, worked out once per design width: the hill under the water tower,
 * the diner, the sheriff's office, the row of shops between them, the street, lamps and the clue spots. Pure numbers,
 * no drawing, so the painters, the moving parts and the plan all read the same positions.
 */
import { textWidth } from '../../../render/pixel-font';
import type { Point } from '../../gravity-falls/types';
import type { Rect } from './shack-art';

/** Top of the meadow the town stands on (the far hills end here). */
export const MEADOW_TOP = 192;
/** Rows where the far and middle rows of houses stand. */
export const FAR_BASE = 188;
export const MID_BASE = 203;
/** Rows where the near buildings' feet are: the diner on the low left, the shops on the terrace, the sheriff by the hill. */
export const DINER_BASE = 222;
export const SHOP_BASE = 212;
export const SHERIFF_BASE = 217;
/** Centre row of the main street. */
export const STREET_Y = 230;
const HILL_FOOT = 238;
export const HILL_SUMMIT = 178;
/** The hill's top sits at this share of the width, and it is this share of the width wide on each side. */
const HILL_CENTER = 0.8;
const HILL_SPREAD = 0.21;
const DINER_W = 46;
const DINER_H = 28;
const SHERIFF_H = 26;
const SHOP_WIDTHS = [26, 30, 24, 28, 31, 25];
const SHOP_GAP = 2;
/** Shop heights vary from the minimum up by a few rows so the roofline steps. */
const SHOP_MIN_H = 26;
const SHOP_H_STEP = 5;
const SHOP_H_RANGE = 8;
const MIN_SHOP_W = 18;
const SHOP_LABELS = ['BAKERY', 'GIFTS', 'BOOKS', 'FIXIT', 'MAPS'];
/** How much wider than its letters a shop sign board is. */
const LABEL_PAD = 4;
/** The tank is a fifth of the width, kept between these so it neither vanishes on wide stages nor crowds a phone. */
const TANK_SHARE = 0.2;
const TANK_MIN_W = 22;
const TANK_MAX_W = 30;
const TANK_H = 18;
/** The frame hides the sides, so the diner starts this share in from the left. */
const DINER_LEFT = 0.085;
/** The board's right edge, as a share of the width, so it clears the window frame. */
const BOARD_RIGHT = 0.92;
const TOWER_LEGS = 22;
/** Below this design width the town's name board is set on two lines so it fits beside the tower. */
const TWO_LINE_BELOW = 260;
export const BOARD_ROWS_GAP = 1;
export const BOARD_PAD = 2;
const BOARD_TOP = 178;

export interface Shop {
  rect: Rect;
  /** Sign text that fits above the awning, or '' when the shop is too narrow for one. */
  label: string;
  seed: number;
}

export interface TownLayout {
  width: number;
  diner: Rect;
  sheriff: Rect;
  shops: readonly Shop[];
  /** Foot of the water tower on the summit, and the box of its tank. */
  tower: Point;
  tank: Rect;
  /** The town-name board and the lines of text on it. */
  board: Rect;
  boardLines: readonly string[];
  patrol: Point;
  cart: Point;
  /** Feet of lamp posts along the street; the second one carries the coded note. */
  lamps: readonly Point[];
  /** Feet of the bush with the journal page caught in it. */
  bush: Point;
  /** Centre of the dark hedge where something peeks out. */
  hedge: Point;
  /** The street's winding centre line, left to right, in design pixels. */
  road: readonly Point[];
}

/** The hill's surface row at column x: a smooth bump under the tower that melts into the meadow to its left. */
export function hillHeight(width: number, x: number): number {
  const d = (x - width * HILL_CENTER) / (width * HILL_SPREAD);
  return Math.round(HILL_FOOT - (HILL_FOOT - HILL_SUMMIT) * Math.exp(-d * d));
}

function shopRow(from: number, to: number): Shop[] {
  const shops: Shop[] = [];
  let x = from;
  for (let i = 0; x < to; i++) {
    const w = Math.min(SHOP_WIDTHS[i % SHOP_WIDTHS.length], to - x);
    if (w < MIN_SHOP_W) break;
    const label = SHOP_LABELS.slice(i % SHOP_LABELS.length).concat(SHOP_LABELS).find((t) => textWidth(t) + LABEL_PAD <= w) ?? '';
    const h = SHOP_MIN_H + ((i * SHOP_H_STEP) % SHOP_H_RANGE);
    shops.push({ rect: { x, y: SHOP_BASE - h, w, h }, label, seed: i + 3 });
    x += w + SHOP_GAP;
  }
  return shops;
}

export function townLayout(width: number): TownLayout {
  const at = (share: number): number => Math.round(width * share);
  const diner: Rect = { x: at(DINER_LEFT), y: DINER_BASE - DINER_H, w: DINER_W, h: DINER_H };
  const sheriffW = Math.max(28, Math.min(36, at(0.1)));
  const sheriff: Rect = { x: at(0.63), y: SHERIFF_BASE - SHERIFF_H, w: sheriffW, h: SHERIFF_H };
  const tower = { x: at(HILL_CENTER), y: HILL_SUMMIT };
  const tankW = Math.max(TANK_MIN_W, Math.min(TANK_MAX_W, at(TANK_SHARE)));
  const tank: Rect = { x: tower.x - Math.round(tankW / 2), y: tower.y - TOWER_LEGS - TANK_H, w: tankW, h: TANK_H };
  const boardLines = width < TWO_LINE_BELOW ? ['GRAVITY', 'FALLS'] : ['GRAVITY FALLS'];
  const boardW = textWidth(boardLines[0]) + BOARD_PAD * 2;
  const boardH = boardLines.length * 5 + (boardLines.length - 1) * BOARD_ROWS_GAP + BOARD_PAD * 2;
  return {
    width, diner, sheriff, tower, tank, boardLines,
    shops: shopRow(diner.x + diner.w + SHOP_GAP, sheriff.x - SHOP_GAP),
    board: { x: at(BOARD_RIGHT) - boardW, y: BOARD_TOP, w: boardW, h: boardH },
    patrol: { x: at(0.72), y: STREET_Y - 3 },
    cart: { x: at(0.23), y: 236 },
    lamps: [{ x: at(0.185), y: 228 }, { x: at(0.34), y: 228 }, { x: at(0.655), y: 232 }, { x: at(0.93), y: 226 }],
    bush: { x: at(0.855), y: 214 },
    hedge: { x: at(0.5), y: 214 },
    road: [
      { x: -6, y: STREET_Y }, { x: at(0.15), y: STREET_Y + 2 }, { x: at(0.4), y: STREET_Y - 1 }, { x: at(0.62), y: STREET_Y + 1 },
      { x: at(0.76), y: STREET_Y - 3 }, { x: at(0.92), y: 220 }, { x: at(0.86), y: 206 }, { x: at(0.9), y: 195 }, { x: tower.x + 2, y: HILL_SUMMIT + 2 },
    ],
  };
}
