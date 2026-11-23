/**
 * The built things of the Lake, drawn once: the boathouse on the right bank, the glassy house across the water, the
 * rowboat pulled up on the beach, and the dock with its lamp post, rod and tackle box. Each one also says where its
 * lit parts are, so the glow code can switch them on at dusk.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ditherFill, ellipse, line, polygon, rect, lampPost, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import {
  BEACH_TOP, BOATHOUSE_H, BOATHOUSE_W, DECK_TOP, HOUSE_H, HOUSE_W, type Box, type LakeLayout,
} from './lake-layout';

const WOOD_PALE = '#e7d7b3';
const WOOD_LIGHT = '#c79d6a';
const WOOD = '#a67c52';
const WOOD_DARK = '#7a5638';
const WOOD_DEEP = '#4a3322';
const MOSS = '#5f8a52';

const WALL = '#d9d0b6';
const WALL_SEAM = '#b9ae92';
const WALL_SHADE = '#8f8a74';
const ROOF = '#a8493a';
const ROOF_LIGHT = '#cd705a';
const ROOF_DARK = '#6a2e28';
const TRIM = '#3f7f86';
const STONE = '#7b8884';
const STONE_DARK = '#5f6c69';
const STONE_LIGHT = '#9aa7a2';

/** Rows of roof above the boathouse's walls, and how far the eaves hang over each side. */
const ROOF_H = 10;
const OVERHANG = 2;
/** Row (from the top of the sprite) where the gable's peak sits under the roof band. */
const PEAK_ROW = 5;
const DOOR_X = 14;
const DOOR_W = 13;
const DOOR_TOP = 4;
const PORTHOLE_ROW = 9;
const FOUNDATION_ROWS = 3;

/** The boathouse picture: gabled boards, a red roof, an arched double door with a dark inside, a porthole, a life ring. */
export function buildBoathouse(): HTMLCanvasElement {
  const w = BOATHOUSE_W + OVERHANG * 2;
  const h = ROOF_H + BOATHOUSE_H;
  const { canvas, ctx } = memoryCanvas(w, h);
  const mid = Math.floor(w / 2);
  const left = OVERHANG;
  const right = OVERHANG + BOATHOUSE_W - 1;
  polygon(ctx, WALL, [{ x: left, y: ROOF_H }, { x: mid, y: PEAK_ROW }, { x: right, y: ROOF_H }]);
  rect(ctx, WALL, left, ROOF_H, BOATHOUSE_W, BOATHOUSE_H);
  ditherFill(ctx, left, ROOF_H, BOATHOUSE_W, 2, WALL, '#a39a80', 0.5);
  for (let x = left + 2; x <= right; x += 3) {
    const roofEdge = Math.round(PEAK_ROW + (Math.abs(x - mid) * (ROOF_H - PEAK_ROW)) / (mid - left));
    const top = Math.min(roofEdge + 3, ROOF_H);
    rect(ctx, WALL_SEAM, x, top, 1, h - top);
  }
  for (let px = right - 6; px <= right; px++) {
    for (let py = ROOF_H; py < h; py++) if (bayer(px, py) < 0.3) rect(ctx, WALL_SHADE, px, py, 1, 1);
  }
  rect(ctx, STONE, left, h - FOUNDATION_ROWS, BOATHOUSE_W, FOUNDATION_ROWS);
  for (let px = left; px <= right; px++) {
    for (let py = h - FOUNDATION_ROWS; py < h; py++) if (bayer(px, py) < 0.4) rect(ctx, STONE_DARK, px, py, 1, 1);
    if (px % 5 === 0) rect(ctx, STONE_LIGHT, px, h - FOUNDATION_ROWS, 1, 1);
  }
  paintDoor(ctx, left + DOOR_X, ROOF_H + DOOR_TOP, h - 1);
  paintLifeRing(ctx, right - 2, ROOF_H + 6);
  ellipse(ctx, TRIM, mid, PORTHOLE_ROW, 2, 2);
  ellipse(ctx, '#9fd0d8', mid, PORTHOLE_ROW, 1, 1);
  line(ctx, ROOF_DARK, 0, ROOF_H, mid, PEAK_ROW - 2, 3);
  line(ctx, ROOF_DARK, w - 1, ROOF_H, mid, PEAK_ROW - 2, 3);
  line(ctx, ROOF, 0, ROOF_H - 1, mid, PEAK_ROW - 3, 2);
  line(ctx, ROOF, w - 1, ROOF_H - 1, mid, PEAK_ROW - 3, 2);
  line(ctx, ROOF_LIGHT, 0, ROOF_H - 2, mid - 1, PEAK_ROW - 4, 1);
  rect(ctx, ROOF_DARK, mid, 0, 1, 2);
  return canvas;
}

/** The big arched door that faces the water: light frame, dark inside, a seam where the two leaves meet, a glint of water. */
function paintDoor(ctx: Ctx, x: number, top: number, bottom: number): void {
  const height = bottom - top + 1;
  rect(ctx, '#efe9d4', x - 1, top - 1, DOOR_W + 2, height + 1);
  rect(ctx, '#1f2e2e', x, top, DOOR_W, height);
  rect(ctx, '#efe9d4', x, top, 1, 1);
  rect(ctx, '#efe9d4', x + DOOR_W - 1, top, 1, 1);
  rect(ctx, '#15201f', x + 6, top, 1, height);
  rect(ctx, '#3d5a5a', x + 2, top + 7, 9, 2);
  rect(ctx, '#4f7a80', x + 1, bottom - 1, DOOR_W - 2, 2);
  rect(ctx, TRIM, x - 1, top - 2, DOOR_W + 2, 1);
}

/** A red and white life ring hung on the wall, with a pixel hole in the middle. */
function paintLifeRing(ctx: Ctx, cx: number, cy: number): void {
  ellipse(ctx, '#cf4a3c', cx, cy, 2, 2);
  rect(ctx, WALL, cx, cy, 1, 1);
  rect(ctx, '#f3efe0', cx - 2, cy, 1, 1);
  rect(ctx, '#f3efe0', cx + 2, cy, 1, 1);
}

/** Where the boathouse's porthole is (its centre) and where the dark inside of the door is, for the dusk glow. */
export function boathouseLights(body: Box): { porthole: Point; door: Box } {
  return {
    porthole: { x: body.x - OVERHANG + Math.floor((BOATHOUSE_W + OVERHANG * 2) / 2), y: body.y - ROOF_H + PORTHOLE_ROW },
    door: { x: body.x + DOOR_X, y: body.y + DOOR_TOP, w: DOOR_W, h: BOATHOUSE_H - DOOR_TOP },
  };
}

/** Where the boathouse sprite's top-left corner goes, given the body box. */
export function boathouseOrigin(body: Box): Point {
  return { x: body.x - OVERHANG, y: body.y - ROOF_H };
}

const HOUSE_PANES = 6;
const PANE_W = 4;
const PANE_STEP = 5;
const PANE_ROW = 4;
const PANE_H = 7;
const PIER_W = 8;

/** The far shore's modern lake house: a flat white roof, a band of blue glass in six panes, a white base and a little pier. */
export function buildLakeHouse(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(HOUSE_W + PIER_W, HOUSE_H + 3);
  rect(ctx, '#f0f3ef', 0, 0, HOUSE_W, 3);
  rect(ctx, '#a8b8b4', 1, 3, HOUSE_W - 2, 1);
  rect(ctx, '#e4ebe7', 1, PANE_ROW, HOUSE_W - 2, PANE_H);
  for (let k = 0; k < HOUSE_PANES; k++) {
    const x = 1 + k * PANE_STEP;
    rect(ctx, '#79b0c2', x, PANE_ROW, PANE_W, PANE_H);
    rect(ctx, '#b9dce6', x + 1, PANE_ROW + 1, 1, 2);
    for (let px = x; px < x + PANE_W; px++) for (let py = PANE_ROW + 4; py < PANE_ROW + PANE_H; py++) if (bayer(px, py) < 0.4) rect(ctx, '#5f95aa', px, py, 1, 1);
  }
  rect(ctx, '#e1e8e4', 0, 11, HOUSE_W, 4);
  rect(ctx, '#b8c5c0', 0, 14, HOUSE_W, 1);
  rect(ctx, '#b79a72', HOUSE_W, 13, PIER_W, 2);
  rect(ctx, '#6e5238', HOUSE_W + 2, 15, 1, 3);
  rect(ctx, '#6e5238', HOUSE_W + 6, 15, 1, 3);
  return canvas;
}

/** The six panes of the lake house in world columns and rows, for the dusk glow. */
export function lakeHousePanes(body: Box): Box[] {
  return Array.from({ length: HOUSE_PANES }, (_, k) => ({ x: body.x + 1 + k * PANE_STEP, y: body.y + PANE_ROW, w: PANE_W, h: PANE_H }));
}

export const BOAT_W = 24;
const BOAT_H = 16;
/** Row inside the boat picture that is the near rim; the scene puts that row on `BOAT_RIM`. */
export const BOAT_RIM_ROW = 9;
const HULL = '#3f8a8c';
const HULL_LIGHT = '#5db3ad';
const HULL_DARK = '#2f6c70';
const RIM = '#efe3c4';
/** Left column and width of each hull row below the rim, narrowing toward the keel. */
const HULL_ROWS: readonly (readonly [number, number])[] = [[0, 24], [1, 22], [2, 20], [3, 18], [5, 14]];

/** A little teal rowboat seen from the side: cream rim, dark inside with a seat, an oar leaning in it, planked hull. */
export function buildRowboat(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(BOAT_W, BOAT_H);
  line(ctx, WOOD_LIGHT, 7, BOAT_RIM_ROW - 1, 3, 0, 1);
  rect(ctx, WOOD_PALE, 2, 0, 3, 2);
  rect(ctx, '#6b3d27', 2, BOAT_RIM_ROW - 1, 20, 1);
  rect(ctx, WOOD_LIGHT, 9, BOAT_RIM_ROW - 1, 4, 1);
  rect(ctx, RIM, 0, BOAT_RIM_ROW, BOAT_W, 1);
  rect(ctx, RIM, BOAT_W - 2, BOAT_RIM_ROW - 2, 2, 2);
  HULL_ROWS.forEach(([x, width], i) => rect(ctx, HULL, x, BOAT_RIM_ROW + 1 + i, width, 1));
  rect(ctx, HULL_LIGHT, 1, BOAT_RIM_ROW + 1, 16, 1);
  rect(ctx, HULL_DARK, 3, BOAT_RIM_ROW + 3, 18, 1);
  rect(ctx, '#2b4c55', 6, BOAT_H - 1, 12, 1);
  return canvas;
}

const LAMP_HEIGHT = 18;
const LAMP_METAL = '#3b4a52';
const LAMP_GLASS = '#ffe9a8';
const POST_EVERY = 12;
const BOBBER_ROW = 233;

/** The lantern's centre, where the dusk halo goes. */
export function lanternOf(layout: LakeLayout): Point {
  return { x: layout.lamp.x + 1, y: DECK_TOP - LAMP_HEIGHT - 3 };
}

/** Where the fishing bobber floats. */
export function bobberOf(layout: LakeLayout): Point {
  return { x: layout.dockEnd + 13, y: BOBBER_ROW };
}

/**
 * The dock: shadow on the water, posts down into the shallows, a planked deck with a dark front board, then the lamp
 * post, a rod resting over the end with its line down to the bobber, a tackle box and a coil of rope.
 */
export function paintDock(ctx: Ctx, layout: LakeLayout): void {
  const { dockStart: x0, dockEnd: x1 } = layout;
  const length = x1 - x0 + 1;
  ctx.save();
  ctx.globalAlpha = 0.45;
  ditherFill(ctx, x0, DECK_TOP + 6, length, BEACH_TOP - DECK_TOP - 6, '#1a4558', '#102f3f', 0.5);
  ctx.restore();
  for (let x = x0 + 4; x < x1; x += POST_EVERY) paintPost(ctx, x);
  paintPost(ctx, x1 - 3);
  rect(ctx, WOOD, x0, DECK_TOP, length, 2);
  rect(ctx, WOOD_DARK, x0, DECK_TOP + 2, length, 4);
  rect(ctx, WOOD_DEEP, x0, DECK_TOP + 5, length, 1);
  for (let x = x0; x <= x1; x += 7) rect(ctx, WOOD_DARK, x, DECK_TOP, 1, 2);
  for (let x = x0 + 3; x <= x1; x += 9) rect(ctx, WOOD_DEEP, x, DECK_TOP + 2, 1, 3);
  for (let x = x0 + 1; x <= x1; x += 4) rect(ctx, WOOD_LIGHT, x, DECK_TOP, 2, 1);
  lampPost(ctx, layout.lamp.x, DECK_TOP, LAMP_HEIGHT, LAMP_METAL, LAMP_GLASS);
  paintRod(ctx, layout);
  rect(ctx, '#b8392e', x1 - 12, DECK_TOP - 3, 6, 3);
  rect(ctx, '#e4584a', x1 - 12, DECK_TOP - 3, 6, 1);
  rect(ctx, '#3b3b3b', x1 - 10, DECK_TOP - 4, 2, 1);
  rect(ctx, '#f0d060', x1 - 9, DECK_TOP - 2, 1, 1);
  ellipse(ctx, '#c8b48a', x0 + 5, DECK_TOP - 1, 3, 1);
  rect(ctx, '#a8946a', x0 + 4, DECK_TOP - 1, 3, 1);
}

/** A mooring post going down into the shallows, mossy at the waterline. */
function paintPost(ctx: Ctx, x: number): void {
  const top = DECK_TOP + 6;
  const length = BEACH_TOP + 2 - top;
  rect(ctx, WOOD_DARK, x, top, 3, length);
  rect(ctx, WOOD_DEEP, x + 2, top, 1, length);
  rect(ctx, MOSS, x, BEACH_TOP - 3, 3, 2);
}

/** The rod rests on the deck's corner and leans out over the water; its thin line drops straight to the bobber. */
function paintRod(ctx: Ctx, layout: LakeLayout): void {
  const baseX = layout.dockEnd - 1;
  const tipX = layout.dockEnd + 12;
  const tipY = DECK_TOP - 12;
  line(ctx, WOOD_DEEP, baseX, DECK_TOP - 1, tipX, tipY, 1);
  rect(ctx, '#c0392b', baseX + 1, DECK_TOP - 3, 2, 2);
  const bobber = bobberOf(layout);
  line(ctx, '#dfe9e9', tipX, tipY, bobber.x, bobber.y - 1, 1);
}
