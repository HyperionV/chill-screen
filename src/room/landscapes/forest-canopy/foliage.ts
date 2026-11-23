/**
 * The leaves of the Forest Canopy. Each clump is a small picture of overlapping leaves, lit from the top right
 * (where the sun is) and dark below; clumps are scattered in three depths and sway with the wind as whole pieces.
 * The far ones are pale and misty, the near ones are dark and frame the page. Pictures are built once per width.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { ellipse, rect, seeded, mix } from '../../gravity-falls/art-kit';
import { breeze, gust } from '../../wind';
import type { Point } from '../../gravity-falls/types';
import { inSunGap, type Perspective } from './layout';

interface LeafPalette {
  dark: string;
  mid: string;
  light: string;
  /** The brightest leaves, where the sun catches an edge. */
  rim: string;
}

const FAR_LEAVES: LeafPalette = { dark: '#5f9a86', mid: '#8fc79c', light: '#c5e6a2', rim: '#f0f6b8' };
const MID_LEAVES: LeafPalette = { dark: '#1d5238', mid: '#378a46', light: '#8ccc58', rim: '#e0f08a' };
const NEAR_LEAVES: LeafPalette = { dark: '#0a2620', mid: '#12432d', light: '#3a8238', rim: '#b6e060' };

/** Leaves per square pixel of a clump: enough to look full while the rim stays ragged. */
const LEAF_DENSITY = 1.45;
/** A clump is a little flatter than it is wide, like a bunch of leaves hanging from a branch. */
const CLUMP_SQUASH = 0.82;
/** Tone cut-offs from dark to bright; the tone mixes where the leaf sits on the clump with a little chance. */
const TONE_MID = 0.3;
const TONE_LIGHT = 0.62;
const TONE_RIM = 0.9;
const SUN_PULL_X = 0.35;
const SUN_PULL_Y = 0.45;
const TONE_CHANCE = 0.35;
const CORE_SHARE = 0.72;
const VARIANTS = 4;
const SPREAD_TRIES = 14;
/** Clumps are placed a little off the page so no edge shows. */
const OFF_PAGE = 12;

export interface Clump {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  /** How far the wind can push this clump, in pixels. */
  amount: number;
}

function clumpSprite(radius: number, palette: LeafPalette, seed: number): HTMLCanvasElement {
  const size = radius * 2 + 4;
  const { canvas, ctx } = memoryCanvas(size, size);
  const rand = seeded(seed);
  const c = size / 2;
  ellipse(ctx, palette.dark, c, c, radius * CORE_SHARE, radius * CORE_SHARE * CLUMP_SQUASH);
  const leaves = Math.round(radius * radius * LEAF_DENSITY);
  for (let i = 0; i < leaves; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = radius * Math.sqrt(rand());
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * CLUMP_SQUASH;
    const tone = 0.5 + (dx / radius) * SUN_PULL_X - (dy / radius) * SUN_PULL_Y + (rand() - 0.5) * TONE_CHANCE;
    const colour = tone > TONE_RIM ? palette.rim : tone > TONE_LIGHT ? palette.light : tone > TONE_MID ? palette.mid : palette.dark;
    const wide = rand() > 0.5;
    rect(ctx, colour, c + dx, c + dy, wide ? 3 : 2, wide ? 2 : 3);
  }
  return canvas;
}

function variants(palette: LeafPalette, rMin: number, rMax: number, seed: number): HTMLCanvasElement[] {
  return Array.from({ length: VARIANTS }, (_, i) => clumpSprite(Math.round(rMin + ((rMax - rMin) * i) / (VARIANTS - 1)), palette, seed + i * 3.1));
}

interface Region {
  count: number;
  rowFrom: number;
  rowTo: number;
  amount: number;
  accept(p: Perspective, x: number, y: number): boolean;
}

function scatter(p: Perspective, region: Region, sprites: readonly HTMLCanvasElement[], seed: number): Clump[] {
  const rand = seeded(seed);
  const clumps: Clump[] = [];
  for (let tries = 0; clumps.length < region.count && tries < region.count * SPREAD_TRIES; tries++) {
    const x = -OFF_PAGE + rand() * (p.width + OFF_PAGE * 2);
    const y = region.rowFrom + rand() * (region.rowTo - region.rowFrom);
    if (!region.accept(p, x, y)) continue;
    clumps.push({ sprite: sprites[Math.floor(rand() * sprites.length)], x, y, amount: region.amount });
  }
  return clumps.sort((a, b) => a.y - b.y);
}

export interface Canopy {
  far: Clump[];
  mid: Clump[];
  near: Clump[];
}

/** Share of the width, on each side, where the near leaves hang down the page like the edges of a frame. */
const FRAME_SHARE = 0.2;
const NEAR_TOP_ROWS = 46;
/** A roof of leaves high in the page, so the light comes down through gaps in it. */
const CEILING_FROM = 0;
const CEILING_TO = 105;
/** Leaves gather this thickly round the tips of the boughs: clumps per tip, and how far they scatter. */
/** Far crowns are small, so they get more clumps per tip to look full. */
const CLUMPS_PER_TIP: Readonly<Record<Depth, number>> = { far: 2, mid: 1, near: 1 };
const TIP_SCATTER = 9;

interface LeafSets {
  far: HTMLCanvasElement[];
  mid: HTMLCanvasElement[];
  near: HTMLCanvasElement[];
}

let sets: LeafSets | null = null;

/** The leaf pictures, made once and shared by every chapter. */
function leafSets(): LeafSets {
  sets ??= {
    far: variants(FAR_LEAVES, 8, 14, 11),
    mid: variants(MID_LEAVES, 9, 16, 23),
    near: variants(NEAR_LEAVES, 14, 26, 37),
  };
  return sets;
}

export type Depth = 'far' | 'mid' | 'near';

/** Leaf clumps gathered on the thin ends of boughs, at one depth. */
export function clumpsAt(tips: readonly Point[], depth: Depth, amount: number, seed: number): Clump[] {
  const rand = seeded(seed);
  const sprites = leafSets()[depth];
  const clumps: Clump[] = [];
  for (const tip of tips) {
    for (let i = 0; i < CLUMPS_PER_TIP[depth]; i++) {
      clumps.push({
        sprite: sprites[Math.floor(rand() * sprites.length)],
        x: tip.x + (rand() - 0.5) * TIP_SCATTER * 2,
        y: tip.y + (rand() - 0.5) * TIP_SCATTER * 2,
        amount,
      });
    }
  }
  return clumps.sort((a, b) => a.y - b.y);
}

export interface FillerSpec {
  /** Clumps in the roof of leaves high in the page. */
  ceiling: number;
  /** Extra far clumps spread over the upper page, for chapters with a thick canopy. */
  distant: number;
  /** Near clumps framing the edges of the page. */
  frame: number;
}

/** Filler leaves between the oaks: a hazy far layer, a roof, and near clumps along the edges. */
export function buildFiller(p: Perspective, spec: FillerSpec): Canopy {
  const { far, mid, near } = leafSets();
  return {
    far: scatter(p, { count: spec.distant, rowFrom: -12, rowTo: 135, amount: 0.6, accept: (q, x, y) => !inSunGap(q, x, y) }, far, 101),
    mid: scatter(p, { count: spec.ceiling, rowFrom: CEILING_FROM, rowTo: CEILING_TO, amount: 0.9, accept: (q, x, y) => !inSunGap(q, x, y) }, mid, 404),
    near: scatter(p, {
      count: spec.frame, rowFrom: -10, rowTo: 238, amount: 1.8,
      accept: (q, x, y) => !inSunGap(q, x, y) && (y < NEAR_TOP_ROWS || x < q.width * FRAME_SHARE || x > q.width * (1 - FRAME_SHARE)),
    }, near, 303),
  };
}

/** Wind strength is boosted for a while after a click; `boost` is 1 when calm. */
export function drawClumps(ctx: CanvasRenderingContext2D, clumps: readonly Clump[], time: number, boost: number): void {
  const push = 1 + gust(time) * 0.4;
  for (const c of clumps) {
    const shift = Math.round(breeze(time, c.x) * c.amount * boost * push);
    ctx.drawImage(c.sprite, Math.round(c.x - c.sprite.width / 2) + shift, Math.round(c.y - c.sprite.height / 2));
  }
}

/** A leaf colour for falling leaves and flecks: a green or autumn gold. */
export const LEAF_FLECKS: readonly string[] = [
  MID_LEAVES.light, mix(MID_LEAVES.light, FAR_LEAVES.rim, 0.5), '#d8c24a', MID_LEAVES.mid,
];
