import type { Look } from '../wallpapers/look';
import type { Route } from './journeys/route';

export interface ViewFrame {
  dt: number;
  /** Seconds, from the page clock. */
  time: number;
  /** Where the pointer is, in stage pixels, while it has been moving lately; otherwise null. */
  pointer: { x: number; y: number } | null;
}

/** What is seen through the window: the built-in seaside, or the person's own wallpapers. Drawn in stage pixels. */
export interface OutsideView {
  /** Where the view is along its chapters, for views that have them; the Settings panel shows and holds it. */
  readonly route?: Route;
  resize(w: number, h: number): void;
  /** Draws the view and returns how its light looks right now, or null when there is nothing to show yet. */
  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look | null;
  /**
   * Draws sharp, full-resolution things (speech in a normal font) on the screen itself, over the clock, after the
   * stage picture is on screen. Units are stage pixels (`scale` screen pixels each); the stage's size is passed too.
   */
  drawOverlay?(screen: CanvasRenderingContext2D, stageWidth: number, stageHeight: number): void;
  /** A click on the glass at this stage point (the radio on the sill has already had its chance). */
  press?(x: number, y: number): void;
}
