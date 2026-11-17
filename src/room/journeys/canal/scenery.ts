import { css, type RGB } from '../../../render/color';
import { memoryCanvas } from '../../../render/pixel-stage';
import { clamp } from '../../../world/math';
import { clamp01, type SkyState } from '../../sky';
import { fbm, hash } from '../noise';
import {
  BRIDGE_XS,
  CHAPTERS,
  CHAPTER_START,
  LOCK,
  blendRgbInto,
  blendScalar,
  lockDepthAt,
  weightsAtWorld,
  wrapDelta,
} from './chapters';
import { drawScaledSprite, type CanalSprites } from './sprites';
import { drawChapterStructures, drawTulipStripes } from './structures';
import { CanalWater, type SmokePuff } from './water';

const DESIGN_ROWS = 270;
const HORIZON = 0.56;
const BANK_TOP = 0.605;
const SHORE_BASE = 0.67;
const BLOCK = 8;

interface Block {
  hill: string;
  field: string;
  grass: string;
  grassDark: string;
  bankEdge: string;
  waterTop: string;
  waterDeep: string;
  waterLift: number;
  quayHeight: number;
}

const windAt = (time: number, x: number): number =>
  Math.sin(time * 0.8 + x * 0.005) * 0.55 + Math.sin(time * 0.27 + x * 0.002 + 1.4) * 0.45;

function mixInto(a: RGB, b: RGB, t: number, out: RGB): void {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
}

export class CanalScenery {
  readonly land = memoryCanvas(1, 1);
  private readonly water = new CanalWater();
  private w = 0;
  private h = 0;
  private unit = 1;
  private shares = new Float32Array(0);
  private blocks: Block[] = [];
  private readonly scratch = new Array<number>(CHAPTERS.length).fill(0);
  private readonly tmpA: RGB = [0, 0, 0];
  private readonly tmpB: RGB = [0, 0, 0];

  private windmillAngle = 0;
  private readonly smoke: SmokePuff[] = [];
  private smokeTimer = 0;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_ROWS;
    this.land.canvas.width = w;
    this.land.canvas.height = h;
    this.shares = new Float32Array(w * CHAPTERS.length);
    const count = Math.ceil(w / BLOCK);
    this.blocks = Array.from({ length: count }, () => ({
      hill: '',
      field: '',
      grass: '',
      grassDark: '',
      bankEdge: '',
      waterTop: '',
      waterDeep: '',
      waterLift: 0,
      quayHeight: 0,
    }));
  }

  /** Computes per-column chapter blend weights and block colours without per-frame allocations. */
  prepare(scroll: number, state: SkyState): { midGrass: RGB; bridgeShade: number; shoreDesignY: number; quayHeight: number } {
    const n = CHAPTERS.length;
    const designW = this.w / this.unit;
    for (let x = 0; x < this.w; x++) {
      weightsAtWorld(scroll + x / this.unit, this.scratch);
      this.shares.set(this.scratch, x * n);
    }

    const horizon = state.sky.horizon;
    const count = Math.ceil(this.w / BLOCK);
    for (let i = 0; i < count; i++) {
      const col = Math.min(this.w - 1, i * BLOCK + (BLOCK >> 1));
      const slice = this.shares.subarray(col * n, col * n + n);
      const b = this.blocks[i];

      blendRgbInto(slice, (s) => s.hill, this.tmpA);
      mixInto(this.tmpA, horizon, 0.58, this.tmpB);
      b.hill = css(this.tmpB);

      blendRgbInto(slice, (s) => s.field, this.tmpA);
      mixInto(this.tmpA, horizon, 0.25, this.tmpB);
      b.field = css(this.tmpB);

      blendRgbInto(slice, (s) => s.grass, this.tmpA);
      b.grass = css(this.tmpA);

      blendRgbInto(slice, (s) => s.grassDark, this.tmpA);
      b.grassDark = css(this.tmpA);

      blendRgbInto(slice, (s) => s.bankEdge, this.tmpA);
      b.bankEdge = css(this.tmpA);

      blendRgbInto(slice, (s) => s.waterTop, this.tmpA);
      mixInto(this.tmpA, horizon, 0.35, this.tmpB);
      b.waterTop = css(this.tmpB);

      blendRgbInto(slice, (s) => s.waterDeep, this.tmpA);
      mixInto(this.tmpA, state.sky.zenith, 0.28, this.tmpB);
      b.waterDeep = css(this.tmpB);

      b.waterLift = blendScalar(slice, (s) => s.waterLift);
      const quayShare = slice[2] + slice[4] + slice[6];
      b.quayHeight = quayShare > 0.35 ? 6 * Math.min(1, (quayShare - 0.35) / 0.35) : 0;
    }

    const midIdx = Math.floor(this.w / 2);
    const midSlice = this.shares.subarray(midIdx * n, midIdx * n + n);
    const midGrass: RGB = [0, 0, 0];
    blendRgbInto(midSlice, (s) => s.grass, midGrass);
    const midBlock = this.blocks[midIdx >> 3] ?? this.blocks[0];

    let bridgeShade = 0;
    const centerDesign = designW * 0.5;
    for (const bx of BRIDGE_XS) {
      const dist = Math.abs(wrapDelta(bx, scroll) - centerDesign);
      if (dist < 68) {
        bridgeShade = Math.max(bridgeShade, Math.cos((dist / 68) * Math.PI * 0.5));
      }
    }

    const shoreDesignY = Math.round((SHORE_BASE - (midBlock?.waterLift ?? 0)) * DESIGN_ROWS);
    return {
      midGrass,
      bridgeShade,
      shoreDesignY,
      quayHeight: midBlock?.quayHeight ?? 0,
    };
  }

  /** Advances windmill rotation and chimney smoke. */
  step(dt: number, time: number, scroll: number): void {
    const gust = 0.45 + Math.abs(windAt(time, scroll)) * 0.9;
    this.windmillAngle += dt * gust * 0.95;

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.45;
      const emitters = [
        LOCK.cottageX + 11,
        CHAPTER_START[2] + 920 + 11,
        CHAPTER_START[2] + 1520 + 11,
        CHAPTER_START[6] + 1144 + 7,
      ];
      for (const ex of emitters) {
        const dx = wrapDelta(ex, scroll);
        if (dx > -40 && dx < this.w / this.unit + 40 && this.smoke.length < 36) {
          this.smoke.push({ wx: ex, y: 0, age: 0, life: 3.6, drift: windAt(time, ex) * 4 });
        }
      }
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const p = this.smoke[i];
      p.age += dt;
      p.y -= dt * 7;
      p.wx += p.drift * dt;
      if (p.age >= p.life) this.smoke.splice(i, 1);
    }
  }

  /** Draws distant hills, fields, far bank, props, trees, and structures onto `this.land`. */
  drawBank(
    sprites: CanalSprites,
    scroll: number,
    time: number,
    chapter: number,
    chapterT: number,
    shoreDesignY: number,
    lockLiftDesign: number,
    gateNudge: number,
  ): number {
    const L = this.land.ctx;
    L.clearRect(0, 0, this.w, this.h);
    L.imageSmoothingEnabled = false;

    const designW = this.w / this.unit;
    const horizonPx = Math.round(this.h * HORIZON);
    const bankTopPx = Math.round(this.h * BANK_TOP);
    const depth = lockDepthAt(chapter, chapterT);
    const effectiveShoreDesignY = Math.round(shoreDesignY + depth * 22);
    const shorePx = Math.round(effectiveShoreDesignY * this.unit);

    // 1. Far misty hills (0.08x parallax, calm low-contrast for clock readability)
    for (let x = 0; x < this.w; x++) {
      const at = (scroll * 0.08 + x / this.unit) * 0.006;
      const rise = clamp01((fbm(at) - 0.3) * 1.5);
      const top = horizonPx - Math.round((2 + rise * 14) * this.unit);
      const b = this.blocks[x >> 3];
      L.fillStyle = b.hill;
      L.fillRect(x, top, 1, bankTopPx - top + 2);
      L.fillStyle = b.field;
      L.fillRect(x, horizonPx, 1, shorePx - horizonPx);
    }

    // 2. Distant church tower in Village Market (0.45x parallax)
    const churchDx = wrapDelta(CHAPTER_START[2] + 1350, scroll) * 0.45 + designW * 0.5 * 0.55;
    if (churchDx > -40 && churchDx < designW + 40) {
      drawScaledSprite(L, sprites.churchTower, churchDx * this.unit, horizonPx + Math.round(8 * this.unit), this.unit * 0.8);
    }

    // 3. Bank body & towpath / wooden or stone quay surface
    const n = CHAPTERS.length;
    const lift = Math.round(lockLiftDesign * this.unit);
    const top = Math.max(horizonPx - Math.round(14 * this.unit), bankTopPx - lift);
    for (let x = 0; x < this.w; x++) {
      const b = this.blocks[x >> 3];
      L.fillStyle = b.grass;
      L.fillRect(x, top, 1, shorePx - top);
      const qh = Math.max(2, Math.round(b.quayHeight * this.unit));
      L.fillStyle = b.bankEdge;
      L.fillRect(x, shorePx - qh, 1, qh);
      if (b.quayHeight > 1) {
        L.fillStyle = 'rgba(255,255,255,0.14)';
        L.fillRect(x, shorePx - qh, 1, 1);
      }
      // Wooden quay planking seams & retaining pilings in Harbour Town
      const harbourShare = this.shares[x * n + 6];
      if (harbourShare > 0.45 && b.quayHeight > 2) {
        const wx = Math.floor(scroll + x / this.unit);
        if (wx % 14 === 0) {
          L.fillStyle = '#4e3522';
          L.fillRect(x, shorePx - qh, Math.max(1, Math.round(1.5 * this.unit)), qh + Math.round(2 * this.unit));
        } else if (wx % 7 === 0) {
          L.fillStyle = 'rgba(60,38,22,0.45)';
          L.fillRect(x, shorePx - qh, 1, Math.round(2 * this.unit));
        }
      }
      // Meadow drainage ditch in Windmill Meadows
      if (this.shares[x * n + 3] > 0.35) {
        L.fillStyle = '#538294';
        L.fillRect(x, shorePx - Math.round(6 * this.unit), 1, Math.max(1, Math.round(2 * this.unit)));
      }
    }

    // 4. Coloured tulip stripe fields (Ch 4) & scattered meadow wildflowers
    drawTulipStripes(L, scroll, designW, top, shorePx, this.unit);
    this.drawMeadowFlowers(L, scroll, designW, top, shorePx);

    // 5. Chapter structures (locks, market, windmills, bridges, haystacks, harbour)
    drawChapterStructures(
      L,
      sprites,
      scroll,
      time,
      chapter,
      chapterT,
      this.w,
      designW,
      shorePx,
      lockLiftDesign,
      gateNudge,
      this.windmillAngle,
      this.unit,
    );

    // 6. Swaying trees & reeds along the bank
    this.drawFlora(L, sprites, scroll, time, designW, shorePx, lockLiftDesign);

    return effectiveShoreDesignY;
  }

  private drawMeadowFlowers(
    L: CanvasRenderingContext2D,
    scroll: number,
    designW: number,
    bankTopPx: number,
    shorePx: number,
  ): void {
    const n = CHAPTERS.length;
    const cell = 10;
    const first = Math.floor((scroll - 16) / cell);
    const last = Math.ceil((scroll + designW + 16) / cell);
    const palette = ['#de4848', '#ebca48', '#e67aa2', '#f0f0e4'];
    const dot = Math.max(1, Math.round(this.unit));

    for (let k = first; k <= last; k++) {
      const seed = k * 3313 + 7;
      const dx = (k + hash(seed)) * cell - scroll;
      const col = clamp(Math.round(dx * this.unit), 0, this.w - 1);
      const slice = this.shares.subarray(col * n, col * n + n);
      if (slice[3] > 0.4) continue; // Chapter 4 uses structured tulip stripe fields instead
      const density = blendScalar(slice, (s) => s.flowerDensity);
      if (hash(seed + 1) > density) continue;

      const y = Math.round(bankTopPx + 2 * this.unit + hash(seed + 2) * Math.max(2, shorePx - bankTopPx - 5 * this.unit));
      L.fillStyle = palette[Math.floor(hash(seed + 3) * palette.length)];
      L.fillRect(Math.round(dx * this.unit), y, dot, dot);
    }
  }

  private drawFlora(
    L: CanvasRenderingContext2D,
    sprites: CanalSprites,
    scroll: number,
    time: number,
    designW: number,
    shorePx: number,
    lockLiftDesign: number,
  ): void {
    const n = CHAPTERS.length;
    const cell = 38;
    const first = Math.floor((scroll - 45) / cell);
    const last = Math.ceil((scroll + designW + 45) / cell);
    for (let k = first; k <= last; k++) {
      const seed = k * 6131 + 19;
      const wx = (k + hash(seed)) * cell;
      const dx = wx - scroll;
      const col = clamp(Math.round(dx * this.unit), 0, this.w - 1);
      const slice = this.shares.subarray(col * n, col * n + n);
      if (slice[1] > 0.45 && wx > LOCK.entryGateX - 20 && wx < LOCK.exitGateX + 20) continue;

      const density = blendScalar(slice, (s) => s.treeDensity);
      if (hash(seed + 1) < density) {
        const willowShare = blendScalar(slice, (s) => s.willowShare);
        const isWillow = hash(seed + 2) < willowShare;
        const sprite = isWillow
          ? sprites.willows[Math.floor(hash(seed + 3) * sprites.willows.length)]
          : sprites.oaks[Math.floor(hash(seed + 3) * sprites.oaks.length)];
        const yOffset = Math.round((4 + hash(seed + 4) * 5 + lockLiftDesign) * this.unit);
        const bend = windAt(time, wx) * 2.2;
        drawScaledSprite(L, sprite, dx * this.unit, shorePx - yOffset, this.unit, bend);
      }

      const reedDensity = blendScalar(slice, (s) => s.reedDensity);
      if (hash(seed + 5) < reedDensity) {
        const reed = sprites.reeds[Math.floor(hash(seed + 6) * sprites.reeds.length)];
        drawScaledSprite(L, reed, (dx + 10) * this.unit, shorePx + Math.round(2 * this.unit), this.unit, windAt(time, wx) * 1.8);
      }
    }
  }

  /** Draws canal water, reflections, wake, overhead stone bridges, and foreground barge deck. */
  drawWaterAndForeground(
    ctx: CanvasRenderingContext2D,
    state: SkyState,
    dt: number,
    time: number,
    scroll: number,
    effectiveSpeed: number,
    shoreDesignY: number,
    bridgeShade: number,
    pointer: { x: number; y: number } | null,
  ): void {
    this.water.drawWater(
      ctx,
      this.land.canvas,
      this.blocks,
      state,
      dt,
      time,
      scroll,
      effectiveSpeed,
      shoreDesignY,
      bridgeShade,
      pointer,
      this.w,
      this.h,
      this.unit,
    );
  }

  /** Draws glowing night lights, chimney smoke, and the barge gunwale. */
  drawOverlay(
    ctx: CanvasRenderingContext2D,
    sprites: CanalSprites,
    state: SkyState,
    time: number,
    scroll: number,
    shoreDesignY: number,
    lockLiftDesign: number,
  ): void {
    this.water.drawOverlay(ctx, sprites, this.smoke, state, time, scroll, shoreDesignY, lockLiftDesign, this.w, this.h, this.unit);
  }
}
