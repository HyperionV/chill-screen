import { memoryCanvas } from '../../render/pixel-stage';

/**
 * Draws a small picture from rows of letters, one letter a pixel, using the palette to say which colour each letter is.
 * A dot or a space is see-through. Returns a canvas to draw with `ctx.drawImage` (always with smoothing off).
 */
export function pixmap(rows: readonly string[], palette: Readonly<Record<string, string>>): HTMLCanvasElement {
  const width = rows.reduce((most, row) => Math.max(most, row.length), 1);
  const { canvas, ctx } = memoryCanvas(width, rows.length);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (ch === '.' || ch === ' ' || !color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}

/** The same picture turned to face the other way. */
export function mirrored(source: HTMLCanvasElement): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(source.width, source.height);
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/** Draws a picture with its bottom-centre at (x, y), snapped to whole pixels. */
export function stand(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number): void {
  ctx.drawImage(sprite, Math.round(x - sprite.width / 2), Math.round(y - sprite.height));
}
