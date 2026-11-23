import type { RGB } from '../../../../render/color';

/** The colours of the disc, lensed light, and shadow. */
export interface BlackHoleLook {
  disc: RGB;
  discHot: RGB;
  arc: RGB;
  photon: RGB;
  glow: RGB;
  shadow: RGB;
}

/** Draws a black hole with warm or cool lensed light. */
export class BlackHole {
  constructor(_unit: number, _shadowRadius: number, _look: BlackHoleLook) {}

  draw(_ctx: CanvasRenderingContext2D, _cx: number, _cy: number, _time: number, _alpha: number): void {}
}
