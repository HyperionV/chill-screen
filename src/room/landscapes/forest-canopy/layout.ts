/**
 * Where things stand in the Forest Canopy: the viewer lies on the grass looking up about 60 degrees, so every
 * trunk seems to run towards one point far above the picture. All pictures here are drawn on a 270-row page that
 * the view then lifts a little, because the window frame and the sill hide the top and bottom rows.
 */

export const DESIGN_HEIGHT = 270;
/** Rows the picture is lifted before it is shown (the window hides the top rows and the sill the bottom ones). */
export const LIFT = 24;

/** The point all trunks run towards: above the top of the page, in the middle. Further up means straighter trunks. */
const VANISH_ROW = -85;
/** The sun's rays start this many rows above the page. */
export const SUN_ROW = -22;
/** The opening in the leaves around the sun: centre row and half sizes (design rows and columns) at gap scale 1. */
const GAP_ROW = 74;
const GAP_HALF_W = 66;
const GAP_HALF_H = 40;
/** The clock sits in the middle of the page: this band is kept calmer and darker so white numbers stay readable. */
const CLOCK_FROM_ROW = 100;
const CLOCK_TO_ROW = 182;
const CLOCK_FROM_SHARE = 0.28;
const CLOCK_TO_SHARE = 0.72;

export interface Perspective {
  width: number;
  vanishX: number;
  vanishY: number;
  sunX: number;
  gapRow: number;
  gapHalfW: number;
  gapHalfH: number;
}

/** `sunShare` is where the sun is across the page (0..1); `gapScale` widens or narrows the opening in the leaves. */
export function perspective(width: number, sunShare: number, gapScale: number): Perspective {
  return {
    width,
    vanishX: width / 2,
    vanishY: VANISH_ROW,
    sunX: width * sunShare,
    gapRow: GAP_ROW,
    gapHalfW: GAP_HALF_W * gapScale,
    gapHalfH: GAP_HALF_H * gapScale,
  };
}

/** The column at row `y` of the line from the vanishing point down to column `baseX` on the bottom row. */
export function railAt(p: Perspective, baseX: number, y: number): number {
  return p.vanishX + ((baseX - p.vanishX) * (y - p.vanishY)) / (DESIGN_HEIGHT - p.vanishY);
}

/** True when a point lies inside the opening in the leaves around the sun. */
export function inSunGap(p: Perspective, x: number, y: number): boolean {
  const dx = (x - p.sunX) / p.gapHalfW;
  const dy = (y - p.gapRow) / p.gapHalfH;
  return dx * dx + dy * dy < 1;
}

/** True when a point lies in the band behind the clock. */
export function inClockBand(p: Perspective, x: number, y: number): boolean {
  return y > CLOCK_FROM_ROW && y < CLOCK_TO_ROW && x > p.width * CLOCK_FROM_SHARE && x < p.width * CLOCK_TO_SHARE;
}
