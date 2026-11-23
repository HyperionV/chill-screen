import type { SceneRenderContext } from '../scene-renderers';

/** What a deep chapter needs from the stage each frame: size, clock, how visible it is and how far it has slid. */
export type DeepRenderContext = Pick<SceneRenderContext, 'w' | 'h' | 'unit' | 'time' | 'alpha' | 'chapterSlide' | 'windStrength'>;

/** The pointer in stage pixels, or null when it has not moved lately. */
export type DeepPointer = { x: number; y: number } | null;

/**
 * One chapter of the Interstellar story, in its own file. It is built once, resized with the stage, moved on only while
 * it is visible, and drawn over the shared starfield with the dissolve already worked out in `rc.alpha`.
 */
export interface DeepScene {
  /** The stage changed size: rebuild sprites and layout. `unit` is height / 270. Called again for every new size. */
  resize(w: number, h: number, unit: number): void;
  /**
   * Moves the scene on by `dt` seconds. `time` is the page clock in seconds. `progress` is how far through its chapter
   * the route is (0 to 1; it stands still while the chapter is locked, so keep idle motion independent of it).
   */
  update(dt: number, time: number, progress: number, pointer: DeepPointer): void;
  /** Draws the scene: everything multiplied by `rc.alpha`, and shifted sideways by `rc.chapterSlide` where it suits. */
  draw(ctx: CanvasRenderingContext2D, rc: DeepRenderContext): void;
  /** A click on the glass at this stage point. Returns true when it hit something the scene reacts to. */
  press(x: number, y: number): boolean;
}
