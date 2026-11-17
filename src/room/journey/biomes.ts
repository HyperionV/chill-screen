import type { RGB } from '../../render/color';

/** The kinds of tree the landscape grows. */
export type TreeKind =
  | 'pine'
  | 'oak'
  | 'autumn'
  | 'bush'
  | 'autumnBush'
  | 'tallPine'
  | 'gnarledOak'
  | 'mossBush';

/** One kind of country the journey passes through. Colours are as they look in full daylight. */
export interface Biome {
  name: string;
  grass: RGB;
  grassDark: RGB;
  hill: RGB;
  mountain: RGB;
  /** Trees per 100 stage pixels along the near ground. */
  trees: number;
  /** The kinds that grow here, with their shares. */
  kinds: [TreeKind, number][];
  /** Colours of the wildflowers dotted over the grass, if any, and how thickly (0..1). */
  flowers: RGB[];
  flowerDensity: number;
  /** 1 where the land gives way to a lake. */
  lake: number;
  /** Chance per 80 stage pixels of the road that a deer, rabbit, fox, duck or hedgehog is met here. */
  wildlife: { deer: number; rabbit: number; fox: number; duck: number; hedgehog: number };
}

export const BIOMES: Biome[] = [
  {
    name: 'Forest',
    grass: [58, 110, 52], grassDark: [40, 88, 44], hill: [58, 100, 86], mountain: [86, 112, 140],
    trees: 2.1, kinds: [['pine', 0.55], ['oak', 0.25], ['bush', 0.2]],
    flowers: [], flowerDensity: 0, lake: 0,
    wildlife: { deer: 0.08, rabbit: 0.1, fox: 0, duck: 0, hedgehog: 0 },
  },
  {
    name: 'Meadow',
    grass: [112, 168, 70], grassDark: [88, 142, 58], hill: [96, 150, 102], mountain: [118, 142, 170],
    trees: 0.55, kinds: [['oak', 0.5], ['bush', 0.5]],
    flowers: [[250, 250, 240], [250, 214, 72], [240, 130, 170], [170, 150, 230]], flowerDensity: 0.55, lake: 0,
    wildlife: { deer: 0.16, rabbit: 0.22, fox: 0, duck: 0, hedgehog: 0 },
  },
  {
    name: 'Lakeside',
    grass: [74, 134, 72], grassDark: [54, 108, 60], hill: [74, 120, 110], mountain: [96, 124, 156],
    trees: 0.9, kinds: [['pine', 0.4], ['oak', 0.3], ['bush', 0.3]],
    flowers: [[250, 250, 240], [170, 150, 230]], flowerDensity: 0.12, lake: 1,
    wildlife: { deer: 0.05, rabbit: 0.1, fox: 0, duck: 0.35, hedgehog: 0 },
  },
  {
    name: 'Autumn Woods',
    grass: [150, 142, 66], grassDark: [122, 110, 52], hill: [138, 112, 72], mountain: [140, 122, 128],
    trees: 1.7, kinds: [['autumn', 0.7], ['pine', 0.1], ['autumnBush', 0.2]],
    flowers: [], flowerDensity: 0, lake: 0,
    wildlife: { deer: 0.12, rabbit: 0.14, fox: 0, duck: 0, hedgehog: 0 },
  },
  {
    name: 'Campfire Clearing',
    grass: [92, 136, 66], grassDark: [68, 106, 50], hill: [82, 120, 86], mountain: [98, 118, 146],
    trees: 0.45, kinds: [['pine', 0.45], ['oak', 0.35], ['bush', 0.2]],
    flowers: [[246, 232, 142], [238, 238, 224]], flowerDensity: 0.08, lake: 0,
    wildlife: { deer: 0.06, rabbit: 0.14, fox: 0, duck: 0, hedgehog: 0 },
  },
  {
    name: 'Old Wood',
    grass: [36, 68, 42], grassDark: [24, 48, 30], hill: [36, 64, 58], mountain: [52, 72, 92],
    trees: 2.7, kinds: [['tallPine', 0.42], ['gnarledOak', 0.36], ['mossBush', 0.22]],
    flowers: [], flowerDensity: 0, lake: 0,
    wildlife: { deer: 0.04, rabbit: 0.05, fox: 0, duck: 0, hedgehog: 0.18 },
  },
];

/** How far along the road each kind of country lasts, in stage pixels (~270 s at SPEED = 9). */
export const SEGMENT = 2430;
export const ROAD_LENGTH = SEGMENT * BIOMES.length;
export const CAMP_BIOME = 4;
export const OLD_WOOD_BIOME = 5;
/** Where the campsite sits inside Campfire Clearing, centred in view when `?biome=4` opens. */
export const CAMP_WORLD_X = (CAMP_BIOME + 0.35) * SEGMENT;

/** The share of each stretch spent blending into the next country. */
const BLEND = 0.35;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** The mix of countries at a point on the road: one share per biome, adding up to 1. Fills and returns `out`. */
export function weightsAt(worldX: number, out: number[]): number[] {
  const n = BIOMES.length;
  const u = worldX / SEGMENT;
  const i = Math.floor(u);
  const f = u - i;
  const t = f > 1 - BLEND ? smooth((f - (1 - BLEND)) / BLEND) : 0;
  out.fill(0);
  out[((i % n) + n) % n] = 1 - t;
  out[(((i + 1) % n) + n) % n] += t;
  return out;
}

/** Returns the index of the dominant biome at `worldX`. */
export function biomeIndexAt(worldX: number): number {
  const n = BIOMES.length;
  const u = worldX / SEGMENT;
  const i = Math.floor(u);
  const f = u - i;
  const t = f > 1 - BLEND ? smooth((f - (1 - BLEND)) / BLEND) : 0;
  const curr = ((i % n) + n) % n;
  const next = (((i + 1) % n) + n) % n;
  return t >= 0.5 ? next : curr;
}

/** A colour of the land at a point: each biome's colour, weighted by how much of it is here. */
export function blend(weights: ArrayLike<number>, offset: number, pick: (b: Biome) => RGB): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < BIOMES.length; i++) {
    const w = weights[offset + i];
    if (w === 0) continue;
    const c = pick(BIOMES[i]);
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
  }
  return [r, g, b];
}

/** A number of the land at a point, weighted the same way. */
export function blendNumber(weights: ArrayLike<number>, offset: number, pick: (b: Biome) => number): number {
  let sum = 0;
  for (let i = 0; i < BIOMES.length; i++) sum += weights[offset + i] * pick(BIOMES[i]);
  return sum;
}
