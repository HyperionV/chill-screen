/**
 * The Gnome Trail, part one: where things stand (the layout) and the four background strips: misty far forest, mid
 * pines with dark gaps, giant trunks and undergrowth. Everything is painted once when the chapter is built.
 * The ground strip, the set pieces and the animated parts live in `ch-woods-art2.ts` and `ch-woods.ts`.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, disc, ellipse, mix, mushroom, rect, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_FOREST, PINE_VARIANTS, fadePalette, pineTree, type PinePalette } from '../../gravity-falls/art-trees';
import { FOREST, buildBush, buildFern } from '../../landscapes/gravity-falls/woods-art';
import { CHAPTER_SECONDS, WALK_SPEED } from './chapters';
import { DESIGN_ROWS, type Station } from './world';

/** The pale green haze that far trees sink into: light falls through the canopy and fogs the distance. */
export const MIST = '#a9c9b3';
/** The colour of the floor under the undergrowth; the ground strip fades into it along its top edge. */
export const FLOOR_DARK = '#16322b';
const GAP_DARK = '#0d1f1c';
const EDGE_SLACK = 8;

/** Rows: the forest floor starts at FLOOR_TOP, the trail's dirt at PATH_TOP (the cast walks on rows 230 to 240). */
export const FLOOR_TOP = 212;
export const PATH_TOP = 224;
/** The row mid-distance things stand on (hidden behind the undergrowth and the ground). */
const MID_BASE = 222;
const FAR_BASE = 206;
const TRUNK_BASE = 216;
const UNDER_TOP = 214;
const UNDER_BASE = 222;
const MIST_FADE_TOP = 34;
const MIST_SOLID = 104;

/** The two pauses of the walk: camera x of the rest, and when it starts and ends as a share of the chapter (240 s). */
const STATION_GATE: Station = { at: 396, from: 0.2, to: 0.42 };
const STATION_COUNCIL: Station = { at: 792, from: 0.62, to: 0.84 };
const MIN_WORLD_WIDTH = 1800;
/** A few pixels past the camera's last stop so the strips never run dry. */
const WORLD_SLACK = 24;
/** Where the stream crosses the trail (world x of its middle). */
const FORD_X = 230;
/** The journal page lies this far right of the carved tree. */
const PAGE_GAP = 30;

/** Where everything stands in the world, from the walker's first step to the last: all x are world pixels. */
export interface WoodsLayout {
  readonly designWidth: number;
  readonly worldWidth: number;
  readonly stations: readonly Station[];
  readonly note: number;
  readonly ford: number;
  readonly log: number;
  readonly symbol: number;
  readonly page: number;
  readonly socks: number;
  readonly gate: number;
  readonly tavern: number;
  readonly peek: number;
  readonly ring: number;
  readonly council: number;
}

/**
 * The world for a view `designWidth` wide. Station values are fixed so the camera can be worked out (it walks 9 px a
 * second, so 396 px takes 44 s between the rests); things beside a station sit at a share of the view's width so they
 * land on screen while the camera rests there.
 */
export function layoutWoods(designWidth: number): WoodsLayout {
  const w = designWidth;
  const walkOn = WALK_SPEED * CHAPTER_SECONDS * (1 - STATION_COUNCIL.to);
  const first = STATION_GATE.at;
  const second = STATION_COUNCIL.at;
  return {
    designWidth: w,
    worldWidth: Math.max(MIN_WORLD_WIDTH, Math.ceil(second + walkOn + w + WORLD_SLACK)),
    stations: [STATION_GATE, STATION_COUNCIL],
    note: Math.round(0.86 * w),
    ford: FORD_X,
    log: Math.round(first + 0.16 * w),
    symbol: Math.round(first + 0.42 * w),
    page: Math.round(first + 0.42 * w) + PAGE_GAP,
    socks: Math.round(first + 0.56 * w),
    gate: Math.round(first + 0.8 * w),
    tavern: Math.round(second + 0.22 * w),
    peek: Math.round(second + 0.36 * w),
    ring: Math.round(second + 0.5 * w),
    council: Math.round(second + 0.8 * w),
  };
}

/** Width of a strip that scrolls at `factor` of the camera: enough to cover the whole walk without repeating. */
export function stripWidth(worldWidth: number, factor: number, viewWidth: number): number {
  return Math.min(worldWidth, Math.ceil(worldWidth * factor) + viewWidth + EDGE_SLACK);
}

interface PineLook {
  base: number;
  sizeMin: number;
  sizeMax: number;
  gap: number;
  fade: number;
  seed: number;
}
const FAR_PINES: PineLook = { base: FAR_BASE, sizeMin: 110, sizeMax: 165, gap: 24, fade: 0.62, seed: 11 };
const MID_PINES: PineLook = { base: MID_BASE, sizeMin: 150, sizeMax: 215, gap: 40, fade: 0.38, seed: 23 };
/** Pine sizes are rounded to this step so a long strip shares a few dozen sprites instead of hundreds. */
const SIZE_STEP = 10;

/** A forest of pines sinking into the haze; the rows under their feet are filled dark so no sky shows through. */
function scatterPines(ctx: Ctx, width: number, look: PineLook): void {
  const palette = fadePalette(PINE_FOREST, MIST, look.fade);
  const rand = seeded(look.seed);
  const sprites = new Map<number, HTMLCanvasElement>();
  rect(ctx, palette.dark, 0, look.base - 3, width, DESIGN_ROWS - look.base + 3);
  for (let x = -look.gap; x < width + look.gap; x += look.gap * (0.7 + rand() * 0.6)) {
    const size = Math.round((look.sizeMin + rand() * (look.sizeMax - look.sizeMin)) / SIZE_STEP) * SIZE_STEP;
    const variant = Math.floor(rand() * PINE_VARIANTS);
    const key = size * PINE_VARIANTS + variant;
    let tree = sprites.get(key);
    if (!tree) {
      tree = pineTree(variant, size, palette);
      sprites.set(key, tree);
    }
    ctx.drawImage(tree, Math.round(x - tree.width / 2), look.base - tree.height);
  }
}

/** The farthest strip: a haze that thickens down the picture, with pale pines standing in it. */
export function buildMistForest(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  ctx.fillStyle = MIST;
  for (let y = MIST_FADE_TOP; y < MIST_SOLID; y++) {
    const level = (y - MIST_FADE_TOP) / (MIST_SOLID - MIST_FADE_TOP);
    for (let x = 0; x < width; x++) if (bayer(x, y) < level) ctx.fillRect(x, y, 1, 1);
  }
  rect(ctx, MIST, 0, MIST_SOLID, width, DESIGN_ROWS - MIST_SOLID);
  scatterPines(ctx, width, FAR_PINES);
  return canvas;
}

/** A dark gap between the mid trees where something watches: its middle in the strip's own pixels. */
export interface Gap {
  readonly x: number;
  readonly y: number;
}
const GAP_SEED = 61;
const GAP_FIRST = 70;
const GAP_SPACING_MIN = 190;
const GAP_SPACING_SPREAD = 150;
const GAP_ROW_MIN = 150;
const GAP_ROW_SPREAD = 36;
const GAP_RX = 9;
const GAP_RY = 14;
const GAP_RIM = 2;

/** The gaps of a mid strip `width` wide; the same strip width always gives the same gaps, so the art and the eyes agree. */
export function gapsFor(width: number): Gap[] {
  const rand = seeded(GAP_SEED);
  const gaps: Gap[] = [];
  for (let x = GAP_FIRST; x < width - GAP_FIRST; x += GAP_SPACING_MIN + rand() * GAP_SPACING_SPREAD) {
    gaps.push({ x: Math.round(x), y: GAP_ROW_MIN + Math.round(rand() * GAP_ROW_SPREAD) });
  }
  return gaps;
}

/** A near-black hole with a dithered rim, so it reads as depth between the trunks and not as a sticker. */
function paintGap(ctx: Ctx, gap: Gap): void {
  ellipse(ctx, GAP_DARK, gap.x, gap.y, GAP_RX, GAP_RY);
  ctx.fillStyle = GAP_DARK;
  for (let dy = -GAP_RY - GAP_RIM; dy <= GAP_RY + GAP_RIM; dy++) {
    for (let dx = -GAP_RX - GAP_RIM; dx <= GAP_RX + GAP_RIM; dx++) {
      const d = Math.hypot(dx / (GAP_RX + GAP_RIM), dy / (GAP_RY + GAP_RIM));
      if (d < 1 && d > 0.74 && bayer(gap.x + dx, gap.y + dy) < 0.5) ctx.fillRect(gap.x + dx, gap.y + dy, 1, 1);
    }
  }
}

/** The mid strip: big pines in thinner haze, with the dark gaps cut into them. */
export function buildMidPines(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  scatterPines(ctx, width, MID_PINES);
  for (const gap of gapsFor(width)) paintGap(ctx, gap);
  return canvas;
}

/** A giant trunk standing in a strip: its middle and its width. */
export interface Trunk {
  readonly x: number;
  readonly w: number;
}
const TRUNK_SEED = 83;
const TRUNK_SPACING_MIN = 150;
const TRUNK_SPACING_SPREAD = 110;
const TRUNK_WIDTH_MIN = 16;
const TRUNK_WIDTH_SPREAD = 14;
const TRUNK_HAZE = 0.18;

/** The giant trunks of a strip `width` wide; the same width always gives the same trunks. */
export function trunksFor(width: number): Trunk[] {
  const rand = seeded(TRUNK_SEED);
  const trunks: Trunk[] = [];
  for (let x = 40 + rand() * 60; x < width; x += TRUNK_SPACING_MIN + rand() * TRUNK_SPACING_SPREAD) {
    trunks.push({ x: Math.round(x), w: TRUNK_WIDTH_MIN + Math.round(rand() * TRUNK_WIDTH_SPREAD) });
  }
  return trunks;
}

/**
 * One trunk from the top of the picture down to `base`: lit left edge, dithered shadow on the right, long dark grooves,
 * moss low on the lit side, a knot and flared roots. `haze` pulls the colours toward the mist for trees farther away.
 */
export function paintTrunk(ctx: Ctx, cx: number, w: number, base: number, rand: () => number, haze: number): void {
  const bark = mix(FOREST.bark, MIST, haze);
  const dark = mix(FOREST.barkDark, MIST, haze);
  const light = mix(FOREST.barkLight, MIST, haze);
  const moss = mix(FOREST.moss, MIST, haze);
  const left = cx - Math.floor(w / 2);
  rect(ctx, bark, left, 0, w, base);
  rect(ctx, light, left, 0, 2, base);
  rect(ctx, dark, left + w - 2, 0, 2, base);
  ctx.fillStyle = dark;
  for (let y = 0; y < base; y++) {
    for (let x = left + Math.floor(w * 0.6); x < left + w - 2; x++) if (bayer(x, y) < 0.42) ctx.fillRect(x, y, 1, 1);
  }
  for (let gx = left + 3; gx < left + w - 3; gx += 3) {
    let y = Math.floor(rand() * 40);
    while (y < base) {
      const length = 10 + Math.floor(rand() * 26);
      rect(ctx, dark, gx + Math.floor(rand() * 2), y, 1, length);
      y += length + 6 + Math.floor(rand() * 30);
    }
  }
  for (let i = 0; i < 4; i++) {
    const my = base - 12 - rand() * 70;
    disc(ctx, moss, left + 2 + rand() * w * 0.45, my, 2 + Math.floor(rand() * 2));
    rect(ctx, mix(FOREST.mossLight, MIST, haze), left + 1 + rand() * w * 0.4, my - 2, 2, 1);
  }
  ellipse(ctx, dark, cx, base - 70 - rand() * 40, 2, 3);
  ellipse(ctx, bark, left - 3, base - 3, 6, 5);
  ellipse(ctx, bark, left + w + 2, base - 3, 6, 5);
  rect(ctx, dark, left - 2, base - 1, w + 5, 1);
}

/** The giant-trunk strip: trunks that pass at half the walker's speed, so the trail feels deep. */
export function buildTrunks(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(TRUNK_SEED + 1);
  for (const trunk of trunksFor(width)) paintTrunk(ctx, trunk.x, trunk.w, TRUNK_BASE, rand, TRUNK_HAZE);
  return canvas;
}

const UNDER_SEED = 97;
const UNDER_ROCK = { base: '#6e7a72', light: '#9fb0a2', dark: '#3d4a44' };
const FLOWER_COLORS = ['#f4ecd2', '#f4d35e', '#e58fb0', '#9ab8ee'] as const;
const FERN_REACHES = [8, 13] as const;
const BUSH_SIZES: readonly (readonly [number, number])[] = [[26, 15], [36, 21], [20, 12]];

/** The undergrowth: a dark floor with bushes, ferns, toadstools, mossy rocks and a few wildflowers along its top edge. */
export function buildUnderstory(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(UNDER_SEED);
  const bushes = BUSH_SIZES.map(([w, h], i) => buildBush(w, h, i + 1));
  const ferns = FERN_REACHES.map(buildFern);
  const caps = [mushroom(5, FOREST.red, FOREST.cream, FOREST.cream), mushroom(7, '#e08a3c', FOREST.cream, FOREST.cream)];
  const stones = [rock(18, 11, 1, UNDER_ROCK), rock(12, 8, 2, UNDER_ROCK)];
  rect(ctx, FLOOR_DARK, 0, UNDER_TOP, width, DESIGN_ROWS - UNDER_TOP);
  for (let x = 0; x < width; x += 11 + rand() * 17) {
    const pick = rand();
    if (pick < 0.4) {
      const bush = bushes[Math.floor(rand() * bushes.length)];
      ctx.drawImage(bush, Math.round(x - bush.width / 2), UNDER_BASE - bush.height);
    } else if (pick < 0.65) {
      const fern = ferns[Math.floor(rand() * ferns.length)];
      ctx.drawImage(fern, Math.round(x - fern.width / 2), UNDER_BASE + 1 - fern.height);
    } else if (pick < 0.8) {
      const cap = caps[Math.floor(rand() * caps.length)];
      ctx.drawImage(cap, Math.round(x), UNDER_BASE + 1 - cap.height);
      ctx.drawImage(caps[0], Math.round(x + 6), UNDER_BASE + 2 - caps[0].height);
    } else if (pick < 0.9) {
      const stone = stones[Math.floor(rand() * stones.length)];
      ctx.drawImage(stone, Math.round(x), UNDER_BASE + 2 - stone.height);
      rect(ctx, FOREST.moss, x + 2, UNDER_BASE + 2 - stone.height, 5, 1);
    } else {
      rect(ctx, FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)], x, UNDER_BASE - 4 - rand() * 4, 2, 2);
    }
  }
  return canvas;
}

/** The pines the foreground boughs are coloured like: darker than the trail's own, because they hang close to the walker. */
export const BOUGH_PALETTE: PinePalette = { dark: '#0f2a25', mid: '#1b463c', light: '#3f7a5a', trunk: '#3a281f', trunkShade: '#2a1c16' };

/**
 * A pine bough hanging from the canopy: a branch across the top with needle strands drooping from it, longest in the
 * middle. The foot of the picture is its free end, which is the part the wind moves most.
 */
export function buildBough(w: number, h: number, seed: number, palette: PinePalette): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, h);
  const rand = seeded(seed);
  rect(ctx, palette.trunk, 0, 0, w, 2);
  rect(ctx, palette.trunkShade, 0, 1, w, 1);
  for (let x = 1; x < w - 1; x += 3) {
    const length = Math.round((h - 2) * (0.45 + 0.55 * rand()) * (1 - (Math.abs(x - w / 2) / w) * 0.7));
    for (let r = 0; r < length; r++) {
      const half = Math.max(0, Math.round(2 * (1 - r / length)));
      rect(ctx, palette.mid, x - half, 2 + r, half * 2 + 1, 1);
      if (half > 0) rect(ctx, palette.dark, x + half, 2 + r, 1, 1);
      if (r % 3 === 0) rect(ctx, palette.light, x - half, 2 + r, 1, 1);
    }
  }
  return canvas;
}
