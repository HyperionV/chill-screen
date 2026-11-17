import { css, type RGB } from '../../../render/color';
import { approach, clamp, seededRandom } from '../../../world/math';
import { hash } from '../noise';
import type { ChapterMood } from './chapters';
import type { JungleSprites } from './sprites';

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
}

interface SpiritLight {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  phase: number;
}

const FIREFLY_COUNT = 42;
const SPIRIT_COUNT = 16;
const STONE_COUNT = 5;

const FIREFLY_RGB = '226,255,134';
const SPIRIT_RGB = '156,252,216';
const RAINBOW_COLORS: readonly RGB[] = [
  [235, 130, 126],
  [240, 198, 120],
  [146, 224, 152],
  [128, 194, 236],
  [174, 148, 228],
];

/** Manages Chapter 3 Waterfall + rainbow, Chapter 5 Hidden Temple + 5 carved stones puzzle, and fireflies. */
export class JungleLandmarks {
  private w = 0;
  private h = 0;
  private unit = 1;

  private readonly fireflies: Firefly[] = [];
  private readonly spirits: SpiritLight[] = Array.from({ length: SPIRIT_COUNT }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 4, phase: 0,
  }));

  private spiritTimer = 0;
  private expectedStone = 0;
  private templeAwake = false;
  private templeGlow = 0;
  private readonly stoneGlow = new Float32Array(STONE_COUNT);
  private readonly stoneTarget = new Float32Array(STONE_COUNT);

  constructor() {
    const rnd = seededRandom(3319);
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      this.fireflies.push({
        x: rnd(),
        y: 0.56 + rnd() * 0.28,
        vx: 0,
        vy: 0,
        phase: rnd() * 6.28,
        speed: 0.7 + rnd() * 1.4,
      });
    }
  }

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
  }

  resetTempleForLoop(): void {
    this.expectedStone = 0;
    this.templeAwake = false;
    this.stoneTarget.fill(0);
  }

  update(dt: number, ch5Weight: number): void {
    if (this.w <= 0 || this.h <= 0) return;
    for (let i = 0; i < STONE_COUNT; i++) {
      this.stoneGlow[i] = approach(this.stoneGlow[i], this.stoneTarget[i], 4.5, dt);
    }
    this.templeGlow = approach(this.templeGlow, this.templeAwake ? 1 : 0, 2.2, dt);

    if (this.templeAwake && ch5Weight > 0.2) {
      this.spiritTimer -= dt;
      if (this.spiritTimer <= 0) {
        this.spiritTimer = 0.55;
        this.spawnSpirit(ch5Weight);
      }
    }
    for (const s of this.spirits) {
      if (!s.active) continue;
      s.age += dt;
      s.x += (s.vx + Math.sin(s.age * 2 + s.phase) * 7 * this.unit) * dt;
      s.y += s.vy * dt;
      if (s.age >= s.life) s.active = false;
    }
  }

  /** Attempts to click one of the 5 carved stones in Chapter 5. Returns true if a stone was hit. */
  pressStone(x: number, y: number, ch5Weight: number, sprites: JungleSprites): boolean {
    if (ch5Weight < 0.25) return false;
    const stoneW = sprites.stones[0].w;
    const stoneH = sprites.stones[0].h;
    const pad = 5 * this.unit;
    for (let i = 0; i < STONE_COUNT; i++) {
      const [sx, sy] = this.stonePos(i, ch5Weight);
      if (Math.abs(x - sx) <= stoneW * 0.5 + pad && y >= sy - stoneH - pad && y <= sy + pad) {
        if (this.templeAwake) {
          this.spawnSpirit(ch5Weight);
          return true;
        }
        if (i === this.expectedStone) {
          this.stoneTarget[i] = 1;
          this.expectedStone++;
          if (this.expectedStone >= STONE_COUNT) {
            this.templeAwake = true;
            for (let k = 0; k < 4; k++) this.spawnSpirit(ch5Weight);
          }
        } else {
          this.expectedStone = 0;
          this.stoneTarget.fill(0);
        }
        return true;
      }
    }
    return false;
  }

  private spawnSpirit(ch5Weight: number): void {
    const [tx, ty] = this.templeDoorPos(ch5Weight);
    for (const s of this.spirits) {
      if (s.active) continue;
      s.active = true;
      s.x = tx + (Math.random() - 0.5) * 6 * this.unit;
      s.y = ty + (Math.random() - 0.5) * 4 * this.unit;
      s.vx = -(14 + Math.random() * 14) * this.unit;
      s.vy = -(10 + Math.random() * 12) * this.unit;
      s.age = 0;
      s.life = 4.2 + Math.random() * 2.2;
      s.phase = Math.random() * 6.28;
      return;
    }
  }

  templePos(ch5Weight: number): [number, number] {
    const slide = (1 - ch5Weight) * this.w * 0.36;
    return [Math.round(this.w * 0.68 + slide), Math.round(this.h * 0.43)];
  }

  private templeDoorPos(ch5Weight: number): [number, number] {
    const [tx, ty] = this.templePos(ch5Weight);
    return [tx + Math.round(64 * this.unit), ty + Math.round(62 * this.unit)];
  }

  private stonePos(index: number, ch5Weight: number): [number, number] {
    const slide = (1 - ch5Weight) * this.w * 0.32;
    const x = Math.round(this.w * (0.24 + index * 0.088) + slide);
    const y = Math.round(this.h * (0.725 + (index % 2) * 0.014));
    return [x, y];
  }

  /** Draws the Chapter 3 waterfall cliff, cascade, wet rocks, and base foam onto the land layer. */
  drawWaterfall(ctx: CanvasRenderingContext2D, time: number, ch3Weight: number, sprites: JungleSprites): void {
    if (ch3Weight < 0.02) return;
    const slide = (1 - ch3Weight) * this.w * 0.38;
    const left = Math.round(this.w * 0.75 + slide);
    const top = Math.round(this.h * 0.25);
    const bottom = Math.round(this.h * 0.68);
    const fallW = Math.round(28 * this.unit);

    ctx.save();
    ctx.globalAlpha = clamp(ch3Weight * 1.25, 0, 1);

    ctx.fillStyle = 'rgb(30,44,44)';
    ctx.fillRect(left - Math.round(8 * this.unit), top, fallW + Math.round(22 * this.unit), bottom - top);
    ctx.fillStyle = 'rgb(44,64,58)';
    ctx.fillRect(left - Math.round(5 * this.unit), top + 2, Math.round(6 * this.unit), bottom - top - 4);

    for (let dx = 0; dx < fallW; dx++) {
      const colPhase = hash(dx * 17.3) * 10;
      ctx.fillStyle = dx % 5 === 0 ? 'rgb(160,214,222)' : 'rgb(104,166,180)';
      ctx.fillRect(left + dx, top, 1, bottom - top);
      const streakY = top + Math.round((time * (36 + (dx % 4) * 9) + colPhase * 7) % (bottom - top));
      const streakH = Math.max(4, Math.round((7 + (dx % 3) * 4) * this.unit));
      ctx.fillStyle = 'rgb(228,248,250)';
      ctx.fillRect(left + dx, streakY, 1, Math.min(streakH, bottom - streakY));
    }

    const rockA = sprites.wetRocks[0];
    const rockB = sprites.wetRocks[1];
    ctx.drawImage(rockA.canvas, Math.round(left - rockA.w * 0.6), bottom - rockA.h + 2);
    ctx.drawImage(rockB.canvas, Math.round(left + fallW - 4 * this.unit), bottom - rockB.h + 3);

    for (let i = 0; i < 10; i++) {
      const fx = left - 6 * this.unit + Math.round((i / 9) * (fallW + 12 * this.unit));
      const bob = Math.round(Math.sin(time * 4 + i * 1.7) * 1.5 * this.unit);
      ctx.fillStyle = i % 2 === 0 ? 'rgb(232,248,250)' : 'rgb(168,214,220)';
      ctx.fillRect(fx, bottom - 2 + bob, Math.max(2, Math.round(4 * this.unit)), Math.max(2, Math.round(2 * this.unit)));
    }
    ctx.restore();
  }

  /** Draws the overgrown Hidden Temple and the 5 water-edge stones onto the land layer. */
  drawTempleBase(ctx: CanvasRenderingContext2D, ch5Weight: number, sprites: JungleSprites): void {
    if (ch5Weight < 0.02) return;
    ctx.save();
    ctx.globalAlpha = clamp(ch5Weight * 1.25, 0, 1);
    const [tx, ty] = this.templePos(ch5Weight);
    ctx.drawImage(sprites.temple.canvas, tx, ty);
    for (let i = 0; i < STONE_COUNT; i++) {
      const [sx, sy] = this.stonePos(i, ch5Weight);
      const sp = sprites.stones[i];
      ctx.drawImage(sp.canvas, Math.round(sx - sp.w / 2), Math.round(sy - sp.h));
    }
    ctx.restore();
  }

  /** Draws waterfall spray mist, rainbow, temple glows, spirit lights, and fireflies after tinting. */
  drawPostTint(
    ctx: CanvasRenderingContext2D,
    dt: number,
    time: number,
    day: number,
    mood: ChapterMood,
    ch3Weight: number,
    ch5Weight: number,
    sprites: JungleSprites,
  ): void {
    if (ch3Weight > 0.08) {
      const slide = (1 - ch3Weight) * this.w * 0.38;
      const baseX = this.w * 0.75 + slide + 14 * this.unit;
      const baseY = this.h * 0.66;
      for (let i = 0; i < 6; i++) {
        const drift = (time * 0.45 + i * 0.17) % 1;
        const px = Math.round(baseX + Math.sin(i * 2.1 + time) * 14 * this.unit);
        const py = Math.round(baseY - drift * 18 * this.unit);
        const a = (1 - drift) * 0.36 * ch3Weight;
        ctx.fillStyle = `rgba(226,248,250,${a.toFixed(3)})`;
        ctx.fillRect(px - 3, py - 1, Math.max(4, Math.round(8 * this.unit)), Math.max(2, Math.round(3 * this.unit)));
      }
    }

    if (ch3Weight > 0.12 && day > 0.32) {
      const slide = (1 - ch3Weight) * this.w * 0.38;
      const cx = Math.round(this.w * 0.74 + slide);
      const cy = Math.round(this.h * 0.66);
      const alpha = ch3Weight * clamp((day - 0.32) / 0.45, 0, 1) * 0.24;
      for (let b = 0; b < RAINBOW_COLORS.length; b++) {
        const r = Math.round((20 - b * 2) * this.unit);
        ctx.fillStyle = css(RAINBOW_COLORS[b], alpha);
        for (let a = 0; a < 14; a++) {
          const theta = Math.PI * (1.05 + (a / 13) * 0.72);
          ctx.fillRect(Math.round(cx + Math.cos(theta) * r), Math.round(cy + Math.sin(theta) * r), Math.max(1, Math.round(this.unit)), Math.max(1, Math.round(this.unit)));
        }
      }
    }

    if (ch5Weight > 0.04) {
      const [tx, ty] = this.templePos(ch5Weight);
      if (this.templeGlow > 0.02) {
        ctx.save();
        ctx.globalAlpha = this.templeGlow * ch5Weight * (0.8 + 0.18 * Math.sin(time * 2));
        ctx.drawImage(sprites.templeGlow.canvas, tx, ty);
        ctx.restore();
      }
      for (let i = 0; i < STONE_COUNT; i++) {
        const g = this.stoneGlow[i];
        if (g < 0.03) continue;
        const [sx, sy] = this.stonePos(i, ch5Weight);
        const sp = sprites.stoneGlows[i];
        ctx.save();
        ctx.globalAlpha = g * ch5Weight;
        ctx.fillStyle = `rgba(${SPIRIT_RGB},${(0.24 * g * ch5Weight).toFixed(3)})`;
        ctx.fillRect(Math.round(sx - sp.w * 0.75), Math.round(sy - sp.h - 2), Math.round(sp.w * 1.5), sp.h + 4);
        ctx.drawImage(sp.canvas, Math.round(sx - sp.w / 2), Math.round(sy - sp.h));
        ctx.restore();
      }
      for (const s of this.spirits) {
        if (!s.active) continue;
        const fade = Math.sin((s.age / s.life) * Math.PI) * ch5Weight;
        const x = Math.round(s.x);
        const y = Math.round(s.y);
        ctx.fillStyle = `rgba(${SPIRIT_RGB},${(0.22 * fade).toFixed(3)})`;
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = `rgba(232,255,244,${fade.toFixed(3)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const fireflyStrength = clamp(mood.fireflyBoost * 0.9 + (1 - day) * 0.55 * (1 - mood.rainStrength), 0, 1);
    if (fireflyStrength > 0.04) {
      const shown = Math.ceil(this.fireflies.length * fireflyStrength);
      for (let i = 0; i < shown; i++) {
        const f = this.fireflies[i];
        f.vx = clamp(f.vx + (Math.random() - 0.5) * 0.14 * dt, -0.025, 0.025);
        f.vy = clamp(f.vy + (Math.random() - 0.5) * 0.12 * dt, -0.02, 0.02);
        f.x += (f.vx - 0.008) * dt;
        f.y += f.vy * dt;
        if (f.y < 0.54) f.vy = Math.abs(f.vy);
        if (f.y > 0.86) f.vy = -Math.abs(f.vy);
        if (f.x < -0.02) f.x += 1.04;
        if (f.x > 1.02) f.x -= 1.04;
        const glow = Math.pow(Math.max(0, Math.sin(time * f.speed + f.phase)), 3) * fireflyStrength;
        if (glow < 0.06) continue;
        const x = Math.round(f.x * this.w);
        const y = Math.round(f.y * this.h);
        ctx.fillStyle = `rgba(${FIREFLY_RGB},${(0.18 * glow).toFixed(3)})`;
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = `rgba(${FIREFLY_RGB},${glow.toFixed(3)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}
