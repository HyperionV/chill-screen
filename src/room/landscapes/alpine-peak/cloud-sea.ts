import { mix, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { approach, clamp, seededRandom } from '../../../world/math';
import { hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';
import type { ViewFrame } from '../../view';
import { ALPINE_COLORS, alpenglowStrength, cloudSeaBaseY } from './scenes';

interface CloudBillow {
  u: number;
  layer: 0 | 1;
  sprite: number;
  scale: number;
  vJitter: number;
  speed: number;
  partX: number;
  partY: number;
  partAlpha: number;
}

const MAX_CLOUDS = 30;
const SPRITE_COUNT = 5;
const CLOUD_PART_RADIUS = 56;

const BAYER_4X4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function buildCloudBankSprite(
  seed: number,
  w: number,
  h: number,
  topCol: RGB,
  litCol: RGB,
  shadeCol: RGB,
): HTMLCanvasElement {
  const { canvas, ctx } = memoryCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const data = img.data;
  const rnd = seededRandom(seed * 211 + 19);

  // Overlapping cumulus domes along the upper cloud bank.
  const domes: { cx: number; cy: number; rx: number; ry: number }[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const arch = Math.sin(Math.PI * t);
    const rx = w * (0.14 + 0.08 * arch + rnd() * 0.04);
    const ry = h * (0.28 + 0.24 * arch + rnd() * 0.08);
    domes.push({
      cx: w * (0.14 + 0.72 * t + (rnd() - 0.5) * 0.06),
      cy: h * (0.58 - 0.20 * arch + (rnd() - 0.5) * 0.06),
      rx,
      ry,
    });
  }

  for (let y = 0; y < h; y++) {
    const ny = y / h;
    const botFade = clamp((1 - ny) / 0.36, 0, 1);
    for (let x = 0; x < w; x++) {
      const edgeFade = clamp(Math.min(x, w - 1 - x) / (w * 0.12), 0, 1);
      let field = 0;
      for (const d of domes) {
        const dx = (x - d.cx) / d.rx;
        const dy = (y - d.cy) / d.ry;
        const dist = Math.hypot(dx, dy);
        if (dist < 1.15) {
          field = Math.max(field, 1.15 - dist);
        }
      }
      // Continuous soft mist shelf across the lower belly.
      if (ny > 0.42 && ny < 0.85) {
        const shelf = Math.sin(clamp((ny - 0.42) / 0.43, 0, 1) * Math.PI) * edgeFade * 0.85;
        field = Math.max(field, shelf);
      }

      const density = clamp(field * 1.15 * botFade * edgeFade, 0, 1);
      const bayer = (BAYER_4X4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      if (density <= bayer * 0.78 + 0.14) continue;

      // Dithered shading from bright top rim -> lit cumulus -> cool shaded belly.
      const shadeFactor = clamp((ny - 0.22) / 0.52 + (1 - field) * 0.28, 0, 1);
      let col: RGB = litCol;
      if (ny < 0.36 && field > 0.48) {
        col = shadeFactor < bayer * 0.35 + 0.18 ? topCol : litCol;
      } else if (shadeFactor > bayer * 0.55 + 0.22) {
        col = shadeCol;
      }

      const o = (y * w + x) * 4;
      data[o] = col[0] | 0;
      data[o + 1] = col[1] | 0;
      data[o + 2] = col[2] | 0;
      data[o + 3] = 242;
    }
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Multi-layered valley cloud sea with soft dithered cloud tops that drifts and parts near the pointer. */
export class CloudSea {
  private readonly clouds: CloudBillow[] = [];
  private sprites: HTMLCanvasElement[] = [];
  private spriteKey = '';

  constructor() {
    for (let i = 0; i < MAX_CLOUDS; i++) {
      const layer: 0 | 1 = i < 14 ? 0 : 1;
      const idx = layer === 0 ? i : i - 14;
      const count = layer === 0 ? 14 : 16;
      this.clouds.push({
        u: (idx / count) * 1.24 - 0.12 + (hash(i * 19 + 5) - 0.5) * 0.04,
        layer,
        sprite: i % SPRITE_COUNT,
        scale: (layer === 0 ? 0.85 : 1.05) + hash(i * 17 + 1) * 0.35,
        vJitter: (hash(i * 17 + 2) - 0.5) * (layer === 0 ? 6 : 8),
        speed: (layer === 0 ? 0.0032 : 0.0058) * (0.8 + hash(i * 17 + 3) * 0.45),
        partX: 0,
        partY: 0,
        partAlpha: 0,
      });
    }
  }

  /** Updates horizontal cloud drift and smooth parting away from the active pointer. */
  update(dt: number, scene: number, w: number, h: number, unit: number, pointer: ViewFrame['pointer']): void {
    const partRad = CLOUD_PART_RADIUS * unit;
    for (const c of this.clouds) {
      c.u += c.speed * dt;
      if (c.u > 1.18) c.u -= 1.36;
      const cx = c.u * w;
      const cy = cloudSeaBaseY(scene, c.layer) * h + c.vJitter * unit;
      let tx = 0;
      let ty = 0;
      let ta = 0;
      if (pointer) {
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < partRad && dist > 0.1) {
          const push = (1 - dist / partRad) ** 1.4;
          tx = (dx / dist) * 20 * unit * push;
          ty = Math.max(0, dy / dist) * 5 * unit * push + 2 * unit * push;
          ta = 0.45 * push;
        }
      }
      c.partX = approach(c.partX, tx, 7, dt);
      c.partY = approach(c.partY, ty, 7, dt);
      c.partAlpha = approach(c.partAlpha, ta, 7, dt);
    }
  }

  /** Draws either the distant valley cloud sea (layer 0) or foreground billowing clouds (layer 1). */
  draw(
    L: CanvasRenderingContext2D,
    scene: number,
    layer: 0 | 1,
    w: number,
    h: number,
    unit: number,
    hour: number,
    state: SkyState,
    parX: number,
    parY: number,
  ): void {
    const baseY = cloudSeaBaseY(scene, layer) * h + parY;
    const day = state.day;
    const glow = alpenglowStrength(hour);

    const topRgb: RGB = mix(
      mix(mix(ALPINE_COLORS.cloudLit, ALPINE_COLORS.alpenglowPink, 0.58 * glow), state.sky.light, 0.22 * day),
      [134, 152, 198],
      (1 - day) * (1 - glow * 0.55) * 0.72,
    );
    const litRgb: RGB = mix(
      mix(ALPINE_COLORS.cloudLit, ALPINE_COLORS.alpenglowPink, 0.35 * glow),
      [96, 114, 158],
      (1 - day) * (1 - glow * 0.45) * 0.76,
    );
    const shadeRgb: RGB = mix(
      mix(ALPINE_COLORS.cloudShade, ALPINE_COLORS.alpenglowShadow, 0.48 * glow),
      [44, 56, 94],
      (1 - day) * 0.80,
    );

    const sw = Math.max(44, Math.round(76 * unit));
    const sh = Math.max(14, Math.round(22 * unit));
    const key = [sw, sh, ...topRgb, ...shadeRgb].map((v) => Math.round(v / 14)).join(',');
    if (key !== this.spriteKey) {
      this.spriteKey = key;
      this.sprites = [0, 1, 2, 3, 4].map((s) => buildCloudBankSprite(s, sw, sh, topRgb, litRgb, shadeRgb));
    }

    // Distant layer 0 includes a continuous soft dithered mist deck across the valley basin.
    if (layer === 0) {
      const deckY = Math.round(baseY + 2 * unit);
      const deckH = Math.round((scene === 1 ? 26 : 56) * unit);
      L.fillStyle = `rgb(${shadeRgb[0] | 0},${shadeRgb[1] | 0},${shadeRgb[2] | 0})`;
      L.fillRect(0, deckY, w, deckH);
      L.fillStyle = `rgb(${litRgb[0] | 0},${litRgb[1] | 0},${litRgb[2] | 0})`;
      for (let x = 0; x < w; x += 2) {
        if (hash(x * 0.7 + scene * 13) > 0.38) {
          L.fillRect(x, deckY - 1, 2, 2);
        }
      }
    }

    L.save();
    for (const c of this.clouds) {
      if (c.layer !== layer) continue;
      const sp = this.sprites[c.sprite];
      if (!sp) continue;
      const cw = Math.round(sp.width * c.scale);
      const ch = Math.round(sp.height * c.scale);
      const cx = Math.round(c.u * w + c.partX + parX * (layer === 0 ? 0.5 : 0.92));
      const cy = Math.round(baseY + c.vJitter * unit + c.partY);
      if (cx + cw * 0.6 < 0 || cx - cw * 0.6 > w) continue;

      const alpha = (layer === 0 ? 0.88 : scene === 1 ? 0.68 : 0.92) * (1 - c.partAlpha);
      if (alpha <= 0.04) continue;
      L.globalAlpha = alpha;
      L.drawImage(sp, Math.round(cx - cw * 0.5), Math.round(cy - ch * 0.58), cw, ch);
    }
    L.restore();
  }
}
