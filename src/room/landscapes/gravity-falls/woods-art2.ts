/**
 * Where everything stands in Gnome Woods and the still painting of it: far hills and pines, the dark gaps the
 * watchers hide in, the ground and its small litter, the set pieces and the foreground. Run once per size.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ellipse, line, mushroom, rect, ridge, rock, seeded, drawSign, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_FOREST, PINE_VARIANTS, fadePalette, pineTree, type PinePalette } from '../../gravity-falls/art-trees';
import type { Point } from '../../gravity-falls/types';
import { DESIGN_HEIGHT } from './scene-art';
import { FOREST, speckle, type WoodsSprites } from './woods-art';

/** Rows where things rest. The ground starts at GROUND_TOP; each piece stands with its bottom row on its own base row. */
export const GROUND_TOP = 200;
export const ROOT_BASE = 252;
export const TAVERN_BASE = 246;
export const STUMP_BASE = 244;
export const LOG_BASE = 229;
export const PAGE_BUSH_BASE = 238;
export const POST_BASE = 236;
export const RING_Y = 240;
/** The top row of the hedge the shy watcher hides behind; its head rises from here. */
export const PEEK_BUSH_TOP = 183;
/** The lantern on the signpost: its centre sits this many rows above the post's foot. */
export const LANTERN_RISE = 31;

/** Pines near the viewer: a little deeper and greener than the shared forest pines. */
export const NEAR_PINES: PinePalette = { dark: '#16372f', mid: '#25574a', light: '#5f9d6e', trunk: '#4a3428', trunkShade: '#33231c' };

/** The design width the counts of small things are tuned for. */
const REFERENCE_WIDTH = 480;
/** The radio sits here: nothing strong is painted in this box. */
const RADIO_FROM = 0.385;
const RADIO_TO = 0.625;
const RADIO_TOP = 0.74;

const DEEP_SHADE = '#1b3a35';
const DEEP_DARK = '#0b1c1b';
const DEEP_TOP = 178;
const DEEP_FADE = 6;
const FAR_PALETTE = fadePalette(PINE_FOREST, '#a3cbbd', 0.55);
const MID_FAR_PALETTE = fadePalette(PINE_FOREST, '#8fb8a8', 0.32);
const FAR_SIZES = [70, 84, 98, 112];
const MID_FAR_SIZES = [100, 120, 140];
const FAR_BASE = 196;
const MID_FAR_BASE = 201;
const GAP_RX = 9;
const GAP_RY = 15;
const GAP_TRUNK = '#2a1f1c';

const GROUND = { base: '#2d5640', dark: '#21463a', light: '#4a7d55', moss: '#5f9b5e', dirt: '#8a6a47', trampled: '#58804c', path: '#6a7650', pathLight: '#7f8a5c', pathDark: '#4f5a3d' };
const PATH_Y = 253;
const ROCK_LOOK = { base: '#7d8279', light: '#aab0a4', dark: '#4a4f4a' };
const FLOWER_COLORS = ['#8fb0ff', '#f0f0f0', '#ffe066', '#ff8fb0'];
const MUSHROOM_LOOKS: readonly (readonly [string, string, string])[] = [['#c9522f', '#f3e2c0', '#e6d8b8'], ['#8a6440', '#d9c79e', '#e6d8b8'], ['#c23b3b', '#ffffff', '#e9dcbc']];

const POST_H = 29;
const RING_COUNT = 14;
/** The ring is this much flatter than it is wide, because we look at it from the side. */
const RING_FLATNESS = 0.22;

export interface RingMushroom {
  x: number;
  /** Row of the mushroom's foot. */
  y: number;
  size: number;
  /** True for the near half of the ring, drawn in front of the characters standing inside it. */
  front: boolean;
}

export interface SockLine {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Every x position and meeting place of the scene for one design width. */
export interface WoodsLayout {
  width: number;
  rootX: number;
  tavernX: number;
  stumpX: number;
  postX: number;
  ringX: number;
  ringRx: number;
  logX: number;
  pageBushX: number;
  peekX: number;
  /** Centres of the dark gaps between far trunks; a pair of eyes watches from each. */
  gaps: readonly Point[];
  ring: readonly RingMushroom[];
  /** The gnomes' washing line between the old tree and the tavern, or null on a screen too narrow for it. */
  sockLine: SockLine | null;
}

const MIN_SOCK_SPAN = 14;
const SOCK_HEIGHT_ON_TREE = 204;
const SOCK_TAVERN_OFFSET = 16;
const SOCK_TAVERN_ROW = 221;

/** How many times more small things a window of this width holds than the 480-wide reference. */
export function widthScale(width: number): number {
  return width / REFERENCE_WIDTH;
}

/** True inside the radio's box, where the picture must stay calm. */
export function inRadioBand(width: number, x: number, y: number): boolean {
  return x > width * RADIO_FROM && x < width * RADIO_TO && y > DESIGN_HEIGHT * RADIO_TOP;
}

export function layoutWoods(width: number): WoodsLayout {
  const at = (share: number): number => Math.round(width * share);
  const rootX = at(0.085);
  const tavernX = at(0.215);
  const ringX = at(0.78);
  const ringRx = Math.min(38, Math.round(width * 0.08));
  const ringRy = Math.round(ringRx * RING_FLATNESS);
  const ring: RingMushroom[] = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const angle = (i / RING_COUNT) * Math.PI * 2 + 0.2;
    ring.push({
      x: Math.round(ringX + Math.cos(angle) * ringRx),
      y: Math.round(RING_Y + Math.sin(angle) * ringRy),
      size: i % 3 === 0 ? 7 : 5,
      front: Math.sin(angle) > 0,
    });
  }
  const bx = tavernX - SOCK_TAVERN_OFFSET;
  const ax = rootX + 10;
  return {
    width,
    rootX,
    tavernX,
    stumpX: at(0.32),
    postX: at(0.645),
    ringX,
    ringRx,
    logX: at(0.835),
    pageBushX: at(0.9),
    peekX: at(0.47),
    gaps: [{ x: at(0.19), y: 186 }, { x: at(0.67), y: 189 }, { x: at(0.84), y: 184 }],
    ring,
    sockLine: bx - ax >= MIN_SOCK_SPAN ? { ax, ay: SOCK_HEIGHT_ON_TREE, bx, by: SOCK_TAVERN_ROW } : null,
  };
}

/** Top-left corner of a picture that stands centred on `centerX` with its bottom row on `baseY`. */
export function standing(canvas: HTMLCanvasElement, centerX: number, baseY: number): Point {
  return { x: centerX - Math.floor(canvas.width / 2), y: baseY - canvas.height };
}

/** Paints `color` over an ellipse in a soft dither: solid in the middle where `strength` is above 1, fading to nothing at the rim. */
function soft(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, strength: number): void {
  ctx.fillStyle = color;
  for (let py = Math.round(cy - ry); py <= Math.round(cy + ry); py++) {
    for (let px = Math.round(cx - rx); px <= Math.round(cx + rx); px++) {
      const edge = Math.hypot((px - cx) / rx, (py - cy) / ry);
      if (edge < 1 && bayer(px, py) < (1 - edge) * strength) ctx.fillRect(px, py, 1, 1);
    }
  }
}

function pineSet(sizes: readonly number[], palette: PinePalette): HTMLCanvasElement[] {
  return sizes.flatMap((size) => Array.from({ length: PINE_VARIANTS }, (_, variant) => pineTree(variant, size, palette)));
}

/** Far hills, a deep shadowed forest floor, two hazy rows of pines, the dark gaps between trunks, and mist at their feet. */
export function paintFarForest(ctx: Ctx, layout: WoodsLayout): void {
  const { width } = layout;
  ridge(ctx, width, { base: 172, top: 118, scale: 70, seed: 3, color: '#80aa9e', mist: '#aacdc1' });
  ridge(ctx, width, { base: 188, top: 138, scale: 48, seed: 11, color: '#5f8f86', mist: '#8cb6a8' });
  rect(ctx, DEEP_SHADE, 0, DEEP_TOP + DEEP_FADE, width, GROUND_TOP - DEEP_TOP - DEEP_FADE);
  speckle(ctx, 0, DEEP_TOP, width, DEEP_FADE, DEEP_SHADE, 0.1, 0.95);
  const rnd = seeded(5);
  const far = pineSet(FAR_SIZES, FAR_PALETTE);
  for (let x = -6; x < width + 6; x += 9 + Math.floor(rnd() * 7)) {
    const tree = far[Math.floor(rnd() * far.length)];
    ctx.drawImage(tree, Math.round(x - tree.width / 2), FAR_BASE + Math.floor(rnd() * 6) - tree.height);
  }
  const nearer = pineSet(MID_FAR_SIZES, MID_FAR_PALETTE);
  for (let x = 0; x < width + 20; x += 26 + Math.floor(rnd() * 10)) {
    const tree = nearer[Math.floor(rnd() * nearer.length)];
    ctx.drawImage(tree, Math.round(x - tree.width / 2), MID_FAR_BASE + Math.floor(rnd() * 3) - tree.height);
  }
  for (const gap of layout.gaps) {
    soft(ctx, gap.x, gap.y, GAP_RX + 5, GAP_RY + 6, DEEP_DARK, 2.2);
    ellipse(ctx, DEEP_DARK, gap.x, gap.y, GAP_RX - 3, GAP_RY - 4);
    rect(ctx, GAP_TRUNK, gap.x - GAP_RX - 1, gap.y - GAP_RY + 3, 2, GAP_RY * 2 - 2);
    rect(ctx, GAP_TRUNK, gap.x + GAP_RX - 1, gap.y - GAP_RY + 3, 2, GAP_RY * 2 - 2);
  }
  speckle(ctx, 0, 186, width, GROUND_TOP - 186, '#b9d8cb', 0.05, 0.5);
}

function pinecone(ctx: Ctx, x: number, y: number): void {
  rect(ctx, '#6b4a2d', x, y, 3, 4);
  rect(ctx, '#8a6440', x, y, 1, 2);
  rect(ctx, FOREST.barkDark, x + 2, y + 1, 1, 3);
}

function acorn(ctx: Ctx, x: number, y: number): void {
  rect(ctx, '#a8743a', x, y + 1, 2, 2);
  rect(ctx, '#6b4423', x, y, 2, 1);
}

function flower(ctx: Ctx, x: number, y: number, color: string): void {
  rect(ctx, FOREST.mossDark, x, y + 1, 1, 2);
  rect(ctx, color, x - 1, y, 3, 1);
  rect(ctx, color, x, y - 1, 1, 3);
  rect(ctx, '#ffd24a', x, y, 1, 1);
}

/** The forest floor: moss and shadow, trampled grass in the ring, bare earth round the stump, a faint path, and small litter everywhere. */
export function paintGround(ctx: Ctx, layout: WoodsLayout, ferns: readonly HTMLCanvasElement[]): void {
  const { width } = layout;
  const scale = widthScale(width);
  const rnd = seeded(31);
  rect(ctx, GROUND.base, 0, GROUND_TOP, width, DESIGN_HEIGHT - GROUND_TOP);
  speckle(ctx, 0, GROUND_TOP, width, 14, GROUND.dark, 0.9, 0.05);
  speckle(ctx, 0, 248, width, DESIGN_HEIGHT - 248, GROUND.light, 0.05, 0.5);
  for (let i = 0; i < 12 * scale + 4; i++) soft(ctx, rnd() * width, 214 + rnd() * 50, 18 + rnd() * 16, 4 + rnd() * 3, GROUND.moss, 0.9);
  soft(ctx, layout.stumpX, STUMP_BASE - 2, 62, 12, GROUND.dirt, 2);
  soft(ctx, layout.ringX, RING_Y, layout.ringRx + 12, 10, GROUND.trampled, 1.6);
  for (let x = 0; x < width; x++) {
    const y = PATH_Y + Math.round(Math.sin(x * 0.04) * 2);
    if (inRadioBand(width, x, y)) continue;
    rect(ctx, GROUND.path, x, y, 1, 4);
    if (bayer(x, y) < 0.4) rect(ctx, GROUND.pathLight, x, y, 1, 1);
    if (bayer(x, y + 4) < 0.4) rect(ctx, GROUND.pathDark, x, y + 4, 1, 1);
  }
  const rocks = [0, 1, 2].map((i) => rock(5 + i, 3 + (i % 2), 70 + i, ROCK_LOOK));
  const smallMushrooms = MUSHROOM_LOOKS.map(([cap, spot, stem]) => mushroom(5, cap, spot, stem));
  const scatter = (count: number, top: number, bottom: number, paint: (x: number, y: number) => void): void => {
    for (let i = 0; i < count; i++) {
      const x = Math.round(rnd() * width);
      const y = Math.round(top + rnd() * (bottom - top));
      if (!inRadioBand(width, x, y)) paint(x, y);
    }
  };
  scatter(Math.round(260 * scale) + 20, 204, 268, (x, y) => rect(ctx, rnd() < 0.5 ? GROUND.dark : GROUND.light, x, y, rnd() < 0.3 ? 2 : 1, 1));
  scatter(Math.round(18 * scale) + 4, 212, 262, (x, y) => {
    const stone = rocks[Math.floor(rnd() * rocks.length)];
    ctx.drawImage(stone, x, y - stone.height);
  });
  scatter(Math.round(10 * scale) + 3, 212, 262, (x, y) => pinecone(ctx, x, y));
  scatter(Math.round(8 * scale) + 2, 212, 262, (x, y) => acorn(ctx, x, y));
  scatter(Math.round(22 * scale) + 4, 214, 264, (x, y) => flower(ctx, x, y, FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)]));
  scatter(Math.round(9 * scale) + 3, 216, 262, (x, y) => {
    const small = smallMushrooms[Math.floor(rnd() * smallMushrooms.length)];
    ctx.drawImage(small, x, y - small.height);
  });
  scatter(Math.round(10 * scale) + 3, 214, 258, (x, y) => {
    const fern = ferns[Math.floor(rnd() * 2)];
    ctx.drawImage(fern, x - Math.floor(fern.width / 2), y - fern.height);
  });
  scatter(Math.round(8 * scale) + 2, 210, 266, (x, y) => line(ctx, FOREST.barkDark, x, y, x + 6, y + (rnd() < 0.5 ? 1 : 0)));
}

/** One half of the toadstool ring: the far half behind the characters (`front` false), the near half in front. */
function paintRing(ctx: Ctx, layout: WoodsLayout, front: boolean): void {
  const sizes = new Map<number, HTMLCanvasElement>();
  for (const spot of layout.ring) {
    if (spot.front !== front) continue;
    let sprite = sizes.get(spot.size);
    if (!sprite) {
      sprite = mushroom(spot.size, FOREST.red, '#ffffff', FOREST.cream);
      sizes.set(spot.size, sprite);
    }
    ctx.drawImage(sprite, spot.x - Math.floor(sprite.width / 2), spot.y - sprite.height);
  }
}

/** The signpost: a lantern on top, a KEEP OUT board, and bare wood below where a note can be pinned. */
function paintPost(ctx: Ctx, postX: number): void {
  rect(ctx, FOREST.bark, postX, POST_BASE - POST_H, 3, POST_H);
  rect(ctx, FOREST.barkDark, postX + 2, POST_BASE - POST_H, 1, POST_H);
  rect(ctx, FOREST.barkLight, postX, POST_BASE - POST_H, 1, POST_H);
  const top = POST_BASE - POST_H - 4;
  rect(ctx, FOREST.ink, postX - 1, top, 5, 1);
  rect(ctx, FOREST.warmDim, postX, top + 1, 3, 3);
  rect(ctx, FOREST.ink, postX - 1, top + 4, 5, 1);
  drawSign(ctx, 'KEEP OUT', postX - 3, POST_BASE - POST_H + 3, 1, FOREST.ink, '#c9a46a');
}

/** A little crate and barrel of gnome supplies, standing with their feet on row `baseY`. */
function paintSupplies(ctx: Ctx, x: number, baseY: number): void {
  rect(ctx, FOREST.wood, x, baseY - 6, 7, 6);
  rect(ctx, FOREST.woodDark, x, baseY - 6, 7, 1);
  rect(ctx, FOREST.woodDark, x, baseY - 1, 7, 1);
  line(ctx, FOREST.woodDark, x, baseY - 6, x + 6, baseY - 1);
  rect(ctx, FOREST.woodDark, x + 9, baseY - 8, 6, 8);
  rect(ctx, FOREST.wood, x + 10, baseY - 8, 4, 1);
  rect(ctx, '#3d3d44', x + 9, baseY - 6, 6, 1);
  rect(ctx, '#3d3d44', x + 9, baseY - 2, 6, 1);
}

/** The washing line: a drooping string between two points (the socks themselves swing in the scene's own drawing). */
function paintSockLine(ctx: Ctx, sock: SockLine): void {
  const span = sock.bx - sock.ax;
  for (let i = 0; i <= span; i++) {
    const t = i / span;
    rect(ctx, '#d8d0b8', sock.ax + i, sock.ay + (sock.by - sock.ay) * t + Math.sin(Math.PI * t) * 3, 1, 1);
  }
}

/** The set pieces behind the characters, back to front: ring far half, log, bush, post, village tree, supplies, tavern, stump. */
export function paintSet(ctx: Ctx, layout: WoodsLayout, sprites: WoodsSprites): void {
  const { log, pageBush, stump, tavern, rootTree } = sprites;
  paintRing(ctx, layout, false);
  const draw = (canvas: HTMLCanvasElement, centerX: number, baseY: number): void => {
    const origin = standing(canvas, centerX, baseY);
    ctx.drawImage(canvas, origin.x, origin.y);
  };
  draw(log, layout.logX, LOG_BASE);
  draw(pageBush, layout.pageBushX, PAGE_BUSH_BASE);
  paintPost(ctx, layout.postX);
  draw(rootTree.canvas, layout.rootX, ROOT_BASE);
  paintSupplies(ctx, layout.rootX + 28, ROOT_BASE - 2);
  draw(tavern.canvas, layout.tavernX, TAVERN_BASE);
  draw(stump.canvas, layout.stumpX, STUMP_BASE);
  if (layout.sockLine) paintSockLine(ctx, layout.sockLine);
}

/** What stands in front of the characters: the near half of the ring, the hedge the watcher hides behind, big corner ferns. */
export function paintFront(ctx: Ctx, layout: WoodsLayout, sprites: WoodsSprites): void {
  paintRing(ctx, layout, true);
  const { peekBush, ferns } = sprites;
  ctx.drawImage(peekBush, layout.peekX - Math.floor(peekBush.width / 2), PEEK_BUSH_TOP);
  const bigFern = ferns[ferns.length - 1];
  for (const x of [Math.round(layout.width * 0.03), Math.round(layout.width * 0.97)]) {
    ctx.drawImage(bigFern, x - Math.floor(bigFern.width / 2), DESIGN_HEIGHT - bigFern.height);
  }
}

const BEAM_WIDTH = 12;
const BEAM_HEIGHT = 150;
/** Columns a beam slants to the right for each row down. */
const BEAM_SLANT = 0.28;

/** One slanted shaft of sunlight: dithered, brightest in the middle and fading towards its foot. Drawn pale yellow. */
export function buildBeam(): HTMLCanvasElement {
  const slant = Math.ceil(BEAM_HEIGHT * BEAM_SLANT);
  const { canvas, ctx } = memoryCanvas(BEAM_WIDTH + slant + 1, BEAM_HEIGHT);
  ctx.fillStyle = '#fff3b4';
  for (let y = 0; y < BEAM_HEIGHT; y++) {
    const left = Math.round(y * BEAM_SLANT);
    const fade = 1 - (0.7 * y) / BEAM_HEIGHT;
    for (let x = 0; x < BEAM_WIDTH; x++) {
      const centre = Math.min(x, BEAM_WIDTH - 1 - x) / (BEAM_WIDTH / 2);
      if (bayer(left + x, y) < centre * fade * 2) ctx.fillRect(left + x, y, 1, 1);
    }
  }
  return canvas;
}

const WISP_W = 120;
const WISP_H = 10;

/** A long flat wisp of ground mist, soft-edged and pale. */
export function buildWisp(): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(WISP_W, WISP_H);
  soft(ctx, WISP_W / 2, WISP_H / 2, WISP_W / 2 - 2, WISP_H / 2 - 1, '#d3ece0', 1.6);
  return canvas;
}
