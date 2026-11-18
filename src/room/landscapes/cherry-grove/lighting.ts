import { memoryCanvas } from '../../../render/pixel-stage';
import type { RGB } from '../../../render/color';
import { hash } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';
import { DESIGN_HEIGHT, GROUND_ROW, SCENES, STONE_WINDOW_RISE, stoneX, waterSpan, type Scene } from './scenes';
import { rect, sprite, type Sprites } from './sprites';

interface GlowBand {
  edge: number;
  color: RGB;
  alpha: number;
}

interface Reflection {
  wash: HTMLCanvasElement;
  ripples: HTMLCanvasElement;
  x: number;
  y: number;
}

interface Light {
  kind: 'paper' | 'stone';
  anchorX: number;
  y: number;
  switchIndex: number;
  x: number;
  power: number;
  bloom: number;
  reflection: Reflection | null;
}

const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];
const HALO: readonly GlowBand[] = [
  { edge: 0.12, color: [255, 230, 177], alpha: 0.82 },
  { edge: 0.35, color: [255, 191, 131], alpha: 0.48 },
  { edge: 0.62, color: [249, 151, 119], alpha: 0.24 },
  { edge: 0.84, color: [233, 125, 121], alpha: 0.11 },
  { edge: 1, color: [233, 125, 121], alpha: 0 },
];
const SPILL: readonly GlowBand[] = [
  { edge: 0.08, color: [255, 197, 149], alpha: 0.38 },
  { edge: 0.34, color: [250, 169, 132], alpha: 0.28 },
  { edge: 0.67, color: [237, 143, 129], alpha: 0.14 },
  { edge: 0.87, color: [232, 133, 130], alpha: 0.06 },
  { edge: 1, color: [232, 133, 130], alpha: 0 },
];
const PAPER_HALO_RX = 31;
const PAPER_HALO_RY = 34;
const STONE_HALO_RX = 24;
const STONE_HALO_RY = 22;
const BRANCH_REACH_X = 53;
const BRANCH_REACH_Y = 52;
const POOL_RX = 49;
const POOL_RY = 18;
const PAPER_POOL_DROP = 61;
const REFLECTION_RX = 62;
const REFLECTION_Y = 108;
const PAPER_CENTER_RISE = 7;
const PAPER_HIT_RADIUS = 12;
const STONE_HIT_HALF_WIDTH = 14;
const STONE_HIT_RISE = 52;
const LANTERN_SECONDS = 35;
const BLOOM_SECONDS = 3;
const MIN_LIGHT = 0.02;
const FLICKER_RATE = 1.13; // Radians per second, so the paper brightens over several seconds.
const PHASE_STEP = 2.4;
const CLEARING_LIGHT = 0.85;
const WARM_WATER: RGB = [255, 170, 146];
const WARM_RIPPLE: RGB = [255, 206, 160];

function dither(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / BAYER.length;
}

function pixel(data: Uint8ClampedArray, offset: number, color: RGB, alpha: number): void {
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  data[offset + 3] = Math.round(alpha * 255);
}

function glow(rx: number, ry: number, bands: readonly GlowBand[]): HTMLCanvasElement {
  const width = rx * 2 + 1;
  const height = ry * 2 + 1;
  const { canvas, ctx } = memoryCanvas(width, height);
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot((x - rx) / rx, (y - ry) / ry);
      if (distance >= 1) continue;
      let band = bands[0];
      for (let i = 1; i < bands.length; i++) {
        const next = bands[i];
        if (distance <= band.edge) break;
        const t = (distance - band.edge) / (next.edge - band.edge);
        if (t < dither(x, y)) break;
        band = next;
        if (distance <= band.edge) break;
      }
      pixel(image.data, (y * width + x) * 4, band.color, band.alpha);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function reflection(scene: Scene, light: Light, width: number): Reflection | null {
  if (!scene.water) return null;
  const left = Math.max(0, light.anchorX - REFLECTION_RX);
  const right = Math.min(width, light.anchorX + REFLECTION_RX + 1);
  const top = Math.max(GROUND_ROW, light.y + 2);
  const bottom = Math.min(DESIGN_HEIGHT, light.y + REFLECTION_Y);
  if (right <= left || bottom <= top) return null;
  const w = right - left;
  const h = bottom - top;
  const wash = memoryCanvas(w, h);
  const ripples = memoryCanvas(w, h);
  const image = wash.ctx.createImageData(w, h);
  const flecks = ripples.ctx.createImageData(w, h);
  for (let y = top; y < bottom; y++) {
    const bank = waterSpan(scene, y, width);
    if (!bank) continue;
    const bankLeft = Math.round(bank[0]);
    const bankRight = bankLeft + Math.max(1, Math.round(bank[1] - bank[0]));
    const start = Math.max(left, bankLeft);
    const end = Math.min(right, bankRight);
    const depth = (y - light.y) / REFLECTION_Y;
    const shift = Math.round(Math.sin(y * 1.8) * 4);
    const rippleRow = y % 3 === 0 || y % 7 === 0;
    for (let x = start; x < end; x++) {
      const across = (x - light.anchorX) / REFLECTION_RX;
      const falloff = Math.max(0, 1 - across * across - depth * depth) ** 2;
      const offset = ((y - top) * w + x - left) * 4;
      if (falloff > dither(x, y)) pixel(image.data, offset, WARM_WATER, falloff * 0.42);
      // Broken horizontal strokes keep the reflection legible as water.
      if (rippleRow && hash(Math.floor((x + shift) / 7) + y * 19) < falloff * 0.72) {
        pixel(flecks.data, offset, WARM_RIPPLE, falloff * 0.84);
      }
    }
  }
  wash.ctx.putImageData(image, 0, 0);
  ripples.ctx.putImageData(flecks, 0, 0);
  return { wash: wash.canvas, ripples: ripples.canvas, x: left, y: top };
}

export class GroveLighting {
  private readonly paperHalo = glow(PAPER_HALO_RX, PAPER_HALO_RY, HALO);
  private readonly stoneHalo = glow(STONE_HALO_RX, STONE_HALO_RY, HALO);
  private readonly branchSpill = glow(BRANCH_REACH_X, BRANCH_REACH_Y, SPILL);
  private readonly pool = glow(POOL_RX, POOL_RY, SPILL);
  private readonly paper = pixmap([
    '.hhhhhh.',
    'orgrgrro',
    'orgygyro',
    'orywgyro',
    'orywyyro',
    'orywgyro',
    'orgrgrro',
    '.rrrrrr.',
  ], { h: '#ed997d', o: '#e5917c', r: '#f3aa85', g: '#ffd296', y: '#ffe3ad', w: '#fff2cc' });
  private readonly stone = pixmap([
    '.rrrrrr.',
    'rgyrgygr',
    'rywrwygr',
    'rywrwygr',
    'rggggggr',
  ], { r: '#d18e71', g: '#f6ac78', y: '#ffd193', w: '#ffe9b7' });
  private readonly switches = SCENES.map((scene) => new Float32Array(scene.lanterns.length + scene.stones.length - 1));
  private layouts: Light[][] = [];
  private active: readonly Light[] = [];
  private spillStrength = 0;

  resize(width: number): void {
    this.active = [];
    this.layouts = SCENES.map((scene) => {
      const lights: Light[] = scene.lanterns.map((lamp, i) =>
        this.makeLight(scene, 'paper', Math.round(lamp.u * width), lamp.y - PAPER_CENTER_RISE, i, width));
      scene.stones.forEach((stone, i) => {
        // The original stone and first paper lantern still share a switch.
        const switchIndex = i === 0 ? 0 : scene.lanterns.length + i - 1;
        lights.push(this.makeLight(scene, 'stone', stoneX(scene, stone, width), stone.y - STONE_WINDOW_RISE, switchIndex, width));
      });
      return lights;
    });
  }

  private makeLight(scene: Scene, kind: Light['kind'], x: number, y: number, switchIndex: number, width: number): Light {
    const light: Light = { kind, anchorX: x, x, y, switchIndex, power: 0, bloom: 0, reflection: null };
    light.reflection = reflection(scene, light, width);
    return light;
  }

  press(x: number, y: number, chapter: number): boolean {
    for (const light of this.layouts[chapter]) {
      const hit = light.kind === 'paper'
        ? Math.abs(x - light.anchorX) < PAPER_HIT_RADIUS && Math.abs(y - light.y) < PAPER_HIT_RADIUS
        : Math.abs(x - light.anchorX) < STONE_HIT_HALF_WIDTH
          && y > light.y + STONE_WINDOW_RISE - STONE_HIT_RISE && y < light.y + STONE_WINDOW_RISE + 3;
      if (hit) {
        this.switches[chapter][light.switchIndex] = LANTERN_SECONDS;
        return true;
      }
    }
    return false;
  }

  update(dt: number): void {
    for (const timers of this.switches) {
      for (let i = 0; i < timers.length; i++) timers[i] = Math.max(0, timers[i] - dt);
    }
  }

  prepare(chapter: number, time: number, night: number, gust: number): void {
    this.active = this.layouts[chapter];
    this.spillStrength = 0.36 + night * 0.64;
    for (let i = 0; i < this.active.length; i++) {
      const light = this.active[i];
      const paper = light.kind === 'paper';
      const timer = this.switches[chapter][light.switchIndex];
      const lit = Math.max(night, paper && chapter === 4 ? CLEARING_LIGHT : 0, Math.min(1, timer / BLOOM_SECONDS));
      const phase = i * PHASE_STEP;
      const flicker = 0.92 + Math.sin(time * FLICKER_RATE + phase) * 0.06 + Math.sin(time * 0.48 - phase) * 0.02;
      light.power = lit * flicker;
      light.bloom = Math.max(0, (timer - (LANTERN_SECONDS - BLOOM_SECONDS)) / BLOOM_SECONDS);
      light.x = paper ? Math.round(light.anchorX + Math.sin(time * 0.5 + i) + gust * 0.15) : light.anchorX;
    }
  }

  drawWater(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    for (const light of this.active) {
      const surface = light.reflection;
      if (!surface || light.power <= MIN_LIGHT) continue;
      ctx.globalAlpha = light.power * this.spillStrength;
      ctx.drawImage(surface.wash, surface.x, surface.y);
      ctx.globalAlpha *= 0.8 + Math.sin(time * 0.86 + light.y) * 0.2;
      ctx.drawImage(surface.ripples, surface.x, surface.y);
    }
    ctx.restore();
  }

  drawSpill(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    for (const light of this.active) {
      if (light.power <= MIN_LIGHT) continue;
      const paper = light.kind === 'paper';
      ctx.globalAlpha = Math.min(1, light.power + light.bloom * 0.18) * this.spillStrength;
      ctx.drawImage(this.branchSpill, light.x - BRANCH_REACH_X, light.y - BRANCH_REACH_Y);
      // Pool light on the ground below the paper, or around the foot of the stone pedestal.
      ctx.globalAlpha *= paper ? 0.62 : 0.93;
      const poolY = light.y + (paper ? PAPER_POOL_DROP : STONE_WINDOW_RISE);
      ctx.drawImage(this.pool, light.x - POOL_RX, poolY - POOL_RY);
    }
    ctx.restore();
  }

  drawLanterns(ctx: CanvasRenderingContext2D, assets: Sprites): void {
    ctx.save();
    for (const light of this.active) {
      if (light.power <= MIN_LIGHT) continue;
      const paper = light.kind === 'paper';
      ctx.globalAlpha = Math.min(1, light.power + light.bloom * 0.24) * (0.48 + this.spillStrength * 0.52);
      ctx.drawImage(paper ? this.paperHalo : this.stoneHalo,
        light.x - (paper ? PAPER_HALO_RX : STONE_HALO_RX), light.y - (paper ? PAPER_HALO_RY : STONE_HALO_RY));
    }
    for (const light of this.active) {
      const paper = light.kind === 'paper';
      if (paper) {
        ctx.globalAlpha = 1;
        rect(ctx, '#725761', light.x, light.y - 22, 1, 17);
        sprite(ctx, assets.lantern, light.x, light.y + PAPER_CENTER_RISE);
      }
      if (light.power <= MIN_LIGHT) continue;
      ctx.globalAlpha = light.power;
      ctx.drawImage(paper ? this.paper : this.stone, light.x - 4, light.y - (paper ? 4 : 3));
    }
    ctx.restore();
  }

  petalLight(x: number, y: number): number {
    let glow = 0;
    for (const light of this.active) {
      if (light.power <= MIN_LIGHT) continue;
      const dx = (x - light.x) / BRANCH_REACH_X;
      const dy = (y - light.y) / BRANCH_REACH_Y;
      const falloff = Math.max(0, 1 - dx * dx - dy * dy);
      glow = Math.max(glow, falloff * falloff * light.power);
    }
    return glow;
  }
}
