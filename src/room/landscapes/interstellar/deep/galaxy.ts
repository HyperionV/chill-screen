import type { RGB } from '../../../../render/color';

/** The colours of a spiral galaxy's core, arms, dust, star knots, and halo. */
export interface GalaxyLook {
  core: RGB;
  arm: RGB;
  dust: RGB;
  knotBlue: RGB;
  knotPink: RGB;
  halo: RGB;
}

/** The orientation, shape, and opacity of a spiral galaxy as drawn. */
export interface GalaxyPose {
  /** Rotation of the arms in radians. */
  spin: number;
  /** Direction of the narrow axis in radians. */
  tilt: number;
  /** Ratio of the narrow axis to the wide axis, from 0.2 to 1. */
  squash: number;
  alpha: number;
}

/** A pre-rendered spiral galaxy drawn with the given spin, tilt, and squash. */
export class SpiralGalaxy {
  constructor(_unit: number, _radius: number, _look: GalaxyLook, _seed: number) {}

  draw(_ctx: CanvasRenderingContext2D, _cx: number, _cy: number, _pose: GalaxyPose): void {}
}
