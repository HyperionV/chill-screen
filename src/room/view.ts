import type { Look } from '../wallpapers/look';

export interface ViewFrame {
  dt: number;
  /** Seconds, from the page clock. */
  time: number;
  /** Where the pointer is, in stage pixels, while it has been moving lately; otherwise null. */
  pointer: { x: number; y: number } | null;
}

/** What is seen through the window: the built-in seaside, or the person's own wallpapers. Drawn in stage pixels. */
export interface OutsideView {
  resize(w: number, h: number): void;
  /** Draws the view and returns how its light looks right now, or null when there is nothing to show yet. */
  draw(ctx: CanvasRenderingContext2D, frame: ViewFrame): Look | null;
}
