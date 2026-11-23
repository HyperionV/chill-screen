import type { ScenePlan } from '../../gravity-falls/types';

/** Rows the pictures are drawn at; the view scales them to the real height. */
export const DESIGN_HEIGHT = 270;

/**
 * One scene of the landscape: a place seen through the window. Positions are design pixels (x across the design
 * width, y down from the top, 270 rows). Built once per size; the view draws it every frame in this order:
 * sky, `back`, `drawBehind`, the cast, `front`, `drawAhead`, the night tint, `drawGlow`.
 */
export interface SceneArt {
  /** Everything behind the cast (hills, trees, buildings, ground), transparent where the sky shows. */
  readonly back: HTMLCanvasElement;
  /** Things in front of the cast (foreground grass, fence, branches), transparent elsewhere. */
  readonly front: HTMLCanvasElement;
  /** Who stands where, where they meet to talk, and what can be found. */
  readonly plan: ScenePlan;
  /** Moving parts behind the cast: swaying plants, water, smoke, birds. `night` is 0 in daylight and 1 in deep night. */
  drawBehind(ctx: CanvasRenderingContext2D, time: number, night: number): void;
  /** Moving parts in front of the cast: swaying foreground grass and branches, falling leaves. */
  drawAhead(ctx: CanvasRenderingContext2D, time: number, night: number): void;
  /** A click at a design point (after the cast and the clues had their chance): a prop reacts. Returns true when it did. */
  press?(x: number, y: number, time: number): boolean;
  /** Light that is added after the night tint so it stays bright: windows, lamps, fireflies, glints. */
  drawGlow(ctx: CanvasRenderingContext2D, time: number, night: number): void;
  /** Only the Hidden Hollow: its door and runes light up once every symbol is found. */
  setDoorOpen?(open: boolean): void;
}

/** Builds a scene for a design width. */
export type SceneBuilder = (designWidth: number) => SceneArt;
