import { mix, type RGB } from '../../render/color';
import { memoryCanvas } from '../../render/pixel-stage';
import { seededRandom } from '../../world/math';
import type { TreeKind } from './biomes';

/** A plant picture and its size in stage pixels. */
export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Four tones of foliage, lit side first. */
type Tones = [RGB, RGB, RGB, RGB];

const TONES: Record<'pine' | 'oak' | 'autumn', Tones> = {
  pine: [[66, 128, 90], [44, 100, 72], [30, 76, 60], [20, 56, 48]],
  oak: [[128, 184, 74], [84, 144, 58], [56, 108, 54], [38, 78, 48]],
  autumn: [[240, 184, 64], [216, 122, 46], [174, 72, 42], [122, 48, 38]],
};
const TRUNK: RGB = [98, 68, 44];
const TRUNK_DARK: RGB = [66, 44, 32];
const REED: RGB = [128, 158, 74];
const REED_DARK: RGB = [88, 120, 58];
const CATTAIL: RGB = [110, 66, 40];
const HAZE: RGB = [168, 190, 208];
const VARIANTS = 4;
/** Rows drawn in one piece when a plant sways: each strip leans a little further than the one below. */
const STRIP = 4;

/** Heights in stage pixels at the design size of 270 rows, as a lowest and highest. */
const HEIGHTS: Record<TreeKind | 'reed' | 'tuft', [number, number]> = {
  pine: [64, 96], oak: [52, 76], autumn: [52, 76], bush: [12, 20], autumnBush: [12, 20], reed: [14, 24], tuft: [6, 10],
};

/** A grid of pixels built in memory and turned into a picture once. */
class Pixels {
  private readonly image: ImageData;
  constructor(readonly w: number, readonly h: number) {
    this.image = new ImageData(w, h);
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const d = this.image.data;
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = 255;
  }

  toSprite(): Sprite {
    const { canvas, ctx } = memoryCanvas(this.w, this.h);
    ctx.putImageData(this.image, 0, 0);
    return { canvas, w: this.w, h: this.h };
  }
}

function hazed(tones: Tones, haze: number): Tones {
  return [mix(tones[0], HAZE, haze), mix(tones[1], HAZE, haze), mix(tones[2], HAZE, haze), mix(tones[3], HAZE, haze)];
}

/** A conifer: stacked tiers that widen toward the base, lit from the left, on a short trunk. */
function pine(h: number, rnd: () => number, tones: Tones, haze: number): Sprite {
  const w = Math.round(h * 0.5) | 1;
  const px = new Pixels(w, h);
  const cx = (w - 1) / 2;
  const trunk = Math.max(3, Math.round(h * 0.1));
  const crown = h - trunk;
  const tiers = 4 + Math.floor(h / 36);
  const trunkColor = mix(TRUNK, HAZE, haze);
  for (let y = crown; y < h; y++) {
    px.set(Math.round(cx) - 1, y, trunkColor);
    px.set(Math.round(cx), y, trunkColor);
    px.set(Math.round(cx) + 1, y, mix(TRUNK_DARK, HAZE, haze));
  }
  const [light, mid, dark, darkest] = hazed(tones, haze);
  const palette = [light, mid, dark, darkest];
  for (let y = 0; y < crown; y++) {
    const t = y / crown;
    const within = t * tiers - Math.floor(t * tiers);
    const half = cx * (0.14 + 0.86 * t) * (0.6 + 0.4 * within);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = half > 0 ? (x - cx) / half : 0;
      let tone = u < -0.35 ? 0 : u < 0.2 ? 1 : u < 0.7 ? 2 : 3;
      if (within > 0.82) tone = Math.min(3, tone + 1);
      if (rnd() < 0.07) tone = Math.max(0, Math.min(3, tone + (rnd() < 0.5 ? -1 : 1)));
      px.set(x, y, palette[tone]);
    }
  }
  return px.toSprite();
}

/** A round-crowned tree (or a bush when `trunkShare` is 0): lumps of foliage shaded from the top left. */
function roundTree(h: number, aspect: number, trunkShare: number, rnd: () => number, tones: Tones, haze: number): Sprite {
  const w = Math.round(h * aspect);
  const px = new Pixels(w, h);
  const trunkH = Math.round(h * trunkShare);
  const crownH = h - trunkH;
  const cx = (w - 1) / 2;
  const palette = hazed(tones, haze);
  const trunkColor = mix(TRUNK, HAZE, haze);
  const bark = Math.max(2, Math.round(w * 0.07));
  for (let y = Math.round(h * 0.5); y < h; y++) {
    for (let x = 0; x < bark; x++) px.set(Math.round(cx) - 1 + x, y, x === bark - 1 ? mix(TRUNK_DARK, HAZE, haze) : trunkColor);
  }
  const main = { x: cx, y: crownH * 0.5, r: Math.min(w / 2, crownH / 2) };
  const lumps = [main];
  for (let i = 0; i < 4; i++) {
    const r = main.r * (0.5 + rnd() * 0.25);
    lumps.push({ x: cx + (rnd() - 0.5) * (w - 2 * r) * 1.1, y: crownH * (0.32 + rnd() * 0.36), r });
  }
  const inside = new Uint8Array(w * crownH);
  const owner = new Int8Array(w * crownH);
  for (let y = 0; y < crownH; y++) {
    for (let x = 0; x < w; x++) {
      let best = -1;
      let bestD = 1;
      lumps.forEach((l, i) => {
        const d = Math.hypot(x - l.x, (y - l.y) * 1.08) / l.r;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) {
        inside[y * w + x] = 1;
        owner[y * w + x] = best;
      }
    }
  }
  for (let y = 0; y < crownH; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside[y * w + x]) continue;
      const l = lumps[owner[y * w + x]];
      const light = (-(x - l.x) * 0.55 - (y - l.y) * 0.85) / l.r + (rnd() - 0.5) * 0.4;
      let tone = light > 0.42 ? 0 : light > -0.05 ? 1 : light > -0.5 ? 2 : 3;
      if (y + 1 >= crownH || !inside[(y + 1) * w + x]) tone = 3;
      px.set(x, y, palette[tone]);
    }
  }
  return px.toSprite();
}

/** A clump of reeds with a few cattail heads: thin stems of different heights. */
function reeds(h: number, rnd: () => number, haze: number): Sprite {
  const w = Math.round(h * 0.7);
  const px = new Pixels(w, h);
  for (let i = 0; i < Math.max(4, Math.round(w / 2.2)); i++) {
    const x = Math.floor(rnd() * w);
    const top = Math.floor(rnd() * h * 0.5);
    const stem = rnd() < 0.5 ? REED : REED_DARK;
    for (let y = top; y < h; y++) px.set(x, y, mix(stem, HAZE, haze));
    if (rnd() < 0.3) {
      px.set(x, top, CATTAIL);
      px.set(x, top + 1, CATTAIL);
      px.set(x, top + 2, CATTAIL);
    }
  }
  return px.toSprite();
}

/** A tuft of grass blades, wider at the base. */
function tuft(h: number, rnd: () => number, base: RGB, haze: number): Sprite {
  const w = Math.round(h * 1.1);
  const px = new Pixels(w, h);
  const dark = mix(base, [20, 40, 24], 0.35);
  for (let i = 0; i < Math.max(3, Math.round(w / 1.6)); i++) {
    const x = Math.floor(rnd() * w);
    const top = Math.floor(rnd() * h * 0.6);
    const lean = rnd() < 0.5 ? -1 : 1;
    const c = mix(rnd() < 0.5 ? base : dark, HAZE, haze);
    for (let y = top; y < h; y++) px.set(x + (y < top + 2 ? lean : 0), y, c);
  }
  return px.toSprite();
}

/** Every plant picture the landscape needs, at one size and haze. */
export interface PlantSet {
  trees: Record<TreeKind, Sprite[]>;
  reeds: Sprite[];
  /** Grass tufts, one set per biome, in that biome's grass colour. */
  tufts: Sprite[][];
}

/** `unit` is the view's rows over 270; `haze` pulls the colours toward the pale of distance (0 near, ~0.45 far). */
export function buildPlants(unit: number, haze: number, grasses: RGB[]): PlantSet {
  const rnd = seededRandom(1234);
  const size = (kind: keyof typeof HEIGHTS, i: number): number => {
    const [lo, hi] = HEIGHTS[kind];
    return Math.max(3, Math.round((lo + ((hi - lo) * (i + 0.5)) / VARIANTS) * unit));
  };
  const make = (kind: TreeKind, fn: (h: number) => Sprite): Sprite[] => Array.from({ length: VARIANTS }, (_, i) => fn(size(kind, i)));
  return {
    trees: {
      pine: make('pine', (h) => pine(h, rnd, TONES.pine, haze)),
      oak: make('oak', (h) => roundTree(h, 0.9, 0.34, rnd, TONES.oak, haze)),
      autumn: make('autumn', (h) => roundTree(h, 0.9, 0.34, rnd, TONES.autumn, haze)),
      bush: make('bush', (h) => roundTree(h, 1.7, 0, rnd, TONES.oak, haze)),
      autumnBush: make('autumnBush', (h) => roundTree(h, 1.7, 0, rnd, TONES.autumn, haze)),
    },
    reeds: Array.from({ length: VARIANTS }, (_, i) => reeds(size('reed', i), rnd, haze)),
    tufts: grasses.map((grass) => Array.from({ length: VARIANTS }, (_, i) => tuft(size('tuft', i), rnd, grass, haze))),
  };
}

/**
 * Draws a plant standing with its base at (`x` + half its width, `baseY`), leaning `bend` pixels at the top. The
 * lean grows toward the top, so the base stays put and the crown moves, in whole pixels.
 */
export function drawSwaying(ctx: CanvasRenderingContext2D, s: Sprite, x: number, baseY: number, bend: number): void {
  const top = baseY - s.h;
  if (Math.abs(bend) < 0.5) {
    ctx.drawImage(s.canvas, x, top);
    return;
  }
  for (let sy = 0; sy < s.h; sy += STRIP) {
    const k = 1 - (sy + STRIP / 2) / s.h;
    const rows = Math.min(STRIP, s.h - sy);
    ctx.drawImage(s.canvas, 0, sy, s.w, rows, x + Math.round(bend * k * k), top + sy, s.w, rows);
  }
}

/** The wind at a place and moment, -1 to 1: slow swells with quicker gusts running through them. */
export function wind(time: number, x: number): number {
  const swell = 0.5 + 0.5 * Math.sin(time * 0.13 + x * 0.001);
  return (Math.sin(time * 0.9 + x * 0.006) * 0.55 + Math.sin(time * 0.31 + x * 0.002 + 1.7) * 0.45) * (0.45 + 0.55 * swell);
}
