/**
 * The set pieces of Gnome Woods, each drawn once into its own small picture: ferns, bushes, the giant mossy stump,
 * a fallen log, the old village tree with its tiny doors and windows, and the toadstool tavern. The scene file and
 * `woods-art2.ts` place them; nothing here moves.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, disc, drawSign, ellipse, line, mix, polygon, rect, seeded, shaded, type Ctx } from '../../gravity-falls/art-kit';
import type { Point } from '../../gravity-falls/types';

/** The colours the woods share, so the set pieces read as one place: mossy greens, warm wood, toadstool red. */
export const FOREST = {
  bark: '#5b4030', barkDark: '#3d2a22', barkLight: '#80593c',
  moss: '#5f9b5e', mossDark: '#3c6e47', mossLight: '#92c97a',
  leaf: '#2e6b58', leafDark: '#1d4640', leafLight: '#5f9d6e',
  wood: '#d6b47c', woodDark: '#a07a4e', woodRing: '#8a6540',
  cream: '#e9dcbc', creamDark: '#b9a47e',
  red: '#c23b3b', redDark: '#7a1f2a', redLight: '#ee6a58',
  warm: '#ffcf70', warmDim: '#b98a42',
  stone: '#7a7a72', stoneDark: '#4f4f4c', ink: '#1a1511',
} as const;

const FERN = { dark: '#245a3c', mid: '#3f8a4f', light: '#7fc06a' };
/** Frond tips as (sideways share of the reach, share of the picture's height down from the top). */
const FROND_TIPS: readonly (readonly [number, number])[] = [[-1, 0.5], [-0.65, 0.15], [-0.25, 0], [0.25, 0], [0.65, 0.15], [1, 0.5]];
/** Leaflets sit on each frond between these shares of its length. */
const LEAFLET_FROM = 0.4;
const LEAFLET_STEP = 0.2;

const STUMP_RING_SHARES = [0.72, 0.45];
const TRUNK_W = 52;
const TRUNK_H = 120;
const WARM_WINDOW_SIZE = 3;

/** Paints `color` over a box in an ordered dither whose strength runs from `top` (first row) to `bottom` (last row), 0 to 1. */
export function speckle(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, top: number, bottom: number): void {
  ctx.fillStyle = color;
  const left = Math.round(x);
  const first = Math.round(y);
  for (let py = first; py < first + h; py++) {
    const level = top + ((bottom - top) * (py - first)) / Math.max(1, h - 1);
    for (let px = left; px < left + w; px++) if (bayer(px, py) < level) ctx.fillRect(px, py, 1, 1);
  }
}

/** A fern `reach` pixels to each side, six fronds fanning from the bottom-centre; lit leaflets along each. */
export function buildFern(reach: number): HTMLCanvasElement {
  const height = reach + 3;
  const { canvas, ctx } = memoryCanvas(reach * 2 + 3, height);
  const cx = reach + 1;
  const baseY = height - 1;
  for (const [side, drop] of FROND_TIPS) {
    const tx = Math.round(cx + side * reach);
    const ty = Math.round(drop * reach);
    line(ctx, FERN.dark, cx, baseY, tx, ty);
    line(ctx, FERN.mid, cx, baseY - 1, tx, ty);
    for (let t = LEAFLET_FROM; t < 1; t += LEAFLET_STEP) {
      rect(ctx, FERN.light, cx + (tx - cx) * t, baseY + (ty - baseY) * t - 1, 1, 1);
    }
  }
  return canvas;
}

/** A leafy bush `w` x `h`: a dark dome with lighter leaf clumps, bright flecks top-left and a dithered shadow lower right. */
export function buildBush(w: number, h: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seeded(seed);
  ellipse(ctx, FOREST.leafDark, w / 2, h - 1, w / 2 - 0.5, h - 1);
  // Clumps only land on the dome (source-atop), so the silhouette stays smooth.
  ctx.globalCompositeOperation = 'source-atop';
  const clumps = 4 + Math.floor(w / 6);
  for (let i = 0; i < clumps; i++) {
    const radius = 2 + Math.floor(rnd() * 3);
    const bx = radius + 2 + rnd() * (w - radius * 2 - 4);
    const by = h * 0.3 + rnd() * h * 0.5;
    disc(ctx, FOREST.leaf, bx, by, radius);
    rect(ctx, FOREST.leafLight, bx - radius + 1, by - radius + 1, 2, 1);
    rect(ctx, FOREST.mossLight, bx - 1, by - radius, 1, 1);
  }
  speckle(ctx, w * 0.45, h * 0.55, w * 0.55, h * 0.45, FOREST.leafDark, 0.55, 0.55);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

export interface StumpSprite {
  canvas: HTMLCanvasElement;
  /** Row of the middle of the flat top, where someone can stand. */
  topY: number;
}

/** The giant mossy stump: ringed top, ridged bark with a lit left edge, moss creeping up from the foot. */
export function buildStump(w: number, h: number): StumpSprite {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rnd = seeded(41);
  const ry = Math.round(w * 0.13);
  const cx = Math.floor(w / 2);
  const rx = cx - 1;
  const footY = h - ry - 1;
  ellipse(ctx, FOREST.bark, cx, footY, rx, ry);
  rect(ctx, FOREST.bark, cx - rx, ry, rx * 2 + 1, footY - ry);
  ctx.globalCompositeOperation = 'source-atop';
  for (let x = 3; x < w - 3; x += 3) {
    rect(ctx, FOREST.barkDark, x + Math.floor(rnd() * 2), ry + Math.floor(rnd() * 4), 1, 6 + Math.floor(rnd() * (h - ry * 2 - 8)));
  }
  rect(ctx, FOREST.barkLight, 2, ry, 2, footY - ry + 2);
  speckle(ctx, w * 0.62, ry, w * 0.38, h - ry, FOREST.barkDark, 0.55, 0.55);
  speckle(ctx, 0, h - 5, w, 5, FOREST.barkDark, 0.3, 0.6);
  for (const share of [0.12, 0.35, 0.8]) {
    disc(ctx, FOREST.moss, w * share, footY - 1, 3);
    rect(ctx, FOREST.mossLight, w * share - 1, footY - 3, 2, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  ellipse(ctx, FOREST.woodDark, cx, ry, rx, ry);
  ellipse(ctx, FOREST.wood, cx, ry, rx - 1, ry - 1);
  for (const share of STUMP_RING_SHARES) {
    ellipse(ctx, FOREST.woodRing, cx, ry, Math.round(rx * share), Math.round((ry - 1) * share));
    ellipse(ctx, FOREST.wood, cx, ry, Math.round(rx * share) - 1, Math.round((ry - 1) * share) - 1);
  }
  line(ctx, FOREST.woodRing, cx + 4, ry - 2, cx + 9, ry + 1);
  for (let i = 0; i < 5; i++) {
    const mx = cx - rx + 2 + Math.floor(rnd() * (rx * 2 - 4));
    disc(ctx, FOREST.moss, mx, ry * 2 - 1, 1 + Math.floor(rnd() * 2));
    rect(ctx, FOREST.mossLight, mx - 1, ry * 2 - 2, 1, 1);
  }
  return { canvas, topY: ry };
}

/** A fallen log lying left to right: its cut end (with rings) on the left, mossy back, orange bracket fungi, a dithered shadow. */
export function buildLog(w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, h + 3);
  const rnd = seeded(77);
  const r = Math.floor(h / 2);
  rect(ctx, FOREST.bark, r, 1, w - r - 1, h);
  ctx.globalCompositeOperation = 'source-atop';
  for (let k = 0; k < Math.floor(h / 3); k++) {
    rect(ctx, FOREST.barkDark, r + 2 + Math.floor(rnd() * (w - r - 10)), 3 + k * 3, 4 + Math.floor(rnd() * 8), 1);
  }
  rect(ctx, FOREST.barkLight, r, 1, w - r - 1, 1);
  rect(ctx, FOREST.barkDark, r, h, w - r - 1, 1);
  for (let x = r + 4; x < w - 6; x += 7) {
    rect(ctx, FOREST.moss, x, 1, 4, 2);
    rect(ctx, FOREST.mossLight, x, 1, 2, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  ellipse(ctx, FOREST.woodDark, r, 1 + r, r, r);
  ellipse(ctx, FOREST.wood, r, 1 + r, r - 1, r - 1);
  ellipse(ctx, FOREST.woodRing, r, 1 + r, Math.round(r * 0.55), Math.round(r * 0.55));
  ellipse(ctx, FOREST.wood, r, 1 + r, Math.round(r * 0.55) - 1, Math.round(r * 0.55) - 1);
  const fungusX = Math.round(r + (w - r) * 0.65);
  rect(ctx, '#e08a3c', fungusX, Math.floor(h / 2), 5, 1);
  rect(ctx, '#f4b86a', fungusX, Math.floor(h / 2) - 1, 4, 1);
  rect(ctx, '#e08a3c', fungusX + 1, Math.floor(h / 2) + 2, 4, 1);
  rect(ctx, '#f4b86a', fungusX + 1, Math.floor(h / 2) + 1, 3, 1);
  speckle(ctx, r - 2, h + 1, w - r, 2, '#1c3a2d', 0.5, 0.5);
  return canvas;
}

export interface RootTree {
  canvas: HTMLCanvasElement;
  /** Centres of the lit windows, in the picture's own pixels. */
  windows: readonly Point[];
  /** Where the little chimney lets out its smoke. */
  chimney: Point;
}

/** The trunk outline: slim above, flaring into roots below. Every row is one run of pixels. */
const TRUNK_OUTLINE: readonly Point[] = [
  { x: 16, y: 0 }, { x: 36, y: 0 }, { x: 37, y: 80 }, { x: 44, y: 100 }, { x: 51, y: 119 },
  { x: 1, y: 119 }, { x: 8, y: 100 }, { x: 15, y: 80 },
];

/** A round-topped gnome door of planks, `w` x `h`, with its feet on row `y + h - 1`. */
function gnomeDoor(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  rect(ctx, FOREST.ink, x - 1, y + 1, w + 2, h);
  rect(ctx, FOREST.ink, x, y, w, 1);
  rect(ctx, color, x, y + 2, w, h - 1);
  rect(ctx, color, x + 1, y + 1, w - 2, 1);
  rect(ctx, mix(color, '#000000', 0.35), x + Math.floor(w / 2), y + 2, 1, h - 1);
  rect(ctx, '#f2c14e', x + w - 2, y + Math.ceil(h / 2), 1, 1);
}

/** A tiny square window with a dark frame and a warm pane (the scene lights a halo over it at dusk). */
function gnomeWindow(ctx: Ctx, x: number, y: number): void {
  rect(ctx, FOREST.ink, x - 1, y - 1, WARM_WINDOW_SIZE + 2, WARM_WINDOW_SIZE + 2);
  rect(ctx, FOREST.warmDim, x, y, WARM_WINDOW_SIZE, WARM_WINDOW_SIZE);
  rect(ctx, FOREST.warm, x, y, 1, 1);
}

/**
 * The ancient village tree: a wide mossy trunk (top cut off flat, the scene hides it under a swaying crown) flaring
 * into roots that hold three little doors, three windows, a ladder, a chimney, and knots of moss.
 */
export function buildRootTree(): RootTree {
  const { canvas, ctx } = memoryCanvas(TRUNK_W, TRUNK_H);
  const rnd = seeded(23);
  shaded(ctx, 0, 0, TRUNK_W, TRUNK_H, (c) => {
    polygon(c, FOREST.bark, TRUNK_OUTLINE);
    ellipse(c, FOREST.bark, 4, 115, 5, 4);
    ellipse(c, FOREST.bark, 47, 115, 5, 4);
    ellipse(c, FOREST.bark, 39, 97, 4, 2);
  }, (c) => {
    for (let i = 0; i < 10; i++) rect(c, FOREST.barkDark, 17 + Math.floor(rnd() * 20), Math.floor(rnd() * 100), 1, 8 + Math.floor(rnd() * 20));
    rect(c, FOREST.barkLight, 17, 0, 2, 82);
    rect(c, FOREST.barkLight, 9, 100, 2, 16);
    speckle(c, 28, 0, 24, TRUNK_H, FOREST.barkDark, 0.6, 0.6);
    disc(c, FOREST.mossDark, 8, 112, 3);
    disc(c, FOREST.moss, 12, 107, 2);
    disc(c, FOREST.moss, 44, 110, 3);
    rect(c, FOREST.mossLight, 7, 110, 2, 1);
    rect(c, FOREST.moss, 17, 58, 2, 22);
    rect(c, FOREST.mossLight, 17, 58, 1, 8);
    ellipse(c, FOREST.ink, 26, 40, 2, 3);
  });
  gnomeDoor(ctx, 13, 107, 5, 9, '#6b3f24');
  gnomeDoor(ctx, 22, 110, 4, 6, '#2f5f6b');
  gnomeDoor(ctx, 33, 108, 5, 8, '#7a3a2a');
  gnomeWindow(ctx, 26, 96);
  gnomeWindow(ctx, 30, 78);
  gnomeWindow(ctx, 20, 63);
  rect(ctx, FOREST.wood, 28, 99, 1, 18);
  rect(ctx, FOREST.wood, 31, 99, 1, 18);
  for (const y of [102, 106, 110, 114]) rect(ctx, FOREST.woodDark, 28, y, 4, 1);
  rect(ctx, FOREST.stone, 38, 90, 4, 7);
  rect(ctx, FOREST.stoneDark, 37, 89, 6, 1);
  rect(ctx, FOREST.stoneDark, 41, 90, 1, 7);
  return {
    canvas,
    windows: [{ x: 27, y: 97 }, { x: 31, y: 79 }, { x: 21, y: 64 }],
    chimney: { x: 40, y: 88 },
  };
}

export interface Tavern {
  canvas: HTMLCanvasElement;
  /** Centre of the glowing window. */
  window: Point;
  /** Where the flagpole tip is (the scene flies a pennant there). */
  flag: Point;
}

const TAVERN_W = 36;
const TAVERN_H = 44;
const CAP_X = 18;
const CAP_Y = 19;
/** The underside of the cap sits at this row; the stem starts just under it. */
const CAP_FLOOR = 24;

/**
 * The toadstool tavern: a red spotted cap, a cream stem with a round door, a glowing window, an ALE sign and a flagpole.
 * The picture's bottom row is where it stands.
 */
export function buildTavern(): Tavern {
  const { canvas, ctx } = memoryCanvas(TAVERN_W, TAVERN_H);
  ellipse(ctx, FOREST.redDark, CAP_X, CAP_Y, 17, 12);
  ellipse(ctx, FOREST.red, CAP_X, CAP_Y - 1, 16, 11);
  ctx.clearRect(0, CAP_FLOOR, TAVERN_W, TAVERN_H - CAP_FLOOR);
  ctx.globalCompositeOperation = 'source-atop';
  ellipse(ctx, FOREST.redLight, CAP_X - 6, CAP_Y - 6, 7, 3);
  speckle(ctx, 22, 8, 13, 15, FOREST.redDark, 0.45, 0.45);
  for (const [sx, sy, radius] of [[10, 17, 2], [23, 14, 2], [28, 20, 1], [15, 12, 1], [19, 20, 1]]) disc(ctx, FOREST.cream, sx, sy, radius);
  ctx.globalCompositeOperation = 'source-over';
  rect(ctx, '#3a1019', 1, CAP_FLOOR - 2, TAVERN_W - 2, 2);
  for (let x = 2; x < TAVERN_W - 3; x += 3) rect(ctx, '#3a1019', x, CAP_FLOOR, 2, 1);
  rect(ctx, FOREST.cream, 8, CAP_FLOOR, 21, TAVERN_H - CAP_FLOOR);
  rect(ctx, FOREST.creamDark, 26, CAP_FLOOR, 3, TAVERN_H - CAP_FLOOR);
  speckle(ctx, 20, CAP_FLOOR, 6, TAVERN_H - CAP_FLOOR, FOREST.creamDark, 0.5, 0.5);
  drawSign(ctx, 'ALE', 14, CAP_FLOOR + 1, 1, FOREST.ink, FOREST.wood);
  gnomeDoor(ctx, 17, 35, 6, 8, '#6b3f24');
  gnomeWindow(ctx, 10, 30);
  rect(ctx, FOREST.barkDark, CAP_X, 0, 1, 9);
  return { canvas, window: { x: 11, y: 31 }, flag: { x: CAP_X + 1, y: 2 } };
}

export interface WoodsSprites {
  rootTree: RootTree;
  tavern: Tavern;
  stump: StumpSprite;
  log: HTMLCanvasElement;
  /** The bush the lost journal page catches in, and the hedge the shy watcher hides behind. */
  pageBush: HTMLCanvasElement;
  peekBush: HTMLCanvasElement;
  /** Small, medium and big ferns. */
  ferns: readonly HTMLCanvasElement[];
}

const STUMP_W = 56;
const STUMP_H = 34;
const LOG_W = 38;
const LOG_H = 9;
const PAGE_BUSH = { w: 28, h: 17, seed: 5 };
const PEEK_BUSH = { w: 32, h: 16, seed: 9 };
const FERN_REACHES = [6, 8, 14];

/** Builds every set piece once. */
export function buildWoodsSprites(): WoodsSprites {
  return {
    rootTree: buildRootTree(),
    tavern: buildTavern(),
    stump: buildStump(STUMP_W, STUMP_H),
    log: buildLog(LOG_W, LOG_H),
    pageBush: buildBush(PAGE_BUSH.w, PAGE_BUSH.h, PAGE_BUSH.seed),
    peekBush: buildBush(PEEK_BUSH.w, PEEK_BUSH.h, PEEK_BUSH.seed),
    ferns: FERN_REACHES.map(buildFern),
  };
}
