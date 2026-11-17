import { memoryCanvas } from '../../../render/pixel-stage';
import { FogLayer } from '../fog';
import { hash } from '../noise';

const FROST_STRENGTH = 0.24;
const CRYSTAL_SPACING = 13;
const FROST_COLOR: [number, number, number] = [219, 239, 249];

/** Both the pale veil and the crystal tips share one wipe mask, with no opaque backing. */
export class FrostGlass {
  private readonly fog = new FogLayer();
  private layer: ReturnType<typeof memoryCanvas> | null = null;
  private crystals: ReturnType<typeof memoryCanvas> | null = null;

  resize(width: number, height: number): void {
    this.fog.resize(width, height);
    this.layer = memoryCanvas(width, height);
    this.crystals = memoryCanvas(width, height);
    const C = this.crystals.ctx;
    C.fillStyle = '#f3fcff';
    for (let y = 0; y < height; y += CRYSTAL_SPACING) {
      for (let x = 0; x < width; x += CRYSTAL_SPACING) {
        const seed = x + y * width;
        const px = x + Math.round(hash(seed) * 9);
        const py = y + Math.round(hash(seed + 7) * 9);
        const edge = Math.min(x, width - x, y, height - y);
        if (edge > height * 0.18 && hash(seed + 1) < 0.8) continue;
        C.fillRect(px - 2, py, 5, 1);
        C.fillRect(px, py - 2, 1, 5);
        C.fillRect(px - 1, py - 1, 1, 1);
        C.fillRect(px + 1, py + 1, 1, 1);
      }
    }
  }

  grow(amount: number, limit = 1): void { this.fog.grow(amount, limit); }
  fade(amount: number): void { this.fog.fade(amount); }
  wipe(x: number, y: number, radius: number): void { this.fog.wipe(x, y, radius); }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.layer || !this.crystals) return;
    const C = this.layer.ctx;
    C.clearRect(0, 0, width, height);
    C.globalCompositeOperation = 'source-over';
    this.fog.draw(C, width, height, FROST_COLOR, FROST_STRENGTH);
    C.globalCompositeOperation = 'source-atop';
    C.drawImage(this.crystals.canvas, 0, 0);
    C.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.layer.canvas, 0, 0);
    ctx.restore();
  }
}
