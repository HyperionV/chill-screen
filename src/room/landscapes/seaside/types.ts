import { css, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { clamp } from '../../../world/math';
import { clamp01, type SkyState } from '../../sky';
import type { Chapter } from '../../journeys/route';

/** Design height in stage pixels; coordinates and sprite sizes scale by `h / DESIGN_ROWS`. */
export const DESIGN_ROWS = 270;
/** Sea horizon as a share of view height, matching the original Sea view. */
export const HORIZON = 0.52;
/** Default shoreline row as a share of view height in the beach scene. */
export const SHORE = 0.69;
/** Surf wave cycle period in seconds. */
export const SURF_PERIOD = 9.5;
/** Cross-dissolve and camera glide duration between consecutive scenes, in seconds. */
export const TRANSITION_SECONDS = 10;
/** Pointer proximity radius in design pixels for startling crabs and gulls. */
export const STARTLE_RADIUS = 28;
/** Maximum parallax shift in design pixels for the nearest foreground layer. */
export const PARALLAX_MAX = 6;
/** Layer parallax multipliers: sky/far, headland/mid-far, mid water/boats, near shore, foreground. */
export const LAYER_PARALLAX = [0.12, 0.25, 0.45, 0.72, 1.0] as const;

export const WHITE: RGB = [255, 255, 255];
export const SAND_COLOR: RGB = [222, 196, 152];
export const SHALLOWS_COLOR: RGB = [74, 186, 184];

/** The five chapters of the Seaside landscape (~3.3 min each, ~16.7 min full loop). */
export const CHAPTERS: readonly Chapter[] = [
  { name: 'Sandy Beach', seconds: 200 },
  { name: 'Fishing Harbour', seconds: 200 },
  { name: 'Lighthouse Point', seconds: 200 },
  { name: 'Tide Pools', seconds: 200 },
  { name: 'Sunset Cove', seconds: 200 },
];

export const SCENE_BEACH = 0;
export const SCENE_HARBOUR = 1;
export const SCENE_LIGHTHOUSE = 2;
export const SCENE_TIDE_POOLS = 3;
export const SCENE_COVE = 4;

export interface Point {
  x: number;
  y: number;
}

export interface SkyGull {
  x: number;
  y: number;
  vx: number;
  flap: number;
  wait: number;
  hop: number;
}

export interface ShoreGull {
  u: number;
  v: number;
  homeU: number;
  homeV: number;
  dir: 1 | -1;
  state: 'idle' | 'walk' | 'peck' | 'hop' | 'fly';
  timer: number;
  clock: number;
  flyY: number;
  flyVx: number;
  flyVy: number;
}

export type CrabMood = 'idle' | 'walk' | 'wave' | 'flee' | 'seek';

export interface CrabState {
  u: number;
  v: number;
  dir: 1 | -1;
  mood: CrabMood;
  timer: number;
  clock: number;
  targetU: number | null;
  targetV: number | null;
  hopOffset: number;
}

export interface HarbourCat {
  mood: 'sit' | 'blink' | 'lick' | 'watch';
  timer: number;
  clock: number;
  lookDir: -1 | 0 | 1;
}

export interface HeronState {
  mood: 'poised' | 'peer' | 'strike' | 'ruffle';
  timer: number;
  clock: number;
  lookDir: -1 | 0 | 1;
}

export interface TideFish {
  pool: 0 | 1;
  u: number;
  v: number;
  vx: number;
  vy: number;
  colorIndex: 0 | 1;
  timer: number;
}

export interface ShoreCrab {
  u: number;
  v: number;
  homeU: number;
  homeV: number;
  dir: 1 | -1;
  mood: 'idle' | 'scuttle' | 'flee';
  timer: number;
  clock: number;
}

export interface Dolphin {
  u: number;
  phase: number;
  active: boolean;
  progress: number;
  duration: number;
  startU: number;
  spanU: number;
  peakV: number;
  wait: number;
}

export interface WaterRipple {
  u: number;
  v: number;
  age: number;
  duration: number;
  maxRadius: number;
}

export interface FishLeap {
  u: number;
  v: number;
  age: number;
  duration: number;
  dir: 1 | -1;
  height: number;
  span: number;
}

export interface Footprint {
  u: number;
  v: number;
  step: number;
  age: number;
  maxAge: number;
}

export interface BoatBob {
  age: number;
  duration: number;
}

export interface BottleNoteState {
  open: boolean;
  age: number;
  duration: number;
  corkAge: number;
}

export interface InteractionState {
  ripples: WaterRipple[];
  fishLeaps: FishLeap[];
  footprints: Footprint[];
  bottle: BottleNoteState;
  boatBobs: BoatBob[];
  sailboatBob: BoatBob;
  lighthouseBoost: number;
  lighthouseSweepAngle: number;
}

export interface SceneRenderContext {
  w: number;
  h: number;
  unit: number;
  time: number;
  dt: number;
  state: SkyState;
  px: number;
  py: number;
  cameraShiftX: number;
  pointer: Point | null;
  interactions: InteractionState;
}

export interface SceneBuffers {
  scene: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  land: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
}

export function createBuffers(w: number, h: number): SceneBuffers {
  const scene = memoryCanvas(w, h);
  const land = memoryCanvas(w, h);
  scene.ctx.imageSmoothingEnabled = false;
  land.ctx.imageSmoothingEnabled = false;
  return { scene, land };
}

export function resizeBuffers(b: SceneBuffers, w: number, h: number): void {
  b.scene.canvas.width = w;
  b.scene.canvas.height = h;
  b.land.canvas.width = w;
  b.land.canvas.height = h;
  b.scene.ctx.imageSmoothingEnabled = false;
  b.land.ctx.imageSmoothingEnabled = false;
}

/** Draws a 1-pixel-thick elliptical ripple ring snapped to stage pixels. */
export function drawRippleRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  if (rx < 1 || ry < 1) return;
  const steps = Math.max(12, Math.round((rx + ry) * 3));
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = ix + Math.round(Math.cos(a) * rx);
    const y = iy + Math.round(Math.sin(a) * ry);
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Draws an offscreen pixel sprite scaled by `unit`, optionally mirrored horizontally, snapped to whole pixels. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  unit: number,
  flip = false,
): void {
  const sw = Math.max(1, Math.round(sprite.width * unit));
  const sh = Math.max(1, Math.round(sprite.height * unit));
  const dx = Math.round(x);
  const dy = Math.round(y);
  ctx.imageSmoothingEnabled = false;
  if (!flip) {
    ctx.drawImage(sprite, dx, dy, sw, sh);
    return;
  }
  ctx.save();
  ctx.translate(dx + sw, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0, sw, sh);
  ctx.restore();
}

/** Tints the offscreen land layer for night and golden-hour sunset, matching the house style. */
export function tintLand(L: CanvasRenderingContext2D, w: number, h: number, state: SkyState): void {
  const { sky, sun, day } = state;
  const night = 1 - day;
  L.save();
  L.globalCompositeOperation = 'source-atop';
  if (night > 0.02) {
    L.fillStyle = css([8, 14, 44], 0.56 * night);
    L.fillRect(0, 0, w, h);
    L.fillStyle = css([40, 70, 150], 0.16 * night);
    L.fillRect(0, 0, w, h);
  }
  const low = clamp01(1 - sun.up / 0.55) * day;
  if (low > 0.02) {
    L.fillStyle = css(sky.light, 0.24 * low);
    L.fillRect(0, 0, w, h);
  }
  L.restore();
}

/** Keeps wandering ground creatures away from the bottom-center radio overlay. */
export function avoidRadio(u: number, v: number): { u: number; v: number } {
  if (u > 0.37 && u < 0.64 && v > 0.72 && v < 0.98) {
    const clampedU = u < 0.5 ? clamp(u, 0.06, 0.36) : clamp(u, 0.65, 0.94);
    return { u: clampedU, v };
  }
  return { u, v };
}

/** Simple 0..1 luma helper for Look calculation. */
export const luma = (c: RGB): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
