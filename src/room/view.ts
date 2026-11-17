import type { Look } from '../wallpapers/look';

export interface ViewFrame {
  dt: number;
  /** Seconds, from the page clock. */
  time: number;
  /** How far the view is shifted by the pointer, in whole stage pixels. */
  shift: [number, number];
}

/** What is seen through the window: the built-in seaside, or the person's own wallpapers. Drawn in stage pixels. */
export interface OutsideView {
  resize(w: number, h: number): void;
  /** Draws the view and returns how its light looks right now, or null when there is nothing to show yet. */
  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look | null;
}
