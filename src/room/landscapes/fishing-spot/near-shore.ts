import { memoryCanvas } from '../../../render/pixel-stage';
import { hash, noise } from '../../journeys/noise';
import { pixmap } from '../../journeys/pixmap';
import type { FishingSprites } from './sprites';
import type { SceneIndex, SceneLayout } from './types';

// Insets keep the two banks clear of the radio while leaving room for open water between them.
const BANK_WIDTH = 156;
const BANK_TOP = 227;
const BANK_MARGIN = 24;
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
): void {
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

  for (let i = 0; i < REED_CLUMPS; i++) {
    const s = seed * 37 + i * 17;
    const x = Math.round(reach * (0.04 + i * 0.10) + hash(s) * 6);
    if (Math.abs(x / reach - scoop) < 0.12) continue;
    const y = bankTop(x) + 7;
    const reed = sprites.reeds[i % sprites.reeds.length];
    const spread = Math.round(10 + hash(s + 1) * 9);
    const tall = Math.round(9 + hash(s + 2) * 11);
    ctx.drawImage(reed.canvas, x - 6, y - tall, spread, tall);
  }

  // Each clump has a flower or bud and smaller pads drifting out into the cove.
  for (let i = 0; i < PAD_CLUSTERS; i++) {
    const x = Math.round(reach * (0.22 + i * 0.28));
    const y = bankTop(x) - 9 - Math.round(hash(seed + i * 7) * 6);
    const bloom = sprites.lilyPads[i % 2 === 0 ? 1 : 3];
    const small = sprites.lilyPads[2];
    ctx.fillStyle = 'rgba(38,68,61,0.35)';
    ctx.fillRect(x - 2, y + 1, bloom.w + 4, 1);
    ctx.drawImage(bloom.canvas, x, y - bloom.h + 1);
    ctx.drawImage(small.canvas, x - 9, y - 7);
    ctx.drawImage(small.canvas, x + 8, y + 3, 7, 2);
  }
}

interface BankPair {
  left: HTMLCanvasElement;
  right: HTMLCanvasElement;
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
      const left = memoryCanvas(width + BANK_MARGIN, height);
      const right = memoryCanvas(width + BANK_MARGIN, height);
      left.ctx.imageSmoothingEnabled = false;
      right.ctx.imageSmoothingEnabled = false;
      left.ctx.translate(BANK_MARGIN, 0);
      right.ctx.translate(width, 0);
      right.ctx.scale(-1, 1);
      paintBank(left.ctx, rocks, sprites, width * bank.left / BANK_WIDTH, bank.scoop, bank.gravel, 21 + scene, height);
      paintBank(right.ctx, rocks, sprites, width * bank.right / BANK_WIDTH, bank.scoop, bank.gravel, 57 + scene, height);
      left.ctx.drawImage(left.canvas, BANK_MARGIN, 0, 1, height, -BANK_MARGIN, 0, BANK_MARGIN, height);
      right.ctx.setTransform(1, 0, 0, 1, 0, 0);
      right.ctx.drawImage(right.canvas, width - 1, 0, 1, height, width, 0, BANK_MARGIN, height);
      return { left: left.canvas, right: right.canvas };
    });
  }

  draw(ctx: CanvasRenderingContext2D, layout: SceneLayout, scene: SceneIndex, parallaxX: number): void {
    const bank = this.banks[scene];
    if (!bank) return;
    const u = layout.unit;
    const w = Math.max(1, Math.round(bank.left.width * u));
    const h = Math.max(1, Math.round(bank.left.height * u));
    const y = Math.round(BANK_TOP * u);
    const shift = Math.round(parallaxX * 7 * u);
    ctx.drawImage(bank.left, shift - Math.round(BANK_MARGIN * u), y, w, h);
    ctx.drawImage(bank.right, Math.round((layout.designW + BANK_MARGIN) * u) - w + shift, y, w, h);
  }
}
