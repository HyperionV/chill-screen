import { drawText, plainText } from '../../render/pixel-font';
import type { Look } from '../../wallpapers/look';
import type { OutsideView, ViewFrame } from '../view';

const LOOK: Look = { mean: 0.3, sun: null, sky: [], night: 0.8, tint: [40, 50, 80] };

/** Stands in for a landscape that has not been built yet: a dark sky with its name. */
export class LandscapePlaceholder implements OutsideView {
  private w = 0;
  private h = 0;

  constructor(private readonly name: string) {}

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  draw(ctx: CanvasRenderingContext2D, _frame: ViewFrame): Look {
    ctx.fillStyle = '#10182e';
    ctx.fillRect(0, 0, this.w, this.h);
    drawText(ctx, plainText(`${this.name} - coming soon`), 12, this.h * 0.3, '#8fa0c8');
    return LOOK;
  }
}
