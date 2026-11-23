/**
 * The chapters of the Forest Canopy: five ways of lying under oak trees and looking up. Each one says where the
 * sun is, how open the leaves are, which oaks stand at which depth and what lies in the pasture at the bottom.
 */
import type { Chapter } from '../../journeys/route';
import type { FillerSpec } from './foliage';
import type { GroundSpec } from './ground';
import type { OakSpec } from './oak';

export interface ChapterSpec {
  name: string;
  /** Where the sun shines in from, as a share of the page width. */
  sunShare: number;
  /** How wide the opening in the leaves is (1 is the usual size). */
  gapScale: number;
  far: readonly OakSpec[];
  mid: readonly OakSpec[];
  near: readonly OakSpec[];
  filler: FillerSpec;
  /** Warm patches of light on the trunks. */
  patches: number;
  /** How strong the sunbeams are (1 is the usual strength). */
  beam: number;
  /** How golden the light is, from 0 (the sky's own colour) to 1. */
  gold: number;
  ground: GroundSpec;
}

const oak = (baseX: number, width: number, forkRow: number, limbs: number, reach: number, haze: number, seed: number): OakSpec =>
  ({ baseX, width, forkRow, limbs, reach, haze, seed });

export const CHAPTER_SPECS: readonly ChapterSpec[] = [
  {
    name: 'Under the Old Oak', sunShare: 0.72, gapScale: 1,
    far: [oak(0.08, 36, 100, 5, 115, 0.55, 3), oak(0.5, 34, 115, 5, 115, 0.55, 8), oak(0.92, 38, 105, 5, 115, 0.55, 13)],
    mid: [oak(0.86, 72, 150, 4, 150, 0.25, 21)],
    near: [oak(0.14, 150, 170, 5, 230, 0, 33)],
    filler: { ceiling: 70, distant: 80, frame: 18 },
    patches: 22, beam: 1, gold: 0.55,
    ground: { roots: true, flowers: 16, tallGrass: false },
  },
  {
    name: 'Pasture Oaks', sunShare: 0.5, gapScale: 1.9,
    far: [oak(0.15, 34, 125, 5, 115, 0.55, 41), oak(0.4, 32, 130, 5, 115, 0.55, 46), oak(0.7, 34, 125, 5, 115, 0.55, 51), oak(0.95, 36, 128, 5, 115, 0.55, 56)],
    mid: [oak(0.04, 80, 175, 4, 170, 0.25, 61), oak(0.98, 78, 175, 4, 170, 0.25, 66)],
    near: [oak(-0.06, 130, 190, 4, 200, 0, 71), oak(1.07, 120, 195, 4, 190, 0, 76)],
    filler: { ceiling: 18, distant: 40, frame: 10 },
    patches: 10, beam: 1, gold: 0.5,
    ground: { roots: false, flowers: 44, tallGrass: true },
  },
  {
    name: 'Dappled Shade', sunShare: 0.38, gapScale: 0.7,
    far: [oak(0.1, 34, 95, 5, 115, 0.55, 81), oak(0.3, 32, 100, 5, 115, 0.55, 86), oak(0.55, 34, 105, 5, 115, 0.55, 91), oak(0.8, 34, 98, 5, 115, 0.55, 96), oak(0.95, 36, 102, 5, 115, 0.55, 101)],
    mid: [oak(0.3, 70, 140, 4, 150, 0.25, 111), oak(0.78, 70, 145, 4, 150, 0.25, 116)],
    near: [oak(0.06, 140, 175, 5, 220, 0, 121), oak(1.0, 130, 180, 5, 215, 0, 126)],
    filler: { ceiling: 150, distant: 130, frame: 30 },
    patches: 40, beam: 0.6, gold: 0.45,
    ground: { roots: true, flowers: 20, tallGrass: false },
  },
  {
    name: 'Golden Light', sunShare: 0.2, gapScale: 1.2,
    far: [oak(0.35, 34, 112, 5, 115, 0.5, 131), oak(0.6, 34, 108, 5, 115, 0.5, 136), oak(0.78, 36, 112, 5, 115, 0.5, 141)],
    mid: [oak(0.1, 62, 160, 4, 140, 0.25, 146)],
    near: [oak(0.9, 150, 170, 5, 230, 0, 151)],
    filler: { ceiling: 60, distant: 70, frame: 16 },
    patches: 26, beam: 1.25, gold: 0.9,
    ground: { roots: true, flowers: 24, tallGrass: false },
  },
  {
    name: 'The Wide Bough', sunShare: 0.62, gapScale: 1.3,
    far: [oak(0.2, 34, 118, 5, 115, 0.55, 161), oak(0.7, 34, 120, 5, 115, 0.55, 166)],
    mid: [oak(0.95, 70, 165, 4, 160, 0.25, 171)],
    near: [oak(0.3, 170, 200, 3, 300, 0, 176)],
    filler: { ceiling: 45, distant: 60, frame: 14 },
    patches: 18, beam: 1, gold: 0.6,
    ground: { roots: true, flowers: 30, tallGrass: true },
  },
];

export const CHAPTER_SECONDS = 150;
/** The last seconds of a chapter, in which the next one fades in. */
export const DISSOLVE_SECONDS = 10;
export const CHAPTERS: readonly Chapter[] = CHAPTER_SPECS.map((c) => ({ name: c.name, seconds: CHAPTER_SECONDS }));
