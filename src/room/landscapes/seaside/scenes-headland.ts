import { css, mix, shade } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { hash } from '../../journeys/noise';
import { clamp01 } from '../../sky';
import type { SeasideCreatures } from './creatures';
import { drawFootprints, sailboatU } from './interactions';
import type { SeasideSprites } from './sprites';
import {
  HORIZON,
  LAYER_PARALLAX,
  SCENE_COVE,
  SCENE_LIGHTHOUSE,
  SCENE_TIDE_POOLS,
  SHALLOWS_COLOR,
  WHITE,
  drawSprite,
  tintLand,
  type SceneBuffers,
  type SceneRenderContext,
} from './types';
import { drawBeachSurf, drawGlitter, drawOpenWater, drawRipplesAndFish } from './water';

/** Renders Scene 2: Lighthouse Point (rocky cliff, tall striped lighthouse, sweeping beam, crashing waves, cliff grass). */
export function renderLighthouseScene(
  rc: SceneRenderContext,
  buffers: SceneBuffers,
  sprites: SeasideSprites,
  creatures: SeasideCreatures,
): void {
  const { w, h, unit, time, state, px, py, cameraShiftX, interactions } = rc;
  const { sky, sun, moon, day } = state;
  const S = buffers.scene.ctx;
  const L = buffers.land.ctx;
  S.clearRect(0, 0, w, h);
  L.clearRect(0, 0, w, h);

  const pan = px + cameraShiftX;
  const hy = Math.round(h * HORIZON);

  // Layer 2: Distant sea stack on far right horizon
  const stackX = Math.round(0.79 * w + pan * LAYER_PARALLAX[1]);
  S.fillStyle = css(shade(mix(sky.horizon, sky.zenith, 0.45), 0.62));
  S.fillRect(stackX, hy - Math.round(9 * unit), Math.round(14 * unit), Math.round(10 * unit));
  S.fillRect(stackX + Math.round(3 * unit), hy - Math.round(14 * unit), Math.round(6 * unit), Math.round(5 * unit));

  // Layer 3: Choppier open sea & glitter
  drawOpenWater(S, w, h, unit, sky, day, time, 0.94, 1, 1.35, pan);
  drawGlitter(S, w, h, unit, sky, sun, moon, day, time, 0.88, pan);
  drawRipplesAndFish(S, w, h, unit, interactions.ripples, interactions.fishLeaps, sprites, sky, day);

  // Layer 4: Left rocky headland, tall striped lighthouse, right rock reef, crashing waves
  const nearPan = pan * LAYER_PARALLAX[3];
  const nearY = py * 0.5;
  drawCliffHeadland(L, w, h, unit, time, nearPan, nearY);
  const lantern = drawTallLighthouse(L, w, h, unit, nearPan, nearY);
  drawSeaRocks(L, w, h, unit, nearPan, nearY);

  // Crashing wave foam & spray droplets on rocks (drawn on S/L boundary)
  drawWaveCrashes(S, w, h, unit, sky, day, time, nearPan, nearY);

  // Perched gulls on right sea rocks
  creatures.drawLandCast(L, SCENE_LIGHTHOUSE, w, h, unit, sprites, pan, py);

  // Layer 5: Foreground windswept cliff grass silhouettes in bottom corners
  drawForegroundGrass(L, w, h, unit, time, pan * LAYER_PARALLAX[4]);

  tintLand(L, w, h, state);
  S.drawImage(buffers.land.canvas, 0, 0);

  // Post-tint: lighthouse stair windows, lantern core & sweeping soft beam
  drawLighthouseLight(S, w, unit, lantern.x, lantern.y, day, time, interactions.lighthouseBoost, interactions.lighthouseSweepAngle);
  creatures.drawSkyGulls(S, day, time, w, h, pan);
}

/** Renders Scene 3: Tide Pools (rock shelf, clear pools, starfish, anemones, tiny fish, crabs, standing heron). */
export function renderTidePoolsScene(
  rc: SceneRenderContext,
  buffers: SceneBuffers,
  sprites: SeasideSprites,
  creatures: SeasideCreatures,
): void {
  const { w, h, unit, time, state, px, py, cameraShiftX, interactions } = rc;
  const { sky, sun, moon, day } = state;
  const S = buffers.scene.ctx;
  const L = buffers.land.ctx;
  S.clearRect(0, 0, w, h);
  L.clearRect(0, 0, w, h);

  const pan = px + cameraShiftX;
  const nearPan = pan * LAYER_PARALLAX[3];
  const nearY = py * 0.5;

  // Layer 2 & 3: Distant open sea down to rocky reef edge (~0.64h)
  drawOpenWater(S, w, h, unit, sky, day, time, 0.64, 0.67, 0.85, pan);
  drawGlitter(S, w, h, unit, sky, sun, moon, day, time, 0.63, pan);

  // Shallow clear pool water beneath the carved rock shelf
  const poolTop = Math.round(h * 0.63);
  const poolWater = mix(sky.water, SHALLOWS_COLOR, 0.45 * day);
  const g = S.createLinearGradient(0, poolTop, 0, h);
  g.addColorStop(0, css(mix(poolWater, sky.horizon, 0.28)));
  g.addColorStop(1, css(shade(poolWater, 0.85)));
  S.fillStyle = g;
  S.fillRect(0, poolTop, w, h - poolTop);

  // Subtle pool light caustics
  S.fillStyle = css(mix(sky.light, WHITE, 0.6), 0.25 + 0.25 * day);
  for (let i = 0; i < 18; i++) {
    const cx = Math.round((0.10 + (i % 9) * 0.095 + Math.sin(time * 0.8 + i) * 0.01) * w + nearPan);
    const cy = Math.round((0.72 + Math.floor(i / 9) * 0.09) * h + nearY);
    S.fillRect(cx, cy, Math.round(4 * unit), 1);
  }

  // Tiny fish darting inside the tide pools + water click ripples/leaps
  creatures.drawTidePoolFish(S, w, h, unit, sprites, pan);
  drawRipplesAndFish(S, w, h, unit, interactions.ripples, interactions.fishLeaps, sprites, sky, day);

  // Layer 4: Sculpted coastal rock shelf with carved clear pools, starfish, anemones, kelp, crabs, heron
  drawTideRockShelf(L, w, h, unit, nearPan, nearY);
  drawPoolFloraAndFauna(L, w, h, unit, time, sprites, nearPan, nearY);
  creatures.drawLandCast(L, SCENE_TIDE_POOLS, w, h, unit, sprites, pan, py);

  // Layer 5: Foreground dark coastal rock framing at bottom corners
  const fgPan = pan * LAYER_PARALLAX[4];
  L.fillStyle = '#332f2e';
  L.fillRect(0, Math.round(0.92 * h), Math.round(0.14 * w + fgPan), Math.round(0.09 * h));
  L.fillRect(Math.round(0.86 * w + fgPan), Math.round(0.92 * h), Math.round(0.16 * w), Math.round(0.09 * h));

  tintLand(L, w, h, state);
  S.drawImage(buffers.land.canvas, 0, 0);
  creatures.drawSkyGulls(S, day, time, w, h, pan);
}

/** Renders Scene 4: Sunset Cove (pine bluff, natural cliff arch, sailboat, dolphin pod, crescent cove sand, red crab). */
export function renderCoveScene(
  rc: SceneRenderContext,
  buffers: SceneBuffers,
  sprites: SeasideSprites,
  creatures: SeasideCreatures,
): void {
  const { w, h, unit, time, state, px, py, cameraShiftX, interactions } = rc;
  const { sky, sun, moon, day } = state;
  const S = buffers.scene.ctx;
  const L = buffers.land.ctx;
  S.clearRect(0, 0, w, h);
  L.clearRect(0, 0, w, h);

  const pan = px + cameraShiftX;

  // Layer 2 & 3: Calm bay water, sun/moon glitter, crescent cove shore, dolphin pod, ripples/leaps
  drawOpenWater(S, w, h, unit, sky, day, time, 0.72, 1, 0.65, pan);
  drawGlitter(S, w, h, unit, sky, sun, moon, day, time, 0.70, pan);
  const sand = drawBeachSurf(S, w, h, unit, sky, day, time, 0.73, 0.035, pan);
  creatures.drawDolphins(S, w, h, unit, sprites, day, pan);
  drawRipplesAndFish(S, w, h, unit, interactions.ripples, interactions.fishLeaps, sprites, sky, day);
  drawFootprints(S, w, h, unit, interactions.footprints, sand, pan, 47);

  // Layer 4: Left pine bluff, right cliff arch, gliding sailboat, gulls, red crab
  const midPan = pan * LAYER_PARALLAX[2];
  const nearPan = pan * LAYER_PARALLAX[3];
  const nearY = py * 0.5;

  drawLeftBluff(L, w, h, unit, nearPan, nearY);
  drawCliffArch(L, w, h, unit, nearPan, nearY);

  // Sailboat gliding calmly across left-mid bay
  const su = sailboatU(time);
  const bob = interactions.sailboatBob;
  const extraBob = bob.age < bob.duration ? Math.sin((bob.age / bob.duration) * Math.PI * 3) * (1 - bob.age / bob.duration) * 3 * unit : 0;
  const rock = Math.sin(time * 1.1) * 0.9 * unit + extraBob;
  const sbx = Math.round(su * w + midPan - (sprites.sailboat.width * unit) / 2);
  const sby = Math.round(0.605 * h + rock - sprites.sailboat.height * unit);
  S.fillStyle = css(shade(sky.water, 0.65), 0.35);
  S.fillRect(sbx + Math.round(4 * unit), Math.round(0.605 * h + rock), Math.round(18 * unit), Math.max(1, Math.round(2 * unit)));
  drawSprite(L, sprites.sailboat, sbx, sby, unit);

  // Little souvenir shell next to the crab on cove sand
  drawSprite(L, sprites.shells[0], Math.round(0.84 * w + nearPan), Math.round(0.84 * h + nearY), unit);
  creatures.drawLandCast(L, SCENE_COVE, w, h, unit, sprites, pan, py);

  // Layer 5: Foreground bluff tufts
  drawForegroundGrass(L, w, h, unit, time, pan * LAYER_PARALLAX[4]);

  tintLand(L, w, h, state);
  S.drawImage(buffers.land.canvas, 0, 0);

  // Post-tint sailboat masthead lantern at dusk/night
  const nightLamp = clamp01((0.68 - day) / 0.45);
  if (nightLamp > 0.05) {
    S.save();
    S.globalAlpha = nightLamp;
    drawSprite(S, sprites.sailboatLight, sbx, sby, unit);
    S.restore();
  }

  creatures.drawSkyGulls(S, day, time, w, h, pan);
}

function drawCliffHeadland(
  L: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  time: number,
  panX: number,
  panY: number,
): void {
  const rightEdge = Math.round(0.32 * w + panX);
  for (let x = 0; x <= rightEdge; x++) {
    const t = x / Math.max(1, rightEdge);
    const plateau = t < 0.65 ? 0.49 : 0.49 + ((t - 0.65) / 0.35) ** 1.4 * 0.48;
    const ridge = Math.sin(x * 0.08) * 0.008 + Math.sin(x * 0.21) * 0.004;
    const topY = Math.round((plateau + ridge) * h + panY);
    const botY = Math.round(h * (t < 0.72 ? 0.96 : 0.96 - (t - 0.72) * 0.4));

    L.fillStyle = '#4f4a48';
    L.fillRect(x, topY, 1, Math.max(1, botY - topY));
    // Sunlit left-facing rock ridges and stratified ledges
    if ((x + Math.round(topY * 0.5)) % 9 < 3) {
      L.fillStyle = '#6e6862';
      L.fillRect(x, topY, 1, Math.round(Math.min(botY - topY, 18 * unit)));
    }
    if (x % 7 === 0) {
      L.fillStyle = '#363233';
      L.fillRect(x, topY + Math.round(12 * unit), 1, Math.max(0, botY - topY - Math.round(12 * unit)));
    }
    // Cliff-top grass cap & swaying blades
    if (t < 0.72) {
      L.fillStyle = '#5b8245';
      L.fillRect(x, topY, 1, Math.max(2, Math.round(3 * unit)));
      L.fillStyle = '#7ca35a';
      L.fillRect(x, topY, 1, 1);
      if (x % 4 === 0 && hash(x * 13) > 0.35) {
        const sway = Math.round(Math.sin(time * 1.8 + x * 0.08) * 1.5 * unit);
        const gh = Math.round((3 + hash(x * 17) * 4) * unit);
        L.fillRect(x + sway, topY - gh, 1, gh);
      }
    }
  }
}

function drawTallLighthouse(
  L: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  panX: number,
  panY: number,
): { x: number; y: number } {
  const cx = Math.round(0.16 * w + panX);
  const baseY = Math.round(0.49 * h + panY);
  const towerH = Math.round(64 * unit);
  const topY = baseY - towerH;

  // Stone plinth
  const plinthW = Math.round(20 * unit);
  L.fillStyle = '#6c6862';
  L.fillRect(cx - Math.round(plinthW / 2), baseY - Math.round(8 * unit), plinthW, Math.round(9 * unit));
  L.fillStyle = '#8c867e';
  L.fillRect(cx - Math.round(plinthW / 2), baseY - Math.round(8 * unit), Math.round(plinthW * 0.65), Math.round(2 * unit));

  // Tapered white & crimson striped tower
  const bands = 5;
  for (let row = 0; row < towerH; row++) {
    const t = row / towerH;
    const halfW = Math.max(4, Math.round((8.5 - t * 3.5) * unit));
    const band = Math.floor(t * bands);
    const isRed = band % 2 === 1;
    const y = topY + row;
    const litW = Math.max(2, Math.round(halfW * 1.2));
    L.fillStyle = isRed ? '#c94136' : '#f2ede2';
    L.fillRect(cx - halfW, y, litW, 1);
    L.fillStyle = isRed ? '#8c2822' : '#bfb8aa';
    L.fillRect(cx - halfW + litW, y, halfW * 2 - litW, 1);
  }

  // Tiny arched doorway
  const doorW = Math.max(3, Math.round(4 * unit));
  const doorH = Math.max(5, Math.round(6 * unit));
  L.fillStyle = '#3b291e';
  L.fillRect(cx - Math.round(doorW / 2), baseY - doorH, doorW, doorH);

  // Gallery balcony & railing
  const galW = Math.round(14 * unit);
  L.fillStyle = '#2b303a';
  L.fillRect(cx - Math.round(galW / 2), topY - Math.round(2 * unit), galW, Math.round(2 * unit));
  for (let rx = -Math.round(galW / 2); rx <= Math.round(galW / 2); rx += Math.max(2, Math.round(2 * unit))) {
    L.fillRect(cx + rx, topY - Math.round(5 * unit), 1, Math.round(3 * unit));
  }
  L.fillRect(cx - Math.round(galW / 2), topY - Math.round(5 * unit), galW, 1);

  // Glass lantern room
  const lanW = Math.round(10 * unit);
  const lanH = Math.round(8 * unit);
  const lanY = topY - Math.round(2 * unit) - lanH;
  L.fillStyle = '#8aa8b8';
  L.fillRect(cx - Math.round(lanW / 2), lanY, lanW, lanH);
  L.fillStyle = '#2b303a';
  L.fillRect(cx - Math.round(lanW / 2), lanY, 1, lanH);
  L.fillRect(cx + Math.round(lanW / 2) - 1, lanY, 1, lanH);

  // Conical red cupola roof + finial
  for (let r = 0; r < Math.round(7 * unit); r++) {
    const rw = Math.max(1, Math.round(((7 * unit - r) / (7 * unit)) * (lanW * 0.65)));
    L.fillStyle = '#b5352c';
    L.fillRect(cx - rw, lanY - r - 1, rw * 2, 1);
  }
  L.fillStyle = '#2b303a';
  L.fillRect(cx, lanY - Math.round(10 * unit), 1, Math.round(4 * unit));

  return { x: cx, y: lanY + Math.round(lanH / 2) };
}

function drawLighthouseLight(
  S: CanvasRenderingContext2D,
  w: number,
  unit: number,
  lx: number,
  ly: number,
  day: number,
  time: number,
  boost: number,
  sweepAngle: number,
): void {
  const duskPower = clamp01((0.72 - day) / 0.45);
  const clickPower = clamp01(boost / 1.4);
  const power = Math.max(duskPower, clickPower);
  if (power < 0.04) return;

  // Warm lantern glow
  const r = Math.round((16 + 10 * clickPower) * unit);
  const g = S.createRadialGradient(lx, ly, 0, lx, ly, r);
  g.addColorStop(0, `rgba(255,244,190,${(0.95 * power).toFixed(3)})`);
  g.addColorStop(0.4, `rgba(255,216,120,${(0.45 * power).toFixed(3)})`);
  g.addColorStop(1, 'rgba(255,216,120,0)');
  S.fillStyle = g;
  S.fillRect(lx - r, ly - r, r * 2, r * 2);

  S.fillStyle = `rgba(255,246,204,${power.toFixed(3)})`;
  S.fillRect(lx - Math.round(3 * unit), ly - Math.round(2 * unit), Math.round(6 * unit), Math.round(4 * unit));

  // Sweeping soft beam across sky & water
  const angle = boost > 0 ? sweepAngle : time * 0.7;
  const facing = Math.cos(angle);
  if (facing <= -0.15) return;
  const beamStrength = Math.max(0, facing) * power * (boost > 0 ? 0.34 : 0.22);
  if (beamStrength < 0.02) return;

  const beamLen = Math.round(w * 0.65);
  const slope = Math.sin(angle) * 0.22;
  const step = Math.max(2, Math.round(3 * unit));
  for (let d = Math.round(4 * unit); d < beamLen; d += step) {
    const f = d / beamLen;
    const spread = Math.round((3 + f * 32) * unit);
    const cy = Math.round(ly + d * slope);
    const a = beamStrength * (1 - f) * (1 - f * 0.3);
    S.fillStyle = `rgba(255,238,175,${a.toFixed(3)})`;
    S.fillRect(lx + d, cy - spread, step, spread * 2);
  }
}

function drawSeaRocks(L: CanvasRenderingContext2D, w: number, h: number, unit: number, panX: number, panY: number): void {
  const x0 = Math.round(0.71 * w + panX);
  const x1 = Math.round(0.96 * w + panX);
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    const hump = Math.sin(Math.PI * t) * 0.08 + Math.sin(t * Math.PI * 3) * 0.015;
    const top = Math.round((0.72 - hump) * h + panY);
    const bot = Math.round(0.78 * h + panY);
    L.fillStyle = t < 0.45 ? '#615b56' : '#433f3d';
    L.fillRect(x, top, 1, Math.max(1, bot - top));
    if (x % 5 === 0) {
      L.fillStyle = '#7d766e';
      L.fillRect(x, top, 1, Math.round(3 * unit));
    }
  }
}

function drawWaveCrashes(
  S: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  sky: SceneRenderContext['state']['sky'],
  day: number,
  time: number,
  panX: number,
  panY: number,
): void {
  const foamCol = mix(sky.light, WHITE, 0.78);
  const spots = [
    { u: 0.29, v: 0.72, phase: 0 },
    { u: 0.72, v: 0.73, phase: 2.4 },
  ];
  for (const sp of spots) {
    const burst = Math.max(0, Math.sin(time * 0.85 + sp.phase)) ** 5;
    if (burst < 0.08) continue;
    const cx = Math.round(sp.u * w + panX);
    const cy = Math.round(sp.v * h + panY);
    S.fillStyle = css(foamCol, (0.35 + 0.65 * day) * burst);
    for (let i = 0; i < 14; i++) {
      const dx = Math.round((hash(i * 19 + Math.floor(time * 2)) - 0.5) * 18 * unit);
      const dy = Math.round(-hash(i * 23 + Math.floor(time * 2)) * 16 * unit * burst);
      S.fillRect(cx + dx, cy + dy, Math.max(1, Math.round(2 * unit)), Math.max(1, Math.round(2 * unit)));
    }
  }
}

const ROCK_PAD = 16;
let cachedShelf: { key: string; canvas: HTMLCanvasElement } | null = null;

function buildRockShelf(w: number, h: number, unit: number): HTMLCanvasElement {
  const fullW = w + ROCK_PAD * 2;
  const { canvas, ctx } = memoryCanvas(fullW, h);
  const lpCenterU = 0.21;
  const rpCenterU = 0.79;
  const rx = 0.135;
  const ry = 0.095;

  for (let x = 0; x < fullW; x++) {
    const u = (x - ROCK_PAD) / Math.max(1, w);
    const shelfTop = Math.round((0.635 + Math.sin(u * 18) * 0.012 + Math.cos(u * 41) * 0.006) * h);
    for (let y = shelfTop; y < h; y++) {
      const v = y / Math.max(1, h);
      const inLeft = ((u - lpCenterU) / rx) ** 2 + ((v - 0.80) / ry) ** 2;
      const inRight = ((u - rpCenterU) / rx) ** 2 + ((v - 0.80) / ry) ** 2;
      if (inLeft < 1 || inRight < 1) {
        if (inLeft > 0.84 || inRight > 0.84) {
          ctx.fillStyle = '#3d3a36';
          ctx.fillRect(x, y, 1, 1);
        }
        continue;
      }
      const rim = y < shelfTop + Math.round(3 * unit);
      const speck = hash(x * 73 + y * 31);
      ctx.fillStyle = rim ? '#948a7a' : speck < 0.18 ? '#524d47' : speck > 0.88 ? '#877f71' : '#6b645c';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

function drawTideRockShelf(L: CanvasRenderingContext2D, w: number, h: number, unit: number, panX: number, panY: number): void {
  const key = `${w}x${h}:${unit.toFixed(2)}`;
  if (!cachedShelf || cachedShelf.key !== key) {
    cachedShelf = { key, canvas: buildRockShelf(w, h, unit) };
  }
  L.drawImage(cachedShelf.canvas, Math.round(panX - ROCK_PAD), Math.round(panY));
}

function drawPoolFloraAndFauna(
  L: CanvasRenderingContext2D,
  w: number,
  h: number,
  unit: number,
  time: number,
  sprites: SeasideSprites,
  panX: number,
  panY: number,
): void {
  const pulse = Math.floor(time * 1.6) % 2 === 0;
  const sway = Math.floor(time * 1.2) % 2 === 0;

  // Left pool starfish, anemones, seaweed
  drawSprite(L, sprites.starfishCoral, 0.13 * w + panX, 0.83 * h + panY, unit);
  drawSprite(L, sprites.starfishGold, 0.25 * w + panX, 0.86 * h + panY, unit);
  drawSprite(L, pulse ? sprites.anemonePinkA : sprites.anemonePinkB, 0.17 * w + panX, 0.76 * h + panY, unit);
  drawSprite(L, pulse ? sprites.anemoneTealA : sprites.anemoneTealB, 0.30 * w + panX, 0.82 * h + panY, unit);
  drawSprite(L, sway ? sprites.seaweedA : sprites.seaweedB, 0.09 * w + panX, 0.74 * h + panY, unit);

  // Right pool starfish, anemones, seaweed
  drawSprite(L, sprites.starfishGold, 0.72 * w + panX, 0.83 * h + panY, unit);
  drawSprite(L, sprites.starfishCoral, 0.86 * w + panX, 0.80 * h + panY, unit);
  drawSprite(L, pulse ? sprites.anemoneTealA : sprites.anemoneTealB, 0.76 * w + panX, 0.77 * h + panY, unit);
  drawSprite(L, pulse ? sprites.anemonePinkA : sprites.anemonePinkB, 0.82 * w + panX, 0.86 * h + panY, unit);
  drawSprite(L, sway ? sprites.seaweedB : sprites.seaweedA, 0.89 * w + panX, 0.74 * h + panY, unit);
}

function drawLeftBluff(L: CanvasRenderingContext2D, w: number, h: number, unit: number, panX: number, panY: number): void {
  const endX = Math.round(0.16 * w + panX);
  for (let x = 0; x <= endX; x++) {
    const t = x / Math.max(1, endX);
    const top = Math.round((0.46 + t * t * 0.24) * h + panY);
    const bot = Math.round(0.73 * h + panY);
    L.fillStyle = t < 0.6 ? '#443e3b' : '#574f4a';
    L.fillRect(x, top, 1, Math.max(1, bot - top));
    if (t < 0.75) {
      L.fillStyle = '#426138';
      L.fillRect(x, top, 1, Math.round(3 * unit));
    }
  }
  // Small coastal pine silhouettes on top of left bluff
  for (const pu of [0.04, 0.085]) {
    const px = Math.round(pu * w + panX);
    const py = Math.round((0.46 + (pu / 0.16) ** 2 * 0.24) * h + panY);
    L.fillStyle = '#2d4728';
    for (let row = 0; row < Math.round(12 * unit); row++) {
      const hw = Math.max(1, Math.round((row / (12 * unit)) * 5 * unit));
      L.fillRect(px - hw, py - Math.round(12 * unit) + row, hw * 2, 1);
    }
  }
}

function drawCliffArch(L: CanvasRenderingContext2D, w: number, h: number, unit: number, panX: number, panY: number): void {
  const x0 = Math.round(0.70 * w + panX);
  const x1 = w;
  const span = Math.max(1, x1 - x0);
  const archCenter = 0.825;
  const archRx = 0.055;
  const archBot = 0.725;
  const archTop = 0.56;

  for (let x = x0; x < x1; x++) {
    const u = (x - panX) / Math.max(1, w);
    const t = (x - x0) / span;
    const ridge = Math.sin(t * Math.PI * 0.85) * 0.12 + Math.sin(t * 14) * 0.01;
    const topY = Math.round((0.55 - ridge) * h + panY);
    const botY = Math.round(archBot * h + panY);

    const dx = Math.abs(u - archCenter) / archRx;
    const holeTop = dx < 1 ? Math.round((archTop + (1 - Math.sqrt(1 - dx * dx)) * 0.13) * h + panY) : botY;
    const drawBot = dx < 1 ? Math.min(botY, holeTop) : botY;

    L.fillStyle = t < 0.35 ? '#756657' : '#52473d';
    L.fillRect(x, topY, 1, Math.max(1, drawBot - topY));
    L.fillStyle = '#536e41';
    L.fillRect(x, topY, 1, Math.max(1, Math.round(2 * unit)));
  }
}

function drawForegroundGrass(L: CanvasRenderingContext2D, w: number, h: number, unit: number, time: number, fgPan: number): void {
  for (const su of [0.02, 0.05, 0.09, 0.91, 0.95, 0.98]) {
    const bx = Math.round(su * w + fgPan);
    const sway = Math.round(Math.sin(time * 1.9 + su * 17) * 2 * unit);
    for (let b = -2; b <= 2; b++) {
      const bh = Math.round((7 + ((Math.abs(b) + Math.round(su * 10)) % 3) * 3) * unit);
      L.fillStyle = b % 2 === 0 ? '#304a2b' : '#43663a';
      for (let y = 0; y < bh; y++) {
        L.fillRect(bx + b * Math.round(2 * unit) + Math.round((y / bh) * (b + sway)), h - y - 1, Math.max(1, Math.round(unit)), 1);
      }
    }
  }
}
