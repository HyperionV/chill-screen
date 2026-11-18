import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';
import { breeze } from '../../wind';
import type { FishingSprites } from './sprites';
import type { SceneIndex, SceneLayout, SpriteBox } from './types';
import { BANK_REED_SWAY, drawWindSprite, LILY_SWAY } from './wind-sprites';

// Insets keep the two banks clear of the radio while leaving room for open water between them.
const BANK_WIDTH = 156;
const BANK_TOP = 227;
const DRY_BANK_ROWS = 10;
const PEBBLE_COUNT = 32;
const REED_CLUMPS = 8;
const PAD_CLUSTERS = 3;
const BANKS = [
  { left: 106, right: 146, scoop: 0.34, gravel: '#85785a' },
  { left: 68, right: 156, scoop: 0.19, gravel: '#968967' },
  { left: 92, right: 117, scoop: 0.55, gravel: '#7e8066' },
  { left: 125, right: 99, scoop: 0.43, gravel: '#948066' },
  { left: 74, right: 130, scoop: 0.57, gravel: '#757665' },
];

interface BankPlant {
  sprite: SpriteBox;
  x: number;
  y: number;
  w: number;
  h: number;
  sway: number;
}

interface Bank {
  canvas: HTMLCanvasElement;
  plants: readonly BankPlant[];
}

function rockSprites(): HTMLCanvasElement[] {
  const colors = { h: '#aaa791', m: '#777e70', s: '#545f56', d: '#3b4944', g: '#77885b' };
  return [
    pixmap([
      '....hhhh....', '..hhmmmmh...', '.hmmmmmsgm..', 'hmmmsmggsmd.', 'dssmmssssddd', '..ddddddd...',
    ], colors),
    pixmap([
      '..hhhhhm...', '.hmhmmssm..', 'hmmmmmssssd', '.dssssdddd.', '...ddddd...',
    ], colors),
    pixmap([
      '...hhh...', '.hmmmms..', 'hmgsmmssd', '.ddssddd.',
    ], colors),
  ];
}

/** Draws a shallow cove, with submerged gravel before the dry bank and stones above the waterline. */
function paintBank(
  ctx: CanvasRenderingContext2D,
  rocks: readonly HTMLCanvasElement[],
  sprites: FishingSprites,
  reach: number,
  scoop: number,
  gravel: string,
  seed: number,
  height: number,
): BankPlant[] {
  const bankTop = (x: number) => Math.round(14 + 26 * (x / reach) ** 1.7 + noise(x / 14 + seed) * 5);
  for (let x = 0; x < reach; x++) {
    const y = bankTop(x);
    const dryY = Math.max(y + 2, height - DRY_BANK_ROWS + Math.round(noise(x / 18 + seed) * 4));
    const paleEdge = hash(x * 13 + seed) > 0.35;
    ctx.fillStyle = 'rgba(78,112,93,0.29)';
    ctx.fillRect(x, y - 7, 1, dryY - y + 7);
    ctx.fillStyle = 'rgba(131,136,101,0.42)';
    ctx.fillRect(x, y - 3, 1, 4);
    ctx.fillStyle = '#4b5746';
    ctx.fillRect(x, dryY, 1, Math.max(0, height - dryY));
    ctx.fillStyle = gravel;
    ctx.fillRect(x, dryY, 1, 3 + Math.round(noise(x / 7 + seed) * 3));
    if (paleEdge) {
      ctx.fillStyle = 'rgba(180,177,141,0.45)';
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }

  for (let i = 0; i < PEBBLE_COUNT; i++) {
    const s = seed * 101 + i * 31;
    const x = Math.round(hash(s) * (reach - 6));
    const y = bankTop(x) + Math.round(hash(s + 1) * 15) - 7;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(167,173,136,0.46)' : 'rgba(91,112,92,0.52)';
    ctx.fillRect(x, y, i % 3 + 1, 1);
  }

  for (let i = 0; i < rocks.length * 2; i++) {
    const rock = rocks[i % rocks.length];
    const x = Math.round((0.09 + i * 0.14) * reach + (hash(seed + i) - 0.5) * 11);
    const y = bankTop(x) + Math.round(hash(seed + i * 19) * 6);
    ctx.fillStyle = 'rgba(31,48,49,0.34)';
    ctx.fillRect(x - 2, y + 1, rock.width + 4, 2);
    ctx.drawImage(rock, x, y - rock.height + 1);
  }

  const plants: BankPlant[] = [];
  for (let i = 0; i < REED_CLUMPS; i++) {
    const s = seed * 37 + i * 17;
    const x = Math.round(reach * (0.04 + i * 0.10) + hash(s) * 6);
    if (Math.abs(x / reach - scoop) < 0.12) continue;
    const y = bankTop(x) + 7;
    const reed = sprites.reeds[i % sprites.reeds.length];
    const spread = Math.round(10 + hash(s + 1) * 9);
    const tall = Math.round(9 + hash(s + 2) * 11);
    plants.push({ sprite: reed, x: x - 6, y: y - tall, w: spread, h: tall, sway: BANK_REED_SWAY });
  }

  // Each clump has a flower or bud and smaller pads around it.
  for (let i = 0; i < PAD_CLUSTERS; i++) {
    const x = Math.round(reach * (0.22 + i * 0.28));
    const y = bankTop(x) - 9 - Math.round(hash(seed + i * 7) * 6);
    const bloom = sprites.lilyPads[i % 2 === 0 ? 1 : 3];
    const small = sprites.lilyPads[2];
    ctx.fillStyle = 'rgba(38,68,61,0.35)';
    ctx.fillRect(x - 2, y + 1, bloom.w + 4, 1);
    plants.push(
      { sprite: bloom, x, y: y - bloom.h + 1, w: bloom.w, h: bloom.h, sway: LILY_SWAY },
      { sprite: small, x: x - 9, y: y - 7, w: small.w, h: small.h, sway: LILY_SWAY },
      { sprite: small, x: x + 8, y: y + 3, w: 7, h: 2, sway: LILY_SWAY },
    );
  }
  return plants;
}

interface BankPair {
  left: Bank;
  right: Bank;
}

function drawBankPlants(
  ctx: CanvasRenderingContext2D, bank: Bank, edge: number, y: number, unit: number, time: number, direction: number,
): void {
  ctx.save();
  ctx.translate(edge, y);
  ctx.scale(direction, 1);
  for (const plant of bank.plants) {
    const stageX = edge + direction * (plant.x + plant.w / 2) * unit;
    const bend = Math.round(breeze(time, stageX) * plant.sway) * direction;
    const w = Math.max(1, Math.round(plant.w * unit));
    const h = Math.max(1, Math.round(plant.h * unit));
    drawWindSprite(ctx, plant.sprite, Math.round(plant.x * unit), Math.round(plant.y * unit), w, h, bend);
  }
  ctx.restore();
}

export class NearShore {
  private banks: BankPair[] = [];
  private rocks: HTMLCanvasElement[] | null = null;

  resize(layout: SceneLayout, sprites: FishingSprites): void {
    this.rocks ??= rockSprites();
    const rocks = this.rocks;
    const width = Math.max(1, Math.floor(Math.min(BANK_WIDTH, layout.designW * 0.32)));
    const height = layout.designH - BANK_TOP;
    this.banks = BANKS.map((bank, scene) => {
      const left = memoryCanvas(width, height);
      const right = memoryCanvas(width, height);
      left.ctx.imageSmoothingEnabled = false;
      right.ctx.imageSmoothingEnabled = false;
      right.ctx.translate(width, 0);
      right.ctx.scale(-1, 1);
      const leftPlants = paintBank(left.ctx, rocks, sprites, width * bank.left / BANK_WIDTH, bank.scoop, bank.gravel, 21 + scene, height);
      const rightPlants = paintBank(right.ctx, rocks, sprites, width * bank.right / BANK_WIDTH, bank.scoop, bank.gravel, 57 + scene, height);
      return { left: { canvas: left.canvas, plants: leftPlants }, right: { canvas: right.canvas, plants: rightPlants } };
    });
  }

  draw(ctx: CanvasRenderingContext2D, layout: SceneLayout, scene: SceneIndex, time: number): void {
    const bank = this.banks[scene];
    if (!bank) return;
    const u = layout.unit;
    const w = Math.max(1, Math.round(bank.left.canvas.width * u));
    const h = Math.max(1, Math.round(bank.left.canvas.height * u));
    const y = Math.round(BANK_TOP * u);
    const right = Math.round(layout.designW * u);
    ctx.drawImage(bank.left.canvas, 0, y, w, h);
    ctx.drawImage(bank.right.canvas, right - w, y, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, w, h);
    ctx.rect(right - w, y, w, h);
    ctx.clip();
    drawBankPlants(ctx, bank.left, 0, y, u, time, 1);
    drawBankPlants(ctx, bank.right, right, y, u, time, -1);
    ctx.restore();
  }
}
