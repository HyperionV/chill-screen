import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import { breeze, gust } from '../../wind';
import { halo } from './lighting';
import { dither } from './pixels';
import { CLOCK_BOTTOM, CLOCK_TOP, DESIGN_HEIGHT, HOLLOW_SCENE, hutX, MEADOW_SCENE, MISTY_SCENE, TRAIL_SCENE } from './scenes';

const SHAFT_HEIGHT = 217;
const SHAFT_SLOPE = 0.27;
const SHAFT_ORIGIN = 25;
const SHAFT_WIDTH = 120;
const CLOCK_FEATHER = 12;
const MIST_WIDTH = 164;
const MIST_HEIGHT = 28;
const MIST_TRAVEL = 19;
const SMOKE_COUNT = 5;
const SEED_COUNT = 14;
const SEED_CALM_SPEED = 2.3;
const SEED_GUST_SPEED = 4.6;
const MOON = '#b2dcd8';
const SUN = '#ffe1a8';

// Each clearing has gaps that send light to different parts of the floor.
const GAPS = [
  [0.08, 0.27, 0.59, 0.77],
  [0.05, 0.35, 0.55, 0.76],
  [0.12, 0.31, 0.57, 0.80],
  [0.07, 0.23, 0.57, 0.69],
  [0.10, 0.25, 0.49, 0.71],
];

function shaftCenter(y: number, variant: number): number {
  return SHAFT_ORIGIN + y * (SHAFT_SLOPE - variant * 0.04);
}

function shaftHalfWidth(y: number, variant: number): number {
  return 4 + y * (0.063 + variant * 0.009);
}

function clockFade(y: number): number {
  return Math.max(0, Math.min(1, (y - CLOCK_TOP) / CLOCK_FEATHER, (CLOCK_BOTTOM - y) / CLOCK_FEATHER));
}

function buildShaft(color: string, variant: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(SHAFT_WIDTH, SHAFT_HEIGHT);
  ctx.fillStyle = color;
  for (let y = 0; y < SHAFT_HEIGHT; y++) {
    const center = shaftCenter(y, variant);
    const half = shaftHalfWidth(y, variant);
    const floorFade = Math.min(1, (SHAFT_HEIGHT - y) / 26);
    const visibility = 1 - clockFade(y) * 0.44;
    const edgeNoise = (noise(y * 0.08 + variant * 17) - 0.5) * 0.32;
    for (let x = Math.floor(center - half); x <= center + half; x++) {
      const distance = Math.abs(x - center) / half;
      const brokenEdge = 1 - distance + edgeNoise;
      if (dither(x, y) >= brokenEdge * floorFade) continue;
      ctx.globalAlpha = (distance < 0.27 ? 0.34 : distance < 0.58 ? 0.19 : 0.10) * visibility;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function buildMist(seed: number): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(MIST_WIDTH, MIST_HEIGHT);
  for (let x = 0; x < MIST_WIDTH; x++) {
    const taper = Math.min(1, x / 33, (MIST_WIDTH - x) / 33);
    const crest = Math.round(9 - noise(x * 0.043 + seed) * 7);
    const depth = Math.round(taper * (11 + noise(x * 0.027 + seed * 2) * 8));
    for (let row = 0; row < depth; row++) {
      const y = crest + row;
      if (dither(x, y) > taper * (1 - row / depth)) continue;
      ctx.fillStyle = row < 3 ? '#badbd6' : row < 8 ? '#8fbcb8' : '#739e9f';
      ctx.globalAlpha = row < 3 ? 0.48 : row < 8 ? 0.31 : 0.19;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

export class ForestAir {
  private seedTravel = 0;
  private readonly shafts = [0, 1].map((variant) => ({
    moon: buildShaft(MOON, variant), sun: buildShaft(SUN, variant),
  }));
  private readonly banks = [buildMist(8), buildMist(21), buildMist(54)];
  private readonly pool = halo(28, 7, '#a0cdc9');
  private readonly smoke = halo(8, 5, '#bfcbc0');
  private readonly motes = Array.from({ length: 7 }, (_, i) => ({
    phase: hash(i * 41), side: hash(i * 29 + 4) - 0.5, speed: 0.023 + hash(i * 7) * 0.018,
  }));
  private readonly seeds = Array.from({ length: SEED_COUNT }, (_, i) => ({
    x: hash(i * 19 + 7), y: hash(i * 23 + 4), phase: hash(i * 47) * Math.PI * 2,
  }));

  advance(dt: number, time: number): void {
    this.seedTravel += dt * (SEED_CALM_SPEED + gust(time) * SEED_GUST_SPEED);
  }

  drawLight(c: CanvasRenderingContext2D, scene: number, time: number, state: SkyState): void {
    const width = c.canvas.width;
    const night = 1 - state.day;
    const hollow = scene === HOLLOW_SCENE;
    const moon = night * (0.78 + Math.max(0, state.moon.up) * 0.22) * (hollow ? 0.91 : 0.4);
    const lowSun = Math.max(0, 1 - state.sun.up / 0.7);
    const sun = state.day * (0.23 + lowSun * 0.53);
    const gaps = GAPS[scene];
    for (let i = 0; i < gaps.length; i++) {
      const variant = i % this.shafts.length;
      const art = this.shafts[variant];
      const x = Math.round(width * gaps[i]) - SHAFT_ORIGIN;
      const floorX = Math.round(x + shaftCenter(SHAFT_HEIGHT, variant));
      const floorY = SHAFT_HEIGHT - 4 + variant * 9;
      if (moon > 0.02) {
        c.globalAlpha = moon * (hollow ? 0.95 : 0.65);
        c.drawImage(this.pool, floorX - 28, floorY - 7);
        c.globalAlpha = moon;
        c.drawImage(art.moon, x, 0);
      }
      if (sun > 0.02) {
        c.globalAlpha = sun;
        c.drawImage(art.sun, x, 0);
      }
      c.fillStyle = '#d3e6cb';
      const strength = Math.max(moon, sun) * (hollow ? 0.78 : 0.45);
      for (const mote of this.motes) {
        const age = (mote.phase + time * mote.speed + i * 0.31) % 1;
        const y = Math.round(14 + age * (SHAFT_HEIGHT - 24));
        const drift = breeze(time * 0.45, floorX + y) * 2;
        const moteX = Math.round(x + shaftCenter(y, variant) + mote.side * shaftHalfWidth(y, variant) + drift);
        if (moteX < 0 || moteX >= width) continue;
        c.globalAlpha = strength * Math.sin(age * Math.PI) * (1 - clockFade(y) * 0.6);
        c.fillRect(moteX, y, 1, 1);
      }
    }
    c.globalAlpha = 1;
  }

  drawMist(c: CanvasRenderingContext2D, scene: number, time: number, night: number): void {
    const width = c.canvas.width;
    const hollow = scene === HOLLOW_SCENE;
    const strength = scene === MISTY_SCENE ? 0.59 : hollow ? 0.39 + night * 0.36 : 0.18 + night * 0.18;
    for (let i = 0; i < this.banks.length; i++) {
      const bank = this.banks[i];
      const anchor = width * (0.12 + i * 0.37);
      const drift = Math.sin(time * 0.075 + i * 1.7) * MIST_TRAVEL + breeze(time * 0.35, anchor) * 3;
      const x = Math.round(anchor - bank.width / 2 + drift);
      const y = hollow ? 174 + i * 12 : 152 + i * 12;
      c.globalAlpha = strength * (i === 1 ? 0.7 : 1);
      c.drawImage(bank, x, y);
    }
    c.globalAlpha = 1;
  }

  drawSmoke(c: CanvasRenderingContext2D, scene: number, time: number, night: number): void {
    if (scene !== TRAIL_SCENE) return;
    const chimney = hutX(c.canvas.width) + 65;
    const drift = 13 + gust(time) * 9;
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const age = (time * 0.125 + i / SMOKE_COUNT) % 1;
      const x = Math.round(chimney + age * (drift + breeze(time * 0.4, chimney) * 4));
      const y = Math.round(111 - age * 43);
      const half = Math.round(4 + age * 7);
      c.globalAlpha = Math.sin(age * Math.PI) * (0.74 - night * 0.14);
      c.drawImage(this.smoke, x - half, y - Math.floor(half / 2), half * 2, half);
    }
    c.globalAlpha = 1;
  }

  drawSeeds(c: CanvasRenderingContext2D, scene: number, time: number): void {
    const width = c.canvas.width;
    const wind = gust(time);
    const travel = width + 12;
    c.globalAlpha = 0.32 + wind * 0.31;
    c.fillStyle = scene === MEADOW_SCENE ? '#e2cca0' : '#bcae85';
    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];
      const x = (seed.x * travel + this.seedTravel) % travel - 6;
      const y = 171 + seed.y * 68 + Math.sin(time * 0.57 + seed.phase) * 5 + breeze(time, x) * 2;
      if (x < 0 || x >= width || (x > width * 0.39 && x < width * 0.62 && y >= DESIGN_HEIGHT * 0.74)) continue;
      c.fillRect(Math.round(x), Math.round(y), i % 3 === 0 ? 2 : 1, 1);
    }
    c.globalAlpha = 1;
  }
}
