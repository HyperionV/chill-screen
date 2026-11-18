/** Slow wind shared by every view: a calm breeze that now and then picks up into a gust, then settles again. */

/** How strong the wind is right now: 0 is nearly still, 1 is the peak of a gust. */
export function gust(time: number): number {
  const slow = 0.5 + 0.5 * Math.sin(time * 0.083 + 1.3);
  const swell = 0.5 + 0.5 * Math.sin(time * 0.19);
  return slow * slow * 0.7 + swell * 0.3;
}

/**
 * The sway of one plant, leaf or flag at horizontal position `x` (stage pixels): about -1 to 1, a wave that travels
 * across the view and grows with the gusts. Multiply by the sway distance wanted.
 */
export function breeze(time: number, x: number): number {
  const wave = Math.sin(time * 1.35 + x * 0.021) * 0.65 + Math.sin(time * 2.7 + x * 0.047) * 0.35;
  return wave * (0.3 + 0.7 * gust(time));
}
