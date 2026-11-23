/**
 * The Lake's living plants and animals, as small pictures built once: reed and cattail clumps, lily pads, a heron, a
 * duck family, and the drooping pine branches that frame the top corners. Drawing them is one blit each.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { ellipse, line, rect, seeded, type Ctx } from '../../gravity-falls/art-kit';
import { hash } from '../../journeys/noise';
import { mirrored, pixmap } from '../../journeys/pixmap';
import { breeze } from '../../wind';

const REED_W = 13;
const STEMS = 6;
const STEM_COLOURS = ['#4f7a3f', '#6f9a4f', '#3f6a3a'];
const CATTAIL = '#6b4328';
const CATTAIL_LIGHT = '#9a6a40';
/** How far (in pixels at the tip) the outer stems of a clump lean away from the middle. */
const REED_SPREAD = 2.5;
/** A shortest stem is this share of the clump's height. */
const REED_SHORTEST = 0.65;

/** A clump of `height` rows: six stems fanning out, every other one topped with a brown cattail, a few drooping leaves. */
export function buildReeds(height: number, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(REED_W, height);
  const rand = seeded(seed);
  for (let i = 0; i < STEMS; i++) {
    const baseX = 2 + Math.round((i * (REED_W - 5)) / (STEMS - 1));
    const lean = (i - (STEMS - 1) / 2) / ((STEMS - 1) / 2);
    const tall = Math.round(height * (REED_SHORTEST + (1 - REED_SHORTEST) * rand()));
    const colour = STEM_COLOURS[i % STEM_COLOURS.length];
    let topX = baseX;
    for (let r = 0; r < tall; r++) {
      topX = Math.max(0, Math.min(REED_W - 2, baseX + Math.round(lean * REED_SPREAD * (r / tall))));
      rect(ctx, colour, topX, height - 1 - r, 1, 1);
    }
    const topY = height - tall;
    if (i % 2 === 0) {
      rect(ctx, CATTAIL, topX, topY + 2, 2, 4);
      rect(ctx, CATTAIL_LIGHT, topX, topY + 2, 1, 1);
      rect(ctx, colour, topX, topY, 1, 2);
    } else {
      const leafY = height - Math.round(tall * 0.55);
      line(ctx, STEM_COLOURS[1], topX, leafY, topX + (lean < 0 ? -3 : 3), leafY + 3, 1);
    }
  }
  return canvas;
}

const LILY = '#4f9b57';
const LILY_DARK = '#2f6d4a';
const LILY_LIGHT = '#86c978';

/** One lily pad of half-width `half`, with a pink flower when `flower` is set. */
function lilyPad(half: number, flower: boolean): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(half * 2 + 3, 7);
  const cx = half + 1;
  ellipse(ctx, LILY_DARK, cx, 4, half, 1);
  ellipse(ctx, LILY, cx, 4, half - 1, 1);
  rect(ctx, LILY_LIGHT, cx - half + 2, 3, 2, 1);
  if (flower) {
    rect(ctx, '#f4a6c0', cx - 1, 2, 3, 2);
    rect(ctx, '#fff0f4', cx, 1, 1, 1);
  }
  return canvas;
}

/** Three pads: small, large, and a small one with a flower. */
export function buildLilies(): readonly HTMLCanvasElement[] {
  return [lilyPad(3, false), lilyPad(5, false), lilyPad(4, true)];
}

const HERON_PALETTE = { k: '#2b3440', w: '#e8eef0', y: '#e8b84a', g: '#9db3bd', G: '#6f8794', l: '#7a6a4c' };
const HERON_ROWS = [
  '.....kk...',
  '....kwyy..',
  '.....w....',
  '.....w....',
  '....ww....',
  '....w.....',
  '...gggg...',
  '..ggggGG..',
  '.ggggGGGG.',
  '..gggGGG..',
  '...GGGG...',
  '....l.....',
  '....l.....',
  '....l.....',
  '...ll.....',
];
/** Rows of the heron that belong to the head and neck, which dip toward the water when it fishes. */
const HERON_HEAD_ROWS = 6;

export interface Heron {
  right: HTMLCanvasElement;
  left: HTMLCanvasElement;
}

/** A grey heron on one leg, once facing right and once facing left. */
export function buildHeron(): Heron {
  const right = pixmap(HERON_ROWS, HERON_PALETTE);
  return { right, left: mirrored(right) };
}

const HERON_PERIOD = 18;
const HERON_DIP_FROM = 14;
const HERON_DIP_TO = 15.2;
const HERON_DIP_ROWS = 3;
/** The heron turns round once in this many seconds. */
const HERON_TURN = 40;

/** Draws the heron standing with its foot at (x, baseY); every so often its head and neck dip toward a fish. */
export function drawHeron(ctx: Ctx, heron: Heron, x: number, baseY: number, time: number): void {
  const sprite = Math.floor(time / HERON_TURN) % 2 === 0 ? heron.right : heron.left;
  const left = Math.round(x - sprite.width / 2);
  const top = Math.round(baseY - sprite.height);
  const t = time % HERON_PERIOD;
  const dip = t > HERON_DIP_FROM && t < HERON_DIP_TO ? HERON_DIP_ROWS : 0;
  const bodyRows = sprite.height - HERON_HEAD_ROWS;
  ctx.drawImage(sprite, 0, HERON_HEAD_ROWS, sprite.width, bodyRows, left, top + HERON_HEAD_ROWS, sprite.width, bodyRows);
  ctx.drawImage(sprite, 0, 0, sprite.width, HERON_HEAD_ROWS, left, top + dip, sprite.width, HERON_HEAD_ROWS);
}

const DUCK_PALETTE = { b: '#a8794a', g: '#2e7d4f', y: '#e8b84a', w: '#cfe3e3' };
const DUCK_ROWS = ['.....gg.', '.....gyy', 'bbbbbbg.', '.bbbbbb.', '..wwww..'];
const DUCKLING_PALETTE = { b: '#d8b45a', y: '#e08a3c', w: '#cfe3e3' };
const DUCKLING_ROWS = ['...b.', 'bbbby', '.www.'];

export interface Ducks {
  mother: HTMLCanvasElement;
  motherLeft: HTMLCanvasElement;
  duckling: HTMLCanvasElement;
  ducklingLeft: HTMLCanvasElement;
}

/** A mother duck and her ducklings, facing right and facing left. */
export function buildDucks(): Ducks {
  const mother = pixmap(DUCK_ROWS, DUCK_PALETTE);
  const duckling = pixmap(DUCKLING_ROWS, DUCKLING_PALETTE);
  return { mother, motherLeft: mirrored(mother), duckling, ducklingLeft: mirrored(duckling) };
}

const BARK = '#3a281f';
const BARK_LIGHT = '#5b4030';
const NEEDLE_DARK = '#1b463c';
const NEEDLE_MID = '#2e6b58';
const NEEDLE_LIGHT = '#5f9d6e';
const LIMB_ROWS = 3;
const MIN_NEEDLE = 4;

/**
 * A pine branch that hangs into the picture from a corner: a bark limb along the top and rows of needles that droop
 * below it, longest toward the free end. It grows from the left edge, or from the right edge when `fromRight`.
 */
export function buildBranch(width: number, drop: number, fromRight: boolean, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, drop + LIMB_ROWS);
  rect(ctx, BARK, 0, 0, width, LIMB_ROWS);
  rect(ctx, BARK_LIGHT, 0, 0, width, 1);
  const columns = Math.floor(width / 2);
  for (let i = 0; i < columns; i++) {
    const x = fromRight ? width - 2 - i * 2 : i * 2;
    const length = MIN_NEEDLE + Math.round(hash(seed + i * 1.7) * (drop - MIN_NEEDLE) * (1 - 0.4 * (i / columns)));
    rect(ctx, NEEDLE_DARK, x, LIMB_ROWS, 1, length);
    rect(ctx, NEEDLE_MID, x + 1, LIMB_ROWS, 1, Math.max(MIN_NEEDLE - 1, length - 2));
    rect(ctx, NEEDLE_LIGHT, x, LIMB_ROWS, 1, 2);
  }
  return canvas;
}

/** Wind bends a branch in strips this many rows tall, so each strip moves whole pixels. */
const SWAY_STRIP = 3;

/** Draws a branch hanging from its top edge at (x, y): the top stays put and the lower rows swing with the wind. */
export function drawHanging(ctx: Ctx, sprite: HTMLCanvasElement, x: number, y: number, time: number, amount: number): void {
  const lean = breeze(time, x) * amount;
  for (let sy = 0; sy < sprite.height; sy += SWAY_STRIP) {
    const rows = Math.min(SWAY_STRIP, sprite.height - sy);
    const reach = (sy + rows) / sprite.height;
    ctx.drawImage(sprite, 0, sy, sprite.width, rows, x + Math.round(lean * reach * reach), y + sy, sprite.width, rows);
  }
}
