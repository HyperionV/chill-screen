import type { RGB } from '../../../render/color';

/** Reuse a colour slot while the chapter and daylight evolve. */
export function blendColor(out: RGB, a: RGB, b: RGB, weight: number): RGB {
  out[0] = a[0] + (b[0] - a[0]) * weight;
  out[1] = a[1] + (b[1] - a[1]) * weight;
  out[2] = a[2] + (b[2] - a[2]) * weight;
  return out;
}
