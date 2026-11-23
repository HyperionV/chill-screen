import { mix, type RGB } from '../../../../render/color';
import { ditherIndex, PixelGrid, type Sprite } from '../sprites-base';

/** The colours of the disc, lensed light, and shadow. */
export interface BlackHoleLook {
  disc: RGB;
  discHot: RGB;
  arc: RGB;
  photon: RGB;
  glow: RGB;
  shadow: RGB;
  lightGain?: number;
  discWidthScale?: number;
}

const TURN = Math.PI * 2;
const HALF_TURN = Math.PI;
const OPAQUE = 255;
const PALETTE_STEPS = 8;

// All distances except the photon line are relative to the shadow radius.
const DISC_REACH = 3.8;
const DISC_TILT = -Math.PI / 18;
const DISC_HALF_THICKNESS = 0.12;
const DISC_EDGE_SPREAD = 0.1;
const DISC_EDGE_FADE = 0.38;
const DISC_SHOULDER = 0.85;
const ARC_GAP = 0.045;
const ARC_WIDTH = 0.58;
const ARC_INNER_CREST = 0.22;
const ARC_END_FADE = 0.32;
const INNER_GLOW_DEPTH = 0.14;
const PHOTON_MIN_ALPHA = 0.54;
const LOWER_ARC_LIGHT = 0.58;
const RECEDING_LIGHT = 0.66;
const HALO_REACH = 4.3;
const HALO_RISE = 2.15;
const HALO_DISC_HEIGHT = 0.49;
const INNER_GLOW_LIGHT = 0.24;
const HALO_ALPHA = 0.3;
const HALO_DISC_PEAK = 0.22;

// Bands are fine across the flow and long in the direction the light travels.
const ARC_FIBERS = 39;
const ARC_FINE_FIBERS = 81;
const ARC_FIBER_CURVE = 2.4;
const ARC_MIN_TEXTURE = 0.55;
const ARC_TEXTURE_RANGE = 0.45;
const ARC_DARK_LANE = 0.67;
const ARC_LANE_WIDTH = 0.065;
const DISC_FIBERS = 128;
const DISC_FIBER_CURVE = 2.1;
const DISC_TEXTURE_MIN = 0.47;
const DISC_TEXTURE_RANGE = 0.53;
const DISC_CORE_SHARPNESS = 9;
const DISC_CORE_LIGHT = 0.65;
const DISC_HOT_SPAN = 1.55;
const DISC_HOT_BIAS = 0.22;
const DISC_BAND_LIGHT = 0.66;
const DISC_TAIL_LIGHT = 0.36;
const DISC_TAIL_FADE = 1.45;
const ARC_END_LIGHT = 0.53;
const ARC_EDGE_FADE = 0.17;
const ARC_RISE = 0.13;
const ARC_CREST_LIGHT = 0.48;
const ARC_CREST_WIDTH = 0.37;
const DISC_WINS_AT = 0.28;

const SWIRL_FRAMES = 4;
const SWIRL_RATE = 2;
const SWIRL_ARC_FREQUENCY = 3;
const SWIRL_DISC_FREQUENCY = 2.7;
const SWIRL_ARC_FIBER = 27;
const SWIRL_DISC_FIBER = 62;
const SWIRL_CUTOFF = 0.56;
const SWIRL_ALPHA = 0.36;
const PULSE_SECONDS = 9;
const PULSE_LIGHT = 0.9;
const PULSE_AMPLITUDE = 0.08;

// The wave starts and ends beyond the lit portion of each semicircle.
const WAVE_FRAMES = 17;
const WAVE_HALF_WIDTH = 0.19;
const WAVE_START = -0.08;
const WAVE_ALPHA = 0.47;
const REFLECTION_HEIGHT = 0.72;
const REFLECTION_DEPTH_FADE = 0.42;
const FLARE_ALPHA = 0.42;

const CLOCK_LEFT = 0.26;
const CLOCK_RIGHT = 0.74;
const CLOCK_TOP = 0.3;
const CLOCK_BOTTOM = 0.56;
const RADIO_LEFT = 0.39;
const RADIO_RIGHT = 0.62;
const RADIO_TOP = 0.74;
const RADIO_BOTTOM = 0.97;
const TEXT_LEFT = 0.28;
const TEXT_RIGHT = 0.72;
const TITLE_TOP = 0.24;
const TITLE_BOTTOM = 0.28;
const STORY_TOP = 0.12;
const STORY_BOTTOM = 0.17;
const BOX_FEATHER_X = 0.045;
const BOX_FEATHER_Y = 0.035;
const CLOCK_DIM = 0.87;
const RADIO_DIM = 0.8;
const TEXT_DIM = 0.64;
const MASK_COLOR: RGB = [0, 0, 0];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const hum = (angle: number): number => (1 + Math.cos(angle)) / 2;
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (1 + 2 * (1 - t));
};

function boxWeight(u: number, v: number, left: number, right: number, top: number, bottom: number): number {
  const x = Math.min(u - left, right - u) / BOX_FEATHER_X;
  const y = Math.min(v - top, bottom - v) / BOX_FEATHER_Y;
  return smooth(1 + Math.min(x, y));
}

export function foregroundCover(u: number, v: number): number {
  return Math.max(
    CLOCK_DIM * boxWeight(u, v, CLOCK_LEFT, CLOCK_RIGHT, CLOCK_TOP, CLOCK_BOTTOM),
    RADIO_DIM * boxWeight(u, v, RADIO_LEFT, RADIO_RIGHT, RADIO_TOP, RADIO_BOTTOM),
    TEXT_DIM * boxWeight(u, v, TEXT_LEFT, TEXT_RIGHT, TITLE_TOP, TITLE_BOTTOM),
    TEXT_DIM * boxWeight(u, v, TEXT_LEFT, TEXT_RIGHT, STORY_TOP, STORY_BOTTOM),
  );
}

/** An erase mask for the light under the clock, radio, and chapter text. */
export function buildForegroundMask(w: number, h: number): Sprite {
  const pixels = new PixelGrid(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cover = foregroundCover(x / w, y / h);
      if (cover > 0) pixels.set(x, y, MASK_COLOR, Math.round(cover * OPAQUE));
    }
  }
  return pixels.toSprite();
}

function paint(grid: PixelGrid, x: number, y: number, color: RGB, light: number): void {
  const step = ditherIndex(x, y, light, PALETTE_STEPS);
  if (step > 0) grid.set(x, y, color, Math.round(step * OPAQUE / (PALETTE_STEPS - 1)));
}

function colors(low: RGB, high: RGB): RGB[] {
  return Array.from({ length: PALETTE_STEPS }, (_, index) => mix(low, high, index / (PALETTE_STEPS - 1)));
}

function drawFramePair(ctx: CanvasRenderingContext2D, frames: readonly Sprite[], frame: number,
  x: number, y: number, alpha: number): void {
  const index = Math.floor(frame);
  const first = frames[index % frames.length];
  const next = frames[(index + 1) % frames.length];
  const blend = frame - index;
  if (first) {
    ctx.globalAlpha = alpha * (1 - blend);
    ctx.drawImage(first.canvas, x, y);
  }
  if (next && blend > 0) {
    ctx.globalAlpha = alpha * blend;
    ctx.drawImage(next.canvas, x, y);
  }
}

/** Draws a black hole with warm or cool lensed light. */
export class BlackHole {
  private readonly halfWidth: number;
  private readonly halfHeight: number;
  private readonly waveOffset: number;
  private readonly glow: Sprite;
  private readonly shadow: Sprite;
  private readonly light: Sprite;
  private readonly streaks: readonly Sprite[];
  private readonly wave: readonly Sprite[];
  private readonly reflection: Sprite;
  private readonly flare: Sprite;

  constructor(unit: number, shadowRadius: number, look: BlackHoleLook) {
    const radius = Math.max(1, Math.round(unit * shadowRadius));
    const lightGain = look.lightGain ?? 1;
    const discWidthScale = look.discWidthScale ?? 1;
    const halfW = Math.ceil(radius * HALO_REACH);
    const halfH = Math.ceil(radius * HALO_RISE);
    const waveOffset = Math.ceil(radius * (1 + ARC_GAP + ARC_WIDTH));
    const w = halfW + halfW + 1;
    const h = halfH + halfH + 1;
    const waveSize = waveOffset + waveOffset + 1;
    const glow = new PixelGrid(w, h);
    const shadow = new PixelGrid(w, h);
    const light = new PixelGrid(w, h);
    const streaks = Array.from({ length: SWIRL_FRAMES }, () => new PixelGrid(w, h));
    const wave = Array.from({ length: WAVE_FRAMES }, () => new PixelGrid(waveSize, waveSize));
    const reflection = new PixelGrid(w, halfH + 1);
    const flare = new PixelGrid(w, h);
    const arcColors = colors(look.arc, look.discHot);
    const discColors = colors(look.disc, look.discHot);
    const tailColors = colors(look.glow, look.disc);
    const innerColors = colors(look.shadow, look.photon);
    const sin = Math.sin(DISC_TILT);
    const cos = Math.cos(DISC_TILT);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - halfW) / radius;
        const dy = (y - halfH) / radius;
        const distance = Math.hypot(dx, dy);
        const along = dx * cos + dy * sin;
        const across = dy * cos - dx * sin;
        const ahead = smooth((1 - along) / 2);
        const beam = RECEDING_LIGHT + (1 - RECEDING_LIGHT) * ahead;
        const above = across < 0;

        const discHaze = clamp01(1 - Math.hypot(along / HALO_REACH, across / HALO_DISC_HEIGHT));
        const roundHaze = smooth(1 - distance / HALO_RISE);
        paint(glow, x, y, look.glow, HALO_ALPHA * roundHaze * beam + HALO_DISC_PEAK * discHaze * beam);

        if (distance < 1) {
          const inner = clamp01(1 - (1 - distance) / INNER_GLOW_DEPTH);
          const index = ditherIndex(x, y, inner * inner * INNER_GLOW_LIGHT * beam, PALETTE_STEPS);
          shadow.set(x, y, innerColors[index] ?? look.shadow);
        } else if (distance < 1 + 1 / radius) {
          const rimLight = clamp01(lightGain * (PHOTON_MIN_ALPHA + (1 - PHOTON_MIN_ALPHA) * ahead));
          shadow.set(x, y, look.photon, Math.round(rimLight * OPAQUE));
          if (above && y <= halfH) {
            paint(reflection, x, halfH - y, look.photon, rimLight);
          }
        }

        let arcLight = 0;
        const band = (distance - 1 - ARC_GAP) / ARC_WIDTH;
        const angle = Math.atan2(across, along);
        const arcTravel = Math.abs(angle) / HALF_TURN;
        if (band > 0 && band < 1) {
          const ends = Math.min(arcTravel, 1 - arcTravel);
          const endFade = smooth(ends / ARC_END_FADE);
          const rim = smooth(band / ARC_RISE) * smooth((1 - band) / ARC_EDGE_FADE);
          const crest = clamp01(1 - Math.abs(band - ARC_INNER_CREST) / ARC_CREST_WIDTH);
          const fiber = hum(band * ARC_FIBERS + Math.sin(angle) * ARC_FIBER_CURVE)
            * hum(band * ARC_FINE_FIBERS - Math.cos(angle));
          const lane = smooth(Math.abs(band - ARC_DARK_LANE) / ARC_LANE_WIDTH);
          const texture = ARC_MIN_TEXTURE + ARC_TEXTURE_RANGE * fiber;
          const arch = ARC_END_LIGHT + (1 - ARC_END_LIGHT) * endFade;
          arcLight = lightGain * rim * arch * smooth(ends / ARC_RISE) * beam * (above ? 1 : LOWER_ARC_LIGHT)
            * lane * (texture * (1 - ARC_CREST_LIGHT) + ARC_CREST_LIGHT * crest);
          const color = arcColors[ditherIndex(x, y, lightGain * crest * texture * beam, PALETTE_STEPS)] ?? look.arc;
          paint(light, x, y, color, arcLight);
          if (above && y <= halfH) {
            const fade = 1 - REFLECTION_DEPTH_FADE * Math.abs(dy) / HALO_RISE;
            paint(reflection, x, halfH - y, color, arcLight * fade);
          }
          wave.forEach((frame, index) => {
            const span = 1 + WAVE_HALF_WIDTH - WAVE_START;
            const center = WAVE_START + span * index / (WAVE_FRAMES - 1);
            const front = smooth(1 - Math.abs(arcTravel - center) / WAVE_HALF_WIDTH);
            paint(frame, x - halfW + waveOffset, y - halfH + waveOffset, look.photon, front * arcLight);
          });
        }

        let discLight = 0;
        const length = Math.abs(along);
        const discAcross = across / discWidthScale;
        const thickness = DISC_HALF_THICKNESS + DISC_EDGE_SPREAD * smooth((length - DISC_SHOULDER) / DISC_REACH);
        const edge = clamp01(1 - Math.abs(discAcross) / thickness);
        if (edge > 0 && length < DISC_REACH) {
          const tail = smooth((DISC_REACH - length) / DISC_TAIL_FADE);
          const core = Math.exp(-Math.abs(discAcross) * DISC_CORE_SHARPNESS);
          const fiber = hum(discAcross * DISC_FIBERS + Math.sin(along * DISC_FIBER_CURVE));
          const texture = DISC_TEXTURE_MIN + DISC_TEXTURE_RANGE * fiber;
          const hot = clamp01(1 - Math.abs(length - DISC_SHOULDER) / DISC_HOT_SPAN) * beam * lightGain;
          discLight = lightGain * tail * beam * smooth(edge / DISC_EDGE_FADE)
            * (DISC_CORE_LIGHT * core + DISC_BAND_LIGHT * edge * texture);
          const color = tail < 1
            ? tailColors[ditherIndex(x, y, tail, PALETTE_STEPS)] ?? look.disc
            : discColors[ditherIndex(x, y, hot * (DISC_HOT_BIAS + core), PALETTE_STEPS)] ?? look.disc;
          if (discLight >= arcLight || discLight > DISC_WINS_AT) paint(light, x, y, color, discLight);
          paint(flare, x, y, look.discHot, discLight * (1 - DISC_TAIL_LIGHT + DISC_TAIL_LIGHT * hot));
        }

        if (arcLight > 0 || discLight > 0) {
          streaks.forEach((frame, index) => {
            const phase = TURN * index / SWIRL_FRAMES;
            const flow = discLight >= arcLight
              ? along * SWIRL_DISC_FREQUENCY - discAcross * SWIRL_DISC_FIBER
              : angle * SWIRL_ARC_FREQUENCY - band * SWIRL_ARC_FIBER;
            const glint = smooth((hum(flow - phase) - SWIRL_CUTOFF) / (1 - SWIRL_CUTOFF));
            paint(frame, x, y, look.discHot, Math.max(discLight, arcLight) * glint);
          });
        }
      }
    }

    this.halfWidth = halfW;
    this.halfHeight = halfH;
    this.waveOffset = waveOffset;
    this.glow = glow.toSprite();
    this.shadow = shadow.toSprite();
    this.light = light.toSprite();
    this.streaks = streaks.map(grid => grid.toSprite());
    this.wave = wave.map(grid => grid.toSprite());
    this.reflection = reflection.toSprite();
    this.flare = flare.toSprite();
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, alpha: number): void {
    const x = Math.round(cx) - this.halfWidth;
    const y = Math.round(cy) - this.halfHeight;
    const pulse = PULSE_LIGHT + PULSE_AMPLITUDE * Math.sin(TURN * time / PULSE_SECONDS);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha * pulse;
    ctx.drawImage(this.glow.canvas, x, y);
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.shadow.canvas, x, y);
    ctx.globalAlpha = alpha * pulse;
    ctx.drawImage(this.light.canvas, x, y);
    drawFramePair(ctx, this.streaks, time * SWIRL_RATE, x, y, alpha * pulse * SWIRL_ALPHA);
    ctx.restore();
  }

  drawFlare(ctx: CanvasRenderingContext2D, cx: number, cy: number, alpha: number): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * FLARE_ALPHA;
    ctx.drawImage(this.flare.canvas, Math.round(cx) - this.halfWidth, Math.round(cy) - this.halfHeight);
    ctx.restore();
  }

  drawWave(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number, alpha: number): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'lighter';
    drawFramePair(ctx, this.wave, clamp01(progress) * (WAVE_FRAMES - 1),
      Math.round(cx) - this.waveOffset, Math.round(cy) - this.waveOffset, alpha * WAVE_ALPHA);
    ctx.restore();
  }

  drawReflection(ctx: CanvasRenderingContext2D, cx: number, top: number, alpha: number): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.reflection.canvas, Math.round(cx) - this.halfWidth, Math.round(top),
      this.reflection.w, Math.max(1, Math.round(this.reflection.h * REFLECTION_HEIGHT)));
    ctx.restore();
  }
}
