import { css, mix } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { fbm, hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import { drawBoxBottom } from './creatures';
import type { FishingSprites } from './sprites';
import { HORIZON, type SceneIndex, type SceneLayout } from './types';

const MARGIN = 18;
const RIDGE_DEPTH = 46;
const PINE_SPACING = 15;
const TREE_SPACING = 25;
const BUSH_SPACING = 19;
const REFLECTION_STRIPS = 7;
const SMOKE_PUFFS = 4;
const CLOCK_HAZE = 0.42;
const SCENES: readonly SceneIndex[] = [0, 1, 2, 3, 4];

export const cabinX = (layout: SceneLayout): number => layout.designW * 0.175;
export const boathouseX = (layout: SceneLayout): number => layout.designW * 0.83;

interface ShoreLayers {
  ridge: HTMLCanvasElement;
  bank: HTMLCanvasElement;
  reflection: HTMLCanvasElement;
}

function softenBehindClock(ctx: CanvasRenderingContext2D, width: number): void {
  ctx.globalCompositeOperation = 'destination-out';
  const center = width / 2;
  const reach = width * 0.29;
  for (let x = Math.floor(center - reach); x < center + reach; x++) {
    const fade = 1 - Math.abs(x - center) / reach;
    ctx.globalAlpha = CLOCK_HAZE * fade * fade;
    ctx.fillRect(x, 0, 1, RIDGE_DEPTH);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function buildLayers(layout: SceneLayout, sprites: FishingSprites, scene: SceneIndex): ShoreLayers {
  const width = Math.ceil(layout.designW) + MARGIN * 2;
  const ridge = memoryCanvas(width, RIDGE_DEPTH);
  const bank = memoryCanvas(width, RIDGE_DEPTH);
  const reflection = memoryCanvas(width, RIDGE_DEPTH);
  ridge.ctx.imageSmoothingEnabled = false;
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
    drawBoxBottom(ridge.ctx, tree, px, ridgeY(px) + 9, 0.46);
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
    drawBoxBottom(bank.ctx, tree, px, bankY(px) + 1, scale);
  }
  for (let x = 0; x < width; x += BUSH_SPACING) {
    const seed = x * 29 + scene * 53;
    if (hash(seed) < 0.19) continue;
    const px = x + Math.round(hash(seed + 1) * 8);
    const bush = sprites.shoreBushes[Math.floor(hash(seed + 2) * sprites.shoreBushes.length)];
    drawBoxBottom(bank.ctx, bush, px, bankY(px) + 1, 0.80);
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
  softenBehindClock(ridge.ctx, width);
  softenBehindClock(bank.ctx, width);

  reflection.ctx.translate(0, RIDGE_DEPTH);
  reflection.ctx.scale(1, -1);
  reflection.ctx.drawImage(bank.canvas, 0, 0);
  return { ridge: ridge.canvas, bank: bank.canvas, reflection: reflection.canvas };
}

export class FarShore {
  private layers: ShoreLayers[] = [];
  private cabinHeight = 0;

  resize(layout: SceneLayout, sprites: FishingSprites): void {
    this.layers = SCENES.map((scene) => buildLayers(layout, sprites, scene));
    this.cabinHeight = sprites.cabin.h;
  }

  draw(ctx: CanvasRenderingContext2D, state: SkyState, scene: SceneIndex, layout: SceneLayout, parallaxX: number, time: number): void {
    const layers = this.layers[scene];
    if (!layers) return;
    const u = layout.unit;
    const w = Math.round(layers.bank.width * u);
    const h = Math.max(1, Math.round(RIDGE_DEPTH * u));
    const waterY = Math.round(layout.waterTopY * u);
    const ridgeX = Math.round((parallaxX * 1.5 - MARGIN) * u);
    const bankX = Math.round((parallaxX * 3 - MARGIN) * u);
    const skyEnd = Math.round(layout.designH * HORIZON * u);

    ctx.fillStyle = css(mix([105, 131, 133], state.sky.horizon, 0.48));
    ctx.fillRect(0, skyEnd, Math.ceil(layout.designW * u), waterY - skyEnd + 1);
    ctx.save();
    ctx.globalAlpha = 0.43 + (1 - state.day) * 0.09;
    ctx.drawImage(layers.ridge, ridgeX, waterY - h, w, h);
    ctx.globalAlpha = 0.69 + (1 - state.day) * 0.12;
    ctx.drawImage(layers.bank, bankX, waterY - h, w, h);
    ctx.restore();

    const smokeX = cabinX(layout) + parallaxX * 3 - 10;
    const smokeY = layout.waterTopY - this.cabinHeight;
    const dot = Math.max(1, Math.round(u));
    ctx.fillStyle = css(mix([224, 230, 236], state.sky.horizon, 0.6), 0.32);
    for (let i = 0; i < SMOKE_PUFFS; i++) {
      const age = (time * 0.28 + i / SMOKE_PUFFS) % 1;
      ctx.fillRect(Math.round((smokeX + age * 7) * u), Math.round((smokeY - age * 10) * u), dot * (age > 0.55 ? 2 : 1), dot);
    }
  }

  drawReflection(ctx: CanvasRenderingContext2D, scene: SceneIndex, layout: SceneLayout, parallaxX: number, time: number): void {
    const layers = this.layers[scene];
    if (!layers) return;
    const u = layout.unit;
    const w = Math.round(layers.reflection.width * u);
    const bankX = Math.round((parallaxX * 3 - MARGIN) * u);
    const waterY = Math.round(layout.waterTopY * u);
    const stripHeight = Math.max(1, Math.round(2 * u));
    ctx.save();
    for (let i = 0; i < REFLECTION_STRIPS; i++) {
      const sx = bankX + Math.round(Math.sin(time * 0.74 + i * 1.2) * i * 0.65 * u);
      const sy = Math.round(i * 3.4 * u);
      ctx.globalAlpha = 0.23 * (1 - i / REFLECTION_STRIPS);
      ctx.drawImage(layers.reflection, 0, i * 4, layers.reflection.width, 3, sx, waterY + sy, w, stripHeight);
    }
    ctx.restore();
  }
}
