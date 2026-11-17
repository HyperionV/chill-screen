import { drawText, plainText, textWidth } from '../../render/pixel-font';

const SHOWN_SECONDS = 6;
const FADE_SECONDS = 1.2;
const TITLE_ROW = 0.262;
const SIZE = 2;

/** Shows a chapter's name in pixel letters for a few seconds when the chapter changes, fading in and out. */
export class ChapterTitle {
  private shown = '';
  private age = Infinity;

  /** Call every frame with the current chapter's name. The first name seen is shown too. */
  draw(ctx: CanvasRenderingContext2D, dt: number, w: number, h: number, name: string): void {
    if (name !== this.shown) {
      this.shown = name;
      this.age = 0;
    }
    this.age += dt;
    if (this.age >= SHOWN_SECONDS) return;
    const fade = Math.min(1, this.age / FADE_SECONDS, (SHOWN_SECONDS - this.age) / FADE_SECONDS);
    const text = plainText(name);
    const x = Math.round((w - textWidth(text) * SIZE) / 2);
    const y = Math.round(h * TITLE_ROW);
    ctx.save();
    ctx.globalAlpha = fade * 0.9;
    drawText(ctx, text, x + SIZE, y + SIZE, 'rgb(10,14,30)', SIZE);
    drawText(ctx, text, x, y, 'rgb(246,238,214)', SIZE);
    ctx.restore();
  }
}
