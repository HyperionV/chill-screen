/** Time of day drives how bright the tank is and what colour the water takes. */

export interface Palette {
  waterTop: [number, number, number];
  waterDeep: [number, number, number];
  sand: [number, number, number];
  rays: [number, number, number];
  /** 0 at night, 1 in full daylight. */
  light: number;
}

type Key = { hour: number } & Palette;

const KEYS: Key[] = [
  { hour: 0, waterTop: [14, 34, 62], waterDeep: [4, 10, 24], sand: [44, 44, 54], rays: [150, 180, 255], light: 0.08 },
  { hour: 5, waterTop: [14, 34, 62], waterDeep: [4, 10, 24], sand: [44, 44, 54], rays: [150, 180, 255], light: 0.08 },
  { hour: 6.75, waterTop: [62, 112, 134], waterDeep: [14, 36, 56], sand: [150, 128, 110], rays: [255, 214, 176], light: 0.55 },
  { hour: 9, waterTop: [52, 160, 178], waterDeep: [10, 58, 82], sand: [216, 196, 156], rays: [255, 246, 216], light: 1 },
  { hour: 16, waterTop: [52, 160, 178], waterDeep: [10, 58, 82], sand: [216, 196, 156], rays: [255, 246, 216], light: 1 },
  { hour: 18.5, waterTop: [70, 122, 140], waterDeep: [12, 42, 62], sand: [184, 150, 122], rays: [255, 196, 138], light: 0.6 },
  { hour: 20.5, waterTop: [20, 46, 76], waterDeep: [6, 16, 32], sand: [72, 68, 70], rays: [170, 190, 255], light: 0.15 },
  { hour: 24, waterTop: [14, 34, 62], waterDeep: [4, 10, 24], sand: [44, 44, 54], rays: [150, 180, 255], light: 0.08 },
];

const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Hour is fractional, 0..24. */
export function paletteAt(hour: number): Palette {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].hour <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const raw = (h - a.hour) / (b.hour - a.hour);
  const t = raw * raw * (3 - 2 * raw);
  return {
    waterTop: mix3(a.waterTop, b.waterTop, t),
    waterDeep: mix3(a.waterDeep, b.waterDeep, t),
    sand: mix3(a.sand, b.sand, t),
    rays: mix3(a.rays, b.rays, t),
    light: a.light + (b.light - a.light) * t,
  };
}
