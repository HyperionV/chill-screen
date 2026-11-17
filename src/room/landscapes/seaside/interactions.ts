import { css, mix, shade } from '../../../render/color';
import { drawText, plainText, textWidth } from '../../../render/pixel-font';
import { clamp, seededRandom } from '../../../world/math';
import { clamp01 } from '../../sky';
import type { SeasideCreatures } from './creatures';
import {
  HORIZON,
  SCENE_BEACH,
  SCENE_COVE,
  SCENE_HARBOUR,
  SCENE_LIGHTHOUSE,
  SCENE_TIDE_POOLS,
  SHORE,
  type InteractionState,
} from './types';

const NOTE_TEXT = plainText('HELLO FROM FAR AWAY');
const NOTE_DURATION = 5.5;
export const CORK_DURATION = 0.7;
const MAX_RIPPLES = 10;
const MAX_FISH = 6;
const MAX_FOOTPRINTS = 24;

export const HARBOUR_BOAT_SPOTS: readonly { u: number; v: number }[] = [
  { u: 0.25, v: 0.63 },
  { u: 0.50, v: 0.61 },
  { u: 0.74, v: 0.64 },
];

export const BOTTLE_POS = { u: 0.69, v: 0.81 };

/** Horizontal position of the Sunset Cove sailboat at `time`. */
export const sailboatU = (time: number): number => 0.28 + 0.06 * Math.sin(time * 0.09);

export function createInteractions(): InteractionState {
  return {
    ripples: [],
    fishLeaps: [],
    footprints: [],
    bottle: { open: false, age: 0, duration: NOTE_DURATION, corkAge: 0 },
    boatBobs: HARBOUR_BOAT_SPOTS.map(() => ({ age: 10, duration: 1.8 })),
    sailboatBob: { age: 10, duration: 1.8 },
    lighthouseBoost: 0,
    lighthouseSweepAngle: 0,
  };
}

/** Advances timers for ripples, leaping fish, footprints, bottle note, boat bobs, and lighthouse sweep. */
export function updateInteractions(state: InteractionState, dt: number): void {
  for (let i = state.ripples.length - 1; i >= 0; i--) {
    state.ripples[i].age += dt;
    if (state.ripples[i].age >= state.ripples[i].duration) state.ripples.splice(i, 1);
  }
  for (let i = state.fishLeaps.length - 1; i >= 0; i--) {
    state.fishLeaps[i].age += dt;
    if (state.fishLeaps[i].age >= state.fishLeaps[i].duration) state.fishLeaps.splice(i, 1);
  }
  for (let i = state.footprints.length - 1; i >= 0; i--) {
    state.footprints[i].age += dt;
    if (state.footprints[i].age >= state.footprints[i].maxAge) state.footprints.splice(i, 1);
  }
  for (const b of state.boatBobs) b.age += dt;
  state.sailboatBob.age += dt;

  if (state.bottle.open) {
    state.bottle.age += dt;
    state.bottle.corkAge += dt;
    if (state.bottle.age >= state.bottle.duration) state.bottle.open = false;
  }

  if (state.lighthouseBoost > 0) {
    state.lighthouseBoost = Math.max(0, state.lighthouseBoost - dt);
    state.lighthouseSweepAngle += dt * 1.9;
  }
}

function addRipple(state: InteractionState, u: number, v: number, maxRadius = 16): void {
  if (state.ripples.length >= MAX_RIPPLES) state.ripples.shift();
  state.ripples.push({ u, v, age: 0, duration: 1.4, maxRadius });
}

function addFishLeap(state: InteractionState, u: number, v: number): void {
  if (state.fishLeaps.length >= MAX_FISH) state.fishLeaps.shift();
  state.fishLeaps.push({
    u,
    v,
    age: 0,
    duration: 0.72,
    dir: Math.random() < 0.5 ? 1 : -1,
    height: 14,
    span: 18,
  });
}

function addFootprintTrail(state: InteractionState, targetU: number, targetV: number): void {
  const startU = clamp(targetU - 0.08, 0.08, 0.92);
  const startV = clamp(targetV + 0.04, 0.73, 0.95);
  for (let i = 0; i < 5; i++) {
    if (state.footprints.length >= MAX_FOOTPRINTS) state.footprints.shift();
    const t = i / 4;
    state.footprints.push({
      u: startU + (targetU - startU) * t,
      v: startV + (targetV - startV) * t + (i % 2 === 0 ? -0.008 : 0.008),
      step: i,
      age: -i * 0.05,
      maxAge: 16,
    });
  }
}

/** Handles a pointer click at stage coordinates `(x, y)` in the active scene. */
export function handleScenePress(
  sceneIndex: number,
  x: number,
  y: number,
  w: number,
  h: number,
  unit: number,
  time: number,
  state: InteractionState,
  creatures: SeasideCreatures,
): void {
  const u = x / Math.max(1, w);
  const v = y / Math.max(1, h);

  // 1. Washed-up bottle (Sandy Beach)
  if (sceneIndex === SCENE_BEACH && Math.hypot(x - BOTTLE_POS.u * w, y - BOTTLE_POS.v * h) <= 18 * unit) {
    state.bottle.open = true;
    state.bottle.age = 0;
    state.bottle.corkAge = 0;
    return;
  }

  // 2. Lighthouse (Lighthouse Point or distant Beach point)
  if (sceneIndex === SCENE_LIGHTHOUSE && x <= 0.25 * w && y >= 0.14 * h && y <= 0.54 * h) {
    state.lighthouseBoost = 3.2;
    state.lighthouseSweepAngle = 0;
    return;
  }
  if (sceneIndex === SCENE_BEACH && Math.hypot(x - 0.255 * w, y - (HORIZON * h - 0.03 * h)) <= 16 * unit) {
    state.lighthouseBoost = 3.2;
    state.lighthouseSweepAngle = 0;
    return;
  }

  // 3. Harbour boats (Fishing Harbour)
  if (sceneIndex === SCENE_HARBOUR) {
    for (let i = 0; i < HARBOUR_BOAT_SPOTS.length; i++) {
      const spot = HARBOUR_BOAT_SPOTS[i];
      if (Math.abs(x - spot.u * w) <= 24 * unit && Math.abs(y - (spot.v - 0.02) * h) <= 16 * unit) {
        state.boatBobs[i].age = 0;
        addRipple(state, spot.u, spot.v + 0.01, 20);
        creatures.takeOffGulls(SCENE_HARBOUR);
        return;
      }
    }
  }

  // 4. Sailboat (Sunset Cove)
  if (sceneIndex === SCENE_COVE) {
    const su = sailboatU(time);
    if (Math.abs(x - su * w) <= 22 * unit && Math.abs(y - 0.56 * h) <= 24 * unit) {
      state.sailboatBob.age = 0;
      addRipple(state, su, 0.60, 20);
      creatures.takeOffGulls(SCENE_COVE);
      return;
    }
  }

  // 5. Sand click (Sandy Beach or Sunset Cove)
  if (sceneIndex === SCENE_BEACH && v >= SHORE + 0.02) {
    addFootprintTrail(state, u, v);
    creatures.attractCrab(SCENE_BEACH, u, v);
    return;
  }
  if (sceneIndex === SCENE_COVE && v >= 0.72) {
    addFootprintTrail(state, u, v);
    creatures.attractCrab(SCENE_COVE, u, v);
    return;
  }

  // 6. Water click (any scene)
  if (isWaterSpot(sceneIndex, u, v)) {
    addRipple(state, u, v, sceneIndex === SCENE_TIDE_POOLS ? 11 : 16);
    addFishLeap(state, u, v);
    if (sceneIndex === SCENE_COVE && u > 0.36 && u < 0.72) {
      creatures.triggerDolphinPod();
    }
  }
}

function isWaterSpot(sceneIndex: number, u: number, v: number): boolean {
  if (v < HORIZON + 0.01) return false;
  if (sceneIndex === SCENE_BEACH) return v < SHORE + 0.02;
  if (sceneIndex === SCENE_HARBOUR) {
    if (v < 0.665) return true;
    return u > 0.35 && u < 0.65;
  }
  if (sceneIndex === SCENE_LIGHTHOUSE) return u > 0.31 && v < 0.92;
  if (sceneIndex === SCENE_TIDE_POOLS) {
    if (v < 0.63) return true;
    const inLeftPool = u > 0.08 && u < 0.34 && v > 0.71 && v < 0.89;
    const inRightPool = u > 0.66 && u < 0.92 && v > 0.71 && v < 0.89;
    return inLeftPool || inRightPool;
  }
  if (sceneIndex === SCENE_COVE) return v < 0.72;
  return false;
}

/** Draws static and clicked sand footprints, snapped to stage pixels. */
export function drawFootprints(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  footprints: readonly InteractionState['footprints'][number][],
  sandColor: [number, number, number],
  panX: number,
  seed: number,
): void {
  const rnd = seededRandom(seed);
  const printCol = shade(sandColor, 0.7);
  ctx.fillStyle = css(printCol, 0.65);

  // Faint natural beach footprints along the dry sand
  for (let i = 0; i < 6; i++) {
    const fx = Math.round((0.20 + i * 0.022 + (rnd() - 0.5) * 0.004) * w + panX * 0.65);
    const fy = Math.round((0.88 - i * 0.008 + (i % 2 === 0 ? -0.005 : 0.005)) * h);
    ctx.fillRect(fx, fy, Math.max(2, Math.round(2 * unit)), Math.max(1, Math.round(unit)));
  }

  for (const fp of footprints) {
    if (fp.age < 0) continue;
    const alpha = clamp01(1 - fp.age / fp.maxAge) * 0.82;
    ctx.fillStyle = css(printCol, alpha);
    const fx = Math.round(fp.u * w + panX * 0.65);
    const fy = Math.round(fp.v * h);
    const pw = Math.max(2, Math.round(2 * unit));
    const ph = Math.max(1, Math.round(unit));
    ctx.fillRect(fx, fy, pw, ph);
    ctx.fillRect(fx + pw, fy, 1, 1);
  }
}

/** Draws the parchment bottle note `"HELLO FROM FAR AWAY"` above the bottle when opened. */
export function drawBottleNote(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  bottle: InteractionState['bottle'],
  panX: number,
): void {
  if (!bottle.open) return;
  const fade = Math.min(1, bottle.age / 0.25, (bottle.duration - bottle.age) / 0.6);
  if (fade <= 0.02) return;

  const scale = Math.max(1, Math.round(unit));
  const textW = textWidth(NOTE_TEXT) * scale;
  const padX = 4 * scale;
  const padY = 3 * scale;
  const boxW = textW + padX * 2;
  const boxH = 5 * scale + padY * 2;
  const cx = Math.round(BOTTLE_POS.u * w + panX * 0.72);
  const bx = clamp(Math.round(cx - boxW / 2), 6, Math.max(6, w - boxW - 6));
  const lift = Math.min(1, bottle.age / 0.35) * 4 * unit;
  const by = Math.round(BOTTLE_POS.v * h - 22 * unit - lift - boxH);

  ctx.save();
  ctx.globalAlpha = clamp01(fade);
  // Drop shadow
  ctx.fillStyle = 'rgba(20,24,36,0.45)';
  ctx.fillRect(bx + scale, by + scale, boxW, boxH);
  // Parchment card + border
  ctx.fillStyle = css(mix([244, 232, 200], [255, 250, 235], 0.5));
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.fillStyle = '#9c7d50';
  ctx.fillRect(bx, by, boxW, 1);
  ctx.fillRect(bx, by + boxH - 1, boxW, 1);
  ctx.fillRect(bx, by, 1, boxH);
  ctx.fillRect(bx + boxW - 1, by, 1, boxH);
  drawText(ctx, NOTE_TEXT, bx + padX, by + padY, '#382a1e', scale);
  ctx.restore();
}
