/**
 * Main Street, part three: the small things that stand on the pavement and in the road: benches, a hydrant, post
 * and newspaper boxes, a bike, a specials board, planters, the notice board, McGucket's junk cart, the fountain, the
 * patrol car, the gift shop's postcard rack and gnome, the hardware shop's stock, and the two hanging shop signs.
 * Each `paint*` function draws once onto the street picture with its centre at `cx` and its feet on row `base`.
 */
import { drawText, textWidth } from '../../../render/pixel-font';
import { memoryCanvas } from '../../../render/pixel-stage';
import { disc, ellipse, line, mix, polygon, rect, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';
import { OUTLINE } from '../../landscapes/gravity-falls/town-buildings';

const WOOD = '#9a6f45';
const WOOD_LIGHT = '#c49a63';
const WOOD_DARK = '#6b4a2f';
const IRON = '#4a4655';
const RED = '#c9473f';
const RED_DARK = '#8f2f2f';
const CHALK = '#f1ecdc';
const PAPER = '#f1e6cf';
const STONE = '#b9ac9a';
const STONE_LIGHT = '#d9cfbf';
const STONE_DARK = '#8a7e70';
const WATER = '#8cc3d8';
const WATER_DARK = '#5f93ac';
const WATER_LIGHT = '#d4f0f6';
const GREEN = '#4f7a58';
const GREEN_LIGHT = '#6fa27a';
const BLUE = '#4a6fa5';
const BRASS = '#c9a24a';
const FLOWERS = ['#f4d35e', '#f6f1e0', '#e58fb0', '#b28ad8'] as const;

const BOARD_PAD = 6;
const WHEEL_STEPS = 14;
const WHEEL_R = 5;
const SPINNER_CARDS = ['#e58fb0', '#8ab4e8', '#f4d35e', '#7fb85a'] as const;

/** Wheels are rings of dots so the spokes' gap shows the street behind. */
function wheel(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  for (let i = 0; i < WHEEL_STEPS; i++) {
    const a = (i / WHEEL_STEPS) * Math.PI * 2;
    rect(ctx, color, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1);
  }
  rect(ctx, color, cx, cy, 1, 1);
}

/** A park bench: two backrest slats, a seat, iron legs, and a hard little shadow. */
export function paintBench(ctx: Ctx, cx: number, base: number): void {
  const x = cx - 12;
  rect(ctx, STONE_DARK, x - 1, base, 26, 1);
  rect(ctx, IRON, x + 2, base - 14, 1, 7);
  rect(ctx, IRON, x + 21, base - 14, 1, 7);
  rect(ctx, WOOD_LIGHT, x, base - 14, 24, 2);
  rect(ctx, WOOD, x, base - 11, 24, 2);
  rect(ctx, WOOD_LIGHT, x - 1, base - 7, 26, 2);
  rect(ctx, WOOD_DARK, x - 1, base - 5, 26, 1);
  rect(ctx, IRON, x + 1, base - 5, 2, 5);
  rect(ctx, IRON, x + 21, base - 5, 2, 5);
}

/** A red fire hydrant with a domed top, two side nozzles and a darker foot. */
export function paintHydrant(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, OUTLINE, cx - 4, base - 13, 9, 13);
  rect(ctx, RED, cx - 3, base - 11, 7, 9);
  rect(ctx, RED, cx - 2, base - 13, 5, 2);
  rect(ctx, BRASS, cx - 1, base - 15, 3, 2);
  rect(ctx, RED, cx - 5, base - 9, 2, 3);
  rect(ctx, RED, cx + 4, base - 9, 2, 3);
  rect(ctx, RED_DARK, cx - 4, base - 2, 9, 2);
  rect(ctx, mix(RED, '#ffffff', 0.4), cx - 2, base - 11, 1, 8);
}

/** A blue street mailbox with a domed lid, a slot and two short legs. */
export function paintPostBox(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, OUTLINE, cx - 6, base - 19, 13, 15);
  ellipse(ctx, OUTLINE, cx, base - 18, 6, 3);
  rect(ctx, BLUE, cx - 5, base - 17, 11, 13);
  ellipse(ctx, BLUE, cx, base - 18, 5, 2);
  rect(ctx, mix(BLUE, '#ffffff', 0.4), cx - 4, base - 17, 1, 12);
  rect(ctx, OUTLINE, cx - 3, base - 14, 7, 1);
  rect(ctx, IRON, cx - 4, base - 4, 2, 4);
  rect(ctx, IRON, cx + 3, base - 4, 2, 4);
}

/** A coin-op newspaper box: yellow body, a window with a folded paper, a coin slot. */
export function paintNewsBox(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, OUTLINE, cx - 6, base - 17, 13, 17);
  rect(ctx, BRASS, cx - 5, base - 16, 11, 14);
  rect(ctx, '#2f3a44', cx - 4, base - 14, 9, 6);
  rect(ctx, PAPER, cx - 3, base - 13, 7, 4);
  rect(ctx, OUTLINE, cx - 2, base - 12, 4, 1);
  rect(ctx, OUTLINE, cx + 1, base - 6, 3, 1);
  rect(ctx, IRON, cx - 5, base - 2, 2, 2);
  rect(ctx, IRON, cx + 4, base - 2, 2, 2);
}

/** A bicycle leaning at the curb, a basket of flowers on its handlebars. */
export function paintBike(ctx: Ctx, cx: number, base: number): void {
  const rear = { x: cx - 8, y: base - WHEEL_R - 1 };
  const front = { x: cx + 8, y: base - WHEEL_R - 1 };
  wheel(ctx, rear.x, rear.y, WHEEL_R, IRON);
  wheel(ctx, front.x, front.y, WHEEL_R, IRON);
  const seat = { x: cx - 4, y: base - 13 };
  const head = { x: cx + 6, y: base - 13 };
  const crank = { x: cx - 1, y: rear.y };
  for (const [a, b] of [[rear, seat], [seat, crank], [rear, crank], [crank, head], [seat, head], [head, front]] as const) line(ctx, '#d4524e', a.x, a.y, b.x, b.y, 1);
  rect(ctx, IRON, cx - 6, base - 14, 4, 1);
  line(ctx, IRON, head.x, head.y, head.x + 2, base - 15, 1);
  rect(ctx, WOOD_LIGHT, cx + 6, base - 18, 6, 4);
  rect(ctx, WOOD_DARK, cx + 6, base - 15, 6, 1);
  rect(ctx, FLOWERS[2], cx + 7, base - 19, 1, 1);
  rect(ctx, FLOWERS[0], cx + 9, base - 20, 1, 2);
  rect(ctx, FLOWERS[1], cx + 11, base - 19, 1, 1);
}

/** A green street bin with a lid, a handle and two bands. */
export function paintTrashCan(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, OUTLINE, cx - 5, base - 14, 11, 14);
  rect(ctx, GREEN, cx - 4, base - 12, 9, 12);
  rect(ctx, GREEN_LIGHT, cx - 4, base - 12, 1, 12);
  rect(ctx, mix(GREEN, OUTLINE, 0.4), cx - 4, base - 7, 9, 1);
  rect(ctx, mix(GREEN, OUTLINE, 0.4), cx - 5, base - 14, 11, 2);
  rect(ctx, OUTLINE, cx - 1, base - 16, 3, 2);
  rect(ctx, PAPER, cx + 6, base - 1, 2, 1);
}

/** An A-frame chalkboard on the pavement, two lines of chalk in the pixel font. */
export function paintSpecialsBoard(ctx: Ctx, cx: number, base: number, first: string, second: string): void {
  const w = Math.max(textWidth(first), textWidth(second)) + BOARD_PAD;
  const x = Math.round(cx - w / 2);
  rect(ctx, OUTLINE, x - 1, base - 22, w + 2, 22);
  rect(ctx, '#3f4a46', x, base - 21, w, 18);
  rect(ctx, WOOD, x - 1, base - 23, w + 2, 2);
  rect(ctx, WOOD_DARK, x - 1, base - 3, w + 2, 3);
  drawText(ctx, first, x + 3, base - 18, CHALK);
  drawText(ctx, second, x + 3, base - 10, '#f2d86a');
  rect(ctx, CHALK, x + 3, base - 12, w - 6, 1);
}

/** A stone planter box with a round shrub and a few flowers of the given colour. */
export function paintPlanter(ctx: Ctx, cx: number, base: number, flower: string): void {
  rect(ctx, OUTLINE, cx - 9, base - 10, 19, 10);
  rect(ctx, STONE, cx - 8, base - 9, 17, 8);
  rect(ctx, STONE_LIGHT, cx - 8, base - 9, 17, 1);
  rect(ctx, STONE_DARK, cx + 5, base - 8, 4, 7);
  ellipse(ctx, '#2f5238', cx, base - 13, 8, 5);
  ellipse(ctx, '#4f8a4e', cx - 1, base - 14, 6, 3);
  for (const [dx, dy] of [[-5, -14], [-1, -17], [3, -15], [6, -12], [-3, -12]] as const) rect(ctx, flower, cx + dx, base + dy, 2, 2);
}

/** The town notice board on two posts under a little roof: cork, pinned flyers. The middle is left bare for the note to be found. */
export function paintNoticeBoard(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, WOOD_DARK, cx - 14, base - 32, 2, 32);
  rect(ctx, WOOD_DARK, cx + 13, base - 32, 2, 32);
  rect(ctx, OUTLINE, cx - 16, base - 36, 33, 25);
  rect(ctx, WOOD_LIGHT, cx - 15, base - 35, 31, 23);
  rect(ctx, WOOD, cx - 14, base - 34, 29, 21);
  rect(ctx, WOOD_DARK, cx - 17, base - 38, 35, 3);
  rect(ctx, WOOD_LIGHT, cx - 17, base - 38, 35, 1);
  for (const [dx, dy, color] of [[-13, -33, PAPER], [-13, -23, '#e8b4a0'], [9, -33, '#bcd4e6'], [9, -22, PAPER]] as const) {
    rect(ctx, color, cx + dx, base + dy, 5, 7);
    rect(ctx, OUTLINE, cx + dx + 1, base + dy + 2, 3, 1);
    rect(ctx, OUTLINE, cx + dx + 1, base + dy + 4, 2, 1);
    rect(ctx, RED, cx + dx + 2, base + dy, 1, 1);
  }
}

/** McGucket's junk cart: a plank bed on two spoked wheels, a jug, a gear, a funnel and a bent antenna. */
export function paintJunkCart(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, STONE_DARK, cx - 17, base, 36, 1);
  rect(ctx, OUTLINE, cx - 17, base - 15, 35, 9);
  rect(ctx, WOOD, cx - 16, base - 14, 33, 7);
  rect(ctx, WOOD_LIGHT, cx - 16, base - 14, 33, 1);
  rect(ctx, WOOD_DARK, cx - 16, base - 10, 33, 1);
  line(ctx, WOOD_DARK, cx + 16, base - 12, cx + 26, base - 5, 1);
  for (const wx of [cx - 9, cx + 9]) {
    disc(ctx, OUTLINE, wx, base - 6, 6);
    disc(ctx, WOOD_LIGHT, wx, base - 6, 5);
    disc(ctx, WOOD_DARK, wx, base - 6, 3);
    rect(ctx, BRASS, wx, base - 6, 1, 1);
  }
  ellipse(ctx, '#9a6f45', cx - 11, base - 20, 4, 5);
  rect(ctx, '#7a5434', cx - 13, base - 27, 4, 4);
  rect(ctx, '#7a5434', cx - 7, base - 22, 1, 4);
  rect(ctx, OUTLINE, cx - 12, base - 21, 2, 2);
  disc(ctx, '#8a949a', cx - 1, base - 20, 5);
  for (let i = 0; i < 8; i++) rect(ctx, '#8a949a', cx - 1 + Math.cos(i * 0.785) * 6.5, base - 20 + Math.sin(i * 0.785) * 6.5, 1, 1);
  disc(ctx, '#5a626a', cx - 1, base - 20, 1);
  polygon(ctx, BRASS, [{ x: cx + 5, y: base - 22 }, { x: cx + 13, y: base - 22 }, { x: cx + 10, y: base - 15 }, { x: cx + 8, y: base - 15 }]);
  line(ctx, IRON, cx + 14, base - 15, cx + 12, base - 26, 1);
  line(ctx, IRON, cx + 12, base - 26, cx + 16, base - 28, 1);
}

/** The fountain's stone basin, pedestal and upper bowl, still water in both; the spray and ripples are drawn each frame. */
export function paintFountainBasin(ctx: Ctx, cx: number, base: number): void {
  ellipse(ctx, OUTLINE, cx, base - 4, 30, 6);
  ellipse(ctx, STONE, cx, base - 5, 29, 5);
  rect(ctx, STONE_LIGHT, cx - 29, base - 5, 59, 1);
  rect(ctx, STONE_DARK, cx - 29, base - 1, 59, 1);
  ellipse(ctx, WATER_DARK, cx, base - 7, 25, 3);
  ellipse(ctx, WATER, cx, base - 8, 23, 2);
  rect(ctx, OUTLINE, cx - 4, base - 21, 9, 15);
  rect(ctx, STONE, cx - 3, base - 20, 7, 14);
  rect(ctx, STONE_LIGHT, cx - 3, base - 20, 1, 14);
  rect(ctx, STONE_DARK, cx + 3, base - 20, 1, 14);
  ellipse(ctx, OUTLINE, cx, base - 21, 12, 4);
  ellipse(ctx, STONE, cx, base - 22, 11, 3);
  ellipse(ctx, WATER, cx, base - 23, 9, 2);
  rect(ctx, WATER_LIGHT, cx - 5, base - 23, 3, 1);
}

/** Where the fountain's jet starts, relative to its centre and base. */
export const fountainNozzle = (cx: number, base: number): Point => ({ x: cx, y: base - 24 });

/** The sheriff's patrol car, side on and facing right: white upper, black doors with a gold star, light bar, a box of donuts on the hood. */
export function paintPatrolCar(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, STONE_DARK, cx - 25, base, 52, 1);
  rect(ctx, OUTLINE, cx - 26, base - 15, 53, 12);
  rect(ctx, '#ecebf0', cx - 25, base - 14, 51, 5);
  rect(ctx, '#2f2f3a', cx - 25, base - 10, 51, 6);
  rect(ctx, '#ffffff', cx - 25, base - 14, 51, 1);
  rect(ctx, OUTLINE, cx - 14, base - 22, 27, 8);
  rect(ctx, '#ecebf0', cx - 13, base - 21, 25, 7);
  rect(ctx, '#587a8e', cx - 11, base - 20, 9, 5);
  rect(ctx, '#587a8e', cx - 1, base - 20, 10, 5);
  rect(ctx, '#b5ced8', cx - 11, base - 20, 2, 1);
  rect(ctx, OUTLINE, cx - 2, base - 21, 1, 7);
  rect(ctx, BRASS, cx - 3, base - 9, 3, 3);
  rect(ctx, '#f6e7a0', cx + 24, base - 12, 2, 3);
  rect(ctx, RED, cx - 26, base - 12, 1, 3);
  rect(ctx, '#9a948a', cx - 26, base - 5, 53, 1);
  rect(ctx, OUTLINE, cx - 4, base - 25, 9, 3);
  rect(ctx, RED, cx - 3, base - 25, 3, 2);
  rect(ctx, BLUE, cx + 1, base - 25, 3, 2);
  rect(ctx, '#f48fb1', cx + 14, base - 18, 7, 4);
  rect(ctx, '#ffffff', cx + 14, base - 18, 7, 1);
  rect(ctx, '#c9843a', cx + 16, base - 20, 3, 2);
  for (const wx of [cx - 16, cx + 16]) {
    disc(ctx, '#232323', wx, base - 4, 5);
    disc(ctx, '#8e8a82', wx, base - 4, 2);
    rect(ctx, '#2f2f3a', wx, base - 4, 1, 1);
  }
}

/** A spinning postcard rack on a pole: three rings of cards in four colours under a round cap. */
export function paintPostcardRack(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, IRON, cx, base - 26, 2, 26);
  rect(ctx, IRON, cx - 3, base - 2, 8, 2);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      rect(ctx, OUTLINE, cx - 6 + i * 4, base - 25 + row * 8, 4, 7);
      rect(ctx, SPINNER_CARDS[(i + row) % SPINNER_CARDS.length], cx - 5 + i * 4, base - 24 + row * 8, 3, 5);
    }
  }
  disc(ctx, RED, cx + 1, base - 28, 2);
}

/** A lawn-gnome statue by the gift shop door: pointed red hat, white beard, blue coat. */
export function paintGnome(ctx: Ctx, cx: number, base: number): void {
  rect(ctx, OUTLINE, cx - 3, base - 13, 7, 13);
  rect(ctx, '#4a6fa5', cx - 2, base - 6, 5, 6);
  rect(ctx, '#f1e6cf', cx - 2, base - 9, 5, 4);
  rect(ctx, '#f0c9a0', cx - 1, base - 11, 3, 2);
  polygon(ctx, RED, [{ x: cx - 2, y: base - 11 }, { x: cx + 3, y: base - 11 }, { x: cx + 1, y: base - 17 }]);
  rect(ctx, OUTLINE, cx - 1, base - 11, 1, 1);
  rect(ctx, '#3a2a2a', cx - 3, base, 7, 1);
}

/** The hardware shop's stock on the pavement: a ladder against the wall, two galvanised buckets and a leaning rake. */
export function paintHardwareStock(ctx: Ctx, cx: number, base: number): void {
  for (const dx of [0, 6]) line(ctx, WOOD_LIGHT, cx + dx, base, cx + dx + 5, base - 36, 1);
  for (let r = 4; r < 34; r += 6) rect(ctx, WOOD_DARK, cx + Math.round((r * 5) / 36), base - r, 7, 1);
  for (const dx of [14, 24]) {
    rect(ctx, OUTLINE, cx + dx - 1, base - 11, 10, 11);
    rect(ctx, '#aab4ba', cx + dx, base - 10, 8, 10);
    rect(ctx, '#dde6ea', cx + dx, base - 10, 2, 10);
    rect(ctx, '#7a848a', cx + dx + 6, base - 10, 2, 10);
    rect(ctx, '#6a747a', cx + dx, base - 6, 8, 1);
  }
  line(ctx, WOOD_LIGHT, cx + 36, base, cx + 33, base - 24, 1);
  rect(ctx, IRON, cx + 29, base - 26, 7, 2);
  for (let t = 0; t < 4; t++) rect(ctx, IRON, cx + 29 + t * 2, base - 24, 1, 2);
}

/** A hanging shop sign: two chains and a board with a bread loaf or a cog on it. The top-left pixel is where the chains meet the bracket. */
export function buildHangingSign(kind: 'loaf' | 'cog'): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(18, 17);
  rect(ctx, IRON, 3, 0, 1, 4);
  rect(ctx, IRON, 14, 0, 1, 4);
  rect(ctx, OUTLINE, 0, 4, 18, 13);
  rect(ctx, kind === 'loaf' ? '#f2d6a8' : '#b9c4cc', 1, 5, 16, 11);
  rect(ctx, '#ffffff', 1, 5, 16, 1);
  if (kind === 'loaf') {
    ellipse(ctx, '#b0703a', 9, 11, 6, 3);
    ellipse(ctx, '#d9964a', 9, 10, 5, 2);
    for (const x of [6, 9, 12]) rect(ctx, '#8a5428', x, 9, 1, 3);
  } else {
    disc(ctx, '#5a626a', 9, 11, 4);
    for (let i = 0; i < 8; i++) rect(ctx, '#5a626a', 9 + Math.cos(i * 0.785) * 5.5, 11 + Math.sin(i * 0.785) * 5.5, 1, 1);
    disc(ctx, '#b9c4cc', 9, 11, 1);
  }
  return canvas;
}
