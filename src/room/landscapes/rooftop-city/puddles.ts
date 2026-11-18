import { css, mix, type RGB } from '../../../render/color';
import type { SkyState } from '../../sky';
import { clamp01 } from '../../sky';
import { createInitialPuddles, type PuddleRipple, type PuddleSpot } from './foreground-layout';
import { WORLD_W, wrapDelta } from './scenes';

const MAX_RIPPLES = 8;
const RIPPLE_LIFE = 2.6;
const RIPPLE_POINTS = 16;
const REFLECTION_ROWS = [-2, 0, 2];
const WARM_REFLECTION: RGB = [255, 204, 120];
const GLASS_REFLECTION: RGB = [215, 231, 251];
const NEON_REFLECTION: RGB = [118, 233, 251];
const NEON_SECONDARY: RGB = [255, 132, 176];
const ADVERT_REFLECTION: RGB = [255, 224, 152];

/** The small uneven shore bounds every reflection and click ripple. */
function rowHalfWidth(puddle: PuddleSpot, dy: number): number {
  const slope = dy / (puddle.h / 2);
  return Math.round(puddle.w / 2 * Math.sqrt(Math.max(0, 1 - slope * slope)));
}

function rowWobble(puddle: PuddleSpot, dy: number): number {
  return Math.round(Math.sin(dy * 1.9 + puddle.wx * 0.1) * 1.5);
}

/**
 * Renders terrace rainwater puddles with sky, neon, string-light, and moon reflections,
 * plus expanding pixel ripples on click.
 */
export class PuddleLayer {
  private readonly puddles: PuddleSpot[] = createInitialPuddles();
  private readonly ripples: PuddleRipple[] = [];

  update(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r) continue;
      r.age += dt;
      if (r.age >= RIPPLE_LIFE) this.ripples.splice(i, 1);
    }
  }

  /** Spawns a water ripple if `(dx, dy)` lands inside a terrace puddle. */
  tryClick(dx: number, dy: number): boolean {
    for (const p of this.puddles) {
      const r = p.screenRect;
      if (!r) continue;
      if (dx >= r.x - 2 && dx <= r.x + r.w + 2 && dy >= r.y - 2 && dy <= r.y + r.h + 2) {
        if (this.ripples.length >= MAX_RIPPLES) this.ripples.shift();
        this.ripples.push({ puddle: p, age: 0 });
        return true;
      }
    }
    return false;
  }

  /** Draws puddle basins and sky-tinted surface shimmer onto the pre-tint land canvas. */
  drawPreTint(
    L: CanvasRenderingContext2D,
    state: SkyState,
    time: number,
    foreCam: number,
    halfW: number,
    designW: number,
    unit: number,
  ): void {
    const skyReflect: RGB = mix(state.sky.zenith, state.sky.horizon, 0.62);
    const poolCol = css(mix([42, 48, 64], skyReflect, 0.48));
    const shimmerCol = css(mix(skyReflect, state.sky.light, 0.38), 0.38);
    const darkReflection = css(mix([35, 41, 56], state.sky.zenith, 0.24));

    for (const p of this.puddles) {
      const sx = wrapDelta(p.wx, foreCam, WORLD_W) + halfW;
      if (sx + p.w * 0.5 < -16 || sx - p.w * 0.5 > designW + 16) {
        p.screenRect = null;
        continue;
      }

      const left = sx - p.w * 0.5;
      p.screenRect = { x: left, y: p.y - p.h * 0.5, w: p.w, h: p.h };
      const ry = p.h * 0.5;

      for (let dy = -Math.floor(ry); dy <= Math.floor(ry); dy++) {
        const halfSpan = rowHalfWidth(p, dy);
        if (halfSpan < 2) continue;
        const rowX = sx - halfSpan + rowWobble(p, dy);
        const rowW = halfSpan * 2;
        const rowY = p.y + dy;

        L.fillStyle = '#343844';
        drawRow(L, rowX - 1, rowY, rowW + 2, unit);
        L.fillStyle = poolCol;
        drawRow(L, rowX, rowY, rowW, unit);
        // Inverted dark parapet and aerials break up the reflected sky.
        if (dy <= 0) {
          L.fillStyle = darkReflection;
          drawRow(L, rowX + 1, rowY, Math.max(1, Math.floor(rowW * 0.29) + dy), unit);
          drawRow(L, rowX + Math.floor(rowW * 0.58), rowY, Math.max(1, Math.floor(rowW * 0.17) + dy), unit);
        }
        if (dy === Math.floor(ry) - 1) {
          L.fillStyle = '#79808f73';
          drawRow(L, rowX + 2, rowY + 1, Math.max(1, Math.floor(rowW * 0.54)), unit);
        }
        if ((dy & 1) === 0) {
          const glintX = rowX + Math.round((0.26 + 0.12 * Math.sin(time * 1.2 + dy + p.wx)) * rowW);
          L.fillStyle = shimmerCol;
          drawRow(L, glintX, rowY, Math.max(1, Math.round(rowW * 0.33)), unit);
        }
      }
    }
  }

  /** Draws post-tint neon/lantern/moon reflections and active click ripples. */
  drawPostTint(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    time: number,
    foreCam: number,
    halfW: number,
    designW: number,
    unit: number,
  ): void {
    const night = 1 - state.day;

    for (const p of this.puddles) {
      const sx = wrapDelta(p.wx, foreCam, WORLD_W) + halfW;
      if (sx + p.w * 0.5 < -16 || sx - p.w * 0.5 > designW + 16) continue;

      const drift = Math.round(Math.sin(time * 1.25 + p.wx) * 1.4);
      const alpha = clamp01(0.16 + night * 0.46);
      if (p.kind === 'sky') {
        const color = state.moon.up > 0 && night > 0.2 ? GLASS_REFLECTION : state.sky.light;
        drawReflectedLight(ctx, p, sx, drift, color, alpha * 0.66, unit);
      } else if (p.kind === 'neon') {
        drawReflectedLight(ctx, p, sx, drift - 5, NEON_REFLECTION, alpha, unit);
        drawReflectedLight(ctx, p, sx, 4 - drift, NEON_SECONDARY, alpha * 0.82, unit);
      } else {
        const color = p.kind === 'billboard' ? ADVERT_REFLECTION : WARM_REFLECTION;
        const pulse = 0.88 + 0.12 * Math.sin(time * 1.7 + p.wx);
        drawReflectedLight(ctx, p, sx, drift, color, alpha * pulse, unit);
      }
    }

    for (const r of this.ripples) {
      const p = r.puddle;
      const sx = wrapDelta(p.wx, foreCam, WORLD_W) + halfW;
      if (sx < -24 || sx > designW + 24) continue;
      const frac = r.age / RIPPLE_LIFE;
      const alpha = (1 - frac) * 0.75;
      const radX = 2 + frac * (p.w * 0.39);
      const radY = 1 + frac * (p.h * 0.29);
      ctx.fillStyle = `rgba(218, 236, 252, ${alpha.toFixed(2)})`;
      for (let k = 0; k < RIPPLE_POINTS; k++) {
        const a = k / RIPPLE_POINTS * Math.PI * 2;
        const dx = Math.round(Math.cos(a) * radX);
        const dy = Math.round(Math.sin(a) * radY);
        if (Math.abs(dx - rowWobble(p, dy)) >= rowHalfWidth(p, dy)) continue;
        drawRow(ctx, sx + dx, p.y + dy, 1, unit);
      }
    }
  }
}

function drawRow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, unit: number): void {
  const left = Math.round(x * unit);
  const top = Math.round(y * unit);
  ctx.fillRect(left, top, Math.round((x + w) * unit) - left, Math.round((y + 1) * unit) - top);
}

function drawReflectedLight(
  ctx: CanvasRenderingContext2D,
  p: PuddleSpot,
  sx: number,
  drift: number,
  color: RGB,
  alpha: number,
  unit: number,
): void {
  for (const dy of REFLECTION_ROWS) {
    const half = rowHalfWidth(p, dy);
    const reach = dy === 0 ? 4 : 2;
    const wobble = rowWobble(p, dy);
    const left = Math.max(wobble - half + 1, drift - reach + dy);
    const right = Math.min(wobble + half - 1, drift + reach + dy);
    if (right <= left) continue;
    ctx.fillStyle = css(color, alpha * (dy === 0 ? 0.74 : 0.48));
    drawRow(ctx, sx + left, p.y + dy, right - left, unit);
  }
}
