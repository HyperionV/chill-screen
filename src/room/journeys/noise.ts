/** A repeatable pseudo-random number in 0..1 for any number: the same input always gives the same output. */
export const hash = (n: number): number => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth value noise along a line: gentle hills for ridges, drifting clouds, wandering paths. */
export const noise = (x: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const t = f * f * (3 - 2 * f);
  return hash(i) * (1 - t) + hash(i + 1) * t;
};

/** Noise with fine detail layered on, 0..1. */
export const fbm = (x: number): number => noise(x) * 0.55 + noise(x * 2.1 + 13) * 0.3 + noise(x * 4.3 + 57) * 0.15;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** A smooth 0..1 rise between two edges, for blending one stretch of a journey into the next. */
export const ramp = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
