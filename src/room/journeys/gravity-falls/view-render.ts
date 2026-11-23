import type { WorldLayer } from './world';

/**
 * Draws the strips far to near, each shifted left by the camera times its factor. A strip repeats when it is narrower
 * than the walk needs; the ground strip (factor 1) is as wide as the world, so it never wraps. Only the visible slice of
 * each strip is copied, and nothing is allocated. The context must already have image smoothing off.
 */
export function drawLayers(ctx: CanvasRenderingContext2D, layers: readonly WorldLayer[], cameraX: number, viewWidth: number): void {
  for (let i = 0; i < layers.length; i++) {
    const { canvas, factor } = layers[i];
    const span = canvas.width;
    if (span === 0) continue;
    const rows = canvas.height;
    const offset = Math.round(cameraX * factor);
    let source = ((offset % span) + span) % span;
    let x = 0;
    while (x < viewWidth) {
      const slice = Math.min(span - source, viewWidth - x);
      ctx.drawImage(canvas, source, 0, slice, rows, x, 0, slice, rows);
      x += slice;
      source = 0;
    }
  }
}
