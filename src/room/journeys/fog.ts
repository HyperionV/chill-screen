import { memoryCanvas } from '../../render/pixel-stage';
import type { RGB } from '../../render/color';

/** Each fog cell covers this many stage pixels square, so the fog shows as soft pixel blocks. */
const CELL = 3;

/**
 * Mist or frost on the glass: a coarse grid of how thick the fog is at each spot. It can be thickened everywhere or
 * in one spot, wiped away with the pointer, and it slowly creeps back over wiped places.
 */
export class FogLayer {
  private cols = 0;
  private rows = 0;
  private thick = new Float32Array(0);
  private readonly pixels = memoryCanvas(1, 1);
  private image: ImageData | null = null;

  resize(w: number, h: number): void {
    this.cols = Math.ceil(w / CELL);
    this.rows = Math.ceil(h / CELL);
    this.thick = new Float32Array(this.cols * this.rows);
    this.pixels.canvas.width = this.cols;
    this.pixels.canvas.height = this.rows;
    this.image = this.pixels.ctx.createImageData(this.cols, this.rows);
  }

  /** Thickens the fog everywhere by up to `amount` (0..1), never past `limit`. */
  grow(amount: number, limit = 1): void {
    for (let i = 0; i < this.thick.length; i++) this.thick[i] = Math.min(limit, this.thick[i] + amount);
  }

  /** Breathes on one spot: thickens the fog within `radius` stage pixels of (x, y). */
  breathe(x: number, y: number, radius: number, amount: number): void {
    this.paint(x, y, radius, (v, falloff) => Math.min(1, v + amount * falloff));
  }

  /** Wipes the fog from the spot, leaving the edge soft. */
  wipe(x: number, y: number, radius: number): void {
    this.paint(x, y, radius, (v, falloff) => v * (1 - falloff));
  }

  /** Lets the fog drift away by `amount` everywhere (clearing slowly by itself). */
  fade(amount: number): void {
    for (let i = 0; i < this.thick.length; i++) this.thick[i] = Math.max(0, this.thick[i] - amount);
  }

  /** The share of the glass with any fog on it, 0..1. */
  get covered(): number {
    let n = 0;
    for (const v of this.thick) if (v > 0.05) n++;
    return n / Math.max(1, this.thick.length);
  }

  /** Paints the fog over what is already drawn; `color` is the fog's tint and `strength` its most opaque (0..1). */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, color: RGB, strength = 0.8): void {
    const image = this.image;
    if (!image) return;
    const data = image.data;
    for (let i = 0; i < this.thick.length; i++) {
      const v = this.thick[i];
      const o = i * 4;
      data[o] = color[0];
      data[o + 1] = color[1];
      data[o + 2] = color[2];
      data[o + 3] = v < 0.03 ? 0 : Math.round(255 * strength * v);
    }
    this.pixels.ctx.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.pixels.canvas, 0, 0, this.cols, this.rows, 0, 0, w, h);
  }

  private paint(x: number, y: number, radius: number, change: (current: number, falloff: number) => number): void {
    const cx = x / CELL;
    const cy = y / CELL;
    const r = radius / CELL;
    for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(this.rows - 1, Math.ceil(cy + r)); j++) {
      for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(this.cols - 1, Math.ceil(cx + r)); i++) {
        const d = Math.hypot(i - cx, j - cy) / r;
        if (d >= 1) continue;
        const k = j * this.cols + i;
        this.thick[k] = change(this.thick[k], 1 - d * d);
      }
    }
  }
}
