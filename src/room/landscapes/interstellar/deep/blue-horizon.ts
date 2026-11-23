import { css, mix, type RGB } from '../../../../render/color';
import { memoryCanvas } from '../../../../render/pixel-stage';
import { ditherIndex, hash2, PixelGrid, type Sprite } from '../sprites-base';
import { BlackHole, buildForegroundMask, foregroundCover, type BlackHoleLook } from './black-hole';
import type { DeepScene } from './deep-scene';
import { Shuttle } from './station';

const DESIGN_HEIGHT = 270;
const TURN = Math.PI * 2;
const ALPHA_MAX = 255;
const LIGHT_STEPS = 8;
const HOLE_X = 0.74;
const HOLE_Y = 0.3;
const HOLE_RADIUS = 0.11;
const HOLE_SLIDE = 0.5;
const HIT_RADIUS = 1.4;

const COLD_LOOK: BlackHoleLook = {
  disc: [120, 149, 239],
  discHot: [227, 240, 255],
  arc: [131, 115, 228],
  photon: [206, 228, 255],
  glow: [79, 77, 199],
  shadow: [4, 6, 17],
};

const HORIZON_LEFT = 0.58;
const HORIZON_RIGHT = 0.5;
const HORIZON_SLIDE = 0.62;
const HORIZON_OVERSCAN = 16;
const EDGE_HALO_HEIGHT = 22;
const EDGE_WIDTH = 2.5;
const EDGE_LIGHT_SPAN = 0.35;
const EDGE_CORE_LIGHT = 0.72;
const EDGE_CORE_PEAK = 0.25;
const EDGE_ROW_FADE = 0.18;
const EDGE_SKY_LIGHT = 0.22;
const EDGE_SKY_PEAK = 0.22;
const EDGE_GLASS_LIGHT = 0.17;
const EDGE_DIM_SCALE = 0.72;
const GLASS_DEPTH = 87;
const GLASS_DARK: RGB = [2, 3, 9];
const GLASS_SHALLOW: RGB = [8, 11, 27];
const EDGE_COOL: RGB = [138, 153, 210];
const EDGE_HOT: RGB = [218, 228, 255];
const REFLECTION_ALPHA = 0.4;
const REFLECTION_GAP = 3;

// A short sweep travels over the arcs inside a slower breathing cycle.
const WAVE_PERIOD = 12;
const WAVE_TRAVEL_SECONDS = 4.6;
const BREATH_PERIOD = 20;
const BREATH_LIGHT = 0.92;
const BREATH_AMPLITUDE = 0.075;

const STREAK_COUNT = 19;
const STREAK_SEED = 23;
const STREAK_SPEED_SAMPLE = 0;
const STREAK_X_SAMPLE = 1;
const STREAK_DEPTH_SAMPLE = 2;
const STREAK_LENGTH_SAMPLE = 3;
const STREAK_LIGHT_SAMPLE = 4;
const STREAK_DEPTH = 0.32;
const STREAK_MIN_LENGTH = 7;
const STREAK_LENGTH_RANGE = 30;
const STREAK_MIN_SPEED = 0.46;
const STREAK_SPEED_RANGE = 0.82;
const STREAK_ALPHA = 0.14;
const STREAK_COLOR = css([49, 66, 110]);

const SHUTTLE_PERIOD = 70;
const SHUTTLE_CROSSING_SECONDS = 56;
const SHUTTLE_START_SECONDS = 5;
const SHUTTLE_SCALE = 1.08;
const SHUTTLE_MARGIN = 11;
const SHUTTLE_SKIM = 6;
const SHUTTLE_DIM_SCALE = 0.55;
const SHUTTLE_RIM = css([214, 232, 255]);
const SHUTTLE_HULL = css([13, 20, 38]);

const MOTE_COUNT = 16;
const MOTE_SEED = 62;
const MOTE_RIGHT = 0.79;
const MOTE_SIDE_SPAN = 0.2;
const MOTE_TOP = 0.11;
const MOTE_HEIGHT = 0.36;
const MOTE_MIN_SPEED = 0.36;
const MOTE_SPEED_RANGE = 0.75;
const MOTE_Y_WANDER = 4;
const MOTE_ALPHA = 0.47;
const MOTE_TWINKLE_PERIOD = 11;
const MOTE_EDGE_FEATHER = 0.12;
const MOTE_COLOR = css([182, 209, 249]);

interface Horizon {
  surface: Sprite;
  edge: Sprite;
  below: Path2D;
  margin: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (1 + 2 * (1 - t));
};

function horizonY(x: number, w: number, h: number): number {
  return h * (HORIZON_LEFT + (HORIZON_RIGHT - HORIZON_LEFT) * x / w);
}

function buildHorizon(w: number, h: number, unit: number): Horizon {
  const margin = Math.ceil(HORIZON_OVERSCAN * unit);
  const width = w + margin + margin;
  const glass = new PixelGrid(width, h);
  const edge = new PixelGrid(width, h);
  const below = new Path2D();
  const halo = Math.max(1, Math.round(EDGE_HALO_HEIGHT * unit));
  const edgeWidth = Math.max(1, Math.round(EDGE_WIDTH * unit));
  const endX = w + margin;

  below.moveTo(-margin, h);
  let lastY = Math.round(horizonY(-margin, w, h));
  below.lineTo(-margin, lastY);
  for (let x = 0; x < width; x++) {
    const stageX = x - margin;
    const line = Math.round(horizonY(stageX, w, h));
    if (lastY !== line) {
      below.lineTo(stageX, lastY);
      below.lineTo(stageX, line);
      lastY = line;
    }
    const nearHole = smooth(1 - Math.abs(stageX / w - HOLE_X) / EDGE_LIGHT_SPAN);
    const edgeColor = mix(EDGE_COOL, EDGE_HOT, nearHole);
    for (let y = Math.max(0, line - halo); y < h; y++) {
      const dy = y - line;
      if (dy >= 0) glass.set(x, y, mix(GLASS_SHALLOW, GLASS_DARK, smooth(dy / (GLASS_DEPTH * unit))));
      if (Math.abs(dy) >= halo) continue;
      const visibility = 1 - EDGE_DIM_SCALE * foregroundCover(stageX / w, y / h);
      if (dy < 0 && dy >= -edgeWidth) {
        const core = EDGE_CORE_LIGHT + nearHole * EDGE_CORE_PEAK;
        edge.set(x, y, edgeColor, Math.round(core * (1 + EDGE_ROW_FADE * dy / edgeWidth) * visibility * ALPHA_MAX));
        continue;
      }
      const fade = smooth(1 - Math.abs(dy) / halo);
      const maxLight = dy < 0 ? EDGE_SKY_LIGHT + EDGE_SKY_PEAK * nearHole : EDGE_GLASS_LIGHT;
      const light = ditherIndex(x, y, visibility * maxLight * fade, LIGHT_STEPS);
      if (light > 0) edge.set(x, y, edgeColor, Math.round(light * ALPHA_MAX / (LIGHT_STEPS - 1)));
    }
  }
  below.lineTo(endX, lastY);
  below.lineTo(endX, h);
  below.closePath();
  return { surface: glass.toSprite(), edge: edge.toSprite(), below, margin };
}

function buildSkimmer(w: number, h: number, unit: number): HTMLCanvasElement {
  const center = Math.max(1, Math.ceil(SHUTTLE_MARGIN * unit));
  const size = center + center + 1;
  const spriteSize = Math.max(1, Math.round(size * SHUTTLE_SCALE));
  const shuttle = new Shuttle(unit);
  const { canvas: shape, ctx: shapeCtx } = memoryCanvas(size, size);
  const { canvas, ctx } = memoryCanvas(spriteSize, spriteSize);
  const heading = Math.atan2(h * (HORIZON_RIGHT - HORIZON_LEFT), w);
  shapeCtx.imageSmoothingEnabled = false;
  shuttle.draw(shapeCtx, center, center, heading, 0, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shape, 0, 0, spriteSize, spriteSize);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = SHUTTLE_RIM;
  ctx.fillRect(0, 0, spriteSize, spriteSize);
  shapeCtx.globalCompositeOperation = 'source-in';
  shapeCtx.fillStyle = SHUTTLE_HULL;
  shapeCtx.fillRect(0, 0, size, size);
  // A one-pixel offset leaves a cool edge along the top of the dark hull.
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(shape, 0, 1, spriteSize, spriteSize);
  return canvas;
}

/** Builds the Blue Horizon chapter, where the ship dives past a blue black hole. */
export function createBlueHorizon(): DeepScene {
  let width = 0;
  let height = 0;
  let unit = 1;
  let blackHole: BlackHole | undefined;
  let horizon: Horizon | undefined;
  let skimmer: HTMLCanvasElement | undefined;
  let light: ReturnType<typeof memoryCanvas> | undefined;
  let mask: Sprite | undefined;
  let holeX = 0;
  let holeY = 0;
  let waveClock = 0;
  let shuttleClock = SHUTTLE_START_SECONDS;

  return {
    resize(w, h, scale) {
      width = w;
      height = h;
      unit = scale;
      blackHole = new BlackHole(unit, DESIGN_HEIGHT * HOLE_RADIUS, COLD_LOOK);
      horizon = buildHorizon(w, h, unit);
      skimmer = buildSkimmer(w, h, unit);
      light = memoryCanvas(w, h);
      mask = buildForegroundMask(w, h);
      holeX = Math.round(w * HOLE_X);
      holeY = Math.round(h * HOLE_Y);
    },

    update(dt) {
      waveClock = (waveClock + dt) % WAVE_PERIOD;
      shuttleClock = (shuttleClock + dt) % SHUTTLE_PERIOD;
    },

    draw(ctx, rc) {
      if (!blackHole || !horizon || !skimmer || !light || !mask) return;
      holeX = Math.round(width * HOLE_X + rc.chapterSlide * HOLE_SLIDE);
      const slide = Math.round(rc.chapterSlide * HORIZON_SLIDE);
      const horizonX = slide - horizon.margin;
      const breath = BREATH_LIGHT + BREATH_AMPLITUDE * Math.sin(TURN * rc.time / BREATH_PERIOD);
      const lit = light.ctx;
      lit.imageSmoothingEnabled = false;
      lit.clearRect(0, 0, width, height);
      lit.save();

      blackHole.draw(lit, holeX, holeY, rc.time, breath);
      if (waveClock < WAVE_TRAVEL_SECONDS) {
        blackHole.drawWave(lit, holeX, holeY, waveClock / WAVE_TRAVEL_SECONDS, breath);
      }

      lit.globalCompositeOperation = 'destination-out';
      lit.drawImage(horizon.surface.canvas, horizonX, 0);
      lit.globalCompositeOperation = 'source-over';
      lit.save();
      lit.translate(slide, 0);
      lit.clip(horizon.below);
      lit.translate(-slide, 0);
      const reflectionTop = horizonY(holeX - slide, width, height) + REFLECTION_GAP * unit;
      blackHole.drawReflection(lit, holeX, reflectionTop, REFLECTION_ALPHA * breath);
      lit.fillStyle = STREAK_COLOR;
      const streakSpan = width + horizon.margin + horizon.margin;
      for (let i = 0; i < STREAK_COUNT; i++) {
        const speed = STREAK_MIN_SPEED + STREAK_SPEED_RANGE * hash2(i, STREAK_SPEED_SAMPLE, STREAK_SEED);
        const start = hash2(i, STREAK_X_SAMPLE, STREAK_SEED) * streakSpan;
        const x = Math.round((start + rc.time * unit * speed) % streakSpan + horizonX);
        const y = Math.round(horizonY(x - slide, width, height)
          + height * STREAK_DEPTH * hash2(i, STREAK_DEPTH_SAMPLE, STREAK_SEED));
        const length = Math.max(1, Math.round(unit * (STREAK_MIN_LENGTH
          + STREAK_LENGTH_RANGE * hash2(i, STREAK_LENGTH_SAMPLE, STREAK_SEED))));
        lit.globalAlpha = STREAK_ALPHA * hash2(i, STREAK_LIGHT_SAMPLE, STREAK_SEED) * breath;
        lit.fillRect(x, y, length, 1);
      }
      lit.restore();

      lit.fillStyle = MOTE_COLOR;
      for (let i = 0; i < MOTE_COUNT; i++) {
        const right = i % 2 === 0;
        const span = width * MOTE_SIDE_SPAN;
        const speed = MOTE_MIN_SPEED + MOTE_SPEED_RANGE * hash2(i, 0, MOTE_SEED);
        const drift = (hash2(i, 1, MOTE_SEED) * span + rc.time * unit * speed) % span;
        const x = Math.round((right ? width * MOTE_RIGHT : 0) + drift + slide);
        const y = Math.round(height * (MOTE_TOP + MOTE_HEIGHT * hash2(i, 2, MOTE_SEED))
          + MOTE_Y_WANDER * unit * Math.sin(rc.time * speed + i));
        const edge = smooth(Math.min(drift, span - drift) / (span * MOTE_EDGE_FEATHER));
        const flicker = (1 + Math.sin(TURN * rc.time / MOTE_TWINKLE_PERIOD + i)) / 2;
        lit.globalAlpha = MOTE_ALPHA * edge * flicker;
        lit.fillRect(x, y, 1, 1);
      }

      lit.globalAlpha = 1;
      lit.globalCompositeOperation = 'destination-out';
      lit.drawImage(mask.canvas, 0, 0);
      lit.globalCompositeOperation = 'source-over';
      lit.globalAlpha = breath;
      lit.drawImage(horizon.edge.canvas, horizonX, 0);

      if (shuttleClock < SHUTTLE_CROSSING_SECONDS) {
        const travel = width + skimmer.width + skimmer.width;
        const x = travel * shuttleClock / SHUTTLE_CROSSING_SECONDS - skimmer.width + slide;
        const y = horizonY(x - slide, width, height) - unit * SHUTTLE_SKIM;
        lit.globalAlpha = 1 - SHUTTLE_DIM_SCALE * foregroundCover(x / width, y / height);
        lit.drawImage(skimmer, Math.round(x - skimmer.width / 2), Math.round(y - skimmer.height / 2));
      }
      lit.restore();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = rc.alpha;
      ctx.drawImage(horizon.surface.canvas, horizonX, 0);
      ctx.drawImage(light.canvas, 0, 0);
      ctx.restore();
    },

    press(x, y) {
      if (!blackHole || Math.hypot(x - holeX, y - holeY) > DESIGN_HEIGHT * HOLE_RADIUS * unit * HIT_RADIUS) return false;
      waveClock = 0;
      return true;
    },
  };
}
