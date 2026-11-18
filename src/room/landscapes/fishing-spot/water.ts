import { css, mix, shade, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import type { SceneIndex, SceneLayout } from './types';

const WHITE: RGB = [255, 255, 255];
const EVENING_TOP_TINT: RGB = [214, 134, 88];
const EVENING_DEEP_TINT: RGB = [78, 56, 76];
const NIGHT_TOP_TINT: RGB = [24, 34, 62];
const NIGHT_DEEP_TINT: RGB = [12, 18, 38];
const MOONLIT_WATER: RGB = [59, 83, 111];
const MOON_GLITTER: RGB = [216, 226, 252];
const WAVE_LIMIT = 520;
const SEAM_ROWS = 4;
const MIST_PADDING = 74;
const MIST_WIDTHS = [46, 63, 77];
const MIST_HEIGHT = 7;

const WAVE_BAND_COUNT = 5;
const GLITTER_COUNT = 38;
const SPARKLE_COUNT = 26;
const STAR_REFLECT_COUNT = 28;
const FAR_MIST_RIBBONS = 6;
const NEAR_MIST_RIBBONS = 5;

interface Wavelet {
  x: number;
  y: number;
  length: number;
  drift: number;
  rate: number;
  phase: number;
  crest: boolean;
}

function buildMist(width: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(width, MIST_HEIGHT);
  for (let x = 0; x < width; x++) {
    const taper = 1 - Math.abs(x / width * 2 - 1);
    const bend = Math.round(Math.sin(x / width * Math.PI * 2) * 1.2);
    for (let y = 0; y < MIST_HEIGHT; y++) {
      const density = taper - Math.abs(y - 3 - bend) * 0.31;
      const threshold = ((x * 3 + y * 5) & 7) / 8;
      if (density <= threshold * 0.73) continue;
      ctx.fillStyle = density > 0.64 ? '#c7d7dd' : 'rgba(196,211,218,0.55)';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

/** Renders lake water, changing reflections and drifting shoreline mist. */
export class FishingWater {
  private w = 0;
  private h = 0;
  private top = 0;
  private readonly seam = memoryCanvas(1, SEAM_ROWS);
  private readonly waves: Wavelet[] = [];
  private mist: HTMLCanvasElement[] = [];

  resize(w: number, h: number, layout: SceneLayout): void {
    this.w = w;
    this.h = h;
    const u = layout.unit;
    this.top = Math.round(layout.waterTopY * u);
    this.seam.canvas.width = Math.max(1, Math.ceil(layout.designW));
    this.seam.ctx.fillStyle = 'rgba(21,41,55,0.16)';
    for (let y = 0; y < SEAM_ROWS; y++) {
      for (let x = 0; x < this.seam.canvas.width; x++) {
        if (((x * 3 + y * 5) & 7) <= y * 2) this.seam.ctx.fillRect(x, y, 1, 1);
      }
    }

    this.waves.length = 0;
    const span = Math.max(1, h - this.top);
    const spacingY = Math.max(2, Math.round(4 * u));
    const maxPerRow = Math.max(1, Math.floor(WAVE_LIMIT / Math.ceil(span / spacingY)));
    for (let y = this.top + spacingY; y < h; y += spacingY) {
      const depth = (y - this.top) / span;
      const spacing = (16 + 34 * depth * depth) * u;
      const count = Math.min(maxPerRow, Math.ceil(w / spacing));
      for (let j = 0; j < count; j++) {
        const seed = y * 131 + j;
        this.waves.push({
          x: (j + hash(seed + 0.7)) * w / count,
          y,
          length: Math.max(1, Math.round((2 + depth * 9) * u * (0.55 + hash(seed + 1)))),
          drift: (hash(y) - 0.5) * 2.4 * u,
          rate: 0.38 + hash(seed) * 0.56,
          phase: hash(seed + 0.3) * Math.PI * 2,
          crest: hash(seed + 0.9) > 0.44,
        });
      }
    }
    if (this.mist.length === 0) this.mist = MIST_WIDTHS.map(buildMist);
  }

  /** Draws the lake body, shore reflections, waves, sun/moon glitter, wind sparkles, and night star reflections. */
  drawWater(
    L: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    parallaxX: number,
  ): void {
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));
    const top = this.top;
    const bot = this.h;
    const span = Math.max(1, bot - top);

    const eveningWarm = scene === 3 ? 0.28 : 0;
    const nightCalm = scene === 4 ? 0.16 : 0;
    let topCol = mix(state.sky.horizon, state.sky.water, 0.48);
    let deepCol = shade(state.sky.water, 0.83);
    const night = 1 - state.day;
    topCol = mix(topCol, MOONLIT_WATER, night * 0.68);
    deepCol = mix(deepCol, MOONLIT_WATER, night * 0.64);
    if (eveningWarm > 0) {
      topCol = mix(topCol, EVENING_TOP_TINT, eveningWarm * 0.65);
      deepCol = mix(deepCol, EVENING_DEEP_TINT, eveningWarm * 0.55);
    }
    if (nightCalm > 0) {
      topCol = mix(topCol, NIGHT_TOP_TINT, nightCalm);
      deepCol = mix(deepCol, NIGHT_DEEP_TINT, nightCalm);
    }

    // 1. Stepped pixel water bands with checkerboard-dithered seams instead of a smooth gradient.
    for (let b = 0; b < WAVE_BAND_COUNT; b++) {
      const y0 = top + Math.round((b / WAVE_BAND_COUNT) * span);
      const y1 = top + Math.round(((b + 1) / WAVE_BAND_COUNT) * span);
      const bandCol = mix(topCol, deepCol, b / Math.max(1, WAVE_BAND_COUNT - 1));
      L.fillStyle = css(bandCol);
      L.fillRect(0, y0, this.w, Math.max(1, y1 - y0));

      if (b < WAVE_BAND_COUNT - 1) {
        const seamHeight = Math.min(y1 - y0, dot * SEAM_ROWS);
        if (seamHeight > 0) L.drawImage(this.seam.canvas, 0, y1 - seamHeight, this.w, seamHeight);
      }
    }

    const pShift = parallaxX * 3.5 * u;
    const troughCol = css(shade(deepCol, 0.72), 0.36);
    const crestCol = css(mix(topCol, WHITE, 0.18 + 0.12 * state.day), 0.46);

    L.save();
    for (const wave of this.waves) {
      const swell = Math.sin(time * wave.rate + wave.phase);
      if (swell < 0.17) continue;
      const x = wave.x + time * wave.drift + pShift * (0.4 + (wave.y - top) / span);
      const wrapped = ((x % this.w) + this.w) % this.w;
      L.fillStyle = wave.crest ? crestCol : troughCol;
      L.globalAlpha = Math.min(1, (swell - 0.17) * 1.3);
      L.fillRect(Math.round(wrapped), wave.y, wave.length, dot);
    }
    L.restore();

    // 4. Sun or moon glitter path.
    const body = state.sun.up > -0.02 ? state.sun : state.moon;
    if (body.up > -0.02) {
      const isSun = state.sun.up > -0.02;
      const strength = isSun ? 0.55 : 0.45 * (1 - state.day);
      const col = isSun ? mix(state.sky.light, WHITE, 0.5) : MOON_GLITTER;
      const cx = body.u * this.w + pShift * 0.5;
      L.save();
      L.fillStyle = css(col);
      for (let i = 0; i < GLITTER_COUNT; i++) {
        const period = 0.9 + hash(i) * 1.1;
        const clk = time / period + hash(i + 0.5);
        const n = Math.floor(clk);
        const seed = i * 7919 + n * 104729;
        const f = hash(seed) ** 0.85;
        const gy = Math.round(top + 2 + (span - 8) * f * f);
        const spread = this.w * (0.015 + 0.09 * f);
        const gx = cx + (hash(seed + 1) + hash(seed + 2) - 1) * spread;
        const glen = Math.max(2, Math.round((1 + 4 * f) * u));
        L.globalAlpha = Math.sin(Math.PI * (clk - n)) ** 2 * strength;
        L.fillRect(Math.round(gx - glen / 2), gy, glen, dot);
      }
      L.restore();
    }

    // 5. Crisp wind-driven water sparkles across open wavelets.
    const sparkleCol = mix(state.sky.light, WHITE, 0.65);
    const sparkleAlphaBase = 0.25 + 0.38 * state.day;
    L.save();
    L.fillStyle = css(sparkleCol);
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const seed = i * 257 + 19;
      const pulse = Math.sin(time * (1.2 + hash(seed) * 1.1) + hash(seed + 1) * 6.28);
      if (pulse < 0.62) continue;
      const f = hash(seed + 2);
      const gx = (((hash(seed + 3) * this.w + pShift * (0.4 + 0.5 * f)) % this.w) + this.w) % this.w;
      const gy = Math.round(top + 4 * u + f * (span - 10 * u));
      const tw = (pulse - 0.62) / 0.38;
      L.globalAlpha = tw * sparkleAlphaBase;
      const sx = Math.round(gx);
      L.fillRect(sx, gy, dot * 2, dot);
      if (tw > 0.7) {
        L.fillRect(sx + dot, gy - dot, dot, dot);
      }
    }
    L.restore();

    // Reflected stars stay with the night sky even in the Night Fishing scene.
    const starShow = Math.max(0, 1 - state.day * 1.3);
    if (starShow > 0.08) {
      for (let i = 0; i < STAR_REFLECT_COUNT; i++) {
        const sx = Math.round(hash(i * 41 + 3) * this.w + pShift * 0.5);
        const sy = Math.round(top + 6 * u + hash(i * 41 + 7) * (span * 0.52));
        const tw = 0.45 + 0.55 * Math.sin(time * (1.2 + hash(i) * 1.4) + i);
        L.fillStyle = `rgba(226,236,255,${(0.45 * starShow * tw).toFixed(3)})`;
        L.fillRect(sx, sy, dot, dot);
        if (tw > 0.72) L.fillRect(sx, sy + dot * 2, dot, dot);
      }
    }
  }

  /**
   * Draws multi-layered stepped pixel mist ribbons hugging the far shoreline and reed edges
   * (tapered dithered ends, never flat uniform bars).
   */
  drawLayeredShoreMist(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    hour: number,
    parallaxX: number,
  ): void {
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));

    const dawnMist = hour >= 5.0 && hour <= 8.8 ? Math.sin(((hour - 5.0) / 3.8) * Math.PI) * 0.65 : 0;
    const duskMist = hour >= 17.4 && hour <= 20.4 ? Math.sin(((hour - 17.4) / 3.0) * Math.PI) * 0.45 : 0;
    const nightMist = (1 - state.day) * 0.32;
    const sceneMist = scene === 2 ? 0.85 : scene === 1 ? 0.35 : scene === 4 ? 0.38 : 0.16;
    const strength = Math.max(dawnMist, duskMist, nightMist, sceneMist);
    if (strength < 0.05) return;

    const alpha = ctx.globalAlpha;
    const span = this.w + MIST_PADDING * u * 2;
    const spriteHeight = Math.max(1, Math.round(MIST_HEIGHT * u));
    ctx.save();

    // Smaller wisps soften the waterline while the second layer drifts over the bay.
    for (let layer = 0; layer < 2; layer++) {
      const count = layer === 0 ? FAR_MIST_RIBBONS : NEAR_MIST_RIBBONS;
      const drift = layer === 0 ? 1.2 : 2.5;
      const depth = layer === 0 ? -1 : 13;
      const shift = parallaxX * (layer === 0 ? 2.2 : 4.2) * u;
      const strengthAtDepth = layer === 0 ? 0.36 : 0.20;
      for (let i = 0; i < count; i++) {
        const wisp = this.mist[(i + scene) % this.mist.length];
        if (!wisp) continue;
        const x = Math.round((i * span / count + time * drift * u) % span - MIST_PADDING * u + shift);
        const w = Math.max(1, Math.round(wisp.width * u));
        if (x + w < 0 || x >= this.w) continue;
        const y = this.top + Math.round((depth + (i % 3) * 3 + Math.sin(time * 0.32 + i)) * u);
        ctx.globalAlpha = alpha * strength * strengthAtDepth * (0.8 + 0.2 * Math.sin(time * 0.21 + i));
        ctx.drawImage(wisp, x, y - dot, w, spriteHeight);
      }
    }
    ctx.restore();
  }
}
