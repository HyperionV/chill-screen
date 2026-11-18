import { memoryCanvas } from '../../../render/pixel-stage';
import { breeze } from '../../wind';
import { dither, rect } from './pixels';
import { hollowX, HOLLOW_SCENE, HOLLOW_Y, hutX, trailLampX, TRAIL_LAMP_Y, TRAIL_SCENE, type MushroomPatch } from './scenes';

const MOON = '#a0cdc9';
const SPORE_LIGHT = '#a1e0a7';
const AMBER = '#f8c780';
const GILL_HEIGHTS = [7, 12, 9, 5];
const GILL_SPACING = 7;
const FLICKER_RATE = 0.64;
const LAMP_SWAY = 2;
const HALO_RINGS = [
  { edge: 0.23, alpha: 0.48, coverage: 1 },
  { edge: 0.49, alpha: 0.24, coverage: 0.9 },
  { edge: 1, alpha: 0.14, coverage: 0.65 },
];

// The broad ring thins into individual pixels so light still shows the surface beneath.
export function halo(radiusX: number, radiusY: number, color: string): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(radiusX * 2 + 1, radiusY * 2 + 1);
  ctx.fillStyle = color;
  for (let y = -radiusY; y <= radiusY; y++) {
    for (let x = -radiusX; x <= radiusX; x++) {
      const distance = (x / radiusX) ** 2 + (y / radiusY) ** 2;
      const ring = HALO_RINGS.find(({ edge }) => distance < edge);
      if (!ring || dither(x, y) > ring.coverage * (1 - distance)) continue;
      ctx.globalAlpha = ring.alpha;
      ctx.fillRect(x + radiusX, y + radiusY, 1, 1);
    }
  }
  return canvas;
}

function stamp(c: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number): void {
  const left = Math.round(x - sprite.width / 2 + 0.5);
  if (left + sprite.width <= 0 || left >= c.canvas.width) return;
  c.drawImage(sprite, left, Math.round(y - sprite.height / 2 + 0.5));
}

function tremble(time: number, phase = 0): number {
  return 0.91 + Math.sin(time * FLICKER_RATE + phase) * 0.09;
}

export function luminousMushrooms(c: CanvasRenderingContext2D, x: number, y: number): void {
  for (let i = 0; i < GILL_HEIGHTS.length; i++) {
    const stem = x + i * GILL_SPACING;
    const cap = y - GILL_HEIGHTS[i];
    rect(c, '#344c45', stem - 3, y, 8, 2);
    rect(c, '#699a7f', stem, cap + 1, 2, GILL_HEIGHTS[i] - 1);
    rect(c, '#aacba1', stem, cap + 2, 1, GILL_HEIGHTS[i] - 3);
    rect(c, '#527964', stem - 3, cap - 2, 8, 4);
    rect(c, '#7eac83', stem - 2, cap - 3, 6, 2);
    rect(c, '#b7dca2', stem - 3, cap + 1, 8, 1);
    rect(c, '#d4e6ae', stem - 1, cap - 3, 2, 1);
  }
}

export class ForestLights {
  private readonly hollow = halo(24, 23, AMBER);
  private readonly hollowRim = halo(30, 27, MOON);
  private readonly cap = halo(9, 7, SPORE_LIGHT);
  private readonly capSpill = halo(23, 7, SPORE_LIGHT);
  private readonly lamp = halo(18, 21, AMBER);
  private readonly window = halo(24, 17, AMBER);
  private readonly lampSpill = halo(27, 9, AMBER);
  private readonly firefly = halo(4, 4, '#e7ecad');

  draw(c: CanvasRenderingContext2D, scene: number, width: number, time: number, night: number,
    patches: readonly MushroomPatch[]): void {
    if (scene === HOLLOW_SCENE) {
      const x = Math.round(hollowX(width));
      const glow = (0.2 + night * 0.8) * tremble(time);
      c.globalAlpha = night * 0.65;
      stamp(c, this.hollowRim, x - 3, HOLLOW_Y - 17);
      c.globalAlpha = glow;
      stamp(c, this.hollow, x, HOLLOW_Y - 11);
      rect(c, '#deb47c', x - 9, HOLLOW_Y + 3, 19, 1);
      rect(c, '#f2c590', x - 5, HOLLOW_Y + 3, 8, 1);
      for (const patch of patches) {
        const light = (0.15 + night * 0.85) * tremble(time, patch.x * 0.03);
        c.globalAlpha = light;
        stamp(c, this.capSpill, patch.x + GILL_SPACING * 1.5, patch.y + 1);
        for (let i = 0; i < GILL_HEIGHTS.length; i++) {
          const x = patch.x + i * GILL_SPACING;
          const cap = patch.y - GILL_HEIGHTS[i];
          stamp(c, this.cap, x + 1, cap);
          rect(c, '#dff4ae', x - 1, cap + 1, 5, 1);
        }
      }
    }
    if (scene === TRAIL_SCENE) {
      const hook = Math.round(trailLampX(width));
      const sway = Math.round(breeze(time, hook) * LAMP_SWAY);
      const x = hook + sway;
      const windowX = Math.round(hutX(width) + 17);
      const glow = (0.18 + night * 0.82) * tremble(time, 1.3);
      c.globalAlpha = glow;
      stamp(c, this.lampSpill, x - 5, 202);
      stamp(c, this.lamp, x, TRAIL_LAMP_Y);
      stamp(c, this.window, windowX, 169);
      c.globalAlpha = 1;
      for (let row = 0; row < 7; row++) {
        rect(c, '#57553d', hook + Math.round(sway * row / 7), TRAIL_LAMP_Y - 14 + row, 1, 1);
      }
      rect(c, '#303c30', x - 4, TRAIL_LAMP_Y - 6, 8, 12);
      rect(c, '#947d4c', x - 2, TRAIL_LAMP_Y - 3, 4, 6);
      rect(c, '#625b40', x - 5, TRAIL_LAMP_Y - 7, 10, 2);
      c.globalAlpha = glow;
      rect(c, '#f5ce87', x - 2, TRAIL_LAMP_Y - 2, 4, 5);
      rect(c, '#fff0b9', x - 1, TRAIL_LAMP_Y - 1, 2, 3);
      rect(c, '#e6b975', windowX - 5, 164, 4, 4);
      rect(c, '#e6b975', windowX + 2, 164, 4, 4);
      rect(c, '#ebba75', windowX - 5, 172, 4, 3);
      rect(c, '#ebba75', windowX + 2, 172, 4, 3);
    }
    c.globalAlpha = 1;
  }

  drawFirefly(c: CanvasRenderingContext2D, x: number, y: number, light: number): void {
    if (x < -4 || x >= c.canvas.width + 4 || y < -4 || y >= c.canvas.height + 4) return;
    c.globalAlpha = light * 0.7;
    stamp(c, this.firefly, x, y);
    c.globalAlpha = light;
    c.fillStyle = '#e6ebaa';
    c.fillRect(x, y, 1, 1);
  }
}
