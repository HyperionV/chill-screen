import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';
import { breeze } from '../../wind';
import { dither, rect } from './pixels';
import {
  CHAPTERS, DESIGN_HEIGHT, GROUND_ROW, HOLLOW_SCENE, MEADOW_SCENE,
  STREAM_SCENE, streamHalfWidth, streamX, TRAIL_SCENE, type MushroomPatch,
} from './scenes';
import { fernSprite } from './sprites';

const FLOOR_GRAIN = 2.7;
const PLANT_COUNT = 55;
const FERN_STRIP = 3;
const FERN_BEND = 3;
const SHADOW_TONES = ['#3a594e', '#426258', '#506b4b', '#42645c', '#485d50'];
const GROUND_TONES = ['#516e55', '#52725e', '#6d8654', '#547869', '#5e7658'];
const MOSS_TONES = ['#829357', '#7b9969', '#8ba262', '#8fae7d', '#80945e'];

function trailLeft(width: number, y: number): number {
  return width * 0.47 - (y - 175) * 0.95;
}

function trailSpan(y: number): number {
  return 8 + (y - 175) * 0.38;
}

export function paintFloor(c: CanvasRenderingContext2D, width: number, scene: number): void {
  for (let x = 0; x < width; x++) {
    const top = Math.round(GROUND_ROW + noise(x * 0.017 + scene * 4) * 13);
    const foreground = Math.round(224 + noise(x * 0.035 + scene) * 15);
    rect(c, GROUND_TONES[scene], x, top, 1, DESIGN_HEIGHT - top);
    rect(c, '#789580', x, top, 1, 2 + Math.floor(noise(x * 0.15) * 3));
    rect(c, SHADOW_TONES[scene], x, foreground, 1, DESIGN_HEIGHT - foreground);
  }

  // A noisy edge keeps each moss cushion from reading as a circle stamped on the floor.
  for (let i = 0; i < Math.min(39, Math.ceil(width / 13)); i++) {
    const x = Math.round(hash(i * 17 + scene + 18) * width);
    const y = 184 + Math.round(hash(i * 7 + 35) * 82);
    const radius = 7 + Math.floor(hash(i * 3 + 17) * 19);
    for (let dy = -4; dy <= 6; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = (dx / radius) ** 2 + (dy / 6) ** 2;
        const density = 1.15 - distance + (hash(dx * 19 + dy * 31 + i * 11) - 0.5) * 0.26;
        if (dither(x + dx, y + dy) >= density) continue;
        const color = dy < -1 ? MOSS_TONES[scene] : dy < 3 ? '#69855b' : '#476a50';
        rect(c, color, x + dx, y + dy, 1, 1);
      }
    }
  }

  for (let i = 0; i < width * FLOOR_GRAIN; i++) {
    const x = Math.floor(hash(i * 7 + scene) * width);
    const y = 183 + Math.floor(hash(i * 13 + 9) * 87);
    const tone = hash(i + 3);
    rect(c, tone < 0.3 ? MOSS_TONES[scene] : tone < 0.6 ? '#5b7957' : SHADOW_TONES[scene], x, y, 1 + i % 3, 1);
    if (i % 13 === 0) {
      rect(c, '#79846a', x - 2, y + 1, 2, 1);
      rect(c, '#a6986c', x, y, 3, 1);
      if (i % 2 === 0) rect(c, '#c0a97e', x + 2, y - 1, 2, 1);
    }
    if (i % 49 === 0 && y > 207) {
      rect(c, '#464d3d', x - 2, y, 7, 2);
      rect(c, '#746449', x, y - 3, 4, 4);
      rect(c, '#a08d65', x + 1, y - 3, 2, 1);
      rect(c, '#a08d65', x, y - 1, 2, 1);
    }
  }

  if (scene === TRAIL_SCENE) {
    for (let y = 175; y < DESIGN_HEIGHT; y++) {
      const left = trailLeft(width, y);
      const span = trailSpan(y);
      rect(c, '#73806a', left - 2, y, span + 4, 1);
      rect(c, '#928569', left, y, span, 1);
      for (let j = 0; j < 3; j++) rect(c, '#ad9a75', left + hash(y * 3 + j) * span, y, 1, 1);
      if (y % 3 === 0) rect(c, '#706f57', left + span * 0.38, y, span * 0.21, 1);
    }
  }
}

interface Plant {
  x: number;
  y: number;
  poses: readonly HTMLCanvasElement[];
}

// Cache each bent silhouette so a plant takes a single draw even during a dissolve.
function windPoses(sprite: HTMLCanvasElement, scale = 1): HTMLCanvasElement[] {
  const width = Math.round(sprite.width * scale);
  const height = Math.round(sprite.height * scale);
  return Array.from({ length: FERN_BEND * 2 + 1 }, (_, i) => {
    const bend = i - FERN_BEND;
    const { canvas, ctx } = memoryCanvas(width + FERN_BEND * 2, height);
    ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < sprite.height; row += FERN_STRIP) {
      const rows = Math.min(FERN_STRIP, sprite.height - row);
      const top = Math.round(row * scale);
      const bottom = Math.round((row + rows) * scale);
      const sway = Math.round(bend * Math.max(0, 1 - row / (sprite.height - FERN_STRIP)));
      ctx.drawImage(sprite, 0, row, sprite.width, rows, FERN_BEND + sway, top, width, bottom - top);
    }
    return canvas;
  });
}

export class ForestFloor {
  private readonly ferns = [fernSprite(), fernSprite(true)]
    .map((sprite) => [windPoses(sprite), windPoses(sprite, 1.5)]);
  private readonly grass = windPoses(pixmap([
    '.l...l...', '..l..l..l', '..lm.l.l.', '...mmlm..', '...dmd...', '....d....',
  ], { l: '#a2ae73', m: '#708d59', d: '#466a4e' }));
  private readonly flowers = windPoses(pixmap([
    '.ww..g...', 'www.ggg..', '..m..m...', '..ml.m.l.', '...mmlm..', '...dmd...', '....d....',
  ], { w: '#e1dcba', g: '#dfc47f', l: '#9dad69', m: '#708d59', d: '#466a4e' }));
  private plants: Plant[][] = [];

  resize(width: number, patches: readonly MushroomPatch[]): void {
    this.plants = Array.from({ length: CHAPTERS.length }, (_, scene) => {
      const plants: Plant[] = [];
      const ferns = this.ferns[scene === HOLLOW_SCENE ? 1 : 0];
      for (let i = 0; i < PLANT_COUNT; i++) {
        const x = hash(i * 23 + scene * 13) * width;
        const y = Math.round(191 + hash(i * 31 + 4) * 79);
        if (x > width * 0.38 && x < width * 0.64 && y > 197) continue;
        if (scene === STREAM_SCENE && Math.abs(x - streamX(width, y)) < streamHalfWidth(y) + 12) continue;
        if (scene === TRAIL_SCENE && x >= trailLeft(width, y) - 9 && x <= trailLeft(width, y) + trailSpan(y) + 9) continue;
        if (scene === HOLLOW_SCENE && patches.some((patch) =>
          Math.abs(x - patch.x - 10) < 24 && y >= patch.y - 3 && y <= patch.y + 15)) continue;
        const poses = i % 3 === 0 ? ferns[y > 242 ? 1 : 0]
          : scene === MEADOW_SCENE && i % 2 === 0 ? this.flowers : this.grass;
        plants.push({ x, y, poses });
      }
      return plants;
    });
  }

  draw(c: CanvasRenderingContext2D, scene: number, time: number): void {
    for (const { x, y, poses } of this.plants[scene]) {
      const bend = Math.round(breeze(time, x) * FERN_BEND);
      const sprite = poses[FERN_BEND + bend];
      c.drawImage(sprite, Math.round(x - sprite.width / 2), y - sprite.height);
    }
  }
}
