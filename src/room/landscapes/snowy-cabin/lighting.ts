import { css, type RGB } from '../../../render/color';
import { clamp } from '../../../world/math';
import type { SkyState } from '../../sky';
import type { Atmosphere } from './atmosphere';
import { HORIZON, type SceneId } from './scenes';
import type { CabinSpec, SnowySprites, VillageBuilding } from './sprites';

/** Draws winter horizon washes, aurora curtains, and shooting stars before terrain. */
export function drawSkyExtras(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SkyState,
  time: number,
  scene: SceneId,
  atmosphere: Atmosphere,
  px: number,
): void {
  const hy = Math.round(h * HORIZON);
  const night = 1 - state.day;

  if (state.day > 0.2) {
    const isMorning = state.sun.u < 0.45;
    const washCol: RGB = isMorning ? [232, 198, 224] : [236, 244, 252];
    const washAlpha = isMorning ? 0.16 * state.day : 0.12 * Math.max(0, state.sun.up);
    if (washAlpha > 0.01) {
      ctx.fillStyle = css(washCol, washAlpha);
      ctx.fillRect(0, Math.round(hy * 0.62), w, Math.round(hy * 0.38));
    }
  }

  const auroraStrength = scene === 'aurora'
    ? Math.max(0.32, night * 0.95)
    : night > 0.45
      ? (night - 0.45) * 0.65
      : 0;
  if (auroraStrength > 0.03) {
    ctx.save();
    ctx.translate(Math.round(px * 0.15), 0);
    atmosphere.drawAurora(ctx, time, auroraStrength);
    ctx.restore();
  }

  atmosphere.drawShootingStars(ctx);
}

/** Tints the offscreen land layer to the hour of day (deep blue night, rose/gold sunset). */
export function tintLand(L: CanvasRenderingContext2D, w: number, h: number, state: SkyState, scene: SceneId): void {
  const { sky, sun, day } = state;
  const night = 1 - day;
  L.save();
  L.globalCompositeOperation = 'source-atop';

  if (night > 0.02) {
    L.fillStyle = css([10, 18, 48], 0.54 * night);
    L.fillRect(0, 0, w, h);
    L.fillStyle = css([44, 78, 152], 0.16 * night);
    L.fillRect(0, 0, w, h);
  }

  if ((scene === 'chimney' || scene === 'aurora') && day > 0.25) {
    L.fillStyle = css([28, 44, 88], 0.24 * day);
    L.fillRect(0, 0, w, h);
  }

  const low = clamp(1 - sun.up / 0.55, 0, 1) * day;
  if (low > 0.02) {
    L.fillStyle = css(sky.light, 0.26 * low);
    L.fillRect(0, 0, w, h);
  }
  L.restore();
}

/** Paints warm cabin windows, snow light spill, porch lantern, and distant village windows after tinting. */
export function drawPostTintLights(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  scene: SceneId,
  state: SkyState,
  time: number,
  sprites: SnowySprites,
  nearOff: number,
  midFarOff: number,
  windowGlow: number,
): void {
  const night = 1 - state.day;

  if (scene === 'clearing') {
    paintCabinLights(ctx, unit, sprites.cabinLarge, w * 0.23 + nearOff, h * 0.735, windowGlow, night, time, true);
  } else if (scene === 'chimney') {
    paintCabinLights(ctx, unit, sprites.cabinClose, w * 0.22 + nearOff, h * 0.78, windowGlow, Math.max(night, 0.5), time, true);
  } else if (scene === 'aurora') {
    paintCabinLights(ctx, unit, sprites.cabinSmall, w * 0.22 + nearOff, h * 0.675, windowGlow, Math.max(night, 0.5), time, false);
  } else if (scene === 'sled') {
    const villageStrength = clamp(Math.max(windowGlow * 0.8, night * 0.95 + 0.25), 0, 1);
    if (villageStrength > 0.08) {
      const baseY = Math.round(h * 0.635);
      paintBuildingWindows(ctx, unit, sprites.villageHouses[0], w * 0.69 + midFarOff, baseY, villageStrength);
      paintBuildingWindows(ctx, unit, sprites.villageChurch, w * 0.77 + midFarOff, baseY - 2 * unit, villageStrength);
      paintBuildingWindows(ctx, unit, sprites.villageHouses[1], w * 0.84 + midFarOff, baseY + unit, villageStrength);
    }
  }
}

function paintCabinLights(
  ctx: CanvasRenderingContext2D,
  u: number,
  spec: CabinSpec,
  cx: number,
  cy: number,
  windowGlow: number,
  nightWeight: number,
  time: number,
  snowSpill: boolean,
): void {
  const tlX = Math.round(cx - (spec.w * u) / 2);
  const tlY = Math.round(cy - spec.h * u);
  const flicker = 0.94 + 0.06 * Math.sin(time * 2.4);

  if (windowGlow > 0.02) {
    const alpha = windowGlow * flicker;
    for (const win of spec.windows) {
      const wx = Math.round(tlX + win.x * u);
      const wy = Math.round(tlY + win.y * u);
      const ww = Math.max(2, Math.round(win.w * u));
      const wh = Math.max(2, Math.round(win.h * u));

      ctx.fillStyle = `rgba(255,196,92,${(0.18 * alpha * (0.35 + 0.65 * nightWeight)).toFixed(3)})`;
      ctx.fillRect(wx - Math.round(4 * u), wy - Math.round(4 * u), ww + Math.round(8 * u), wh + Math.round(8 * u));

      ctx.fillStyle = `rgba(255,214,116,${(0.95 * alpha).toFixed(3)})`;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = `rgba(255,244,196,${(0.85 * alpha).toFixed(3)})`;
      ctx.fillRect(wx + 1, wy + 1, Math.max(1, ww - 2), Math.max(1, Math.floor(wh / 2)));
      ctx.fillStyle = '#3b2416';
      ctx.fillRect(wx + Math.floor(ww / 2), wy, Math.max(1, Math.round(u * 0.8)), wh);
      ctx.fillRect(wx, wy + Math.floor(wh / 2), ww, Math.max(1, Math.round(u * 0.8)));

      if (snowSpill) {
        const spillAlpha = alpha * (0.14 + 0.24 * nightWeight);
        const steps = 6;
        for (let s = 0; s < steps; s++) {
          const k = s / steps;
          const sy = Math.round(cy + s * 3.5 * u);
          const sw = Math.round(ww * (1.2 + k * 1.4));
          const sx = Math.round(wx + ww * 0.5 - sw * 0.42);
          ctx.fillStyle = `rgba(255,198,94,${(spillAlpha * (1 - k * 0.72)).toFixed(3)})`;
          ctx.fillRect(sx, sy, sw, Math.max(2, Math.round(3 * u)));
        }
      }
    }
  }

  if (spec.lanternX !== null && spec.lanternY !== null) {
    const lx = Math.round(tlX + spec.lanternX * u);
    const ly = Math.round(tlY + spec.lanternY * u);
    const lanternStrength = (0.35 + 0.65 * nightWeight) * flicker;
    ctx.fillStyle = `rgba(255,196,92,${(0.22 * lanternStrength).toFixed(3)})`;
    ctx.fillRect(lx - Math.round(5 * u), ly - Math.round(5 * u), Math.round(11 * u), Math.round(11 * u));
    ctx.fillStyle = `rgba(255,232,160,${lanternStrength.toFixed(3)})`;
    ctx.fillRect(lx - Math.round(u), ly - Math.round(u), Math.max(2, Math.round(2 * u)), Math.max(2, Math.round(2 * u)));
  }
}

function paintBuildingWindows(
  ctx: CanvasRenderingContext2D,
  u: number,
  b: VillageBuilding,
  cx: number,
  cy: number,
  strength: number,
): void {
  const tlX = Math.round(cx - (b.w * u) / 2);
  const tlY = Math.round(cy - b.h * u);
  ctx.fillStyle = `rgba(255,212,118,${(0.9 * strength).toFixed(3)})`;
  for (const win of b.windows) {
    ctx.fillRect(
      Math.round(tlX + win.x * u),
      Math.round(tlY + win.y * u),
      Math.max(1, Math.round(win.w * u)),
      Math.max(1, Math.round(win.h * u)),
    );
  }
}
