import { css, type RGB } from '../../../render/color';
import { ramp } from '../noise';
import { blendColor } from './colors';
import type { Chapter } from '../route';

/** The six stretches of Fairy Road, ~4.5 min each at normal pace (26.5 min total). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Mushroom Wood', seconds: 270 },
  { name: 'Wisp Marsh', seconds: 270 },
  { name: "The Witch's Cottage", seconds: 270 },
  { name: 'Moonrise Stones', seconds: 270 },
  { name: 'Deer Spirit Glade', seconds: 270 },
  { name: 'Blessing of Dawn', seconds: 240 },
];

/** Share of each chapter spent cross-fading smoothly into the next. */
const BLEND_START = 0.72;

export interface ChapterPalette {
  mountain: RGB;
  hill: RGB;
  grass: RGB;
  grassDark: RGB;
  road: RGB;
  roadRut: RGB;
  waterTop: RGB;
  waterDeep: RGB;
  /** 0 dry verge, 1 boggy marsh pools. */
  marsh: number;
  /** 0 normal lighting, 1 warm dawn-gold wash. */
  dawnGold: number;
  /** Trees per 100 stage pixels along the near verge. */
  trees: number;
  /** Giant mushrooms per 100 stage pixels. */
  mushrooms: number;
  /** Glowing / wildflower density 0..1. */
  flowers: number;
  flowerColors: readonly RGB[];
}

export const PALETTES: readonly ChapterPalette[] = [
  // 1. Mushroom Wood: mossy emerald floor, cool teal ridges, rich violet-blue shadows.
  {
    mountain: [62, 82, 110], hill: [44, 78, 72], grass: [50, 94, 58], grassDark: [32, 66, 44],
    road: [108, 84, 62], roadRut: [78, 58, 42], waterTop: [56, 108, 112], waterDeep: [30, 68, 78],
    marsh: 0, dawnGold: 0, trees: 1.55, mushrooms: 1.25, flowers: 0.18,
    flowerColors: [[148, 224, 198], [220, 178, 246], [248, 232, 160]],
  },
  // 2. Wisp Marsh: boggy blue-green reeds and still reflective pools.
  {
    mountain: [54, 78, 98], hill: [38, 76, 78], grass: [46, 88, 70], grassDark: [28, 60, 52],
    road: [92, 80, 62], roadRut: [66, 56, 42], waterTop: [46, 106, 104], waterDeep: [22, 62, 68],
    marsh: 1, dawnGold: 0, trees: 0.55, mushrooms: 0.15, flowers: 0.12,
    flowerColors: [[154, 236, 214], [190, 224, 248]],
  },
  // 3. The Witch's Cottage: warm autumn-moss verge, smoky plum hills, cosy dirt lane.
  {
    mountain: [68, 72, 104], hill: [58, 68, 82], grass: [64, 96, 56], grassDark: [44, 68, 42],
    road: [116, 86, 60], roadRut: [84, 60, 40], waterTop: [62, 98, 110], waterDeep: [36, 62, 76],
    marsh: 0, dawnGold: 0, trees: 0.95, mushrooms: 0.35, flowers: 0.28,
    flowerColors: [[236, 168, 92], [210, 140, 226], [244, 228, 172]],
  },
  // 4. Moonrise Stones: cool slate moorland, heather tufts, silver-blue hills.
  {
    mountain: [68, 80, 114], hill: [56, 74, 92], grass: [60, 88, 74], grassDark: [40, 62, 56],
    road: [104, 90, 74], roadRut: [74, 64, 52], waterTop: [64, 98, 122], waterDeep: [34, 60, 84],
    marsh: 0, dawnGold: 0, trees: 0.35, mushrooms: 0.1, flowers: 0.22,
    flowerColors: [[194, 184, 242], [220, 236, 250]],
  },
  // 5. Deer Spirit Glade: quiet deep-jade glade studded with luminous blossoms.
  {
    mountain: [60, 86, 114], hill: [46, 82, 84], grass: [52, 102, 68], grassDark: [34, 72, 50],
    road: [108, 88, 66], roadRut: [78, 62, 46], waterTop: [62, 114, 124], waterDeep: [32, 70, 84],
    marsh: 0, dawnGold: 0, trees: 0.9, mushrooms: 0.25, flowers: 0.65,
    flowerColors: [[148, 242, 222], [242, 234, 152], [236, 182, 246], [250, 250, 242]],
  },
  // 6. Blessing of Dawn: sunlit meadow moss, warm ochre road, blooming gold and rose.
  {
    mountain: [104, 110, 134], hill: [86, 114, 88], grass: [84, 134, 66], grassDark: [58, 98, 48],
    road: [132, 102, 70], roadRut: [96, 72, 48], waterTop: [96, 146, 146], waterDeep: [52, 96, 104],
    marsh: 0, dawnGold: 1, trees: 0.85, mushrooms: 0.35, flowers: 0.85,
    flowerColors: [[252, 218, 92], [250, 168, 192], [252, 246, 218], [186, 228, 128]],
  },
];

export interface BlendedChapter {
  weights: number[];
  mountain: RGB;
  hill: RGB;
  grass: RGB;
  grassDark: RGB;
  road: RGB;
  roadRut: RGB;
  waterTop: RGB;
  waterDeep: RGB;
  marsh: number;
  dawnGold: number;
  trees: number;
  mushrooms: number;
  flowers: number;
}

const ZERO: RGB = [0, 0, 0];

/** Fills `out` with chapter weights (0..1) and blended colours/densities, fading smoothly over the last 28%. */
export function blendChapters(index: number, t: number, next: number, out: BlendedChapter): void {
  const w = out.weights;
  w.fill(0);
  const cross = t > BLEND_START ? ramp(BLEND_START, 1, t) : 0;
  w[index] = 1 - cross;
  w[next] += cross;

  const a = PALETTES[index];
  const b = PALETTES[next];
  blendColor(out.mountain, a.mountain, b.mountain, cross);
  blendColor(out.hill, a.hill, b.hill, cross);
  blendColor(out.grass, a.grass, b.grass, cross);
  blendColor(out.grassDark, a.grassDark, b.grassDark, cross);
  blendColor(out.road, a.road, b.road, cross);
  blendColor(out.roadRut, a.roadRut, b.roadRut, cross);
  blendColor(out.waterTop, a.waterTop, b.waterTop, cross);
  blendColor(out.waterDeep, a.waterDeep, b.waterDeep, cross);
  out.marsh = a.marsh + (b.marsh - a.marsh) * cross;
  out.dawnGold = a.dawnGold + (b.dawnGold - a.dawnGold) * cross;
  out.trees = a.trees + (b.trees - a.trees) * cross;
  out.mushrooms = a.mushrooms + (b.mushrooms - a.mushrooms) * cross;
  out.flowers = a.flowers + (b.flowers - a.flowers) * cross;
}

export function createBlended(): BlendedChapter {
  return {
    weights: new Array<number>(CHAPTERS.length).fill(0),
    mountain: [...ZERO],
    hill: [...ZERO],
    grass: [...ZERO],
    grassDark: [...ZERO],
    road: [...ZERO],
    roadRut: [...ZERO],
    waterTop: [...ZERO],
    waterDeep: [...ZERO],
    marsh: 0,
    dawnGold: 0,
    trees: 0,
    mushrooms: 0,
    flowers: 0,
  };
}

export { css };
