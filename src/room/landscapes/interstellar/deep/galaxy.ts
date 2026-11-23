import { css, mix, type RGB } from '../../../../render/color';
import { clamp, seededRandom } from '../../../../world/math';
import { ditherIndex, hash2, PixelGrid } from '../sprites-base';

/** The colours of a spiral galaxy's core, arms, dust, star knots, and halo. */
export interface GalaxyLook {
  core: RGB;
  arm: RGB;
  dust: RGB;
  knotBlue: RGB;
  knotPink: RGB;
  halo: RGB;
}

/** The orientation, shape, and opacity of a spiral galaxy as drawn. */
export interface GalaxyPose {
  /** Rotation of the arms in radians. */
  spin: number;
  /** Direction of the narrow axis in radians. */
  tilt: number;
  /** Ratio of the narrow axis to the wide axis, from 0.2 to 1. */
  squash: number;
  alpha: number;
}

const PIXEL = 1;
const TAU = Math.PI + Math.PI;
const MAIN_ARM_COUNT = 2;
const HALF_PI = Math.PI / MAIN_ARM_COUNT;
const ARM_PHASES = [0, Math.PI, HALF_PI, -HALF_PI];
// The inner arms are broad and warm, while the outer arcs narrow and turn blue.
const ARM_WINDING = 1.8;
const ARM_INNER = 0.12;
const ARM_OUTER = 0.9;
const FAINT_ARM_OUTER = 0.77;
const ARM_WIDTH_INNER = 0.43;
const ARM_WIDTH_OUTER = 0.18;
const ARM_WIDTH_FALLOFF = ARM_WIDTH_INNER - ARM_WIDTH_OUTER;
const ARM_HAZE = 0.58;
const FAINT_ARM_HAZE = 0.38;
const ARM_HAZE_WIDTH = 1.6;
const ARM_GRAIN = 0.32;
const CORE_RADIUS = 0.29;
const CORE_POWER = 2.4;
const CORE_WARMTH = 2.2;
const HALO_OPACITY = 0.21;
const HALO_POWER = 2;
const TONE_STEPS = 9;
const OPACITY_STEPS = 17;
const OPAQUE = 255;
// The dust follows the inward side of the two main arms and breaks into streaks.
const DUST_INNER = 0.13;
const DUST_OUTER = 0.85;
const DUST_FADE_WIDTH = 0.12;
const DUST_OFFSET = 0.2;
const DUST_WIDTH = 0.13;
const DUST_WAVE_DEPTH = 0.05;
const DUST_WAVE_RATE = 36;
const DUST_OPACITY = 0.8;
// The points scale with the sprite area and stay bounded even for a close-up.
const POINTS_PER_RADIUS_SQUARED = 0.35;
const MAIN_STAR_SHARE = 0.78;
const STAR_DENSITY_POWER = 1.46;
const STAR_MIN_OPACITY = 0.14;
const STAR_MAX_OPACITY = 0.78;
const FAINT_STAR_OPACITY = 0.52;
const STAR_WARM_LIMIT = 0.27;
const STAR_COOL_MIX = 0.62;
const GAUSSIAN_FACTOR = -2;
const MAX_KNOTS = 30;
const KNOT_POINT_SHARE = 0.15;
const KNOT_INNER = 0.23;
const KNOT_OUTER = 0.87;
const KNOT_BLUE_CHANCE = 0.64;
const JITTER_CENTER = 0.5;
const KNOT_SPREAD = 0.17;
const KNOT_GLINT_CHANCE = 0.27;
const KNOT_GLOW_OPACITY = 0.53;
const KNOT_MIN_OPACITY = 0.44;
const KNOT_CORE_OPACITY = 0.9;
const MIN_GLINT_RADIUS = 27;
const CROSS_SIZE = PIXEL + PIXEL + PIXEL;

function armAngle(distance: number): number {
  return ARM_WINDING * Math.log(Math.max(ARM_INNER, distance) / ARM_INNER);
}

function galaxyGlow(radius: number, look: GalaxyLook, seed: number): { glow: PixelGrid; dust: PixelGrid } {
  const size = radius + radius + PIXEL;
  const glow = new PixelGrid(size, size);
  const dust = new PixelGrid(size, size);
  const coreTones: RGB[] = [];
  const armTones: RGB[] = [];
  for (let tone = 0; tone < TONE_STEPS; tone++) {
    coreTones.push(mix(look.halo, look.core, tone / (TONE_STEPS - 1)));
    armTones.push(mix(look.halo, look.arm, tone / (TONE_STEPS - 1)));
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dy = y - radius;
      const distance = Math.hypot(dx, dy) / radius;
      if (distance >= 1) continue;

      const bulge = Math.max(0, 1 - distance / CORE_RADIUS) ** CORE_POWER;
      const halo = HALO_OPACITY * (1 - distance) ** HALO_POWER;
      const phase = Math.atan2(dy, dx) - armAngle(distance);
      const offset = phase - Math.round(phase / Math.PI) * Math.PI;
      const mainOffset = Math.abs(offset);
      const faintOffset = HALF_PI - mainOffset;
      const width = (ARM_WIDTH_INNER - ARM_WIDTH_FALLOFF * distance) * ARM_HAZE_WIDTH;
      const main = Math.max(0, 1 - mainOffset / width) * Math.max(0, 1 - distance / ARM_OUTER);
      const faint = Math.max(0, 1 - faintOffset / width) * Math.max(0, 1 - distance / FAINT_ARM_OUTER);
      const grain = 1 - ARM_GRAIN * hash2(x, y, seed);
      const arm = ARM_HAZE * (main + faint * FAINT_ARM_HAZE) * grain;
      const opacity = ditherIndex(x, y, bulge + halo + arm, OPACITY_STEPS) / (OPACITY_STEPS - 1);
      if (opacity > 0) {
        const warmth = ditherIndex(x, y, bulge * CORE_WARMTH, TONE_STEPS);
        const armTone = ditherIndex(x, y, arm, TONE_STEPS);
        glow.set(x, y, warmth > 0 ? coreTones[warmth] : armTones[armTone], opacity * OPAQUE);
      }

      if (distance < DUST_INNER || distance > DUST_OUTER) continue;
      const lane = DUST_OFFSET + DUST_WAVE_DEPTH * Math.sin(distance * DUST_WAVE_RATE);
      const edge = Math.max(0, 1 - Math.abs(offset - lane) / DUST_WIDTH);
      const taper = Math.min(1, (distance - DUST_INNER) / DUST_FADE_WIDTH, (DUST_OUTER - distance) / DUST_FADE_WIDTH);
      const shadow = ditherIndex(x, y, DUST_OPACITY * edge * taper * grain, OPACITY_STEPS) / (OPACITY_STEPS - 1);
      if (shadow > 0) dust.set(x, y, look.dust, shadow * OPAQUE);
    }
  }
  return { glow, dust };
}

function paintStars(ctx: CanvasRenderingContext2D, radius: number, look: GalaxyLook, random: () => number, count: number): void {
  const cool = mix(look.arm, look.knotBlue, STAR_COOL_MIX);
  const tones: string[] = [];
  for (let tone = 0; tone < TONE_STEPS; tone++) {
    const distance = tone / (TONE_STEPS - 1);
    tones.push(css(distance < STAR_WARM_LIMIT
      ? mix(look.core, look.arm, distance / STAR_WARM_LIMIT)
      : mix(look.arm, cool, (distance - STAR_WARM_LIMIT) / (1 - STAR_WARM_LIMIT))));
  }

  const mainCount = Math.round(count * MAIN_STAR_SHARE);
  for (let i = 0; i < count; i++) {
    const main = i < mainCount;
    const pair = i % MAIN_ARM_COUNT;
    const phase = ARM_PHASES[main ? pair : pair + MAIN_ARM_COUNT];
    const limit = main ? ARM_OUTER : FAINT_ARM_OUTER;
    const distance = ARM_INNER + (limit - ARM_INNER) * random() ** STAR_DENSITY_POWER;
    const spread = Math.sqrt(GAUSSIAN_FACTOR * Math.log(Math.max(Number.EPSILON, random()))) * Math.cos(TAU * random());
    const angle = armAngle(distance) + phase + spread * (ARM_WIDTH_INNER - ARM_WIDTH_FALLOFF * distance);
    const x = Math.round(radius + Math.cos(angle) * distance * radius);
    const y = Math.round(radius + Math.sin(angle) * distance * radius);
    const brightness = STAR_MIN_OPACITY + (STAR_MAX_OPACITY - STAR_MIN_OPACITY) * (1 - distance) * random();
    ctx.globalAlpha = brightness * (main ? 1 : FAINT_STAR_OPACITY);
    ctx.fillStyle = tones[Math.round(distance * (TONE_STEPS - 1))];
    ctx.fillRect(x, y, PIXEL, PIXEL);
  }
  ctx.globalAlpha = 1;
}

function paintKnots(ctx: CanvasRenderingContext2D, radius: number, look: GalaxyLook, random: () => number, count: number): void {
  const blue = css(look.knotBlue);
  const pink = css(look.knotPink);
  const center = css(look.core);
  for (let i = 0; i < count; i++) {
    const distance = KNOT_INNER + (KNOT_OUTER - KNOT_INNER) * (i + random()) / count;
    const jitter = (random() - JITTER_CENTER) * KNOT_SPREAD;
    const angle = armAngle(distance) + ARM_PHASES[i % MAIN_ARM_COUNT] + jitter;
    const x = Math.round(radius + Math.cos(angle) * distance * radius);
    const y = Math.round(radius + Math.sin(angle) * distance * radius);
    ctx.fillStyle = random() < KNOT_BLUE_CHANCE ? blue : pink;
    if (radius >= MIN_GLINT_RADIUS && random() < KNOT_GLINT_CHANCE) {
      ctx.globalAlpha = KNOT_GLOW_OPACITY * (1 - distance);
      ctx.fillRect(x - PIXEL, y, CROSS_SIZE, PIXEL);
      ctx.fillRect(x, y - PIXEL, PIXEL, CROSS_SIZE);
      ctx.fillStyle = center;
    }
    ctx.globalAlpha = KNOT_MIN_OPACITY + (KNOT_CORE_OPACITY - KNOT_MIN_OPACITY) * (1 - distance);
    ctx.fillRect(x, y, PIXEL, PIXEL);
  }
}

/** A pre-rendered spiral galaxy drawn with the given spin, tilt, and squash. */
export class SpiralGalaxy {
  private readonly picture: HTMLCanvasElement;
  private readonly pixelRadius: number;

  constructor(unit: number, radius: number, look: GalaxyLook, seed: number) {
    const pixelRadius = Math.max(PIXEL, Math.round(unit * radius));
    this.pixelRadius = pixelRadius;
    const { glow, dust } = galaxyGlow(pixelRadius, look, seed);
    this.picture = glow.toSprite().canvas;
    const ctx = this.picture.getContext('2d');
    if (!ctx) return;

    const random = seededRandom(seed);
    const budget = Math.floor(pixelRadius * pixelRadius * POINTS_PER_RADIUS_SQUARED);
    const knots = Math.min(MAX_KNOTS, Math.floor(budget * KNOT_POINT_SHARE));
    paintStars(ctx, pixelRadius, look, random, budget - knots);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(dust.toSprite().canvas, 0, 0);
    paintKnots(ctx, pixelRadius, look, random, knots);
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, pose: GalaxyPose): void {
    ctx.save();
    ctx.globalAlpha *= clamp(pose.alpha, 0, 1);
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.rotate(pose.tilt);
    ctx.scale(1, pose.squash);
    ctx.rotate(pose.spin);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.picture, -this.pixelRadius, -this.pixelRadius);
    ctx.restore();
  }
}
