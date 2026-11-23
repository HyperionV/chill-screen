import { pixmap } from '../journeys/pixmap';
import type { CastId, CastSprites } from './types';

/** Shared colours so every character has the same outline ink and the same skin family. */
export const INK = '#241b22';
export const SKIN = '#f1c8a0';
export const SKIN_SHADE = '#d49e78';
export const WHITE = '#f6f3ec';

export type Palette = Readonly<Record<string, string>>;
export type CastSet<Id extends CastId> = Readonly<Record<Id, CastSprites>>;
/** The three leg variants of a walker: standing, step A, step B. */
export type LegSet = readonly [readonly string[], readonly string[], readonly string[]];

/**
 * Stacks the upper-body rows on the leg rows and draws them as one sprite.
 * Short rows are padded on the right with see-through pixels so every frame of a character has the same width.
 */
export function composeSprite(
  upper: readonly string[],
  legs: readonly string[],
  palette: Palette,
  width: number,
): HTMLCanvasElement {
  const rows = [...upper, ...legs].map((row) => {
    if (row.length > width) throw new Error(`Sprite row "${row}" is ${row.length} wide but the sprite is ${width} wide`);
    return row.padEnd(width, '.');
  });
  return pixmap(rows, palette);
}

/** A copy of the rows with some rows (by index) swapped for new ones: how a pose differs from the base pose. */
export function replaceRows(rows: readonly string[], changes: Readonly<Record<number, string>>): readonly string[] {
  return rows.map((row, index) => {
    const swapped = changes[index];
    return swapped === undefined ? row : swapped;
  });
}

/** One row slid a pixel left or right (the row must already be as wide as the sprite). */
export function shiftRow(row: string, dx: 1 | -1): string {
  return dx === 1 ? `.${row.slice(0, -1)}` : `${row.slice(1)}.`;
}

export interface PersonSpec {
  width: number;
  palette: Palette;
  upper: readonly string[];
  /** The signature pose: same row count as `upper`. */
  actUpper: readonly string[];
  legs: LegSet;
  /** Legs for the signature pose when it is not the standing legs. */
  actLegs?: readonly string[];
}

/** A walker: stand, two step frames (only the legs change) and the signature pose (only the upper body changes). */
export function buildPerson(spec: PersonSpec): CastSprites {
  const { width, palette, upper, actUpper } = spec;
  const [standLegs, stepA, stepB] = spec.legs;
  return {
    stand: composeSprite(upper, standLegs, palette, width),
    step: [composeSprite(upper, stepA, palette, width), composeSprite(upper, stepB, palette, width)],
    act: composeSprite(actUpper, spec.actLegs ?? standLegs, palette, width),
  };
}

/** A picture placed `offsetY` rows down inside a taller canvas, so the same picture can bob up and down. */
export function composeFloating(
  rows: readonly string[],
  palette: Palette,
  width: number,
  height: number,
  offsetY: number,
): HTMLCanvasElement {
  const above = Array.from({ length: offsetY }, () => '');
  const below = Array.from({ length: height - offsetY - rows.length }, () => '');
  return composeSprite([...above, ...rows], below, palette, width);
}
