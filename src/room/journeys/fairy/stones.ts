import { css, type RGB } from '../../../render/color';
import { blendColor } from './colors';
import { disc, type SkyState } from '../../sky';
import type { FairySprites } from './sprites';

interface StoneNode {
  dx: number;
  dy: number;
  spriteIdx: number;
  lit: boolean;
  glow: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const STONE_LAYOUT: readonly { dx: number; dy: number; spriteIdx: number }[] = [
  { dx: -76, dy: 4, spriteIdx: 0 },
  { dx: -38, dy: -2, spriteIdx: 1 },
  { dx: 0, dy: -5, spriteIdx: 2 },
  { dx: 38, dy: -2, spriteIdx: 1 },
  { dx: 76, dy: 4, spriteIdx: 0 },
];

const WHITE: RGB = [255, 255, 255];

/** Chapter 4 Moonrise Stones circle, clickable runes, rising moon/sun disc, and skyward spirit beam. */
export class MoonriseStones {
  private readonly stones: StoneNode[] = STONE_LAYOUT.map((s) => ({
    ...s, lit: false, glow: 0, x: -999, y: -999, w: 0, h: 0,
  }));
  private visible = false;
  private readonly discColor: RGB = [0, 0, 0];
  private beam = 0;
  private spiritTimer = 0;
  private wasLitInLoop = false;

  invalidate(): void { this.visible = false; }

  press(px: number, py: number, unit: number, chapterIndex: number, onSpark: (x: number, y: number, count: number) => void): boolean {
    if (chapterIndex !== 3 || !this.visible) return false;
    for (const s of this.stones) {
      const pad = 6 * unit;
      if (px >= s.x - pad && px <= s.x + s.w + pad && py >= s.y - pad && py <= s.y + s.h + pad) {
        if (!s.lit) {
          s.lit = true;
          s.glow = 0.45;
          this.wasLitInLoop = true;
          onSpark(s.x + s.w * 0.5, s.y + s.h * 0.4, 7);
        } else {
          onSpark(s.x + s.w * 0.5, s.y + s.h * 0.4, 4);
        }
        return true;
      }
    }
    return false;
  }

  update(dt: number, chapterIndex: number, onSpirit: (x: number, y: number) => void): void {
    if (this.wasLitInLoop && (chapterIndex === 0 || chapterIndex === 5)) {
      this.wasLitInLoop = false;
      this.beam = 0;
      for (const s of this.stones) {
        s.lit = false;
        s.glow = 0;
      }
    }
    let allLit = true;
    for (const s of this.stones) {
      if (s.lit) s.glow = Math.min(1, s.glow + dt * 2.2);
      else allLit = false;
    }
    if (allLit) {
      this.beam = Math.min(1, this.beam + dt * 0.75);
      this.spiritTimer -= dt;
      if (this.spiritTimer <= 0) {
        this.spiritTimer = 0.28;
        const center = this.stones[2];
        if (center.x > -40 && center.x < 1000) {
          onSpirit(center.x + center.w * 0.5, center.y + center.h * 0.6);
        }
      }
    }
  }

  drawDisc(ctx: CanvasRenderingContext2D, state: SkyState, cx: number, h: number, unit: number, weight: number): void {
    if (weight < 0.02) return;
    const sunUp = state.sun.up > 0;
    const moonUp = state.moon.up > 0;
    const rise = sunUp ? Math.min(1, state.sun.up) : moonUp ? Math.min(1, state.moon.up) : 0.45;
    const cy = Math.round(h * (0.58 - rise * 0.08));
    const r = Math.round(24 * unit);
    const x = Math.round(cx + 110 * unit);

    ctx.save();
    ctx.globalAlpha = weight * 0.85;
    if (sunUp) {
      const sunCol = blendColor(this.discColor, state.sky.light, WHITE, 0.45);
      ctx.fillStyle = css(sunCol, 0.22);
      disc(ctx, x, cy, r + Math.round(6 * unit));
      ctx.fillStyle = css(sunCol, 0.85);
      disc(ctx, x, cy, r);
    } else {
      ctx.fillStyle = 'rgba(204,222,250,0.16)';
      disc(ctx, x, cy, r + Math.round(6 * unit));
      ctx.fillStyle = '#e8ecf0';
      disc(ctx, x, cy, r);
      ctx.fillStyle = '#cbd2dc';
      disc(ctx, x - Math.round(6 * unit), cy - Math.round(4 * unit), Math.max(2, Math.round(4 * unit)));
      disc(ctx, x + Math.round(7 * unit), cy + Math.round(3 * unit), Math.max(1, Math.round(3 * unit)));
      disc(ctx, x - Math.round(2 * unit), cy + Math.round(8 * unit), Math.max(1, Math.round(2 * unit)));
    }
    ctx.restore();
  }

  paint(
    L: CanvasRenderingContext2D,
    sprites: FairySprites,
    cx: number,
    h: number,
    w: number,
    unit: number,
    hillColor: RGB,
    weight: number,
  ): void {
    this.visible = weight >= 0.02 && cx >= -120 * unit && cx <= w + 120 * unit;
    if (!this.visible) return;
    L.save();
    L.globalAlpha = weight;
    const crestY = Math.round(h * 0.74);
    const hillW = Math.round(92 * unit);
    const hillH = Math.round(10 * unit);
    const x0 = Math.round(cx);

    L.fillStyle = css(hillColor);
    for (let dx = -hillW; dx <= hillW; dx++) {
      const u = dx / hillW;
      const top = crestY - Math.round((1 - u * u) * hillH);
      L.fillRect(x0 + dx, top, 1, Math.round(h * 0.79) - top);
    }

    const scale = 3.3 * unit;
    for (const node of this.stones) {
      const sp = sprites.stones[node.spriteIdx];
      const sw = Math.round(sp.base.w * scale);
      const sh = Math.round(sp.base.h * scale);
      const sx = Math.round(cx + node.dx * unit - sw * 0.5);
      const sy = Math.round(crestY - hillH + node.dy * unit - sh + 10 * unit);
      node.x = sx;
      node.y = sy;
      node.w = sw;
      node.h = sh;
      L.imageSmoothingEnabled = false;
      L.drawImage(sp.base.canvas, sx, sy, sw, sh);
    }
    L.restore();
  }

  drawGlows(
    ctx: CanvasRenderingContext2D,
    sprites: FairySprites,
    cx: number,
    h: number,
    w: number,
    unit: number,
    weight: number,
    nightBoost: number,
  ): void {
    if (weight < 0.02 || cx < -120 * unit || cx > w + 120 * unit) return;
    if (this.beam > 0.02) {
      const crestY = Math.round(h * 0.74);
      const hillH = Math.round(10 * unit);
      const bw = Math.max(4, Math.round(14 * unit * this.beam));
      const bx = Math.round(cx - bw / 2);
      const by = Math.round(crestY - hillH);
      ctx.save();
      ctx.globalAlpha = this.beam * weight * 0.32;
      ctx.fillStyle = '#c8f4ff';
      ctx.fillRect(bx, 0, bw, by);
      ctx.globalAlpha = this.beam * weight * 0.55;
      ctx.fillRect(Math.round(cx - bw * 0.25), 0, Math.max(2, Math.round(bw * 0.5)), by);
      ctx.restore();
    }
    for (const node of this.stones) {
      if (node.glow <= 0.02) continue;
      const sp = sprites.stones[node.spriteIdx];
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = node.glow * weight * (0.65 + 0.35 * nightBoost);
      ctx.drawImage(sp.rune.canvas, node.x, node.y, node.w, node.h);
      ctx.restore();
    }
  }
}
