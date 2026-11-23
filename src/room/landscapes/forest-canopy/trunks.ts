/**
 * The tall trunks of the Forest Canopy, one picture per depth. Every trunk is a strip between two lines that run
 * towards the vanishing point, so it is wide at the bottom and thin at the top; bark is drawn as dithered streaks,
 * broken cracks, a lit side facing the sun and a few patches of moss. Built once per width.
 */
import { memoryCanvas } from '../../../render/pixel-stage';
import { bayer } from '../../gravity-falls/art-kit';
import { hash } from '../../journeys/noise';
import { DESIGN_HEIGHT, railAt, type Perspective } from './layout';

/** Bark from deep shade to sunlit gold, and the moss that grows on the shaded side. */
export const BARK = ['#1b120e', '#3a281d', '#5c4130', '#8a6644', '#d9aa60'] as const;
const MOSS = ['#1e3b22', '#2f5a2c', '#5a8a36'] as const;
const BARK_STEPS = BARK.length;
/** Pixels of trunk width at the bottom row that one bark streak covers. */
const STREAK_PIXELS = 6;
const MIN_STREAKS = 3;
/** How much brighter the top of a trunk is: it is nearer the bright canopy. */
const TOP_LIFT = 0.16;
/** The share of a trunk's width, on its lit side, that counts as the bright rim. */
const RIM_SHARE = 0.07;
const MOSS_CHANCE = 0.12;
const CRACK_CHANCE = 0.16;
const CRACK_DARKEN = 0.28;

export interface Trunk {
  /** Column where the trunk's centre line meets the bottom row. May lie off the page: trunks lean in towards the middle. */
  baseX: number;
  /** Width at the bottom row, in pixels. */
  width: number;
  /** Rows above this one are left empty: an oak's trunk ends where it splits into boughs. */
  top?: number;
}

type Rgb = readonly [number, number, number];

function toRgb(hex: string): Rgb {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const blend = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Bark and moss colours seen through `haze` (0 none, 1 all air): far trunks fade into the pale light between the leaves. */
function palette(hazeColour: string, haze: number): { bark: Rgb[]; moss: Rgb[] } {
  const air = toRgb(hazeColour);
  return {
    bark: BARK.map((c) => blend(toRgb(c), air, haze)),
    moss: MOSS.map((c) => blend(toRgb(c), air, haze)),
  };
}

function paintTrunk(data: Uint8ClampedArray, width: number, p: Perspective, trunk: Trunk, colours: ReturnType<typeof palette>, seed: number): void {
  const litOnRight = trunk.baseX <= p.sunX;
  const streaks = Math.max(MIN_STREAKS, Math.round(trunk.width / STREAK_PIXELS));
  for (let y = trunk.top ?? 0; y < DESIGN_HEIGHT; y++) {
    const left = railAt(p, trunk.baseX - trunk.width / 2, y);
    const right = railAt(p, trunk.baseX + trunk.width / 2, y);
    const span = right - left;
    if (right < 0 || left > width || span <= 0) continue;
    const topLift = (1 - y / DESIGN_HEIGHT) * TOP_LIFT;
    for (let x = Math.max(0, Math.floor(left)); x <= Math.min(width - 1, Math.ceil(right)); x++) {
      const t = Math.min(1, Math.max(0, (x - left) / span));
      const sun = litOnRight ? t : 1 - t;
      const streak = Math.floor(t * streaks);
      const streakTone = hash(streak * 7.31 + seed);
      const crack = hash(streak * 3.7 + Math.floor(y / (4 + streakTone * 6)) * 1.9 + seed);
      const tone = 0.16 + sun * 0.6 + (streakTone - 0.5) * 0.3 + topLift - (crack > 1 - CRACK_CHANCE ? CRACK_DARKEN : 0);
      let colour: Rgb;
      const moss = hash(streak * 11.1 + Math.floor(y / 9) * 5.3 + seed);
      if (moss > 1 - MOSS_CHANCE && sun < 0.6) {
        colour = colours.moss[Math.min(colours.moss.length - 1, Math.floor(sun * 4 + bayer(x, y)))];
      } else if (sun > 1 - RIM_SHARE) {
        colour = colours.bark[BARK_STEPS - 1];
      } else {
        const step = Math.min(BARK_STEPS - 1, Math.max(0, Math.floor(tone * (BARK_STEPS - 0.01) + bayer(x, y) - 0.5)));
        colour = colours.bark[step];
      }
      const o = (y * width + x) * 4;
      data[o] = colour[0];
      data[o + 1] = colour[1];
      data[o + 2] = colour[2];
      data[o + 3] = 255;
    }
  }
}

/** One picture holding every trunk of a depth. `haze` is how much of `hazeColour` the layer is seen through. */
export function paintTrunks(p: Perspective, trunks: readonly Trunk[], hazeColour: string, haze: number, seed: number): HTMLCanvasElement {
  const { width } = p;
  const { canvas, ctx } = memoryCanvas(width, DESIGN_HEIGHT);
  const image = ctx.createImageData(width, DESIGN_HEIGHT);
  const colours = palette(hazeColour, haze);
  trunks.forEach((trunk, i) => paintTrunk(image.data, width, p, trunk, colours, seed + i * 17.3));
  ctx.putImageData(image, 0, 0);
  return canvas;
}
