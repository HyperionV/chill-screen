/**
 * Small pixel-art helpers shared by the Gravity Falls Landscape and Journey: shapes, dithering, glow, signs and
 * little props. Everything here draws with whole-pixel rectangles (no smoothing) and is meant to be run once when
 * a scene is built; only `drawHalo` is cheap enough for every frame. Trees and grass live in `art-trees.ts`.
 */
import { memoryCanvas } from '../../render/pixel-stage';
import { drawText, plainText, textWidth } from '../../render/pixel-font';
import { hash, noise } from '../journeys/noise';
import type { Point } from './types';

export type Ctx = CanvasRenderingContext2D;

/** The 4x4 ordered dither thresholds, the same pattern the stage uses, so our dither lines up with its own. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BAYER_CELLS = 16;
/** Brightness steps of a glow halo, faintest first; a pixel's step is dithered so the rings blend. */
const HALO_STEPS = [0, 0.12, 0.24, 0.4, 0.55];
/** Rows of mist blended into the foot of a ridge. */
const RIDGE_MIST_ROWS = 16;
const MIN_POST_GAP = 4;

/** Ordered-dither threshold at a whole pixel: 0..1, a fixed pattern that repeats every 4 pixels. */
export function bayer(x: number, y: number): number {
  return (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / BAYER_CELLS;
}

/** A repeatable random-number maker: `seeded(7)()` gives 0..1, then the next number in a fixed sequence. */
export function seeded(seed: number): () => number {
  let n = 0;
  return () => hash(seed * 131.7 + ++n);
}

/** Fills a rectangle with a colour, snapped to whole pixels. */
export function rect(ctx: Ctx, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** The colour `t` of the way (0..1) from hex colour `a` to hex colour `b`, as a hex string. Colours must be '#rrggbb'. */
export function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A filled pixel disc of radius `r` centred on (cx, cy). */
export function disc(ctx: Ctx, color: string, cx: number, cy: number, r: number): void {
  ellipse(ctx, color, cx, cy, r, r);
}

/** A filled pixel ellipse with half-width `rx` and half-height `ry`, centred on (cx, cy). */
export function ellipse(ctx: Ctx, color: string, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = color;
  const x = Math.round(cx);
  const y = Math.round(cy);
  const radiusY = Math.round(ry);
  for (let dy = -radiusY; dy <= radiusY; dy++) {
    const t = dy / (radiusY + 0.5);
    const half = Math.floor((Math.round(rx) + 0.5) * Math.sqrt(1 - t * t));
    ctx.fillRect(x - half, y + dy, half * 2 + 1, 1);
  }
}

/** A straight line of `thick` x `thick` squares from (x0, y0) to (x1, y1), stepped one pixel at a time. */
export function line(ctx: Ctx, color: string, x0: number, y0: number, x1: number, y1: number, thick = 1): void {
  ctx.fillStyle = color;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), thick, thick);
  }
}

/** Fills a convex polygon (roofs, gables, slopes) row by row with hard pixel edges. Points are in drawing order. */
export function polygon(ctx: Ctx, color: string, points: readonly Point[]): void {
  const top = Math.ceil(Math.min(...points.map((p) => p.y)));
  const bottom = Math.floor(Math.max(...points.map((p) => p.y)));
  ctx.fillStyle = color;
  for (let y = top; y <= bottom; y++) {
    let lo = Infinity;
    let hi = -Infinity;
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      if (y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) return;
      const xs = a.y === b.y ? [a.x, b.x] : [a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y)];
      lo = Math.min(lo, ...xs);
      hi = Math.max(hi, ...xs);
    });
    if (lo <= hi) ctx.fillRect(Math.round(lo), y, Math.round(hi) - Math.round(lo) + 1, 1);
  }
}

/**
 * Draws a shape and its surface detail into a scratch layer, then puts it on `ctx`: `shape` paints the outline in
 * a flat colour, `detail` then paints planks, shingles or shadow that only land on the shape (source-atop). Both
 * draw in `ctx` coordinates; the box (x, y, w, h) must contain the shape.
 */
export function shaded(ctx: Ctx, x: number, y: number, w: number, h: number, shape: (c: Ctx) => void, detail: (c: Ctx) => void): void {
  const { canvas, ctx: layer } = memoryCanvas(Math.max(1, w), Math.max(1, h));
  layer.translate(-x, -y);
  shape(layer);
  layer.globalCompositeOperation = 'source-atop';
  detail(layer);
  ctx.drawImage(canvas, x, y);
}

/**
 * Fills a rectangle with `base` and scatters `accent` over it in an ordered dither: `level` 0 is all base, 1 is all
 * accent, in between the accent pixels thicken. Use it for soft shadow edges and mist instead of a gradient.
 */
export function ditherFill(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, accent: string, level: number): void {
  rect(ctx, base, x, y, w, h);
  ctx.fillStyle = accent;
  const left = Math.round(x);
  const top = Math.round(y);
  for (let py = top; py < top + h; py++) {
    for (let px = left; px < left + w; px++) if (bayer(px, py) < level) ctx.fillRect(px, py, 1, 1);
  }
}

export interface RidgeLook {
  /** Row of the ridge's foot (bottom edge). */
  base: number;
  /** Row of the highest summit. */
  top: number;
  /** Horizontal size of one hill bump in pixels; bigger is gentler. */
  scale: number;
  /** Changes the shape of the hills. */
  seed: number;
  color: string;
  /** Mist colour the foot of the ridge fades into by dither, so far hills sink into haze. */
  mist: string;
}

/** A band of far hills: a noisy skyline filled with `color`, its lower rows dithered into `mist`. Built once. */
export function ridge(ctx: Ctx, width: number, look: RidgeLook): void {
  const span = look.base - look.top;
  for (let x = 0; x < width; x++) {
    const top = Math.round(look.base - noise(x / look.scale + look.seed) * span);
    rect(ctx, look.color, x, top, 1, look.base - top);
    const mistTop = Math.max(top, look.base - RIDGE_MIST_ROWS);
    for (let y = mistTop; y < look.base; y++) {
      if (bayer(x, y) < (y - mistTop) / RIDGE_MIST_ROWS) rect(ctx, look.mist, x, y, 1, 1);
    }
  }
}

const haloCache = new Map<string, HTMLCanvasElement>();

/** The halo picture for one radius and colour, built the first time and kept; a dithered 5-step fall-off. */
function haloSprite(radius: number, color: string): HTMLCanvasElement {
  const key = `${radius}|${color}`;
  const known = haloCache.get(key);
  if (known) return known;
  const size = radius * 2 + 1;
  const { canvas, ctx } = memoryCanvas(size, size);
  ctx.fillStyle = color;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const d = Math.hypot(px - radius, py - radius) / radius;
      if (d >= 1) continue;
      const step = Math.min(HALO_STEPS.length - 1, Math.floor((1 - d) * (HALO_STEPS.length - 1) + bayer(px, py)));
      if (step === 0) continue;
      ctx.globalAlpha = HALO_STEPS[step];
      ctx.fillRect(px, py, 1, 1);
    }
  }
  haloCache.set(key, canvas);
  return canvas;
}

/**
 * A soft light halo centred on (x, y): bright core, mid ring, faint dithered edge. `strength` 0..1 scales the whole
 * halo (use it for dusk fade-in and flicker). The picture is cached per radius and colour, so this costs one blit.
 */
export function drawHalo(ctx: Ctx, x: number, y: number, radius: number, color: string, strength: number): void {
  if (strength <= 0) return;
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, strength);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(haloSprite(radius, color), Math.round(x) - radius, Math.round(y) - radius);
  ctx.globalAlpha = before;
}

/**
 * A painted sign: a board of `paper` with an `ink` border and `text` in the pixel font, top-left at (x, y).
 * `size` is how many pixels each font pixel covers. Returns the board's width and height so the caller can place
 * posts, ornaments or neighbours.
 */
export function drawSign(ctx: Ctx, text: string, x: number, y: number, size: number, ink: string, paper: string): { w: number; h: number } {
  const plain = plainText(text);
  const pad = size + 1;
  const w = textWidth(plain) * size + pad * 2;
  const h = 5 * size + pad * 2;
  rect(ctx, ink, x, y, w, h);
  rect(ctx, paper, x + 1, y + 1, w - 2, h - 2);
  drawText(ctx, plain, x + pad, y + pad, ink, size);
  return { w, h };
}

/** A toadstool picture (cap `size` pixels wide, odd number from 5 up) with the bottom-centre at its bottom row. */
export function mushroom(size: number, cap: string, spot: string, stem: string): HTMLCanvasElement {
  const capHeight = Math.ceil(size * 0.55);
  const stemHeight = Math.max(2, Math.floor(size * 0.4));
  const { canvas, ctx } = memoryCanvas(size, capHeight + stemHeight);
  const mid = Math.floor(size / 2);
  const stemWidth = size >= 7 ? 3 : 1;
  // Two ovals make the cap and its dark underside; the lower half of both is wiped so only a dome is left.
  ellipse(ctx, mix(cap, '#000000', 0.35), mid, capHeight - 1, mid, capHeight - 1);
  ellipse(ctx, cap, mid, capHeight - 2, mid - 1, capHeight - 2);
  ctx.clearRect(0, capHeight, size, stemHeight);
  rect(ctx, stem, mid - Math.floor(stemWidth / 2), capHeight - 1, stemWidth, stemHeight + 1);
  rect(ctx, mix(stem, '#000000', 0.25), mid + Math.floor(stemWidth / 2), capHeight, 1, stemHeight);
  rect(ctx, mix(cap, '#ffffff', 0.35), mid - 1, 1, 2, 1);
  rect(ctx, spot, mid - Math.floor(size / 3), Math.max(1, capHeight - 3), 1, 1);
  rect(ctx, spot, mid + Math.floor(size / 4), Math.max(1, capHeight - 2), 1, 1);
  return canvas;
}

export interface RockLook {
  base: string;
  light: string;
  dark: string;
}

/** A rounded boulder `w` x `h` pixels: dark outline, 1-pixel top-left highlight, dithered shadow underneath. `seed` varies the cracks. */
export function rock(w: number, h: number, seed: number, look: RockLook): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, h);
  const cx = Math.floor(w / 2);
  // A dome centred on the bottom row: the canvas edge cuts it flat, so it sits on the ground.
  ellipse(ctx, look.dark, cx, h - 1, w / 2 - 0.5, h - 1);
  ellipse(ctx, look.base, cx, h - 1, w / 2 - 1.5, h - 2);
  // Detail goes on with source-atop so it only lands on the stone, never on the see-through corners.
  ctx.globalCompositeOperation = 'source-atop';
  ditherFill(ctx, Math.round(w * 0.35), Math.round(h * 0.7), Math.round(w * 0.65), Math.max(1, Math.round(h * 0.3)), look.base, look.dark, 0.5);
  rect(ctx, look.light, w * 0.25, h * 0.2, Math.max(2, w * 0.2), 1);
  rect(ctx, look.light, w * 0.2, h * 0.3, 1, 1);
  const crackX = Math.round(w * (0.4 + hash(seed) * 0.3));
  rect(ctx, look.dark, crackX, h * 0.35, 1, Math.max(2, h * 0.3));
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

export interface FenceLook {
  wood: string;
  light: string;
  dark: string;
}

/**
 * A crooked wooden fence from `x` to `x + length` standing on row `baseY`: posts every `gap` pixels (each leaning a
 * pixel or two by chance) joined by two rails. Draws straight onto `ctx`; run it when building the layer.
 */
export function fenceRun(ctx: Ctx, x: number, baseY: number, length: number, look: FenceLook, height = 10, gap = 9): void {
  const step = Math.max(MIN_POST_GAP, gap);
  const rail = (row: number): void => {
    rect(ctx, look.wood, x, baseY - row, length, 2);
    rect(ctx, look.dark, x, baseY - row + 1, length, 1);
  };
  rail(Math.round(height * 0.7));
  rail(Math.round(height * 0.3));
  for (let px = x; px <= x + length; px += step) {
    const lean = Math.floor(hash(px * 0.37) * 3) - 1;
    const tall = height + Math.floor(hash(px * 0.91) * 3);
    for (let row = 0; row < tall; row++) {
      const shift = Math.round((lean * row) / tall);
      rect(ctx, look.wood, px + shift, baseY - row - 1, 2, 1);
      rect(ctx, look.dark, px + shift + 1, baseY - row - 1, 1, 1);
    }
    rect(ctx, look.light, px + Math.round(lean), baseY - tall, 1, 1);
  }
}

/**
 * A street or yard lamp: a slim pole standing on row `baseY` with a small lantern box on top, in `metal` with the
 * glass in `glass`. Returns the lantern's centre so the scene can put a `drawHalo` there at dusk.
 */
export function lampPost(ctx: Ctx, x: number, baseY: number, height: number, metal: string, glass: string): Point {
  rect(ctx, metal, x, baseY - height, 2, height);
  rect(ctx, mix(metal, '#000000', 0.35), x + 1, baseY - height, 1, height);
  rect(ctx, metal, x - 1, baseY - 2, 4, 2);
  const lanternTop = baseY - height - 5;
  rect(ctx, metal, x - 2, lanternTop, 6, 1);
  rect(ctx, glass, x - 1, lanternTop + 1, 4, 3);
  rect(ctx, metal, x - 2, lanternTop + 4, 6, 1);
  rect(ctx, mix(glass, '#ffffff', 0.5), x - 1, lanternTop + 1, 1, 1);
  return { x: x + 1, y: lanternTop + 2 };
}
