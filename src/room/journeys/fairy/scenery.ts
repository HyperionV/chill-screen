import { disc } from '../../sky';
import { hash } from '../noise';
import type { FairySprites } from './sprites';

const FAR_SPEED = 0.23;
const EDGE_SPEED = 1.85;
const EDGE_SHARE = 0.13;
const CART_SHARE = 0.18;

/** Small houses belong to the distant wood; the big leaves frame the near road. */
export function paintFairyHouses(ctx: CanvasRenderingContext2D, sprites: FairySprites,
  scroll: number, w: number, h: number, unit: number, night: number): void {
  const cell = 74 * unit;
  const offset = scroll * FAR_SPEED;
  ctx.imageSmoothingEnabled = false;
  for (let k = Math.floor(offset / cell) - 1; k <= Math.ceil((offset + w) / cell); k++) {
    const seed = k * 947 + 9;
    const x = Math.round((k + hash(seed) * 0.6) * cell - offset);
    const y = Math.round(h * (0.61 + hash(seed + 1) * 0.035));
    const tree = sprites.trees[Math.abs(k) % sprites.trees.length];
    const th = (28 + hash(seed + 2) * 12) * unit;
    const tw = th * tree.w / tree.h;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(tree.canvas, x, Math.round(y - th), Math.round(tw), Math.round(th));
    ctx.restore();
    const house = sprites.cottage.house;
    const hx = x + Math.round(tw * 0.4);
    const hy = y - Math.round(14 * unit);
    ctx.drawImage(house.canvas, hx, hy, Math.round(14 * unit), Math.round(12 * unit));
    ctx.fillStyle = '#f5d48c';
    ctx.fillRect(hx + Math.round(3 * unit), hy + Math.round(8 * unit), Math.max(1, Math.round(2 * unit)), Math.max(1, Math.round(unit)));
    if (night > 0.1) {
      ctx.fillStyle = `rgba(255,222,140,${night * 0.2})`;
      disc(ctx, hx + Math.round(4 * unit), hy + Math.round(8 * unit), Math.max(1, Math.round(3 * unit)));
    }
  }
}

export function paintEdgeLeaves(ctx: CanvasRenderingContext2D, sprites: FairySprites,
  scroll: number, time: number, w: number, h: number, unit: number): void {
  const offset = scroll * EDGE_SPEED;
  const cell = 42 * unit;
  ctx.imageSmoothingEnabled = false;
  // Only the edges are dressed, so neither Pip nor the cauldron disappears behind a leaf.
  for (let side = 0; side < 2; side++) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side === 0 ? 0 : Math.round(w * (1 - EDGE_SHARE)), Math.round(h * 0.70), Math.ceil(w * EDGE_SHARE), h);
    ctx.clip();
    for (let k = Math.floor(offset / cell) - 1; k <= Math.ceil((offset + w) / cell); k++) {
      const x = (k + hash(k * 59) * 0.4) * cell - offset;
      if (side === 0 ? x > w * EDGE_SHARE + 36 * unit : x < w * (1 - EDGE_SHARE) - 36 * unit) continue;
      const list = k % 2 === 0 ? sprites.giantLeaves : sprites.ferns;
      const sp = list[Math.abs(k) % list.length];
      const height = (45 + hash(k * 61) * 22) * unit;
      const width = sp.w / sp.h * height;
      const sway = Math.round(Math.sin(time * 1.2 + k) * 2 * unit);
      ctx.drawImage(sp.canvas, Math.round(x - width / 2 + sway), Math.round(h * 1.03 - height), Math.round(width), Math.round(height));
    }
    ctx.restore();
  }
}

export function drawCart(ctx: CanvasRenderingContext2D, time: number, speed: number,
  w: number, h: number, unit: number, night: number): void {
  const bob = speed > 0 ? Math.round(Math.sin(time * (3.5 + speed * 2)) * unit) : 0;
  const x = Math.round(8 * unit);
  const y = Math.round(h * 0.92) + bob;
  const width = Math.round(w * CART_SHARE);
  const plank = Math.max(2, Math.round(7 * unit));
  ctx.fillStyle = '#382718';
  ctx.fillRect(0, y, width, h - y);
  ctx.fillStyle = '#9c7446';
  ctx.fillRect(0, y, width, Math.max(1, Math.round(2 * unit)));
  ctx.fillStyle = '#68462b';
  ctx.fillRect(0, y + Math.round(3 * unit), width, plank);
  ctx.fillStyle = '#302117';
  ctx.fillRect(x, y - Math.round(27 * unit), Math.round(3 * unit), Math.round(28 * unit));
  ctx.fillRect(x, y - Math.round(27 * unit), Math.round(15 * unit), Math.round(2 * unit));
  const lx = x + Math.round(14 * unit + Math.sin(time * 0.8) * unit);
  const ly = y - Math.round(14 * unit);
  ctx.fillStyle = '#34302b';
  ctx.fillRect(lx, y - Math.round(26 * unit), Math.max(1, Math.round(unit)), Math.round(7 * unit));
  ctx.fillRect(lx - Math.round(4 * unit), ly - Math.round(5 * unit), Math.round(9 * unit), Math.round(12 * unit));
  ctx.fillStyle = '#ffdb87';
  ctx.fillRect(lx - Math.round(2 * unit), ly - Math.round(3 * unit), Math.round(5 * unit), Math.round(7 * unit));
  ctx.fillStyle = `rgba(255,213,110,${0.03 + night * 0.2})`;
  disc(ctx, lx, ly, Math.max(1, Math.round(10 * unit)));
  ctx.fillStyle = '#b7a57a';
  ctx.fillRect(width - Math.round(8 * unit), y + Math.round(3 * unit), Math.max(1, Math.round(2 * unit)), Math.max(1, Math.round(2 * unit)));
}
