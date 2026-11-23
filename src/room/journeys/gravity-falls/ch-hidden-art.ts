/**
 * The Hidden Hollow, part one: where things stand (the layout) and the four strips behind the cast: far lilac hills over
 * the valley with its lake and the Shack's one window, hazy pines, giant dark trunks and a hedge of ferns and bushes along
 * the horizon. Everything is painted once when the chapter is built. The ground the cast walks on, the standing stones
 * and the door are in `ch-hidden-art2.ts`; what moves is in `ch-hidden.ts`.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer, ditherFill, ellipse, line, mix, mushroom, polygon, rect, ridge, rock, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { PINE_VARIANTS, fadePalette, pineTree } from '../../gravity-falls/art-trees';
import type { Point } from '../../gravity-falls/types';
import { HAZE, MOSS, PINE_TWILIGHT, ROOT, STONE, type HiddenLayout, type StoneSpec } from '../../landscapes/gravity-falls/hidden-layout';
import { hash } from '../noise';
import { CHAPTER_SECONDS, WALK_SPEED } from './chapters';
import { DESIGN_ROWS, type Station } from './world';

/** The two pauses of the walk: camera x of the rest, and when it starts and ends as a share of the chapter (240 s). */
const STATION_STONES: Station = { at: 340, from: 0.18, to: 0.42 };
const STATION_DOOR: Station = { at: 720, from: 0.62, to: 0.86 };
const MIN_WORLD_WIDTH = 1800;
/** A few pixels past the camera's last stop so the strips never run dry. */
const WORLD_SLACK = 24;
/** A strip is made a few pixels wider than the walk needs so its edge never shows. */
const EDGE_SLACK = 8;

/** Things beside a station sit at a share of the view's width so they land on screen while the camera rests there. */
const LAMP_SHARE = 0.78;
const SIGN_SHARE = 0.3;
const STUMP_SHARE = 0.16;
const STONE_SHARES = [0.7, 0.79, 0.88] as const;
const BUSH_SHARE = 0.3;
const DOOR_SHARE = 0.82;
const STONE_SPECS: readonly Omit<StoneSpec, 'x'>[] = [
  { w: 9, h: 42, base: 212, runes: 3, seed: 1 },
  { w: 11, h: 58, base: 209, runes: 4, seed: 2 },
  { w: 9, h: 46, base: 213, runes: 3, seed: 3 },
];
const DOOR_ROW = 204;
/** Rows the props of the clearing stand on (their feet). */
const LAMP_FOOT = 224;
const SIGN_FOOT = 222;
const STUMP_FOOT = 221;
const BUSH_FOOT = 221;

/** The hillside bank the door is set into: its middle sits a little right of the door and it spreads this far each way. */
export const BANK_HALF = 112;
const BANK_SHIFT = 10;

/** Glowing toadstools and crystals along the trail: about one every `GLOWER_GAP` pixels, every third one a crystal. */
const GLOWER_FIRST = 70;
const GLOWER_GAP = 96;
const GLOWER_JITTER = 30;
const GLOWER_CRYSTAL_EVERY = 3;
const GLOWER_KEEP_CLEAR = 30;
const SHROOM_ROW = 223;
const SHROOM_ROW_SPREAD = 4;
const CRYSTAL_ROW = 222;

/** The far valley sits in the far strip's own pixels (it scrolls at 0.15 of the camera), so it stays within view all along. */
const LAKE_SHARE = 0.5;
const LAKE_ROW = 184;
const SHACK_SHARE = 0.74;
const SHACK_ROW = 187;
const HOUSE_SHARES = [0.8, 0.86, 0.92] as const;
const HOUSE_ROW = 190;
const HOUSE_W = 4;
const HOUSE_H = 3;

/** Everything the chapter and its painters need to know about where things stand: all x are world pixels unless noted. */
export interface HollowLayout {
  readonly designWidth: number;
  readonly worldWidth: number;
  readonly stations: readonly Station[];
  /**
   * The same shapes the Landscape's painters read, filled for this long world. `lake` and `shack` are in the far strip's
   * pixels, `edge` is where the bank ends on the right.
   */
  readonly spec: HiddenLayout;
  /** Centre column of the hillside bank. */
  readonly bankCentre: number;
  /** The far roofs (far strip pixels): their windows light up at dusk. */
  readonly houses: readonly Point[];
}

/** World x where the toadstools and crystals stand, kept away from the door's steps and the lamp (`clear` lists their columns). */
function scatterGlowers(worldWidth: number, clear: readonly number[]): { shrooms: Point[]; crystals: Point[] } {
  const shrooms: Point[] = [];
  const crystals: Point[] = [];
  for (let k = 0, x = GLOWER_FIRST; x < worldWidth - GLOWER_FIRST; k++, x += GLOWER_GAP) {
    const gx = Math.round(x + (hash(k * 2.3) - 0.5) * GLOWER_JITTER);
    if (clear.some((c) => Math.abs(gx - c) < GLOWER_KEEP_CLEAR)) continue;
    if (k % GLOWER_CRYSTAL_EVERY === GLOWER_CRYSTAL_EVERY - 1) crystals.push({ x: gx, y: CRYSTAL_ROW });
    else shrooms.push({ x: gx, y: SHROOM_ROW + Math.floor(hash(k * 5.9) * SHROOM_ROW_SPREAD) });
  }
  return { shrooms, crystals };
}

/** The world for a view `designWidth` wide. Station values are fixed so the camera can be worked out (it walks 9 px a second). */
export function layoutHollow(designWidth: number): HollowLayout {
  const w = designWidth;
  const share = (station: Station, s: number): number => Math.round(station.at + s * w);
  const walkOn = WALK_SPEED * CHAPTER_SECONDS * (1 - STATION_DOOR.to);
  const worldWidth = Math.max(MIN_WORLD_WIDTH, Math.ceil(STATION_DOOR.at + walkOn + w + WORLD_SLACK));
  const door = { x: share(STATION_DOOR, DOOR_SHARE), y: DOOR_ROW };
  const stones = STONE_SPECS.map((spec, i): StoneSpec => ({ ...spec, x: share(STATION_STONES, STONE_SHARES[i]) }));
  const lantern = { x: Math.round(LAMP_SHARE * w), y: LAMP_FOOT };
  const { shrooms, crystals } = scatterGlowers(worldWidth, [door.x, lantern.x]);
  const first = stones[0];
  return {
    designWidth: w,
    worldWidth,
    stations: [STATION_STONES, STATION_DOOR],
    bankCentre: door.x + BANK_SHIFT,
    houses: HOUSE_SHARES.map((s) => ({ x: Math.round(w * s), y: HOUSE_ROW })),
    spec: {
      width: worldWidth,
      door,
      edge: door.x + BANK_SHIFT + BANK_HALF,
      stones,
      lantern,
      sign: { x: Math.round(SIGN_SHARE * w), y: SIGN_FOOT },
      bush: { x: share(STATION_DOOR, BUSH_SHARE), y: BUSH_FOOT },
      stump: { x: share(STATION_STONES, STUMP_SHARE), y: STUMP_FOOT },
      lake: { x: Math.round(w * LAKE_SHARE), y: LAKE_ROW },
      shack: { x: Math.round(w * SHACK_SHARE), y: SHACK_ROW },
      owl: { x: first.x + 1, y: first.base - first.h + 1 },
      shrooms,
      crystals,
    },
  };
}

/** The one window of the Shack, far below, top-left corner in the far strip's pixels: the glow code lights it at dusk. */
export function farWindow(layout: HollowLayout): Point {
  return { x: layout.spec.shack.x - 1, y: layout.spec.shack.y - 4 };
}

/** Width of a strip that scrolls at `factor` of the camera: enough to cover the whole walk without repeating. */
export function stripWidth(worldWidth: number, factor: number, viewWidth: number): number {
  return Math.min(worldWidth, Math.ceil(worldWidth * factor) + viewWidth + EDGE_SLACK);
}

const FAR_RIDGE = { base: 152, top: 100, scale: 110, seed: 11, color: '#8f8ac6', mist: '#b8b3e0' } as const;
const NEAR_RIDGE = { base: 176, top: 134, scale: 70, seed: 23, color: mix('#7b73b4', HAZE, 0.15), mist: '#a39ed0' } as const;
const VALLEY = { top: 172, base: '#6f7cb6', light: '#8e96cc', dark: '#5a66a0' } as const;
const WATER = { rim: '#5f6fb0', deep: '#7f98d6', base: '#a6bdf0', shine: '#d3e2ff' } as const;
const FAR_PINE_STEP = 10;
const FAR_PINE_ROWS = [{ base: 158, sizes: [16, 22, 28], fade: 0.65, seed: 3 }, { base: 182, sizes: [18, 24], fade: 0.5, seed: 41 }] as const;
const VALLEY_PATCHES_PER_PIXEL = 0.07;
const LAKE_MIN_RX = 10;
const LAKE_RX_SHARE = 0.09;
const VALLEY_PINES = 20;
const SHACK_WALL = '#5a463f';
const SHACK_WALL_LIT = '#8a6a58';
const SHACK_ROOF = '#2f6f78';
const SHACK_ROOF_LIT = '#46959b';
const SHACK_DARK = '#2a2442';

/** A row of small hazy pines that melts a ridge into the valley. */
function paintFarPines(ctx: Ctx, width: number, base: number, sizes: readonly number[], fade: number, seed: number): void {
  const palette = fadePalette(PINE_TWILIGHT, HAZE, fade);
  const sprites = sizes.flatMap((size) => Array.from({ length: PINE_VARIANTS }, (_, v) => pineTree(v, size, palette)));
  for (let x = -4, i = 0; x < width + 8; x += FAR_PINE_STEP, i++) {
    const sprite = sprites[Math.floor(hash(i + seed) * sprites.length)];
    const y = base + Math.round(hash(i * 0.6 + seed) * 4);
    ctx.drawImage(sprite, Math.round(x - sprite.width / 2 + hash(i * 3 + seed) * 5), y - sprite.height);
  }
}

/** The little Mystery Shack seen from far above: a brown box, a teal roof, a chimney and a dark window to be lit later. */
function paintFarShack(ctx: Ctx, layout: HollowLayout): void {
  const { x, y } = layout.spec.shack;
  rect(ctx, SHACK_WALL, x - 4, y - 5, 9, 5);
  rect(ctx, SHACK_WALL_LIT, x - 4, y - 5, 4, 5);
  polygon(ctx, SHACK_ROOF, [{ x: x - 6, y: y - 5 }, { x: x + 6, y: y - 5 }, { x, y: y - 9 }]);
  rect(ctx, SHACK_ROOF_LIT, x - 4, y - 7, 2, 1);
  rect(ctx, SHACK_WALL, x + 3, y - 10, 1, 3);
  const pane = farWindow(layout);
  rect(ctx, SHACK_DARK, pane.x, pane.y, 2, 2);
  rect(ctx, SHACK_DARK, x + 2, y - 3, 2, 3);
}

/** The valley floor: patchwork fields, tiny pines, a few roofs, the lake with a pale sheen and the Shack. */
function paintValley(ctx: Ctx, width: number, layout: HollowLayout): void {
  ditherFill(ctx, 0, VALLEY.top, width, DESIGN_ROWS - VALLEY.top, VALLEY.base, VALLEY.light, 0.25);
  const rand = seeded(23);
  for (let i = 0; i < width * VALLEY_PATCHES_PER_PIXEL; i++) {
    rect(ctx, i % 2 === 0 ? VALLEY.light : VALLEY.dark, rand() * width, VALLEY.top + 6 + rand() * 18, 5 + rand() * 8, 1 + Math.round(rand() * 2));
  }
  const { x, y } = layout.spec.lake;
  const rx = Math.max(LAKE_MIN_RX, Math.round(layout.designWidth * LAKE_RX_SHARE));
  ellipse(ctx, WATER.rim, x, y, rx + 1, 4);
  ellipse(ctx, WATER.base, x, y, rx, 3);
  ellipse(ctx, WATER.deep, x + 2, y + 1, rx - 4, 2);
  for (let px = x - rx + 2; px < x + rx - 2; px++) if (bayer(px, y - 2) < 0.5) rect(ctx, WATER.shine, px, y - 2, 1, 1);
  const fade = fadePalette(PINE_TWILIGHT, HAZE, 0.3);
  for (let i = 0; i < VALLEY_PINES; i++) {
    const sprite = pineTree(i, 9 + Math.round(rand() * 4), fade);
    ctx.drawImage(sprite, Math.round(rand() * width) - Math.floor(sprite.width / 2), HOUSE_ROW + Math.round(rand() * 5) - sprite.height);
  }
  for (const house of layout.houses) {
    rect(ctx, '#4d4378', house.x, house.y, HOUSE_W, HOUSE_H);
    rect(ctx, ROOT.light, house.x, house.y - 1, HOUSE_W, 1);
  }
  paintFarShack(ctx, layout);
}

/** The farthest strip: lilac hills, hazy pines, and the valley far below with its lake and the Shack. */
export function buildFarHills(width: number, layout: HollowLayout): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  ridge(ctx, width, FAR_RIDGE);
  paintFarPines(ctx, width, FAR_PINE_ROWS[0].base, FAR_PINE_ROWS[0].sizes, FAR_PINE_ROWS[0].fade, FAR_PINE_ROWS[0].seed);
  ridge(ctx, width, NEAR_RIDGE);
  paintFarPines(ctx, width, FAR_PINE_ROWS[1].base, FAR_PINE_ROWS[1].sizes, FAR_PINE_ROWS[1].fade, FAR_PINE_ROWS[1].seed);
  paintValley(ctx, width, layout);
  return canvas;
}

/** Mid pines stand in loose groups, so the valley shows through between them. */
const MID_BASE = 200;
const MID_SEED = 29;
const MID_GAP = 62;
const MID_SIZE_MIN = 90;
const MID_SIZE_MAX = 150;
/** Pine sizes are rounded to this step so a long strip shares a few dozen sprites instead of hundreds. */
const SIZE_STEP = 10;
const MID_FADE = 0.42;

/** The mid strip: big indigo pines sinking into haze. */
export function buildMidPines(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const palette = fadePalette(PINE_TWILIGHT, HAZE, MID_FADE);
  const rand = seeded(MID_SEED);
  const sprites = new Map<number, HTMLCanvasElement>();
  for (let x = -MID_GAP; x < width + MID_GAP; x += MID_GAP * (0.7 + rand() * 0.9)) {
    const size = Math.round((MID_SIZE_MIN + rand() * (MID_SIZE_MAX - MID_SIZE_MIN)) / SIZE_STEP) * SIZE_STEP;
    const variant = Math.floor(rand() * PINE_VARIANTS);
    const key = size * PINE_VARIANTS + variant;
    let tree = sprites.get(key);
    if (!tree) {
      tree = pineTree(variant, size, palette);
      sprites.set(key, tree);
    }
    ctx.drawImage(tree, Math.round(x - tree.width / 2), MID_BASE - tree.height);
  }
  return canvas;
}

/** A giant trunk standing in a strip: its middle and its width. */
export interface Trunk {
  readonly x: number;
  readonly w: number;
}
const TRUNK_SEED = 71;
const TRUNK_FIRST = 70;
/** The old trunks crowd the start of the trail and thin out toward the open hollow. */
const TRUNK_SPACING_NEAR = 130;
const TRUNK_SPACING_FAR = 420;
const TRUNK_SPREAD = 90;
const TRUNK_WIDTH_MIN = 14;
const TRUNK_WIDTH_SPREAD = 12;
const TRUNK_BASE = 200;
const TRUNK_HAZE = 0.22;
const CANOPY_ROW = 44;

/** The giant trunks of a strip `width` wide; the same width always gives the same trunks. */
export function trunksFor(width: number): Trunk[] {
  const rand = seeded(TRUNK_SEED);
  const trunks: Trunk[] = [];
  for (let x = TRUNK_FIRST; x < width; ) {
    trunks.push({ x: Math.round(x), w: TRUNK_WIDTH_MIN + Math.round(rand() * TRUNK_WIDTH_SPREAD) });
    x += TRUNK_SPACING_NEAR + (TRUNK_SPACING_FAR - TRUNK_SPACING_NEAR) * (x / width) + rand() * TRUNK_SPREAD;
  }
  return trunks;
}

/**
 * One giant trunk from the top of the picture down to the horizon: lit left edge, dithered shadow on the right, long
 * grooves, moss on the lit side, a crown of dark needles at the top and a few hanging moss strands.
 */
function paintTrunk(ctx: Ctx, trunk: Trunk, rand: () => number): void {
  const bark = mix(ROOT.base, HAZE, TRUNK_HAZE);
  const dark = mix(ROOT.dark, HAZE, TRUNK_HAZE);
  const light = mix(ROOT.light, HAZE, TRUNK_HAZE);
  const left = trunk.x - Math.floor(trunk.w / 2);
  rect(ctx, bark, left, 0, trunk.w, TRUNK_BASE);
  rect(ctx, light, left, 0, 2, TRUNK_BASE);
  rect(ctx, dark, left + trunk.w - 2, 0, 2, TRUNK_BASE);
  ctx.fillStyle = dark;
  for (let y = 0; y < TRUNK_BASE; y++) {
    for (let x = left + Math.floor(trunk.w * 0.6); x < left + trunk.w - 2; x++) if (bayer(x, y) < 0.42) ctx.fillRect(x, y, 1, 1);
  }
  for (let gx = left + 3; gx < left + trunk.w - 3; gx += 3) {
    for (let y = Math.floor(rand() * 40); y < TRUNK_BASE; y += 16 + Math.floor(rand() * 40)) rect(ctx, dark, gx, y, 1, 8 + Math.floor(rand() * 20));
  }
  for (let i = 0; i < 4; i++) {
    const y = 90 + rand() * 100;
    ellipse(ctx, MOSS, left + 2 + rand() * trunk.w * 0.4, y, 2, 2);
    rect(ctx, mix(MOSS, '#ffffff', 0.25), left + 1 + rand() * trunk.w * 0.3, y - 2, 2, 1);
  }
  for (let i = 0; i < 3; i++) {
    ellipse(ctx, PINE_TWILIGHT.dark, trunk.x + (i - 1) * 9, CANOPY_ROW + (i % 2) * 5, 12, 5);
    ellipse(ctx, PINE_TWILIGHT.mid, trunk.x + (i - 1) * 9 - 2, CANOPY_ROW + (i % 2) * 5 - 1, 8, 3);
  }
  for (let s = 0; s < 3; s++) {
    const sx = left + 2 + Math.floor(rand() * (trunk.w - 4));
    rect(ctx, MOSS, sx, CANOPY_ROW + 6, 1, 14 + Math.floor(rand() * 18));
  }
}

/** The giant-trunk strip: tall dark trunks that pass at half the walker's speed, so the trail feels deep. */
export function buildTrunks(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(TRUNK_SEED + 1);
  for (const trunk of trunksFor(width)) paintTrunk(ctx, trunk, rand);
  return canvas;
}

const UNDER_SEED = 97;
const UNDER_BASE = 202;
const LEAF = { dark: '#2f4580', mid: '#4a62a8', light: '#7a92d8' } as const;
const FERN_DARK = '#27506a';
const FERN_MID = '#3d7f8a';
const FERN_TIP = '#8fd6c8';
const FERN_FRONDS = 6;
const FERN_REACHES = [9, 14] as const;
const BUSH_SIZES: readonly (readonly [number, number])[] = [[26, 15], [36, 21], [20, 12]];
const SHROOM_CAP = '#58c8bc';
const SHROOM_SPOT = '#e8fff8';
const SHROOM_STEM = '#c9c2e8';
const FLOWER_COLORS = ['#c9a8ff', '#f4e6ff', '#ffd36a', '#8ff0e0'] as const;

/** A fern: curved fronds fanning up from the foot, dark teal with a pale tip. */
export function buildFern(reach: number): HTMLCanvasElement {
  const mid = reach + 1;
  const { canvas, ctx } = memoryCanvas(reach * 2 + 3, reach + 2);
  for (let f = 0; f < FERN_FRONDS; f++) {
    const lean = (f - (FERN_FRONDS - 1) / 2) * 0.28;
    const length = Math.round(reach * (0.75 + 0.25 * hash(f * 3.1 + reach)));
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const color = i === length - 1 ? FERN_TIP : t > 0.5 ? FERN_MID : FERN_DARK;
      rect(ctx, color, mid + lean * i + lean * t * t * reach * 0.5, reach + 1 - i, 1, 1);
    }
  }
  return canvas;
}

/** A rounded bush of three leaf blobs, lit on top, in the hollow's twilight blues. */
function buildBush(w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, h);
  ellipse(ctx, LEAF.dark, w / 2, h - h * 0.4, w / 2 - 1, h * 0.4);
  ellipse(ctx, LEAF.dark, w * 0.3, h * 0.55, w * 0.28, h * 0.45);
  ellipse(ctx, LEAF.dark, w * 0.7, h * 0.6, w * 0.26, h * 0.4);
  ellipse(ctx, LEAF.mid, w / 2, h * 0.6, w * 0.4, h * 0.3);
  ellipse(ctx, LEAF.mid, w * 0.32, h * 0.5, w * 0.2, h * 0.25);
  for (let i = 0; i < w / 4; i++) rect(ctx, LEAF.light, 2 + i * 4 + (i % 2), h * 0.28 + (i % 3), 2, 1);
  return canvas;
}

/** The hedge along the horizon: bushes, ferns, toadstools, mossy rocks and wildflowers, the nearest slow strip. */
export function buildUnderstory(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, DESIGN_ROWS);
  const rand = seeded(UNDER_SEED);
  const bushes = BUSH_SIZES.map(([w, h]) => buildBush(w, h));
  const ferns = FERN_REACHES.map(buildFern);
  const caps = [mushroom(5, SHROOM_CAP, SHROOM_SPOT, SHROOM_STEM), mushroom(7, '#7a6ad8', SHROOM_SPOT, SHROOM_STEM)];
  const stones = [rock(18, 11, 1, STONE), rock(12, 8, 2, STONE)];
  rect(ctx, LEAF.dark, 0, UNDER_BASE - 2, width, DESIGN_ROWS - UNDER_BASE + 2);
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
      rect(ctx, MOSS, x + 2, UNDER_BASE + 2 - stone.height, 5, 1);
    } else {
      const y = UNDER_BASE - 4 - rand() * 4;
      line(ctx, LEAF.dark, x, y + 1, x, y + 3);
      rect(ctx, FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)], x - 1, y, 3, 1);
    }
  }
  return canvas;
}
