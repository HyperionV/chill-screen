import { memoryCanvas } from '../../../render/pixel-stage';
import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import { line, oval } from './sprites';

// Tip travel at the peak of a gust, in stage pixels.
const BAMBOO_SWAY = 3;
const MAPLE_SWAY = 3;
const GRASS_SWAY = 2;
const POND_PLANT_SWAY = 2;
// Half-pixel bend steps let different heights cross pixel boundaries at different times.
const STEPS_PER_PIXEL = 2;
const BAMBOO_CLUMPS = 9;
const LEFT_CLUMPS = 5;
const GRASS_TUFTS = 38;
const LILY_PADS = 9;
const MAPLE_CLUSTERS = 65;
const MAPLE_BRANCH_LENGTH = 90;
const MAPLE_MAX_REACH = 145;

interface BendFrames { image: HTMLCanvasElement; width: number; steps: number }
interface Plant { frames: BendFrames; left: number; top: number; phaseX: number }

function bendFrames(width: number, height: number, sway: number,
  paint: (ctx: CanvasRenderingContext2D, amount: number) => void): BendFrames {
  const steps = sway * STEPS_PER_PIXEL;
  const { canvas, ctx } = memoryCanvas(width * (2 * steps + 1), height);
  for (let step = -steps; step <= steps; step++) {
    ctx.setTransform(1, 0, 0, 1, (step + steps) * width, 0);
    paint(ctx, step / STEPS_PER_PIXEL);
  }
  return { image: canvas, width, steps };
}

function rootedFrames(image: HTMLCanvasElement, sway: number): BendFrames {
  return bendFrames(image.width + 2 * sway, image.height, sway, (ctx, amount) => {
    const rowShift = (y: number): number => Math.round(amount * (1 - y / (image.height - 1)) ** 2);
    for (let top = 0; top < image.height;) {
      const shift = rowShift(top);
      let bottom = top + 1;
      while (bottom < image.height && rowShift(bottom) === shift) bottom++;
      const rows = bottom - top;
      ctx.drawImage(image, 0, top, image.width, rows, sway + shift, top, image.width, rows);
      top = bottom;
    }
  });
}

function bambooFrames(image: HTMLCanvasElement, width: number, height: number): BendFrames {
  const scaled = memoryCanvas(width, height);
  scaled.ctx.imageSmoothingEnabled = false;
  scaled.ctx.drawImage(image, 0, 0, width, height);
  return rootedFrames(scaled.canvas, BAMBOO_SWAY);
}

function plant(frames: BendFrames, left: number, top: number, phaseX: number, pad: number): Plant {
  return { frames, left: Math.round(left) - pad, top: Math.round(top), phaseX };
}

function drawPlant(ctx: CanvasRenderingContext2D, time: number, item: Plant): void {
  const { image, width, steps } = item.frames;
  const step = steps + Math.round(breeze(time, item.phaseX) * steps);
  ctx.drawImage(image, step * width, 0, width, image.height, item.left, item.top, width, image.height);
}

function maple(width: number): Plant {
  const reach = Math.min(width * 0.29, MAPLE_MAX_REACH);
  // Leave room for the widest leaf oval and the lowest twig endpoint.
  const leafMargin = 12;
  const canopyHeight = 73;
  const canopyWidth = Math.ceil(Math.max(MAPLE_BRANCH_LENGTH, reach) + 2 * leafMargin);
  const frames = bendFrames(canopyWidth + 2 * MAPLE_SWAY, canopyHeight, MAPLE_SWAY, (ctx, amount) => {
    const origin = leafMargin + MAPLE_SWAY;
    const bend = (x: number): number => Math.round(amount * Math.min(1, x / reach));
    for (let n = 0; n < MAPLE_BRANCH_LENGTH; n++) {
      const y = 20 + n * 0.2;
      ctx.fillStyle = '#514438';
      ctx.fillRect(origin + n + bend(n), Math.round(y), 3, Math.max(1, 8 - Math.floor(n / 15)));
    }
    for (let n = 0; n < MAPLE_CLUSTERS; n++) {
      const reachX = hash(n + 45) * reach;
      const rootX = Math.max(0, reachX - 15);
      const x = origin + reachX + bend(reachX);
      const y = 8 + hash(n + 94) * 55;
      line(ctx, x, y + 9, origin + rootX + bend(rootX), 24, '#61513c');
      oval(ctx, x, y, 6 + hash(n) * 5, 3 + hash(n + 1) * 3, n % 3 ? '#ad6444' : '#cc8b54');
      line(ctx, x - 2, y - 2, x + 2, y - 2, '#e1a36a');
    }
  });
  return plant(frames, -leafMargin, 0, reach / 2, MAPLE_SWAY);
}

function lilyFrames(flower: boolean): BendFrames {
  // The bottom edge of the pad sits on the water, with the blossom above it.
  const centerX = 7;
  const centerY = 5;
  const { canvas, ctx } = memoryCanvas(2 * centerX + 1, centerY + 4);
  oval(ctx, centerX, centerY, 7, 3, '#385f46');
  line(ctx, centerX - 3, centerY - 1, centerX + 4, centerY - 1, '#78955a');
  line(ctx, centerX, centerY, centerX + 6, centerY + 3, '#527d73');
  if (flower) {
    oval(ctx, centerX, centerY - 3, 3, 2, '#dfc6b3');
    ctx.fillStyle = '#e4c77b';
    ctx.fillRect(centerX, centerY - 3, 1, 1);
  }
  return rootedFrames(canvas, POND_PLANT_SWAY);
}

/** Resize-time sprites keep the per-frame work to one blit per plant. */
export class GardenPlants {
  private readonly distant: Plant[] = [];
  private readonly behindGrove: Plant[] = [];
  private readonly grove: Plant[] = [];
  private readonly frontBamboo: Plant[];
  private readonly grass: Plant[] = [];
  private readonly lilies: Plant[] = [];
  private readonly maple: Plant;

  constructor(width: number, bamboo: HTMLCanvasElement) {
    const distant = bambooFrames(bamboo, 30, 187);
    const behindGrove = bambooFrames(bamboo, 30, 170);
    const grove = rootedFrames(bamboo, BAMBOO_SWAY);
    for (let i = 0; i < BAMBOO_CLUMPS; i++) {
      const farX = i < LEFT_CLUMPS ? i * 21 - 25 : width - (i - LEFT_CLUMPS) * 18;
      this.distant.push(plant(distant, farX, -32, farX, BAMBOO_SWAY));
      this.behindGrove.push(plant(behindGrove, farX, 8, farX, BAMBOO_SWAY));
      const x = i < LEFT_CLUMPS ? i * 23 - 15 : width - (i - LEFT_CLUMPS) * 26 - 20;
      if (x > width * 0.31 && x < width * 0.67) continue;
      this.grove.push(plant(grove, x, 17, x, BAMBOO_SWAY));
    }
    this.frontBamboo = [
      plant(bambooFrames(bamboo, 40, 220), -12, 50, -12, BAMBOO_SWAY),
      plant(bambooFrames(bamboo, 40, 233), width - 25, 37, width - 25, BAMBOO_SWAY),
    ];
    for (let i = 0; i < GRASS_TUFTS; i++) {
      const x = hash(i + 16) * width;
      if (x > width * 0.37 && x < width * 0.65) continue;
      const y = 254 + hash(i + 82) * 16;
      // Crop each tuft around its four blades, with the shared root on the last row.
      const left = Math.round(x) - 5;
      const top = Math.round(y) - 8;
      const tuft = memoryCanvas(10, 17);
      for (let blade = 0; blade < 4; blade++) {
        line(tuft.ctx, x - left, y + 8 - top, x + blade * 3 - 5 - left, y - hash(i + blade) * 8 - top, '#3b533c');
      }
      this.grass.push(plant(rootedFrames(tuft.canvas, GRASS_SWAY), left, top, x, GRASS_SWAY));
    }
    const pads = lilyFrames(false);
    const blossoms = lilyFrames(true);
    for (let i = 0; i < LILY_PADS; i++) {
      const x = width * 0.60 + hash(i + 53) * width * 0.18;
      const y = 204 + hash(i + 99) * 18;
      this.lilies.push(plant(i % 3 === 0 ? blossoms : pads, x - 7, y - 5, x, POND_PLANT_SWAY));
    }
    this.maple = maple(width);
  }

  drawBackground(ctx: CanvasRenderingContext2D, scene: number, time: number): void {
    const plants = scene === 2 ? this.behindGrove : this.distant;
    for (let i = 0; i < plants.length; i++) drawPlant(ctx, time, plants[i]);
    if (scene === 2) {
      for (let i = 0; i < this.grove.length; i++) drawPlant(ctx, time, this.grove[i]);
    }
  }

  drawPond(ctx: CanvasRenderingContext2D, time: number): void {
    for (let i = 0; i < this.lilies.length; i++) drawPlant(ctx, time, this.lilies[i]);
  }

  drawForeground(ctx: CanvasRenderingContext2D, scene: number, time: number): void {
    if (scene === 0 || scene === 4) drawPlant(ctx, time, this.maple);
    for (let i = 0; i < this.grass.length; i++) drawPlant(ctx, time, this.grass[i]);
    if (scene === 2) {
      for (let i = 0; i < this.frontBamboo.length; i++) drawPlant(ctx, time, this.frontBamboo[i]);
    }
  }
}
