import { css, type RGB } from '../../../../render/color';
import { lerp, seededRandom } from '../../../../world/math';
import { ramp } from '../../../journeys/noise';
import { ditherIndex, PixelGrid, type Sprite } from '../sprites-base';
import type { DeepRenderContext, DeepScene } from './deep-scene';
import { SpiralGalaxy, type GalaxyLook, type GalaxyPose } from './galaxy';
import { Shuttle, Station } from './station';

const DESIGN_HEIGHT = 270;
const HALF = 0.5;
const TURN = 2 * Math.PI;
const PIXEL = 1;
const FULL_ALPHA = 1;

// Leave a dark gap between the spirals even at the narrow end of the orbit.
const ORBIT_SECONDS = 240;
const ORBIT_CENTER_Y = 0.36;
const ORBIT_WIDTH = 0.28;
const ORBIT_MIN_WIDTH = 0.23;
const ORBIT_HEIGHT = 0.18;
const GALAXY_SLIDE = 0.5;
const STATION_SLIDE = 1;

const CLOCK_LEFT = 0.26;
const CLOCK_RIGHT = 0.74;
const CLOCK_TOP = 0.30;
const CLOCK_BOTTOM = 0.56;
const CLOCK_FADE_WIDTH = 0.075;
const CLOCK_DIMMING = 0.35;

const LARGE_LOOK: GalaxyLook = {
  core: [255, 224, 161],
  arm: [232, 205, 168],
  dust: [83, 48, 56],
  knotBlue: [167, 205, 255],
  knotPink: [248, 166, 175],
  halo: [137, 90, 66],
};
const SMALL_LOOK: GalaxyLook = {
  core: [255, 196, 120],
  arm: [168, 187, 230],
  dust: [63, 47, 77],
  knotBlue: [171, 218, 255],
  knotPink: [241, 158, 199],
  halo: [83, 88, 144],
};
const LARGE_GALAXY = { radius: 0.24, look: LARGE_LOOK, seed: 43, tilt: -0.14, squash: 0.85, spinRate: 0.019, spinStart: 0.7 };
const SMALL_GALAXY = { radius: 0.18, look: SMALL_LOOK, seed: 79, tilt: 0.4, squash: 0.55, spinRate: -0.027, spinStart: 2.2 };

// Both streams fade into the arms. Their spread and brightness peak in the middle.
const BRIDGE_STAR_COUNT = 70;
const BRIDGE_SEED = 527;
const BRIDGE_FLOW_SECONDS = 38;
const BRIDGE_ATTACH_RADIUS = 0.83;
const BRIDGE_BOW = 0.034;
const BRIDGE_SPREAD = 0.043;
const BRIDGE_LANE_OFFSET = 0.2;
const BRIDGE_CENTER_DENSITY = 0.4;
const CUBIC_RANGE = 4;
const BRIDGE_TWINKLE_RATE = 0.95;
const BRIDGE_STAR_ALPHA = 0.9;
const BRIDGE_MIN_TWINKLE = 0.67;
const BRIDGE_BRIGHT_EVERY = 5;
const BRIDGE_BRIGHT_LENGTH = 2;
const BRIDGE_HAZE_RADIUS = 0.047;
const BRIDGE_HAZE_STAMPS = 11;
const BRIDGE_HAZE_ALPHA = 0.146;
const GLOW_LEVELS = 7;
const BYTE_ALPHA = 255;
const BRIDGE_HAZE: RGB = [195, 141, 103];
const BRIDGE_GOLD = css([248, 203, 151]);
const BRIDGE_BLUE = css([175, 204, 251]);

// Scatter the glints around the border in the order they brighten.
const STAR_TURN_SECONDS = 3;
const STAR_COOL = css([203, 221, 255]);
const STAR_WARM = css([255, 226, 177]);
const STAR_WHITE = css([255, 247, 228]);
const STAR_BASE_ALPHA = 0.38;
const STAR_SPIKE_ALPHA = 0.27;
const STAR_INNER_ALPHA = 0.65;
const STAR_INNER_LENGTH = 0.44;
const STAR_HORIZONTAL_LENGTH = 0.72;
const STARS = [
  { x: 0.085, y: 0.24, length: 11, color: STAR_WARM },
  { x: 0.89, y: 0.68, length: 9, color: STAR_COOL },
  { x: 0.18, y: 0.60, length: 8, color: STAR_COOL },
  { x: 0.94, y: 0.15, length: 12, color: STAR_WARM },
  { x: 0.09, y: 0.92, length: 7, color: STAR_COOL },
  { x: 0.81, y: 0.31, length: 8, color: STAR_COOL },
  { x: 0.20, y: 0.095, length: 9, color: STAR_WARM },
  { x: 0.81, y: 0.895, length: 10, color: STAR_WARM },
  { x: 0.045, y: 0.48, length: 10, color: STAR_COOL },
  { x: 0.965, y: 0.49, length: 8, color: STAR_WARM },
];

const STATION_X = 0.14;
const STATION_Y = 0.74;
const STATION_RADIUS = DESIGN_HEIGHT * 0.05;
const STATION_ALPHA = 0.87;
const STATION_FLASH_SECONDS = 1.5;
const SHUTTLE_CYCLE_SECONDS = 70;
// Start with the ship just inside the window on its way to the Station.
const SHUTTLE_START_PHASE = 5;
const SHUTTLE_APPROACH_SECONDS = 30;
const SHUTTLE_DOCK_SECONDS = 8;
const SHUTTLE_DEPART_SECONDS = 18;
const SHUTTLE_MARGIN = 15;
const SHUTTLE_APPROACH_ARC = 0.11;
const SHUTTLE_DEPART_ARC = 0.13;
const SHUTTLE_TURN_START = 0.04;
const SHUTTLE_TURN_END = 0.23;

const FLARE_SECONDS = 2.4;
const FLARE_GLOW_RADIUS = 0.29;
const FLARE_GLOW_ALPHA = 0.67;
const FLARE_RING_ALPHA = 0.56;
const FLARE_RING_START = 0.27;
const FLARE_RING_END = 1.24;

interface OrbitGalaxy {
  sprite: SpiralGalaxy;
  radius: number;
  pose: GalaxyPose;
  cosTilt: number;
  sinTilt: number;
  spinRate: number;
  spinStart: number;
  glow: Sprite;
  ringColor: string;
  x: number;
  y: number;
  flareUntil: number;
}

interface BridgeStar {
  phase: number;
  offset: number;
  twinkle: number;
  forward: boolean;
  length: number;
}

function buildGlow(radius: number, color: RGB): Sprite {
  const r = Math.max(PIXEL, Math.round(radius));
  const size = r + r + PIXEL;
  const grid = new PixelGrid(size, size);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const strength = 1 - Math.hypot(x, y) / r;
      if (strength <= 0) continue;
      const level = ditherIndex(x, y, strength * strength, GLOW_LEVELS);
      grid.set(x + r, y + r, color, Math.round(level * BYTE_ALPHA / (GLOW_LEVELS - 1)));
    }
  }
  return grid.toSprite();
}

function buildGalaxy(unit: number, config: typeof LARGE_GALAXY): OrbitGalaxy {
  const designRadius = DESIGN_HEIGHT * config.radius;
  const radius = Math.max(PIXEL, Math.round(designRadius * unit));
  return {
    sprite: new SpiralGalaxy(unit, designRadius, config.look, config.seed),
    radius,
    pose: { spin: config.spinStart, tilt: config.tilt, squash: config.squash, alpha: FULL_ALPHA },
    cosTilt: Math.cos(config.tilt),
    sinTilt: Math.sin(config.tilt),
    spinRate: config.spinRate,
    spinStart: config.spinStart,
    glow: buildGlow(radius * FLARE_GLOW_RADIUS, config.look.core),
    ringColor: css(config.look.core),
    x: 0,
    y: 0,
    flareUntil: 0,
  };
}

function buildBridgeStars(): BridgeStar[] {
  const random = seededRandom(BRIDGE_SEED);
  return Array.from({ length: BRIDGE_STAR_COUNT }, (_, i) => ({
    phase: random(),
    offset: (random() + random()) * HALF - HALF,
    twinkle: random() * TURN,
    forward: i < BRIDGE_STAR_COUNT * HALF,
    length: i % BRIDGE_BRIGHT_EVERY === 0 ? BRIDGE_BRIGHT_LENGTH : PIXEL,
  }));
}

function clockVisibility(rc: DeepRenderContext, x: number, y: number): number {
  const dx = Math.max(0, rc.w * CLOCK_LEFT - x, x - rc.w * CLOCK_RIGHT);
  const dy = Math.max(0, rc.h * CLOCK_TOP - y, y - rc.h * CLOCK_BOTTOM);
  const clear = ramp(0, rc.h * CLOCK_FADE_WIDTH, Math.hypot(dx, dy));
  return FULL_ALPHA - CLOCK_DIMMING * (1 - clear);
}

function projectedLength(galaxy: OrbitGalaxy, x: number, y: number): number {
  const along = x * galaxy.cosTilt + y * galaxy.sinTilt;
  const across = -x * galaxy.sinTilt + y * galaxy.cosTilt;
  return Math.hypot(along, across / galaxy.pose.squash);
}

function drawGlow(ctx: CanvasRenderingContext2D, glow: Sprite, x: number, y: number): void {
  ctx.drawImage(glow.canvas, x - Math.floor(glow.w * HALF), y - Math.floor(glow.h * HALF));
}

function drawBridge(
  ctx: CanvasRenderingContext2D, rc: DeepRenderContext, time: number,
  large: OrbitGalaxy, small: OrbitGalaxy, stars: BridgeStar[], haze: Sprite,
): void {
  const dx = small.x - large.x;
  const dy = small.y - large.y;
  const distance = Math.hypot(dx, dy);
  if (distance < PIXEL) return;
  const ux = dx / distance;
  const uy = dy / distance;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const maxReach = distance * HALF;
  const start = Math.min(maxReach, large.radius * BRIDGE_ATTACH_RADIUS / projectedLength(large, ux, uy));
  const end = distance - Math.min(maxReach, small.radius * BRIDGE_ATTACH_RADIUS / projectedLength(small, ux, uy));
  const bow = Math.min(rc.h * BRIDGE_BOW, (end - start) * HALF);
  const spread = rc.h * BRIDGE_SPREAD;

  for (let i = 0; i < BRIDGE_HAZE_STAMPS; i++) {
    const t = (i + HALF) / BRIDGE_HAZE_STAMPS;
    const taper = Math.sin(t * Math.PI);
    const along = lerp(start, end, t);
    const across = taper * bow;
    const x = Math.round(large.x + ux * along - uy * across);
    const y = Math.round(large.y + uy * along + ux * across);
    ctx.globalAlpha = rc.alpha * BRIDGE_HAZE_ALPHA * taper * clockVisibility(rc, x, y);
    drawGlow(ctx, haze, x, y);
  }

  const travel = (time / BRIDGE_FLOW_SECONDS) % 1;
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const phase = (star.phase + travel) % 1;
    const moving = star.forward ? phase : 1 - phase;
    const centered = moving - HALF;
    const t = lerp(moving, HALF + CUBIC_RANGE * centered * centered * centered, BRIDGE_CENTER_DENSITY);
    const taper = Math.sin(t * Math.PI);
    const lane = star.forward ? BRIDGE_LANE_OFFSET : -BRIDGE_LANE_OFFSET;
    const along = lerp(start, end, t);
    const across = taper * (bow + spread * (star.offset + lane));
    const x = Math.round(large.x + ux * along - uy * across);
    const y = Math.round(large.y + uy * along + ux * across);
    if (x < 0 || x >= rc.w || y < 0 || y >= rc.h) continue;
    const twinkle = HALF + HALF * Math.sin(time * BRIDGE_TWINKLE_RATE + star.twinkle);
    ctx.globalAlpha = rc.alpha * BRIDGE_STAR_ALPHA * taper
      * lerp(BRIDGE_MIN_TWINKLE, FULL_ALPHA, twinkle) * clockVisibility(rc, x, y);
    ctx.fillStyle = star.forward ? BRIDGE_GOLD : BRIDGE_BLUE;
    ctx.fillRect(x, y, horizontal ? star.length : PIXEL, horizontal ? PIXEL : star.length);
  }
}

function drawPixelRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  // Mirror one octant to keep the expanding ring one pixel wide.
  for (let y = 0; y <= radius; y++) {
    const x = Math.round(Math.sqrt(radius * radius - y * y));
    if (y > x) break;
    ctx.fillRect(cx + x, cy + y, PIXEL, PIXEL);
    ctx.fillRect(cx - x, cy + y, PIXEL, PIXEL);
    if (y > 0) {
      ctx.fillRect(cx + x, cy - y, PIXEL, PIXEL);
      ctx.fillRect(cx - x, cy - y, PIXEL, PIXEL);
    }
    if (x === y) continue;
    ctx.fillRect(cx + y, cy + x, PIXEL, PIXEL);
    ctx.fillRect(cx + y, cy - x, PIXEL, PIXEL);
    if (y > 0) {
      ctx.fillRect(cx - y, cy + x, PIXEL, PIXEL);
      ctx.fillRect(cx - y, cy - x, PIXEL, PIXEL);
    }
  }
}

function drawGalaxy(ctx: CanvasRenderingContext2D, rc: DeepRenderContext, galaxy: OrbitGalaxy, time: number): void {
  const alpha = rc.alpha * clockVisibility(rc, galaxy.x, galaxy.y);
  galaxy.pose.spin = (galaxy.spinStart + time * galaxy.spinRate) % TURN;
  galaxy.pose.alpha = alpha;
  ctx.globalAlpha = FULL_ALPHA;
  galaxy.sprite.draw(ctx, galaxy.x, galaxy.y, galaxy.pose);

  const remaining = (galaxy.flareUntil - time) / FLARE_SECONDS;
  if (remaining <= 0) return;
  ctx.globalAlpha = alpha * FLARE_GLOW_ALPHA * remaining * remaining;
  drawGlow(ctx, galaxy.glow, galaxy.x, galaxy.y);
  ctx.globalAlpha = alpha * FLARE_RING_ALPHA * remaining;
  ctx.fillStyle = galaxy.ringColor;
  const radius = Math.max(PIXEL, Math.round(galaxy.radius * lerp(FLARE_RING_END, FLARE_RING_START, remaining)));
  drawPixelRing(ctx, galaxy.x, galaxy.y, radius);
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, across: number, down: number): void {
  ctx.fillRect(x - across, y, across + across + PIXEL, PIXEL);
  ctx.fillRect(x, y - down, PIXEL, down + down + PIXEL);
}

function drawForeground(ctx: CanvasRenderingContext2D, rc: DeepRenderContext, time: number): void {
  const turn = (time / STAR_TURN_SECONDS) % STARS.length;
  const active = Math.floor(turn);
  const pulse = Math.sin((turn - active) * Math.PI);
  for (let i = 0; i < STARS.length; i++) {
    const star = STARS[i];
    const x = Math.round(star.x * rc.w + rc.chapterSlide);
    const y = Math.round(star.y * rc.h);
    const down = Math.max(PIXEL, Math.round(star.length * rc.unit));
    const across = Math.max(PIXEL, Math.round(down * STAR_HORIZONTAL_LENGTH));
    if (x + across < 0 || x - across >= rc.w || y + down < 0 || y - down >= rc.h) continue;
    const glint = i === active ? lerp(STAR_BASE_ALPHA, FULL_ALPHA, pulse) : STAR_BASE_ALPHA;
    const alpha = rc.alpha * glint * clockVisibility(rc, x, y);
    ctx.fillStyle = star.color;
    ctx.globalAlpha = alpha * STAR_SPIKE_ALPHA;
    drawCross(ctx, x, y, across, down);
    ctx.globalAlpha = alpha * STAR_INNER_ALPHA;
    drawCross(ctx, x, y, Math.round(across * STAR_INNER_LENGTH), Math.round(down * STAR_INNER_LENGTH));
    ctx.fillStyle = STAR_WHITE;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, y, PIXEL, PIXEL);
  }
}

function drawShuttle(
  ctx: CanvasRenderingContext2D, rc: DeepRenderContext, shuttle: Shuttle,
  time: number, dockX: number, dockY: number,
): void {
  const phase = (time + SHUTTLE_START_PHASE) % SHUTTLE_CYCLE_SECONDS;
  const departure = phase - SHUTTLE_APPROACH_SECONDS - SHUTTLE_DOCK_SECONDS;
  const margin = Math.round(SHUTTLE_MARGIN * rc.unit);
  const offstageX = rc.w + margin + Math.round(rc.chapterSlide * STATION_SLIDE);
  let x = dockX;
  let y = dockY;
  let heading = Math.PI;
  if (phase < SHUTTLE_APPROACH_SECONDS) {
    // The last stretch slows to a stop with the ship level at the collar.
    const remaining = 1 - phase / SHUTTLE_APPROACH_SECONDS;
    const progress = 1 - remaining * remaining;
    const arc = rc.h * SHUTTLE_APPROACH_ARC;
    const wave = Math.sin(progress * Math.PI);
    x = lerp(offstageX, dockX, progress);
    y -= arc * wave * wave;
    heading = Math.atan2(-arc * Math.PI * Math.sin(progress * TURN), dockX - offstageX);
  } else if (departure >= 0) {
    if (departure >= SHUTTLE_DEPART_SECONDS) return;
    const elapsed = departure / SHUTTLE_DEPART_SECONDS;
    const progress = elapsed * elapsed;
    const arc = rc.h * SHUTTLE_DEPART_ARC;
    const wave = Math.sin(progress * Math.PI);
    x = lerp(dockX, offstageX, progress);
    y -= arc * wave * wave;
    // Back away from the collar before turning right.
    const turn = ramp(SHUTTLE_TURN_START, SHUTTLE_TURN_END, progress);
    const tangent = Math.atan2(-arc * Math.PI * Math.sin(progress * TURN), offstageX - dockX);
    heading = lerp(-Math.PI, tangent, turn);
  }
  if (x <= -margin || x >= rc.w + margin) return;
  ctx.globalAlpha = FULL_ALPHA;
  shuttle.draw(ctx, Math.round(x), Math.round(y), heading, time, rc.alpha);
}

interface TwinLayout {
  large: OrbitGalaxy;
  small: OrbitGalaxy;
  haze: Sprite;
  station: Station;
  shuttle: Shuttle;
  stationX: number;
  stationY: number;
  drawn: boolean;
}

/** Builds the Two Galaxies chapter, where two spirals circle as the ship turns home. */
export function createTwinGalaxies(): DeepScene {
  const stars = buildBridgeStars();
  let layout: TwinLayout | undefined;
  let time = 0;
  let stationFlashUntil = 0;

  return {
    resize(w, h, unit) {
      if (w <= 0 || h <= 0 || unit <= 0) {
        layout = undefined;
        return;
      }
      const large = buildGalaxy(unit, LARGE_GALAXY);
      const small = buildGalaxy(unit, SMALL_GALAXY);
      large.flareUntil = layout?.large.flareUntil ?? 0;
      small.flareUntil = layout?.small.flareUntil ?? 0;
      layout = {
        large,
        small,
        haze: buildGlow(h * BRIDGE_HAZE_RADIUS, BRIDGE_HAZE),
        station: new Station(unit, STATION_RADIUS),
        shuttle: new Shuttle(unit),
        stationX: 0,
        stationY: 0,
        drawn: false,
      };
    },
    update(dt) {
      time += dt;
    },
    draw(ctx, rc) {
      if (!layout) return;
      layout.drawn = rc.alpha > 0;
      if (!layout.drawn) return;
      const { large, small, haze, station, shuttle } = layout;
      const angle = ((time % ORBIT_SECONDS) / ORBIT_SECONDS) * TURN;
      const centerX = rc.w * HALF + rc.chapterSlide * GALAXY_SLIDE;
      const centerY = rc.h * ORBIT_CENTER_Y;
      const dx = Math.cos(angle) * Math.max(rc.w * ORBIT_WIDTH, rc.h * ORBIT_MIN_WIDTH);
      const dy = Math.sin(angle) * rc.h * ORBIT_HEIGHT;
      large.x = Math.round(centerX - dx);
      large.y = Math.round(centerY - dy);
      small.x = Math.round(centerX + dx);
      small.y = Math.round(centerY + dy);
      layout.stationX = Math.round(rc.w * STATION_X + rc.chapterSlide * STATION_SLIDE);
      layout.stationY = Math.round(rc.h * STATION_Y);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawBridge(ctx, rc, time, large, small, stars, haze);
      drawGalaxy(ctx, rc, large, time);
      drawGalaxy(ctx, rc, small, time);
      drawForeground(ctx, rc, time);

      const flash = Math.max(0, (stationFlashUntil - time) / STATION_FLASH_SECONDS);
      const lamp = flash * flash;
      const dockX = Math.round(layout.stationX + station.dock.dx);
      const dockY = Math.round(layout.stationY + station.dock.dy);
      ctx.globalAlpha = FULL_ALPHA;
      station.draw(ctx, layout.stationX, layout.stationY, time, rc.alpha * lerp(STATION_ALPHA, FULL_ALPHA, lamp));
      drawShuttle(ctx, rc, shuttle, time, dockX, dockY);
      if (flash > 0) {
        ctx.globalAlpha = rc.alpha * lamp;
        ctx.fillStyle = STAR_WARM;
        drawCross(ctx, dockX, dockY, PIXEL, PIXEL);
      }
      ctx.restore();
    },
    press(x, y) {
      if (!layout?.drawn) return false;
      if (layout.station.contains(x, y, layout.stationX, layout.stationY)) {
        stationFlashUntil = time + STATION_FLASH_SECONDS;
        return true;
      }
      const { large, small } = layout;
      if (projectedLength(small, x - small.x, y - small.y) <= small.radius) {
        small.flareUntil = time + FLARE_SECONDS;
        return true;
      }
      if (projectedLength(large, x - large.x, y - large.y) <= large.radius) {
        large.flareUntil = time + FLARE_SECONDS;
        return true;
      }
      return false;
    },
  };
}
