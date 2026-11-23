import { css, mix, type RGB } from '../../../../render/color';
import { memoryCanvas } from '../../../../render/pixel-stage';
import { ditherIndex, hash2, PixelGrid, type Sprite } from '../sprites-base';
import { BlackHole, buildForegroundMask, type BlackHoleLook } from './black-hole';
import type { DeepScene } from './deep-scene';
import { Shuttle, Station } from './station';

const DESIGN_HEIGHT = 270;
const TURN = Math.PI * 2;
const ALPHA_MAX = 255;
const LIGHT_STEPS = 8;

const HOLE_X = 0.8;
const HOLE_Y = 0.3;
const HOLE_RADIUS = 0.12;
const HOLE_SLIDE = 0.5;
const HOLE_HIT_RADIUS = 1.55;
const STATION_X = 0.17;
const STATION_Y = 0.6;
const STATION_RADIUS = 0.11;
const STATION_WIDTH_LIMIT = 0.15;
const PLANET_SLIDE = 0.65;
const DUST_SLIDE = 0.7;

const WARM_LOOK: BlackHoleLook = {
  disc: [241, 165, 107],
  discHot: [255, 249, 228],
  arc: [246, 167, 100],
  photon: [255, 246, 218],
  glow: [178, 85, 48],
  shadow: [4, 4, 9],
  lightGain: 1.4,
  discWidthScale: 1.5,
};

const LIMB_LEFT = 0.9;
const LIMB_RIGHT = 0.62;
// The centre lies beyond the right edge, so the arc rises across the whole stage.
const PLANET_CENTER_X = 1.38;
const PLANET_CENTER_DROP = 0.55;
const PLANET_OVERSCAN = 16;
const HALO_HEIGHT = 29;
const LIT_SURFACE_DEPTH = 19;
const ATMOSPHERE_WIDTH = 2.5;
const COOL_EDGE: RGB = [181, 221, 254];
const WARM_EDGE: RGB = [255, 235, 202];
const COOL_HALO: RGB = [78, 147, 229];
const WARM_HALO: RGB = [173, 137, 133];
const SURFACE_DARK: RGB = [9, 14, 26];
const SURFACE_COOL: RGB = [35, 48, 66];
const SURFACE_WARM: RGB = [61, 53, 60];
const SURFACE_HAZE = 0.26;
const SHORE_LIGHT = 0.46;
const SHORE_HALO = 0.23;
const LIMB_AMPLITUDE = 0.1;
const LIMB_LIGHT = 0.89;
const LIMB_PERIOD = 29;
// Long bands with a second waviness give the clouds a broken, stretched grain.
const CLOUD_BAND = 0.66;
const CLOUD_WARP_RATE = 0.016;
const CLOUD_WARP = 1.8;
const CLOUD_FINE_BAND = 1.08;
const CLOUD_FINE_WARP = 0.038;
const CLOUD_GRAIN = 0.15;
const CLOUD_SEED = 9;
const CLOUD_LIGHT = 0.22;
const CLOUD_COVER = 0.45;
const CLOUD_DEPTH = 130;
const SURFACE_DEPTH = 90;

const LOOP_SECONDS = 90;
const APPROACH_SECONDS = 44;
const DOCK_SECONDS = 10;
const DEPART_SECONDS = 28;
const FAR_X = 0.93;
const FAR_Y = 0.75;
const APPROACH_X = 0.83;
const APPROACH_Y = 0.57;
const DOCK_LEAD = 0.2;
const DOCK_LIFT = 0.063;
const DEPART_LEAD = 0.1;
const EXIT_X = -0.13;
const EXIT_Y = 0.77;
const EXIT_BEND_X = 0.04;
const EXIT_BEND_Y = 0.66;
const FAR_SHIP_SCALE = 0.58;
const FAR_SHIP_LIGHT = 0.78;
const SHIP_MARGIN = 14;
const DOCKED_HULL = css([67, 74, 88]);

const RING_SECONDS = 2.3;
const FLASH_SECONDS = 1.4;
const FLASH_COUNT = 2;
const FLASH_ALPHA = 0.8;
const FLASH_COLOR = css([255, 218, 159]);
const SIGNAL_COLOR = css([255, 232, 181]);
const SIGNAL_ALPHA = 0.61;
const SIGNAL_START = 0.16;
const SIGNAL_RADIUS = 0.26;
const FLARE_SECONDS = 2;
const FLARE_ATTACK = 0.18;

const DUST_COUNT = 12;
const DUST_SEED = 31;
const DUST_SKY_TOP = 0.18;
const DUST_SKY_SPAN = 0.48;
const DUST_Y_WANDER = 4;
const DUST_MIN_SPEED = 0.55;
const DUST_SPEED_RANGE = 0.7;
const DUST_LIGHT = 0.39;
const DUST_COLOR = css([194, 155, 126]);

interface Planet {
  surface: Sprite;
  atmosphere: Sprite;
  margin: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (1 + 2 * (1 - t));
};
const cubic = (a: number, b: number, c: number, d: number, t: number): number => {
  const u = 1 - t;
  const left = a * u + b * t;
  const middle = b * u + c * t;
  const right = c * u + d * t;
  return u * (left * u + middle * t) + t * (middle * u + right * t);
};
const tangent = (a: number, b: number, c: number, d: number, t: number): number => {
  const u = 1 - t;
  return u * (u * (b - a) + t * (c - b)) + t * (u * (c - b) + t * (d - c));
};

function buildPlanet(w: number, h: number, unit: number): Planet {
  const margin = Math.ceil(PLANET_OVERSCAN * unit);
  const width = w + margin + margin;
  const surface = new PixelGrid(width, h);
  const atmosphere = new PixelGrid(width, h);
  const left = h * LIMB_LEFT;
  const right = h * LIMB_RIGHT;
  const centerX = Math.max(w * PLANET_CENTER_X, w / 2 + (left - right) * h * PLANET_CENTER_DROP / w);
  // Equal distances to both screen edges determine the circle's centre and radius.
  const centerY = (left + right) / 2 + (centerX - w / 2) * w / (left - right);
  const radius = Math.hypot(centerX, centerY - left);
  const haloHeight = Math.max(1, Math.round(HALO_HEIGHT * unit));
  const edgeWidth = Math.max(1, Math.round(ATMOSPHERE_WIDTH * unit));

  for (let x = 0; x < width; x++) {
    const stageX = x - margin;
    const centerOffset = stageX - centerX;
    const edgeY = Math.round(centerY - Math.sqrt(Math.max(0, radius * radius - centerOffset * centerOffset)));
    const warmth = smooth(stageX / w);
    const edgeColor = mix(COOL_EDGE, WARM_EDGE, warmth);
    const haloColor = mix(COOL_HALO, WARM_HALO, warmth);
    const surfaceColor = mix(SURFACE_COOL, SURFACE_WARM, warmth);
    const cloudWarp = Math.sin(stageX * CLOUD_WARP_RATE / unit) * CLOUD_WARP;
    const cloudFineWarp = Math.sin(stageX * CLOUD_FINE_WARP / unit);

    for (let y = Math.max(0, edgeY - haloHeight); y < h; y++) {
      const depth = (y - edgeY) / unit;
      if (y >= edgeY) {
        const bands = Math.sin(depth * CLOUD_BAND + cloudWarp);
        const wisps = Math.sin(depth * CLOUD_FINE_BAND + cloudFineWarp);
        const grain = hash2(stageX, y, CLOUD_SEED) * CLOUD_GRAIN;
        const clouds = smooth((bands + wisps) / 2 + grain - CLOUD_COVER);
        const shade = SURFACE_HAZE * smooth(1 - depth / SURFACE_DEPTH)
          + CLOUD_LIGHT * clouds * smooth(1 - depth / CLOUD_DEPTH);
        surface.set(x, y, mix(SURFACE_DARK, surfaceColor, shade + warmth * SURFACE_HAZE));
      }
      if (y < edgeY) {
        const rise = smooth(1 + (y - edgeY) / haloHeight);
        const light = ditherIndex(x, y, rise * SHORE_HALO, LIGHT_STEPS);
        if (light > 0) atmosphere.set(x, y, haloColor, Math.round(light * ALPHA_MAX / (LIGHT_STEPS - 1)));
      } else if (y < edgeY + edgeWidth) {
        const core = 1 - SHORE_LIGHT * (y - edgeY) / edgeWidth;
        atmosphere.set(x, y, edgeColor, Math.round(core * ALPHA_MAX));
      } else if (depth < LIT_SURFACE_DEPTH) {
        const light = ditherIndex(x, y, SHORE_LIGHT * smooth(1 - depth / LIT_SURFACE_DEPTH), LIGHT_STEPS);
        if (light > 0) atmosphere.set(x, y, haloColor, Math.round(light * ALPHA_MAX / (LIGHT_STEPS - 1)));
      }
    }
  }
  return { surface: surface.toSprite(), atmosphere: atmosphere.toSprite(), margin };
}

function drawSignal(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = SIGNAL_COLOR;
  for (let dx = 0; dx <= radius; dx++) {
    const dy = Math.round(Math.sqrt(radius * radius - dx * dx));
    if (dy < dx) break;
    ctx.fillRect(x + dx, y + dy, 1, 1);
    ctx.fillRect(x - dx, y - dy, 1, 1);
    ctx.fillRect(x + dy, y - dx, 1, 1);
    ctx.fillRect(x - dy, y + dx, 1, 1);
    if (dx === 0 || dx === dy) continue;
    ctx.fillRect(x - dx, y + dy, 1, 1);
    ctx.fillRect(x + dx, y - dy, 1, 1);
    ctx.fillRect(x + dy, y + dx, 1, 1);
    ctx.fillRect(x - dy, y - dx, 1, 1);
  }
}

/** Builds the Gargantua chapter, where the ship returns to the ring station. */
export function createGargantua(): DeepScene {
  let width = 0;
  let height = 0;
  let unit = 1;
  let blackHole: BlackHole | undefined;
  let planet: Planet | undefined;
  let station: Station | undefined;
  let shuttle: Shuttle | undefined;
  let mask: Sprite | undefined;
  let light: ReturnType<typeof memoryCanvas> | undefined;
  let flyingShip: ReturnType<typeof memoryCanvas> | undefined;
  let dockedShip: HTMLCanvasElement | undefined;
  let dockHeading = 0;
  let shipCenter = 0;
  let holeX = 0;
  let holeY = 0;
  let stationX = 0;
  let stationY = 0;
  let shuttleClock = 0;
  let stationFlash = RING_SECONDS;
  let holeFlare = FLARE_SECONDS;

  return {
    resize(w, h, scale) {
      width = w;
      height = h;
      unit = scale;
      blackHole = new BlackHole(unit, DESIGN_HEIGHT * HOLE_RADIUS, WARM_LOOK);
      planet = buildPlanet(w, h, unit);
      station = new Station(unit, Math.min(DESIGN_HEIGHT * STATION_RADIUS, w * STATION_WIDTH_LIMIT / unit));
      shuttle = new Shuttle(unit);
      mask = buildForegroundMask(w, h);
      light = memoryCanvas(w, h);
      shipCenter = Math.max(1, Math.ceil(SHIP_MARGIN * unit));
      const shipSize = shipCenter + shipCenter + 1;
      flyingShip = memoryCanvas(shipSize, shipSize);
      const parked = memoryCanvas(shipSize, shipSize);
      dockHeading = Math.atan2(-h * DOCK_LIFT, -w * DOCK_LEAD);
      parked.ctx.imageSmoothingEnabled = false;
      shuttle.draw(parked.ctx, shipCenter, shipCenter, dockHeading, 0, 1);
      // Hold a dim hull at the berth without carrying over the flying ship's spark.
      parked.ctx.globalCompositeOperation = 'source-in';
      parked.ctx.fillStyle = DOCKED_HULL;
      parked.ctx.fillRect(0, 0, shipSize, shipSize);
      dockedShip = parked.canvas;
      holeX = Math.round(w * HOLE_X);
      holeY = Math.round(h * HOLE_Y);
      stationX = Math.round(w * STATION_X);
      stationY = Math.round(h * STATION_Y);
    },

    update(dt) {
      shuttleClock = (shuttleClock + dt) % LOOP_SECONDS;
      stationFlash = Math.min(RING_SECONDS, stationFlash + dt);
      holeFlare = Math.min(FLARE_SECONDS, holeFlare + dt);
    },

    draw(ctx, rc) {
      if (!blackHole || !planet || !station || !shuttle || !mask || !light || !flyingShip || !dockedShip) return;
      holeX = Math.round(width * HOLE_X + rc.chapterSlide * HOLE_SLIDE);
      stationX = Math.round(width * STATION_X + rc.chapterSlide);
      const planetX = Math.round(rc.chapterSlide * PLANET_SLIDE) - planet.margin;
      const lit = light.ctx;
      lit.imageSmoothingEnabled = false;
      lit.clearRect(0, 0, width, height);
      lit.save();

      blackHole.draw(lit, holeX, holeY, rc.time, 1);
      const flare = smooth(holeFlare / FLARE_ATTACK) * smooth(1 - holeFlare / FLARE_SECONDS);
      if (flare > 0) blackHole.drawFlare(lit, holeX, holeY, flare);
      lit.globalCompositeOperation = 'destination-out';
      lit.drawImage(planet.surface.canvas, planetX, 0);
      lit.globalCompositeOperation = 'source-over';

      lit.globalAlpha = LIMB_LIGHT + LIMB_AMPLITUDE * Math.sin(TURN * rc.time / LIMB_PERIOD);
      lit.drawImage(planet.atmosphere.canvas, planetX, 0);
      lit.globalAlpha = DUST_LIGHT;
      lit.fillStyle = DUST_COLOR;
      for (let i = 0; i < DUST_COUNT; i++) {
        const speed = DUST_MIN_SPEED + DUST_SPEED_RANGE * hash2(i, 0, DUST_SEED);
        const drift = (hash2(i, 1, DUST_SEED) * width + rc.time * speed * unit) % width;
        const x = Math.round(drift + rc.chapterSlide * DUST_SLIDE);
        const y = Math.round(height * (DUST_SKY_TOP + DUST_SKY_SPAN * hash2(i, i, DUST_SEED))
          + Math.sin(rc.time * speed + i) * DUST_Y_WANDER * unit);
        lit.fillRect(x, y, 1, 1);
      }
      lit.globalAlpha = 1;

      const dockX = Math.round(stationX + station.dock.dx);
      const dockY = Math.round(stationY + station.dock.dy);
      if (stationFlash < RING_SECONDS) {
        const t = stationFlash / RING_SECONDS;
        const radius = Math.round(height * (SIGNAL_START + (SIGNAL_RADIUS - SIGNAL_START) * t));
        drawSignal(lit, stationX, stationY, radius, SIGNAL_ALPHA * (1 - t));
      }
      lit.globalAlpha = 1;
      station.draw(lit, stationX, stationY, rc.time, 1);
      if (stationFlash < FLASH_SECONDS) {
        const t = stationFlash / FLASH_SECONDS;
        const flash = FLASH_ALPHA * (1 - t) * (1 + Math.cos(t * TURN * FLASH_COUNT)) / 2;
        lit.globalCompositeOperation = 'screen';
        station.draw(lit, stationX, stationY, rc.time, flash);
        lit.globalCompositeOperation = 'source-over';
        lit.globalAlpha = flash;
        lit.fillStyle = FLASH_COLOR;
        lit.fillRect(dockX, dockY, 1, 1);
      }

      const departAt = APPROACH_SECONDS + DOCK_SECONDS;
      if (shuttleClock >= APPROACH_SECONDS && shuttleClock < departAt) {
        lit.globalAlpha = 1;
        lit.drawImage(dockedShip, dockX - shipCenter, dockY - shipCenter);
      } else if (shuttleClock < departAt + DEPART_SECONDS) {
        const approaching = shuttleClock < APPROACH_SECONDS;
        const interval = approaching ? shuttleClock / APPROACH_SECONDS : (shuttleClock - departAt) / DEPART_SECONDS;
        const t = approaching ? interval * (2 - interval) : interval * interval;
        const slide = rc.chapterSlide;
        const fromX = approaching ? width * FAR_X + slide : dockX;
        const fromY = approaching ? height * FAR_Y : dockY;
        const leadX = approaching ? width * APPROACH_X + slide : dockX - width * DEPART_LEAD;
        const leadY = approaching ? height * APPROACH_Y : dockY - height * DOCK_LIFT * DEPART_LEAD / DOCK_LEAD;
        const settleX = approaching ? dockX + width * DOCK_LEAD : width * EXIT_BEND_X + slide;
        const settleY = approaching ? dockY + height * DOCK_LIFT : height * EXIT_BEND_Y;
        const toX = approaching ? dockX : width * EXIT_X + slide;
        const toY = approaching ? dockY : height * EXIT_Y;
        const x = cubic(fromX, leadX, settleX, toX, t);
        const y = cubic(fromY, leadY, settleY, toY, t);
        const heading = Math.atan2(tangent(fromY, leadY, settleY, toY, t), tangent(fromX, leadX, settleX, toX, t));
        const closeness = smooth(approaching ? t : 1 - t);
        const shipScale = FAR_SHIP_SCALE + (1 - FAR_SHIP_SCALE) * closeness;
        const shipSize = Math.max(1, Math.round(flyingShip.canvas.width * shipScale));
        const local = flyingShip.ctx;
        local.imageSmoothingEnabled = false;
        local.clearRect(0, 0, flyingShip.canvas.width, flyingShip.canvas.height);
        shuttle.draw(local, shipCenter, shipCenter, heading, rc.time, 1);
        lit.globalAlpha = FAR_SHIP_LIGHT + (1 - FAR_SHIP_LIGHT) * closeness;
        lit.drawImage(flyingShip.canvas, Math.round(x - shipSize / 2), Math.round(y - shipSize / 2), shipSize, shipSize);
      }

      lit.globalAlpha = 1;
      lit.globalCompositeOperation = 'destination-out';
      lit.drawImage(mask.canvas, 0, 0);
      lit.restore();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = rc.alpha;
      ctx.drawImage(planet.surface.canvas, planetX, 0);
      ctx.drawImage(light.canvas, 0, 0);
      ctx.restore();
    },

    press(x, y) {
      if (station?.contains(x, y, stationX, stationY)) {
        stationFlash = 0;
        return true;
      }
      const holeRadius = DESIGN_HEIGHT * HOLE_RADIUS * unit * HOLE_HIT_RADIUS;
      if (blackHole && Math.hypot(x - holeX, y - holeY) <= holeRadius) {
        holeFlare = 0;
        return true;
      }
      return false;
    },
  };
}
