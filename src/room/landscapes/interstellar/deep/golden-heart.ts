import { mix, type RGB } from '../../../../render/color';
import { memoryCanvas } from '../../../../render/pixel-stage';
import { clamp, lerp, seededRandom } from '../../../../world/math';
import { ditherIndex, hash2, PixelGrid, type Sprite } from '../sprites-base';
import type { DeepRenderContext, DeepScene } from './deep-scene';
import { SpiralGalaxy, type GalaxyLook, type GalaxyPose } from './galaxy';
import { Shuttle } from './station';

const PIXEL = 1;
const DIAMETER = 2;
const TURN = Math.PI * DIAMETER;
const BYTE_ALPHA = 255;

// The bright bulge sits low and left, with the outer arms spilling beyond the frame.
const CORE_U = 0.40;
const CORE_V = 0.62;
const RADIUS_SHARE = 0.95;
const TILT = -0.45;
const SQUASH = 0.60;
const SPIN_SECONDS = 360;
const FRONT_SEED = 909;
const BACK_SEED = 943;
const BACK_SCALE = 1.16;
const BACK_ALPHA = 0.29;
const BACK_SLIDE = 0.40;
const BACK_SPIN_OFFSET = 0.28;
const BACK_SPIN_SECONDS = 392;
const LOOK: GalaxyLook = {
  core: [181, 112, 61],
  arm: [224, 156, 103],
  dust: [53, 28, 24],
  knotBlue: [145, 200, 255],
  knotPink: [250, 120, 174],
  halo: [134, 75, 42],
};
const BULGE_RADIUS_V = 0.16;
const BULGE_GOLD: RGB = [255, 240, 189];
const BULGE_AMBER: RGB = [204, 115, 47];
const BULGE_TONES = 18;
const BULGE_ALPHA_LEVELS = 32;
const BULGE_FALLOFF = 1.35;

// Follow the spiral sprite's two main arms with separate dust and blue-white stars.
const ARM_WINDING = 1.8;
const ARM_ORIGIN = 0.12;
const ARM_ACCENT_INNER = 0.17;
const ARM_ACCENT_OUTER = 0.84;
const ARM_ACCENT_TAPER = 0.12;
const ARM_DUST_OFFSET = 0.22;
const ARM_DUST_WAVE = 0.052;
const ARM_DUST_RATE = 36;
const ARM_DUST_WIDTH = 0.15;
const ARM_DUST_GRAIN = 5;
const ARM_DUST_MIN_ALPHA = 0.31;
const ARM_DUST_MAX_ALPHA = 0.71;
const ARM_DUST_TONES: readonly RGB[] = [[50, 29, 28], [83, 43, 33], [125, 64, 39]];
const ARM_STAR_WIDTH = 0.22;
const ARM_STAR_DENSITY = 0.11;
const ARM_STAR_ALPHA = 0.73;
const ARM_STAR_TONES: readonly RGB[] = [[149, 190, 239], [185, 216, 250], [224, 239, 255]];

// The soft edge keeps the clock shadow from looking like a panel.
const VEIL_COLOR: RGB = [17, 9, 13];
const VEIL_U = 0.50;
const VEIL_V = 0.43;
const VEIL_RADIUS_U = 0.44;
const VEIL_RADIUS_V = 0.25;
const VEIL_INNER = 0.64;
const VEIL_ALPHA = 0.40;
const VEIL_LEVELS = 8;

// These little clusters orbit in the face of the foreground spiral.
const KNOT_SITES = [
  { radius: 0.23, offset: 0.09, pink: true },
  { radius: 0.25, offset: Math.PI - 0.08, pink: false },
  { radius: 0.31, offset: -0.11, pink: false },
  { radius: 0.32, offset: Math.PI + 0.05, pink: true },
  { radius: 0.40, offset: 0.13, pink: true },
  { radius: 0.43, offset: Math.PI - 0.09, pink: false },
  { radius: 0.49, offset: -0.07, pink: false },
  { radius: 0.51, offset: Math.PI + 0.11, pink: true },
  { radius: 0.60, offset: 0.09, pink: true },
  { radius: 0.64, offset: Math.PI + 0.06, pink: false },
];
const KNOT_BLUE_LIGHT: RGB = [240, 249, 255];
const KNOT_PINK_LIGHT: RGB = [255, 220, 235];
const KNOT_BLUE_RING = '#aedafd';
const KNOT_PINK_RING = '#ffc2d8';
const KNOT_RADIUS = 11;
const KNOT_HIT_RADIUS = 11;
const KNOT_MIN_HIT_PIXELS = 4;
const KNOT_DITHER_LEVELS = 2;
const KNOT_FLATTEN = 1.45;
const KNOT_GRAIN_THRESHOLD = 0.83;
const KNOT_GLOW_ALPHA = 0.64;
const KNOT_GRAIN_ALPHA = 0.93;
const KNOT_GRAIN_FLOOR = 0.34;
const KNOT_MIN_SECONDS = 4;
const KNOT_MAX_SECONDS = 7;
const KNOT_DIM = 0.59;
const KNOT_BRIGHT = 1;
const KNOT_RING_SECONDS = 2.4;
const KNOT_RING_TRAVEL = 34;
const KNOT_RING_ALPHA = 0.65;

// A core click rolls a wide glow all the way to the farthest corner.
const CORE_HIT_SHARE = 0.83;
const CORE_PULSE_SECONDS = 7;
const CORE_RING_COLOR = '#ffc786';
const CORE_RING_START = 0.46;
const CORE_RING_HALO = 9;
const CORE_RING_EDGE = 2;
const CORE_HALO_ALPHA = 0.12;
const CORE_EDGE_ALPHA = 0.31;
const RING_FADE_IN = 0.12;

// Sparse foreground lights leave most of the fine detail to the galaxy.
const FOREGROUND_SEED = 981;
const SPARKLE_ROWS = 6;
const SPARKLE_COLUMNS = 2;
const SPARKLE_OUTER_U = 0.058;
const SPARKLE_INNER_U = 0.245;
const SPARKLE_TOP_V = 0.12;
const SPARKLE_BOTTOM_V = 0.91;
const SPARKLE_JITTER_INSET = 0.15;
const SPARKLE_SLIDE_LIMIT = 0.04;
const SPARKLE_MIN_SECONDS = 5;
const SPARKLE_MAX_SECONDS = 11;
const SPARKLE_DIM = 0.42;
const SPARKLE_BRIGHT = 0.98;
const SPARKLE_CROSS_ALPHA = 0.57;
const SPARKLE_CROSS_PIXELS = PIXEL * DIAMETER + PIXEL;
const SPARKLE_COLOR = '#eef6ff';
const DUST_COUNT = 26;
const DUST_COLOR = '#e5aa71';
const DUST_DIM = 0.13;
const DUST_BRIGHT = 0.38;
const DUST_MIN_DRIFT = 0.004;
const DUST_MAX_DRIFT = 0.012;
const DUST_RISE = 0.07;
const DUST_SWAY_SECONDS = 19;
const DUST_SWAY = 0.012;
const DUST_MARGIN = 0.04;
const DUST_WRAP = 1 + DIAMETER * DUST_MARGIN;

// Keep the ship low and left as it recedes, and light the edge facing the bulge.
const SHIP_SECONDS = 80;
const SHIP_U = 0.12;
const SHIP_V = 0.74;
const SHIP_BOW = 0.022;
const SHIP_START_SCALE = 2;
const SHIP_MIN_SCALE = 0.28;
const SHIP_FADE_IN = 0.045;
const SHIP_FADE_OUT = 0.25;
const SHIP_TRAVEL_CURVE = 3;
const SHIP_TILE_HALF = 17;
const SHIP_DARK_EDGE = '#252a3a';
const SHIP_RIM = '#ffc385';

interface Knot {
  radius: number;
  angle: number;
  pink: boolean;
  phase: number;
  period: number;
  sprite: Sprite;
  x: number;
  y: number;
  visible: boolean;
  flareAge: number;
}

interface Layout {
  w: number;
  h: number;
  unit: number;
  coreHitRadius: number;
  x: number;
  y: number;
  front: SpiralGalaxy;
  back: SpiralGalaxy;
  arms: Sprite;
  bulge: Sprite;
  knots: Knot[];
  veil: Sprite;
  veilX: number;
  veilY: number;
  shuttle: Shuttle;
  shipTile: ReturnType<typeof memoryCanvas>;
  shipMask: ReturnType<typeof memoryCanvas>;
}

function armAngle(distance: number): number {
  return ARM_WINDING * Math.log(distance / ARM_ORIGIN);
}

function buildArmAccents(radius: number): Sprite {
  const reach = Math.ceil(radius * ARM_ACCENT_OUTER);
  const size = reach * DIAMETER + PIXEL;
  const grid = new PixelGrid(size, size);
  for (let y = -reach; y <= reach; y++) {
    for (let x = -reach; x <= reach; x++) {
      const distance = Math.hypot(x, y) / radius;
      if (distance <= ARM_ACCENT_INNER || distance >= ARM_ACCENT_OUTER) continue;
      const taper = Math.min(1, (distance - ARM_ACCENT_INNER) / ARM_ACCENT_TAPER,
        (ARM_ACCENT_OUTER - distance) / ARM_ACCENT_TAPER);
      const phase = Math.atan2(y, x) - armAngle(distance);
      const offset = Math.abs(phase - Math.round(phase / Math.PI) * Math.PI);
      const lane = ARM_DUST_OFFSET + Math.sin(distance * ARM_DUST_RATE) * ARM_DUST_WAVE;
      const dust = 1 - Math.abs(offset - lane) / ARM_DUST_WIDTH;
      if (dust > 0) {
        const grain = hash2(Math.floor(x / ARM_DUST_GRAIN), Math.floor(y / ARM_DUST_GRAIN), FRONT_SEED);
        const tone = ditherIndex(x, y, grain, ARM_DUST_TONES.length);
        const alpha = dust * dust * taper * lerp(ARM_DUST_MIN_ALPHA, ARM_DUST_MAX_ALPHA, grain);
        grid.set(x + reach, y + reach, ARM_DUST_TONES[tone], Math.round(BYTE_ALPHA * alpha));
      } else if (offset < ARM_STAR_WIDTH) {
        const density = ARM_STAR_DENSITY * taper * (1 - offset / ARM_STAR_WIDTH);
        const grain = hash2(x, y, BACK_SEED);
        if (grain < density) {
          const tone = ditherIndex(x, y, grain / density, ARM_STAR_TONES.length);
          grid.set(x + reach, y + reach, ARM_STAR_TONES[tone], Math.round(BYTE_ALPHA * taper * ARM_STAR_ALPHA));
        }
      }
    }
  }
  return grid.toSprite();
}

function buildBulge(h: number): Sprite {
  const radius = Math.max(PIXEL, Math.round(h * BULGE_RADIUS_V));
  const size = radius * DIAMETER + PIXEL;
  const grid = new PixelGrid(size, size);
  const lastTone = BULGE_TONES - PIXEL;
  const lastAlpha = BULGE_ALPHA_LEVELS - PIXEL;
  const tones = Array.from({ length: BULGE_TONES }, (_, i) => mix(BULGE_AMBER, BULGE_GOLD, i / lastTone));
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const fade = 1 - Math.hypot(x, y) / radius;
      if (fade <= 0) continue;
      const coverage = ditherIndex(x + PIXEL, y, fade ** BULGE_FALLOFF, BULGE_ALPHA_LEVELS);
      const tone = ditherIndex(x, y, fade, BULGE_TONES);
      grid.set(x + radius, y + radius, tones[tone], Math.round(BYTE_ALPHA * coverage / lastAlpha));
    }
  }
  return grid.toSprite();
}

function buildVeil(w: number, h: number): Sprite {
  const rx = Math.max(PIXEL, Math.round(w * VEIL_RADIUS_U));
  const ry = Math.max(PIXEL, Math.round(h * VEIL_RADIUS_V));
  const grid = new PixelGrid(rx * DIAMETER + PIXEL, ry * DIAMETER + PIXEL);
  const lastLevel = VEIL_LEVELS - PIXEL;
  for (let y = 0; y < grid.h; y++) {
    const dy = (y - ry) / ry;
    for (let x = 0; x < grid.w; x++) {
      const dx = (x - rx) / rx;
      const fade = clamp((1 - Math.hypot(dx, dy)) / (1 - VEIL_INNER), 0, 1);
      const level = ditherIndex(x, y, fade * fade, VEIL_LEVELS);
      if (level > 0) grid.set(x, y, VEIL_COLOR, Math.round(BYTE_ALPHA * level / lastLevel));
    }
  }
  return grid.toSprite();
}

function buildKnot(unit: number, pink: boolean, seed: number): Sprite {
  const radius = Math.max(PIXEL, Math.round(unit * KNOT_RADIUS));
  const size = radius * DIAMETER + PIXEL;
  const grid = new PixelGrid(size, size);
  const glow = pink ? LOOK.knotPink : LOOK.knotBlue;
  const light = pink ? KNOT_PINK_LIGHT : KNOT_BLUE_LIGHT;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      const fade = 1 - Math.hypot(x, y * KNOT_FLATTEN) / radius;
      if (fade <= 0) continue;
      const px = x + radius;
      const py = y + radius;
      if (hash2(x, y, seed) > KNOT_GRAIN_THRESHOLD) {
        const alpha = lerp(KNOT_GRAIN_FLOOR, KNOT_GRAIN_ALPHA, fade);
        grid.set(px, py, light, Math.round(BYTE_ALPHA * alpha));
      } else if (ditherIndex(px, py, fade, KNOT_DITHER_LEVELS) > 0) {
        grid.set(px, py, glow, Math.round(BYTE_ALPHA * KNOT_GLOW_ALPHA * fade));
      }
    }
  }
  grid.fillRect(radius - PIXEL, radius, SPARKLE_CROSS_PIXELS, PIXEL, light);
  grid.fillRect(radius, radius - PIXEL, PIXEL, SPARKLE_CROSS_PIXELS, light);
  return grid.toSprite();
}

function cycleLight(time: number, period: number, phase: number): number {
  return (1 + Math.cos(time / period * TURN + phase)) / DIAMETER;
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, alpha: number): void {
  ctx.globalAlpha = alpha * SPARKLE_CROSS_ALPHA;
  ctx.fillRect(x - PIXEL, y, SPARKLE_CROSS_PIXELS, PIXEL);
  ctx.fillRect(x, y - PIXEL, PIXEL, SPARKLE_CROSS_PIXELS);
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, PIXEL, PIXEL);
}

/** Paints the visible rows of a ring with square pixels, including when its centre is offscreen. */
function drawRing(
  ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number,
  radius: number, halfWidth: number,
): void {
  const outer = radius + halfWidth;
  const inner = Math.max(0, radius - halfWidth);
  const outerSquared = outer * outer;
  const innerSquared = inner * inner;
  const start = Math.max(0, Math.ceil(cy - outer));
  const end = Math.min(h - PIXEL, Math.floor(cy + outer));
  for (let y = start; y <= end; y++) {
    const dy = y - cy;
    const dySquared = dy * dy;
    const reach = Math.floor(Math.sqrt(Math.max(0, outerSquared - dySquared)));
    const left = Math.max(0, cx - reach);
    const right = Math.min(w - PIXEL, cx + reach);
    if (right < left) continue;
    if (dySquared >= innerSquared) {
      ctx.fillRect(left, y, right - left + PIXEL, PIXEL);
      continue;
    }
    const gap = Math.ceil(Math.sqrt(innerSquared - dySquared));
    const leftEnd = Math.min(right, cx - gap);
    const rightStart = Math.max(left, cx + gap);
    if (leftEnd >= left) ctx.fillRect(left, y, leftEnd - left + PIXEL, PIXEL);
    if (rightStart <= right) ctx.fillRect(rightStart, y, right - rightStart + PIXEL, PIXEL);
  }
}

function tintShipMask(mask: ReturnType<typeof memoryCanvas>, hull: HTMLCanvasElement, color: string): void {
  const { ctx, canvas } = mask;
  ctx.globalCompositeOperation = 'copy';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(hull, 0, 0);
}

function drawShuttle(
  ctx: CanvasRenderingContext2D, layout: Layout, cx: number, cy: number, slide: number, time: number, alpha: number,
): void {
  const phase = time / SHIP_SECONDS;
  const opacity = Math.min(1, phase / SHIP_FADE_IN, (1 - phase) / SHIP_FADE_OUT);
  if (opacity <= 0) return;
  const travel = phase * phase * (SHIP_TRAVEL_CURVE - DIAMETER * phase);
  const startX = layout.w * SHIP_U + slide;
  const startY = layout.h * SHIP_V;
  const bow = layout.h * SHIP_BOW;
  const x = lerp(startX, cx, travel);
  const y = lerp(startY, cy, travel) + Math.sin(travel * Math.PI) * bow;
  const heading = Math.atan2(cy - startY + Math.cos(travel * Math.PI) * Math.PI * bow, cx - startX);

  const tile = layout.shipTile;
  const half = Math.floor(tile.canvas.width / DIAMETER);
  tile.ctx.save();
  tile.ctx.globalCompositeOperation = 'source-over';
  tile.ctx.globalAlpha = 1;
  tile.ctx.clearRect(0, 0, tile.canvas.width, tile.canvas.height);
  tile.ctx.imageSmoothingEnabled = false;
  layout.shuttle.draw(tile.ctx, half, half, heading, time, 1);
  tile.ctx.restore();

  const size = Math.max(PIXEL, Math.round(tile.canvas.width * lerp(SHIP_START_SCALE, SHIP_MIN_SCALE, travel)));
  const left = Math.round(x - size / DIAMETER);
  const top = Math.round(y - size / DIAMETER);
  const lightX = Math.sign(cx - x) * PIXEL;
  const lightY = Math.sign(cy - y) * PIXEL;
  const mask = layout.shipMask;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha * opacity;
  tintShipMask(mask, tile.canvas, SHIP_DARK_EDGE);
  ctx.drawImage(mask.canvas, left - lightX, top - lightY, size, size);
  tintShipMask(mask, tile.canvas, SHIP_RIM);
  ctx.drawImage(mask.canvas, left + lightX, top + lightY, size, size);
  ctx.drawImage(tile.canvas, left, top, size, size);
  ctx.restore();
}

/** Builds the Golden Heart chapter, a close view of a galaxy's amber core. */
export function createGoldenHeart(): DeepScene {
  const random = seededRandom(FOREGROUND_SEED);
  const jitter = () => lerp(SPARKLE_JITTER_INSET, 1 - SPARKLE_JITTER_INSET, random());
  const sparkles = Array.from({ length: SPARKLE_ROWS * SPARKLE_COLUMNS }, (_, i) => {
    const column = i % SPARKLE_COLUMNS;
    const row = Math.floor(i / SPARKLE_COLUMNS);
    return {
      left: lerp(SPARKLE_OUTER_U, SPARKLE_INNER_U, (column + jitter()) / SPARKLE_COLUMNS),
      right: 1 - lerp(SPARKLE_OUTER_U, SPARKLE_INNER_U, (column + jitter()) / SPARKLE_COLUMNS),
      leftV: lerp(SPARKLE_TOP_V, SPARKLE_BOTTOM_V, (row + jitter()) / SPARKLE_ROWS),
      rightV: lerp(SPARKLE_TOP_V, SPARKLE_BOTTOM_V, (row + jitter()) / SPARKLE_ROWS),
      phase: random() * TURN,
      period: lerp(SPARKLE_MIN_SECONDS, SPARKLE_MAX_SECONDS, random()),
    };
  });
  const motes = Array.from({ length: DUST_COUNT }, () => ({
    u: random() * DUST_WRAP, v: random() * DUST_WRAP, phase: random() * TURN,
    drift: lerp(DUST_MIN_DRIFT, DUST_MAX_DRIFT, random()),
    alpha: lerp(DUST_DIM, DUST_BRIGHT, random()),
  }));
  const frontPose: GalaxyPose = { spin: 0, tilt: TILT, squash: SQUASH, alpha: 1 };
  const backPose: GalaxyPose = { spin: BACK_SPIN_OFFSET, tilt: TILT, squash: SQUASH, alpha: BACK_ALPHA };
  const cosTilt = Math.cos(TILT);
  const sinTilt = Math.sin(TILT);
  let layout: Layout | null = null;
  let elapsed = 0;
  let shipTime = 0;
  let previousProgress = 0;
  let corePulseAge = Infinity;
  let drawn = false;
  let coreX = 0;
  let coreY = 0;

  function drawKnots(ctx: CanvasRenderingContext2D, view: Layout, alpha: number): void {
    for (let i = 0; i < view.knots.length; i++) {
      const knot = view.knots[i];
      const theta = knot.angle + frontPose.spin;
      const dx = Math.cos(theta) * knot.radius;
      const dy = Math.sin(theta) * knot.radius * SQUASH;
      knot.x = Math.round(coreX + dx * cosTilt - dy * sinTilt);
      knot.y = Math.round(coreY + dx * sinTilt + dy * cosTilt);
      const half = Math.floor(knot.sprite.w / DIAMETER);
      const x = knot.x - half;
      const y = knot.y - half;
      knot.visible = x < view.w && x + knot.sprite.w > 0 && y < view.h && y + knot.sprite.h > 0;
      if (knot.visible) {
        const light = lerp(KNOT_DIM, KNOT_BRIGHT, cycleLight(elapsed, knot.period, knot.phase));
        const flare = 1 - clamp(knot.flareAge / KNOT_RING_SECONDS, 0, 1);
        ctx.globalAlpha = alpha * lerp(light, 1, flare);
        ctx.drawImage(knot.sprite.canvas, x, y);
        if (flare > 0) {
          ctx.fillStyle = knot.pink ? KNOT_PINK_RING : KNOT_BLUE_RING;
          ctx.globalAlpha = alpha * flare;
          ctx.fillRect(knot.x - PIXEL, knot.y, SPARKLE_CROSS_PIXELS, PIXEL);
          ctx.fillRect(knot.x, knot.y - PIXEL, PIXEL, SPARKLE_CROSS_PIXELS);
        }
      }
      if (knot.flareAge < KNOT_RING_SECONDS) {
        const age = knot.flareAge / KNOT_RING_SECONDS;
        ctx.fillStyle = knot.pink ? KNOT_PINK_RING : KNOT_BLUE_RING;
        ctx.globalAlpha = alpha * KNOT_RING_ALPHA * (1 - age);
        drawRing(ctx, view.w, view.h, knot.x, knot.y, half + age * KNOT_RING_TRAVEL * view.unit, PIXEL);
      }
    }
  }

  function drawCorePulse(ctx: CanvasRenderingContext2D, view: Layout, alpha: number): void {
    if (corePulseAge >= CORE_PULSE_SECONDS) return;
    const phase = corePulseAge / CORE_PULSE_SECONDS;
    const halo = Math.max(PIXEL, Math.round(CORE_RING_HALO * view.unit));
    const edge = Math.max(PIXEL, Math.round(CORE_RING_EDGE * view.unit));
    const farX = Math.max(coreX, view.w - coreX);
    const farY = Math.max(coreY, view.h - coreY);
    const radius = lerp(view.coreHitRadius * CORE_RING_START, Math.hypot(farX, farY) + halo, phase);
    const fade = Math.min(1, phase / RING_FADE_IN) * (1 - phase);
    ctx.fillStyle = CORE_RING_COLOR;
    ctx.globalAlpha = alpha * fade * CORE_HALO_ALPHA;
    drawRing(ctx, view.w, view.h, coreX, coreY, radius, halo);
    ctx.globalAlpha = alpha * fade * CORE_EDGE_ALPHA;
    drawRing(ctx, view.w, view.h, coreX, coreY, radius, edge);
  }

  function drawForeground(ctx: CanvasRenderingContext2D, rc: DeepRenderContext, slide: number): void {
    ctx.fillStyle = SPARKLE_COLOR;
    const limit = rc.w * SPARKLE_SLIDE_LIMIT;
    const sparkleSlide = clamp(slide, -limit, limit);
    for (let i = 0; i < sparkles.length; i++) {
      const pair = sparkles[i];
      const shine = cycleLight(elapsed, pair.period, pair.phase);
      // One star in each pair is always at least halfway to full brightness.
      drawSparkle(ctx, Math.round(pair.left * rc.w + sparkleSlide), Math.round(pair.leftV * rc.h),
        rc.alpha * lerp(SPARKLE_DIM, SPARKLE_BRIGHT, shine));
      drawSparkle(ctx, Math.round(pair.right * rc.w + sparkleSlide), Math.round(pair.rightV * rc.h),
        rc.alpha * lerp(SPARKLE_DIM, SPARKLE_BRIGHT, 1 - shine));
    }
    ctx.fillStyle = DUST_COLOR;
    for (let i = 0; i < motes.length; i++) {
      const mote = motes[i];
      const u = (mote.u + elapsed * mote.drift) % DUST_WRAP - DUST_MARGIN;
      const v = (mote.v + elapsed * mote.drift * DUST_RISE) % DUST_WRAP - DUST_MARGIN;
      const sway = Math.sin(elapsed / DUST_SWAY_SECONDS * TURN + mote.phase) * DUST_SWAY;
      const x = Math.round(u * rc.w + slide);
      const y = Math.round((v + sway) * rc.h);
      if (x < 0 || x >= rc.w || y < 0 || y >= rc.h) continue;
      ctx.globalAlpha = rc.alpha * mote.alpha;
      ctx.fillRect(x, y, PIXEL, PIXEL);
    }
  }

  return {
    resize(w, h, unit) {
      const radius = Math.max(PIXEL, Math.round(w * RADIUS_SHARE));
      const veil = buildVeil(w, h);
      const bulge = buildBulge(h);
      const knotRandom = seededRandom(FRONT_SEED);
      const knots: Knot[] = KNOT_SITES.map((site, i) => ({
        radius: site.radius * radius,
        angle: armAngle(site.radius) + site.offset,
        pink: site.pink,
        phase: knotRandom() * TURN,
        period: lerp(KNOT_MIN_SECONDS, KNOT_MAX_SECONDS, knotRandom()),
        sprite: buildKnot(unit, site.pink, FRONT_SEED + i),
        x: 0,
        y: 0,
        visible: false,
        flareAge: Infinity,
      }));
      const tileHalf = Math.max(PIXEL, Math.ceil(unit * SHIP_TILE_HALF));
      const tileSize = DIAMETER * tileHalf + PIXEL;
      layout = {
        w, h, unit, knots, veil, bulge,
        x: w * CORE_U,
        y: Math.round(h * CORE_V),
        coreHitRadius: Math.floor(bulge.w / DIAMETER) * CORE_HIT_SHARE,
        front: new SpiralGalaxy(unit, radius / unit, LOOK, FRONT_SEED),
        back: new SpiralGalaxy(unit, Math.round(radius * BACK_SCALE) / unit, LOOK, BACK_SEED),
        arms: buildArmAccents(radius),
        veilX: Math.round(w * VEIL_U - Math.floor(veil.w / DIAMETER)),
        veilY: Math.round(h * VEIL_V - Math.floor(veil.h / DIAMETER)),
        shuttle: new Shuttle(unit),
        shipTile: memoryCanvas(tileSize, tileSize),
        shipMask: memoryCanvas(tileSize, tileSize),
      };
      corePulseAge = Infinity;
      drawn = false;
    },
    update(dt, _time, progress) {
      elapsed += dt;
      if (progress < previousProgress) shipTime = 0;
      previousProgress = progress;
      shipTime = (shipTime + dt) % SHIP_SECONDS;
      corePulseAge += dt;
      if (!layout) return;
      for (let i = 0; i < layout.knots.length; i++) layout.knots[i].flareAge += dt;
    },
    draw(ctx, rc) {
      drawn = false;
      if (!layout || rc.alpha <= 0) return;
      const slide = rc.chapterSlide;
      coreX = Math.round(layout.x + slide);
      coreY = layout.y;
      drawn = true;
      frontPose.spin = (elapsed % SPIN_SECONDS) / SPIN_SECONDS * TURN;
      frontPose.alpha = rc.alpha;
      backPose.spin = (elapsed % BACK_SPIN_SECONDS) / BACK_SPIN_SECONDS * TURN + BACK_SPIN_OFFSET;
      backPose.alpha = rc.alpha * BACK_ALPHA;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      layout.back.draw(ctx, Math.round(layout.x + slide * BACK_SLIDE), coreY, backPose);
      layout.front.draw(ctx, coreX, coreY, frontPose);
      ctx.globalAlpha = rc.alpha;
      ctx.save();
      ctx.translate(coreX, coreY);
      ctx.rotate(TILT);
      ctx.scale(1, SQUASH);
      ctx.rotate(frontPose.spin);
      const armHalf = Math.floor(layout.arms.w / DIAMETER);
      ctx.drawImage(layout.arms.canvas, -armHalf, -armHalf);
      ctx.restore();
      const bulgeHalf = Math.floor(layout.bulge.w / DIAMETER);
      ctx.drawImage(layout.bulge.canvas, coreX - bulgeHalf, coreY - bulgeHalf);
      drawKnots(ctx, layout, rc.alpha);
      drawCorePulse(ctx, layout, rc.alpha);
      drawForeground(ctx, rc, slide);
      ctx.globalAlpha = rc.alpha * VEIL_ALPHA;
      ctx.drawImage(layout.veil.canvas, layout.veilX, layout.veilY);
      drawShuttle(ctx, layout, coreX, coreY, slide, shipTime, rc.alpha);
      ctx.restore();
    },
    press(x, y) {
      if (!drawn || !layout || x < 0 || x >= layout.w || y < 0 || y >= layout.h) return false;
      let hit: Knot | null = null;
      const hitRadius = Math.max(KNOT_MIN_HIT_PIXELS, Math.round(layout.unit * KNOT_HIT_RADIUS));
      let nearest = hitRadius * hitRadius;
      for (let i = 0; i < layout.knots.length; i++) {
        const knot = layout.knots[i];
        if (!knot.visible) continue;
        const dx = x - knot.x;
        const dy = y - knot.y;
        const distance = dx * dx + dy * dy;
        if (distance <= nearest) {
          nearest = distance;
          hit = knot;
        }
      }
      if (hit) {
        hit.flareAge = 0;
        return true;
      }
      if (Math.hypot(x - coreX, y - coreY) > layout.coreHitRadius) return false;
      corePulseAge = 0;
      return true;
    },
  };
}
