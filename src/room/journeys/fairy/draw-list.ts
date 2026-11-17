import type { Sprite } from './sprites';

interface Item {
  sprite: Sprite | null;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  alpha: number;
}

// Fixed storage avoids creating a closure for every plant on every frame.
const CAPACITY = 192;

export class DrawList {
  private readonly items: Item[] = Array.from({ length: CAPACITY }, () => ({
    sprite: null, x: 0, y: 0, w: 0, h: 0, depth: 0, alpha: 1,
  }));
  private count = 0;

  clear(): void { this.count = 0; }

  add(sprite: Sprite, x: number, y: number, w: number, h: number, depth: number, alpha = 1): void {
    if (this.count === CAPACITY || alpha <= 0) return;
    const item = this.items[this.count++];
    item.sprite = sprite;
    item.x = Math.round(x);
    item.y = Math.round(y);
    item.w = Math.max(1, Math.round(w));
    item.h = Math.max(1, Math.round(h));
    item.depth = depth;
    item.alpha = alpha;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // The short list is nearly sorted already; only its active portion is visited.
    for (let i = 1; i < this.count; i++) {
      const item = this.items[i];
      let j = i;
      while (j > 0 && this.items[j - 1].depth > item.depth) {
        this.items[j] = this.items[j - 1];
        j--;
      }
      this.items[j] = item;
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < this.count; i++) {
      const item = this.items[i];
      if (!item.sprite) continue;
      ctx.globalAlpha = item.alpha;
      ctx.drawImage(item.sprite.canvas, item.x, item.y, item.w, item.h);
    }
    ctx.restore();
  }
}
