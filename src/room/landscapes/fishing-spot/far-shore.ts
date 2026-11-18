import { css, mix } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { fbm, hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import { breeze, gust } from '../../wind';
import { drawBoxBottom } from './creatures';
import type { FishingSprites } from './sprites';
import { HORIZON, type SceneIndex, type SceneLayout, type SpriteBox } from './types';
import { drawWindSprite } from './wind-sprites';

const MARGIN = 18;
const RIDGE_DEPTH = 46;
const PINE_SPACING = 15;
const TREE_SPACING = 25;
const BUSH_SPACING = 19;
const REFLECTION_STRIPS = 7;
/** Reflection strips farther from shore move up to this many stage pixels. */
const REFLECTION_SWAY = 3;
const REFLECTION_PHASE_STEP = 48;
const SMOKE_PUFFS = 4;
/** Chimney smoke drifts farther downwind as it rises. Distances are in stage pixels. */
const SMOKE_DRIFT = 4;
const SMOKE_GUST_DRIFT = 5;
const SMOKE_SWAY = 2;
const SMOKE_RISE = 10;
const SMOKE_CYCLE_RATE = 0.28;
const SMOKE_FADE_PORTION = 0.25;
/** Distant foliage moves less than the foreground reeds. */
const RIDGE_SWAY = 1;
const TREE_SWAY = 2;
const CLOCK_HAZE = 0.42;
const SCENES: readonly SceneIndex[] = [0, 1, 2, 3, 4];

export const cabinX = (layout: SceneLayout): number => layout.designW * 0.175;
export const boathouseX = (layout: SceneLayout): number => layout.designW * 0.83;

interface ShoreLayers {
  ridge: PlantLayer;
  bank: PlantLayer;
  haze: HTMLCanvasElement;
  reflection: ReturnType<typeof memoryCanvas>;
}

interface ShorePlant {
  sprite: SpriteBox;
  stageX: number;
  x: number;
  y: number;
  w: number;
  h: number;
  reach: number;
  tip: number;
}

interface PlantLayer {
  ground: HTMLCanvasElement;
  combined: ReturnType<typeof memoryCanvas>;
  plants: ShorePlant[];
  plantsInFront: boolean;
  dirty: boolean;
}

function paintClockHaze(ctx: CanvasRenderingContext2D, width: number): void {
  const center = width / 2;
  const reach = width * 0.29;
  for (let x = Math.floor(center - reach); x < center + reach; x++) {
    const fade = 1 - Math.abs(x - center) / reach;
    ctx.globalAlpha = CLOCK_HAZE * fade * fade;
    ctx.fillRect(x, 0, 1, RIDGE_DEPTH);
  }
  ctx.globalAlpha = 1;
}

function placePlant(sprite: SpriteBox, x: number, y: number, scale: number, u: number, reach: number): ShorePlant {
  const w = Math.round(sprite.w * scale);
  const h = Math.round(sprite.h * scale);
  return {
    sprite,
    stageX: (x - MARGIN) * u,
    x: Math.round(Math.round(x - w / 2) * u),
    y: Math.round(Math.round(y - h) * u),
    w: Math.max(1, Math.round(w * u)),
    h: Math.max(1, Math.round(h * u)),
    reach,
    tip: 0,
  };
}

/** Reuse the composite until a tree or bush actually moves by a whole pixel. */
function updatePlants(layer: PlantLayer, haze: HTMLCanvasElement, time: number): boolean {
  let dirty = layer.dirty;
  for (const plant of layer.plants) {
    const tip = Math.round(breeze(time, plant.stageX) * plant.reach);
    if (plant.tip !== tip) {
      dirty = true;
      plant.tip = tip;
    }
  }
  if (!dirty) return false;

  const { canvas, ctx } = layer.combined;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (layer.plantsInFront) ctx.drawImage(layer.ground, 0, 0, canvas.width, canvas.height);
  for (const p of layer.plants) drawWindSprite(ctx, p.sprite, p.x, p.y, p.w, p.h, p.tip);
  if (!layer.plantsInFront) ctx.drawImage(layer.ground, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(haze, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  layer.dirty = false;
  return true;
}

function buildLayers(layout: SceneLayout, sprites: FishingSprites, scene: SceneIndex): ShoreLayers {
  const u = layout.unit;
  const width = Math.ceil(layout.designW) + MARGIN * 2;
  const stageWidth = Math.max(1, Math.round(width * u));
  const stageHeight = Math.max(1, Math.round(RIDGE_DEPTH * u));
  const ridge = memoryCanvas(width, RIDGE_DEPTH);
  const bank = memoryCanvas(width, RIDGE_DEPTH);
  const haze = memoryCanvas(width, RIDGE_DEPTH);
  const ridgeComposite = memoryCanvas(stageWidth, stageHeight);
  const bankComposite = memoryCanvas(stageWidth, stageHeight);
  const reflection = memoryCanvas(stageWidth, stageHeight);
  const ridgePlants: ShorePlant[] = [];
  const bankPlants: ShorePlant[] = [];
  ridgeComposite.ctx.imageSmoothingEnabled = false;
  bankComposite.ctx.imageSmoothingEnabled = false;
  bank.ctx.imageSmoothingEnabled = false;
  const ridgeY = (x: number) => Math.round(23 - fbm(x * 0.012 + scene * 3) * 14);
  const bankY = (x: number) => Math.round(RIDGE_DEPTH - 2 - fbm(x * 0.022 + scene * 6) * 3);

  for (let x = 0; x < width; x++) {
    const top = ridgeY(x);
    ridge.ctx.fillStyle = '#6b8890';
    ridge.ctx.fillRect(x, top, 1, RIDGE_DEPTH - top);
  }
  for (let x = 0; x < width; x += PINE_SPACING) {
    const seed = x * 13 + scene * 31;
    if (hash(seed) < 0.20) continue;
    const px = x + Math.round(hash(seed + 1) * PINE_SPACING);
    const tree = sprites.farPines[Math.floor(hash(seed + 2) * sprites.farPines.length)];
    ridgePlants.push(placePlant(tree, px, ridgeY(px) + 9, 0.46, u, RIDGE_SWAY));
  }

  // Keep a clearing for each building and place overlapping crowns between the clearings.
  const cabin = cabinX(layout) + MARGIN;
  const shed = boathouseX(layout) + MARGIN;
  for (let x = -TREE_SPACING; x < width; x += TREE_SPACING) {
    const seed = x * 17 + scene * 73;
    const px = x + Math.round(hash(seed) * TREE_SPACING);
    const inClearing = Math.abs(px - cabin) < sprites.cabin.w * 0.6 || Math.abs(px - shed) < sprites.boathouse.w * 0.6;
    const tree = sprites.midTrees[Math.floor(hash(seed + 2) * sprites.midTrees.length)];
    const scale = inClearing ? 0.43 : 0.64 + hash(seed + 3) * 0.24;
    bankPlants.push(placePlant(tree, px, bankY(px) + 1, scale, u, TREE_SWAY));
  }
  for (let x = 0; x < width; x += BUSH_SPACING) {
    const seed = x * 29 + scene * 53;
    if (hash(seed) < 0.19) continue;
    const px = x + Math.round(hash(seed + 1) * 8);
    const bush = sprites.shoreBushes[Math.floor(hash(seed + 2) * sprites.shoreBushes.length)];
    bankPlants.push(placePlant(bush, px, bankY(px) + 1, 0.80, u, RIDGE_SWAY));
  }

  for (let x = 0; x < width; x++) {
    const y = bankY(x);
    bank.ctx.fillStyle = '#7e896b';
    bank.ctx.fillRect(x, y, 1, 1);
    bank.ctx.fillStyle = '#586a58';
    bank.ctx.fillRect(x, y + 1, 1, RIDGE_DEPTH - y - 1);
    if (hash(x * 17) > 0.72) {
      bank.ctx.fillStyle = '#a1a18a';
      bank.ctx.fillRect(x, y, 2, 1);
    }
  }
  drawBoxBottom(bank.ctx, sprites.cabin, cabin, RIDGE_DEPTH, 1);
  drawBoxBottom(bank.ctx, sprites.boathouse, shed, RIDGE_DEPTH + 1, 1);
  paintClockHaze(haze.ctx, width);

  reflection.ctx.translate(0, stageHeight);
  reflection.ctx.scale(1, -1);
  return {
    ridge: { ground: ridge.canvas, combined: ridgeComposite, plants: ridgePlants, plantsInFront: true, dirty: true },
    bank: { ground: bank.canvas, combined: bankComposite, plants: bankPlants, plantsInFront: false, dirty: true },
    haze: haze.canvas,
    reflection,
  };
}

export class FarShore {
  private layers: ShoreLayers[] = [];
  private cabinHeight = 0;

  resize(layout: SceneLayout, sprites: FishingSprites): void {
    this.layers = SCENES.map((scene) => buildLayers(layout, sprites, scene));
    this.cabinHeight = sprites.cabin.h;
  }

  draw(ctx: CanvasRenderingContext2D, state: SkyState, scene: SceneIndex, layout: SceneLayout, time: number): void {
    const layers = this.layers[scene];
    if (!layers) return;
    const u = layout.unit;
    const waterY = Math.round(layout.waterTopY * u);
    const shoreX = Math.round(-MARGIN * u);
    const skyEnd = Math.round(layout.designH * HORIZON * u);
    const ridge = layers.ridge.combined.canvas;
    const bank = layers.bank.combined.canvas;
    updatePlants(layers.ridge, layers.haze, time);
    if (updatePlants(layers.bank, layers.haze, time)) {
      layers.reflection.ctx.clearRect(0, 0, bank.width, bank.height);
      layers.reflection.ctx.drawImage(bank, 0, 0);
    }

    ctx.fillStyle = css(mix([105, 131, 133], state.sky.horizon, 0.48));
    ctx.fillRect(0, skyEnd, Math.ceil(layout.designW * u), waterY - skyEnd + 1);
    ctx.save();
    ctx.globalAlpha = 0.43 + (1 - state.day) * 0.09;
    ctx.drawImage(ridge, shoreX, waterY - ridge.height);
    ctx.globalAlpha = 0.69 + (1 - state.day) * 0.12;
    ctx.drawImage(bank, shoreX, waterY - bank.height);
    ctx.restore();

    const smokeX = cabinX(layout) - 10;
    const chimneyX = smokeX * u;
    const smokeY = layout.waterTopY - this.cabinHeight;
    const dot = Math.max(1, Math.round(u));
    const drift = SMOKE_DRIFT + SMOKE_GUST_DRIFT * gust(time);
    const bend = SMOKE_SWAY * breeze(time, chimneyX);
    ctx.fillStyle = css(mix([224, 230, 236], state.sky.horizon, 0.6));
    ctx.save();
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const age = (time * SMOKE_CYCLE_RATE + i / SMOKE_PUFFS) % 1;
      const x = Math.round(chimneyX + age * (drift + age * bend));
      ctx.globalAlpha = 0.32 * Math.min(1, (1 - age) / SMOKE_FADE_PORTION);
      ctx.fillRect(x, Math.round((smokeY - age * SMOKE_RISE) * u), dot * (age > 0.55 ? 2 : 1), dot);
    }
    ctx.restore();
  }

  drawReflection(ctx: CanvasRenderingContext2D, scene: SceneIndex, layout: SceneLayout, time: number): void {
    const layers = this.layers[scene];
    if (!layers) return;
    const u = layout.unit;
    const reflection = layers.reflection.canvas;
    const bankX = Math.round(-MARGIN * u);
    const waterY = Math.round(layout.waterTopY * u);
    const stripHeight = Math.max(1, Math.round(2 * u));
    const sourceHeight = Math.max(1, Math.round(3 * u));
    ctx.save();
    for (let i = 0; i < REFLECTION_STRIPS; i++) {
      const depth = i / (REFLECTION_STRIPS - 1);
      const phaseX = layout.designW * u / 2 + i * REFLECTION_PHASE_STEP;
      const sx = bankX + Math.round(breeze(time, phaseX) * depth * REFLECTION_SWAY);
      const sy = Math.round(i * 3.4 * u);
      ctx.globalAlpha = 0.23 * (1 - i / REFLECTION_STRIPS);
      ctx.drawImage(reflection, 0, Math.round(i * 4 * u), reflection.width, sourceHeight,
        sx, waterY + sy, reflection.width, stripHeight);
    }
    ctx.restore();
  }
}
