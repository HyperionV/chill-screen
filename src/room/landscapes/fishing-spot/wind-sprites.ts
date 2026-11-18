import { breeze } from '../../wind';
import type { SpriteBox } from './types';

/** Maximum reed tip travel in stage pixels, from the farthest bank to the foreground. */
export const BANK_REED_SWAY = 2;
export const FOREGROUND_REED_SWAY = 3;
/** A lily's bloom bends gently at the waterline. */
export const LILY_SWAY = 1;
/** A lantern hangs from its top handle. Its glow sits halfway down the sprite. */
const LANTERN_SWAY = 2;

export function lanternBend(time: number, stageX: number): number {
  return Math.round(breeze(time, stageX) * LANTERN_SWAY);
}

/** Draws consecutive rows with the same pixel offset together, keeping the anchored edge still. */
export function drawWindSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteBox,
  x: number,
  y: number,
  width: number,
  height: number,
  tip: number,
  anchorTop = false,
): void {
  if (tip === 0 || height <= 1) {
    ctx.drawImage(sprite.canvas, x, y, width, height);
    return;
  }

  const reach = Math.abs(tip);
  const direction = Math.sign(tip);
  const sourceScale = sprite.h / height;
  let start = 0;
  for (let offset = reach; offset >= 0; offset--) {
    const end = offset === 0 ? height : Math.floor((reach - offset + 0.5) * (height - 1) / reach) + 1;
    if (end <= start) continue;
    const row = anchorTop ? height - end : start;
    const rows = end - start;
    ctx.drawImage(sprite.canvas, 0, row * sourceScale, sprite.w, rows * sourceScale,
      x + direction * offset, y + row, width, rows);
    start = end;
  }
}
