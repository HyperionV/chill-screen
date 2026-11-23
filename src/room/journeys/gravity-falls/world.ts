import type { ScenePlan } from '../../gravity-falls/types';

/** Rows the pictures are drawn at; the view scales them to the real height. */
export const DESIGN_ROWS = 270;

/**
 * A place where the walk pauses so the cast can talk. `at` is the camera's left edge (world design pixels) while it
 * rests; `from` and `to` are the start and end of the pause as fractions (0..1) of the chapter, with `from < to`.
 * Stations must be listed in order of `at` and of time, and the world must be wide enough for the camera to arrive
 * at the last one and keep walking until the chapter ends (see `cameraAt` in chapters.ts).
 */
export interface Station {
  readonly at: number;
  readonly from: number;
  readonly to: number;
}

/** One strip of scenery. It scrolls at `factor` times the camera (0.15 far away, 1 the ground the cast stands on). */
export interface WorldLayer {
  readonly canvas: HTMLCanvasElement;
  readonly factor: number;
}

/**
 * One place of the journey, built once per design width. Coordinates are design pixels (270 rows); x is in the world,
 * so a thing drawn at world x shows at x - cameraX. The view draws it in this order: the layers (far to near),
 * `drawBehind`, the cast and the clues, `drawAhead`, the night tint, `drawGlow`.
 */
export interface ChapterWorld {
  /** At least 1800. */
  readonly worldWidth: number;
  /** Far to near; every canvas is at most about 2600 x 270. A layer narrower than the view repeats. */
  readonly layers: readonly WorldLayer[];
  readonly stations: readonly Station[];
  /**
   * Homes in world pixels: locals stand at their stations (feet inside the view while their pause is on); the party
   * (dipper, mabel, waddles) uses `followDx` and the view puts them beside the camera. Spots are world pixels, each
   * within one station's view. Clues are world pixels.
   */
  readonly plan: ScenePlan;
  /** Moving parts behind the cast: animated trees, water, smoke, signs. `night` is 0 in daylight and 1 in deep night. */
  drawBehind(ctx: CanvasRenderingContext2D, cameraX: number, time: number, night: number): void;
  /** Moving parts in front of the cast: foreground grass, branches, fence posts. */
  drawAhead(ctx: CanvasRenderingContext2D, cameraX: number, time: number, night: number): void;
  /** Light added after the night tint so it stays bright: lamps, windows, sparks. */
  drawGlow(ctx: CanvasRenderingContext2D, cameraX: number, time: number, night: number): void;
  /** A click after the cast and the clues had their chance. `x` is in world pixels, `y` in design rows. True when a prop reacted. */
  press?(x: number, y: number, time: number): boolean;
  /** The Hidden Hollow lights its door when this is true (every symbol found). Other places leave it out. */
  setDoorOpen?(open: boolean): void;
}

/** Makes a chapter's world for a design width (the view's width in design pixels). */
export type WorldBuilder = (designWidth: number) => ChapterWorld;
