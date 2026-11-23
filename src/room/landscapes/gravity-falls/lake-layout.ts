/**
 * Where everything stands at the Lake: rows and columns for the dock, the boathouse, the far lake house, the
 * reed islet, the monster and the four clues. Rows are fixed (the picture is 270 rows tall); columns follow the width.
 */
import type { Point } from '../../gravity-falls/types';
import { noise, ramp } from '../../journeys/noise';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Row where the far shore meets the water; from here down to the beach the picture is lake. */
export const WATERLINE = 168;
/** Row people stand on along the dock. */
export const DECK_TOP = 224;
/** Row where the beach starts in front of the lake; the cast walks along it. */
export const BEACH_TOP = 237;
/** Row the boathouse stands on, where the right bank meets the lake. */
export const BANK_BASE = 214;
/** The monster's waterline: its feet stand here, in the shallows just off the right bank, so the cast can walk up beside it. */
export const MONSTER_FEET = 218;
/** Where along the width the monster surfaces: right of the radio, beside the bank where everyone else stands. */
const MONSTER_SHARE = 0.665;
/** Row the reed islet's mud rests on. */
export const ISLET_BASE = 207;
/** Top row of the pulled-up rowboat's near rim. */
export const BOAT_RIM = 235;
/** Where the left bank starts at the picture's left edge, before it slopes down to the beach. */
const LEFT_BANK_TOP = 216;

export const BOATHOUSE_W = 32;
export const BOATHOUSE_H = 17;
export const HOUSE_W = 30;
export const HOUSE_H = 15;

/** Shares of the width where the banks slope and where the grass gives way to sand. */
const LEFT_SLOPE_END = 0.1;
const RIGHT_SLOPE_START = 0.55;
const RIGHT_SLOPE_END = 0.7;
/** The shoreline wobbles by up to this many rows so it never looks ruled. */
const SHORE_WOBBLE = 1.5;
const SHORE_WOBBLE_SCALE = 7;

export interface LakeLayout {
  width: number;
  dockStart: number;
  dockEnd: number;
  /** The far shore's glassy house (body only). */
  house: Box;
  /** The boathouse body (the roof rises above `y`). */
  boathouse: Box;
  /** Centre column of the rowboat pulled up on the beach. */
  boatX: number;
  /** Foot of the dock's lamp post. */
  lamp: Point;
  /** Middle column and mud row of the reed islet. */
  islet: Point;
  monster: Point;
  symbol: Point;
  note: Point;
  page: Point;
  peek: Point;
  /** First land row at column `x`: the lake lies above it, the banks and the beach below. */
  landTop(x: number): number;
}

export function lakeLayout(width: number): LakeLayout {
  const at = (share: number): number => Math.round(width * share);
  const dockEnd = at(0.25);
  const boathouse: Box = { x: at(0.935) - BOATHOUSE_W, y: BANK_BASE - BOATHOUSE_H, w: BOATHOUSE_W, h: BOATHOUSE_H };
  const islet: Point = { x: at(0.5), y: ISLET_BASE };
  const boatX = at(0.145);
  const landTop = (x: number): number => {
    const left = LEFT_BANK_TOP + (BEACH_TOP - LEFT_BANK_TOP) * ramp(0, width * LEFT_SLOPE_END, x);
    const right = BEACH_TOP - (BEACH_TOP - BANK_BASE) * ramp(width * RIGHT_SLOPE_START, width * RIGHT_SLOPE_END, x);
    return Math.round((x < width * 0.5 ? left : right) + noise(x / SHORE_WOBBLE_SCALE) * SHORE_WOBBLE);
  };
  return {
    width,
    dockStart: at(0.05),
    dockEnd,
    house: { x: at(0.075), y: WATERLINE - 1 - HOUSE_H, w: HOUSE_W, h: HOUSE_H },
    boathouse,
    boatX,
    lamp: { x: dockEnd - 4, y: DECK_TOP },
    islet,
    monster: { x: at(MONSTER_SHARE), y: MONSTER_FEET },
    symbol: { x: boathouse.x + 7, y: BANK_BASE - 10 },
    note: { x: dockEnd - 3, y: DECK_TOP - 10 },
    page: { x: islet.x + 4, y: ISLET_BASE - 8 },
    peek: { x: boatX, y: BOAT_RIM - 3 },
    landTop,
  };
}
