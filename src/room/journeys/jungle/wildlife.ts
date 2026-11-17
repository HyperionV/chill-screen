import { clamp, seededRandom } from '../../../world/math';
import type { Pointer } from '../../journey/wildlife';
import type { ChapterMood } from './chapters';
import { drawFacing, getCreatureSprites, type CreatureSprites } from './creature-sprites';

type ParrotMood = 'perch' | 'preen' | 'look' | 'flash' | 'call' | 'shelter' | 'flyIn';
type DragonMood = 'hover' | 'dart' | 'rest';

interface Parrot {
  variant: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 1 | -1;
  mood: ParrotMood;
  timer: number;
  phase: number;
  visitor: boolean;
}

interface Flock {
  x: number;
  y: number;
  vx: number;
  variant: number;
  count: number;
  phase: number;
}

interface TroopMonkey {
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  mood: 'sit' | 'walk' | 'swing' | 'shelter';
  timer: number;
  phase: number;
}

interface Dragonfly {
  x: number;
  y: number;
  tx: number;
  ty: number;
  mood: DragonMood;
  timer: number;
  phase: number;
}

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  phase: number;
}

interface Bat {
  x: number;
  y: number;
  vx: number;
  phase: number;
}

interface ToucanState {
  x: number;
  y: number;
  facing: 1 | -1;
  mood: 'perch' | 'tilt' | 'shelter';
  timer: number;
  phase: number;
}

const BUTTERFLY_COLORS = ['#f6be3c', '#f2eff0', '#ee84aa', '#7cc0f6', '#f48c3e'] as const;
const MAX_VISITORS = 3;
const PARROT_BRANCH_SLOTS: readonly [number, number][] = [
  [0.12, 0.19],
  [0.20, 0.19],
  [0.68, 0.18],
  [0.84, 0.18],
  [0.27, 0.25],
  [0.62, 0.18],
];

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Manages canopy/air wildlife (parrots, toucan, troop monkeys, snake, bats, dragonflies, butterflies) and the recurring small monkey. */
export class JungleWildlife {
  private w = 0;
  private h = 0;
  private unit = 1;
  private readonly sprites: CreatureSprites = getCreatureSprites();

  private readonly parrots: Parrot[] = [];
  private flock: Flock | null = null;
  private flockWait = 8;

  private readonly troop: TroopMonkey[] = [];
  private toucan: ToucanState = { x: 0.76, y: 0.18, facing: -1, mood: 'perch', timer: 3, phase: 1.2 };
  private readonly dragonflies: Dragonfly[] = [];
  private readonly butterflies: Butterfly[] = [];
  private snake = { anchorX: 0.36, phase: 0.8, tongueTimer: 3.5 };
  private readonly bats: Bat[] = [];

  constructor() {
    const rnd = seededRandom(5519);
    for (let i = 0; i < 4; i++) {
      const [bx, by] = PARROT_BRANCH_SLOTS[i];
      this.parrots.push({
        variant: i % 3,
        x: bx,
        y: by,
        targetX: bx,
        targetY: by,
        facing: i % 2 === 0 ? 1 : -1,
        mood: 'perch',
        timer: 2 + rnd() * 4,
        phase: rnd() * 6.28,
        visitor: false,
      });
    }
    for (let i = 0; i < 3; i++) {
      this.troop.push({
        x: i === 0 ? 0.08 : i === 1 ? 0.65 : 0.22,
        y: i === 0 ? 0.19 : i === 1 ? 0.18 : 0.25,
        vx: 0,
        facing: i % 2 === 0 ? 1 : -1,
        mood: 'sit',
        timer: 2 + rnd() * 3,
        phase: rnd() * 6.28,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.dragonflies.push({
        x: 0.2 + rnd() * 0.6,
        y: 0.66 + rnd() * 0.12,
        tx: 0.2 + rnd() * 0.6,
        ty: 0.66 + rnd() * 0.12,
        mood: 'hover',
        timer: 1 + rnd() * 2,
        phase: rnd() * 6.28,
      });
    }
    for (let i = 0; i < 6; i++) {
      this.butterflies.push({
        x: rnd(),
        y: 0.60 + rnd() * 0.16,
        vx: 0,
        vy: 0,
        color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length],
        phase: rnd() * 6.28,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.bats.push({
        x: rnd(),
        y: 0.06 + rnd() * 0.16,
        vx: (i % 2 === 0 ? 1 : -1) * (0.06 + rnd() * 0.04),
        phase: rnd() * 6.28,
      });
    }
  }

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
  }

  /** Triggered when clicking the upper canopy: nearby parrots flash wings, one calls, and a visitor flies in. */
  callParrots(clickX: number, _clickY: number): void {
    if (this.w <= 0) return;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.parrots.length; i++) {
      const p = this.parrots[i];
      if (p.mood === 'flyIn') continue;
      p.facing = clickX >= p.x * this.w ? 1 : -1;
      p.mood = 'flash';
      p.timer = 0.75;
      const d = Math.abs(p.x * this.w - clickX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      this.parrots[bestIdx].mood = 'call';
      this.parrots[bestIdx].timer = 1.05;
    }

    const visitors = this.parrots.filter((p) => p.visitor);
    if (visitors.length >= MAX_VISITORS) {
      const oldIdx = this.parrots.findIndex((p) => p.visitor);
      if (oldIdx >= 0) this.parrots.splice(oldIdx, 1);
    }
    const slot = PARROT_BRANCH_SLOTS[(this.parrots.length + Math.floor(Math.random() * 3)) % PARROT_BRANCH_SLOTS.length];
    const fromLeft = clickX < this.w * 0.5;
    this.parrots.push({
      variant: Math.floor(Math.random() * 3),
      x: fromLeft ? -0.05 : 1.05,
      y: rand(0.08, 0.22),
      targetX: clamp(slot[0] + rand(-0.05, 0.05), 0.1, 0.9),
      targetY: clamp(slot[1] + rand(-0.02, 0.02), 0.09, 0.25),
      facing: fromLeft ? 1 : -1,
      mood: 'flyIn',
      timer: 1.6,
      phase: Math.random() * 6.28,
      visitor: true,
    });
  }

  update(dt: number, time: number, day: number, mood: ChapterMood, weights: Float32Array, pointer: Pointer | null): void {
    if (this.w <= 0 || this.h <= 0) return;
    const sheltering = mood.rainStrength > 0.45;
    this.updateParrots(dt, sheltering);
    this.updateFlock(dt, day, mood.rainStrength);
    this.updateToucan(dt, sheltering);
    this.updateTroop(dt, sheltering, weights[1] + weights[3]);
    this.updateDragonflies(dt, mood.rainStrength);
    this.updateButterflies(dt, time, day, mood.rainStrength, pointer);
    this.updateSnake(dt);
    this.updateBats(dt, day, weights[5]);
  }

  private updateParrots(dt: number, sheltering: boolean): void {
    for (const p of this.parrots) {
      p.timer -= dt;
      if (p.mood === 'flyIn') {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.x += dx * Math.min(1, dt * 2.4);
        p.y += dy * Math.min(1, dt * 2.4);
        if (Math.hypot(dx, dy) < 0.015 || p.timer <= 0) {
          p.x = p.targetX;
          p.y = p.targetY;
          p.mood = 'flash';
          p.timer = 0.6;
        }
        continue;
      }
      if (sheltering && p.mood !== 'flash' && p.mood !== 'call') {
        p.mood = 'shelter';
        continue;
      }
      if (p.timer <= 0) {
        const r = Math.random();
        p.mood = r < 0.55 ? 'perch' : r < 0.8 ? 'preen' : 'look';
        if (p.mood === 'look') p.facing = Math.random() < 0.5 ? 1 : -1;
        p.timer = rand(2.2, 5.5);
      }
    }
  }

  private updateFlock(dt: number, day: number, rainStrength: number): void {
    if (day < 0.38 || rainStrength > 0.5) {
      this.flock = null;
      return;
    }
    if (!this.flock) {
      this.flockWait -= dt;
      if (this.flockWait > 0) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.flock = {
        x: dir > 0 ? -0.08 : 1.08,
        y: rand(0.08, 0.22),
        vx: dir * rand(0.09, 0.14),
        variant: Math.floor(Math.random() * 3),
        count: 2 + Math.floor(Math.random() * 3),
        phase: Math.random() * 6.28,
      };
      this.flockWait = rand(14, 28);
      return;
    }
    this.flock.x += this.flock.vx * dt;
    if (this.flock.vx > 0 ? this.flock.x > 1.15 : this.flock.x < -0.15) this.flock = null;
  }

  private updateToucan(dt: number, sheltering: boolean): void {
    if (sheltering) {
      this.toucan.mood = 'shelter';
      return;
    }
    this.toucan.timer -= dt;
    if (this.toucan.timer <= 0) {
      this.toucan.mood = Math.random() < 0.55 ? 'perch' : 'tilt';
      if (Math.random() < 0.35) this.toucan.facing = this.toucan.facing === 1 ? -1 : 1;
      this.toucan.timer = rand(2.5, 6);
    }
  }

  private updateTroop(dt: number, sheltering: boolean, presence: number): void {
    if (presence < 0.05) return;
    for (const m of this.troop) {
      m.timer -= dt;
      if (sheltering) {
        m.mood = 'shelter';
        continue;
      }
      if (m.mood === 'walk') {
        m.x += m.vx * dt;
        if (m.x < 0.12) {
          m.x = 0.12;
          m.facing = 1;
          m.vx = Math.abs(m.vx);
        } else if (m.x > 0.86) {
          m.x = 0.86;
          m.facing = -1;
          m.vx = -Math.abs(m.vx);
        }
      }
      if (m.timer <= 0) {
        const r = Math.random();
        m.mood = r < 0.45 ? 'sit' : r < 0.8 ? 'walk' : 'swing';
        m.facing = Math.random() < 0.5 ? 1 : -1;
        m.vx = m.facing * rand(0.025, 0.045);
        m.timer = rand(2.5, 5.5);
      }
    }
  }

  private updateDragonflies(dt: number, rainStrength: number): void {
    if (rainStrength > 0.65) return;
    for (const d of this.dragonflies) {
      d.timer -= dt;
      if (d.mood === 'dart') {
        d.x += (d.tx - d.x) * Math.min(1, dt * 6);
        d.y += (d.ty - d.y) * Math.min(1, dt * 6);
        if (d.timer <= 0 || Math.hypot(d.tx - d.x, d.ty - d.y) < 0.01) {
          d.mood = Math.random() < 0.5 ? 'hover' : 'rest';
          d.timer = rand(1.2, 3.2);
        }
      } else if (d.timer <= 0) {
        d.mood = 'dart';
        d.tx = clamp(d.x + rand(-0.18, 0.18), 0.1, 0.9);
        d.ty = clamp(d.y + rand(-0.06, 0.06), 0.63, 0.81);
        d.timer = rand(0.5, 1.0);
      }
    }
  }

  private updateButterflies(dt: number, time: number, day: number, rainStrength: number, pointer: Pointer | null): void {
    if (day < 0.35 || rainStrength > 0.45) return;
    for (const b of this.butterflies) {
      b.vx = clamp(b.vx + rand(-0.08, 0.08) * dt, -0.05, 0.05);
      b.vy = clamp(b.vy + rand(-0.06, 0.06) * dt - Math.sin(time * 2 + b.phase) * 0.01, -0.03, 0.03);
      if (pointer) {
        const px = b.x * this.w;
        const py = b.y * this.h;
        if (Math.hypot(pointer.x - px, pointer.y - py) < 26 * this.unit) {
          b.vx += Math.sign(px - pointer.x || 1) * 0.18 * dt;
          b.vy += Math.sign(py - pointer.y || 1) * 0.14 * dt;
        }
      }
      b.x += (b.vx - 0.012) * dt;
      b.y += b.vy * dt;
      if (b.y < 0.58) b.vy = Math.abs(b.vy);
      if (b.y > 0.78) b.vy = -Math.abs(b.vy);
      if (b.x < -0.02) b.x = 1.02;
      if (b.x > 1.02) b.x = -0.02;
    }
  }

  private updateSnake(dt: number): void {
    this.snake.tongueTimer -= dt;
    if (this.snake.tongueTimer <= -0.35) this.snake.tongueTimer = rand(3.2, 7.0);
  }

  private updateBats(dt: number, day: number, ch6Weight: number): void {
    if (day > 0.45 && ch6Weight < 0.3) return;
    for (const b of this.bats) {
      b.x += b.vx * dt;
      if (b.x < -0.05) b.x = 1.05;
      if (b.x > 1.05) b.x = -0.05;
    }
  }

  drawSkyLife(ctx: CanvasRenderingContext2D, time: number, day: number, ch6Weight: number): void {
    if (day < 0.45 || ch6Weight > 0.3) {
      const alpha = clamp(Math.max(1 - day * 2, ch6Weight), 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      for (const b of this.bats) {
        const sp = Math.floor(time * 7 + b.phase) % 2 === 0 ? this.sprites.bat.up : this.sprites.bat.down;
        ctx.drawImage(sp, Math.round(b.x * this.w), Math.round((b.y + Math.sin(time * 3 + b.phase) * 0.015) * this.h));
      }
      ctx.restore();
    }

    if (this.flock) {
      const f = this.flock;
      const set = this.sprites.parrots[f.variant];
      const facing: 1 | -1 = f.vx >= 0 ? 1 : -1;
      for (let i = 0; i < f.count; i++) {
        const sp = Math.floor(time * 8 + f.phase + i) % 2 === 0 ? set.fly1 : set.fly2;
        const px = f.x * this.w - facing * i * 9 * this.unit;
        const py = f.y * this.h + (i % 2 === 0 ? -1 : 1) * i * 3 * this.unit + Math.sin(time * 4 + i) * 2;
        drawFacing(ctx, sp, px, py, facing);
      }
    }
  }

  drawUpperAndBankLife(
    ctx: CanvasRenderingContext2D,
    time: number,
    day: number,
    mood: ChapterMood,
    weights: Float32Array,
    templePos: [number, number],
  ): void {
    for (const p of this.parrots) {
      const set = this.sprites.parrots[p.variant];
      let sp = set.perch;
      if (p.mood === 'flyIn') sp = Math.floor(time * 9 + p.phase) % 2 === 0 ? set.fly1 : set.fly2;
      else if (p.mood === 'flash') sp = set.flash;
      else if (p.mood === 'call') sp = set.call;
      else if (p.mood === 'preen') sp = set.preen;
      const px = p.x * this.w;
      const py = p.y * this.h - sp.height + (p.mood === 'flyIn' ? Math.sin(time * 2 + p.phase) * 0.8 : 1);
      drawFacing(ctx, sp, px - sp.width / 2, py, p.facing);
      if (p.mood === 'call') {
        const noteY = Math.round(py - 4 - Math.abs(Math.sin(time * 6)) * 2);
        const noteX = Math.round(px + p.facing * 4);
        ctx.fillStyle = 'rgb(252,238,144)';
        ctx.fillRect(noteX, noteY, 2, 2);
        ctx.fillRect(noteX + 1, noteY - 2, 1, 2);
      }
    }

    const tsp = this.toucan.mood === 'tilt' ? this.sprites.toucan.tilt : this.sprites.toucan.perch;
    drawFacing(ctx, tsp, this.toucan.x * this.w, this.toucan.y * this.h - tsp.height + 1, this.toucan.facing);

    const troopAlpha = clamp(weights[1] + weights[3] * 0.75, 0, 1);
    if (troopAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = troopAlpha;
      for (const m of this.troop) {
        let sp = this.sprites.troop.sit;
        if (m.mood === 'walk') sp = Math.floor(time * 5 + m.phase) % 2 === 0 ? this.sprites.troop.walk1 : this.sprites.troop.walk2;
        else if (m.mood === 'swing') sp = this.sprites.troop.swing;
        const my = m.y * this.h - sp.height + (m.mood === 'swing' ? Math.sin(time * 3 + m.phase) * 3 * this.unit : 1);
        drawFacing(ctx, sp, m.x * this.w, my, m.facing);
      }
      ctx.restore();
    }

    const sx = Math.round(this.snake.anchorX * this.w);
    const snakeLen = Math.round(28 * this.unit);
    for (let y = 0; y < snakeLen; y++) {
      const k = y / snakeLen;
      const wave = Math.round(Math.sin(k * Math.PI * 2.5 + time * 0.9 + this.snake.phase) * (2.5 * this.unit));
      ctx.fillStyle = y % 4 === 0 ? 'rgb(34,88,42)' : 'rgb(74,154,68)';
      ctx.fillRect(sx + wave, y, 2, 1);
    }
    const headX = sx + Math.round(Math.sin(Math.PI * 2.5 + time * 0.9 + this.snake.phase) * (2.5 * this.unit));
    ctx.fillStyle = 'rgb(88,176,78)';
    ctx.fillRect(headX - 1, snakeLen, 3, 2);
    if (this.snake.tongueTimer <= 0) {
      ctx.fillStyle = 'rgb(226,64,74)';
      ctx.fillRect(headX, snakeLen + 2, 1, 2);
    }

    if (mood.rainStrength < 0.65) {
      for (const d of this.dragonflies) {
        const dx = Math.round(d.x * this.w);
        const dy = Math.round(d.y * this.h + Math.sin(time * 5 + d.phase) * 0.8);
        ctx.fillStyle = 'rgb(76,216,228)';
        ctx.fillRect(dx - 1, dy, 3, 1);
        if (Math.floor(time * 16 + d.phase) % 2 === 0) {
          ctx.fillStyle = 'rgba(220,248,255,0.75)';
          ctx.fillRect(dx, dy - 1, 1, 1);
          ctx.fillRect(dx, dy + 1, 1, 1);
        }
      }
    }

    if (day >= 0.35 && mood.rainStrength <= 0.45) {
      for (const b of this.butterflies) {
        const bx = Math.round(b.x * this.w);
        const by = Math.round(b.y * this.h);
        const open = Math.floor(time * 7 + b.phase) % 2 === 0;
        ctx.fillStyle = b.color;
        if (open) {
          ctx.fillRect(bx - 1, by - 1, 1, 2);
          ctx.fillRect(bx + 1, by - 1, 1, 2);
        } else {
          ctx.fillRect(bx, by - 1, 1, 2);
        }
        ctx.fillStyle = 'rgb(36,28,22)';
        ctx.fillRect(bx, by, 1, 1);
      }
    }

    this.drawFriendMonkey(ctx, time, weights, templePos);
  }

  private drawFriendMonkey(
    ctx: CanvasRenderingContext2D,
    time: number,
    weights: Float32Array,
    templePos: [number, number],
  ): void {
    const presence = clamp(weights[1] + weights[2] + weights[3] + weights[4] + weights[5], 0, 1);
    if (presence < 0.04) return;

    let best = 1;
    for (let i = 2; i < 6; i++) {
      if (weights[i] > weights[best]) best = i;
    }

    let fx = this.w * 0.21;
    let fy = this.h * 0.25;
    let sp = this.sprites.friend.sit;
    let facing: 1 | -1 = 1;

    if (best === 1) {
      sp = Math.sin(time * 0.9) > 0.35 ? this.sprites.friend.tilt : this.sprites.friend.sit;
      fx = this.w * 0.21;
      fy = this.h * 0.25 - sp.height + 1;
    } else if (best === 2) {
      const swing = Math.sin(time * 1.45);
      sp = this.sprites.friend.swing;
      fx = this.w * (0.24 + swing * 0.09);
      fy = this.h * (0.16 + Math.abs(swing) * 0.035);
      facing = Math.cos(time * 1.45) >= 0 ? 1 : -1;
    } else if (best === 3) {
      sp = this.sprites.friend.shelter;
      fx = this.w * 0.16;
      fy = this.h * 0.25 - sp.height + 1;
    } else if (best === 4) {
      sp = this.sprites.friend.statue;
      fx = templePos[0] + Math.round(32 * this.unit);
      fy = templePos[1] + Math.round(41 * this.unit) - sp.height;
      facing = -1;
    } else {
      sp = this.sprites.friend.sleep;
      fx = this.w * 0.20;
      fy = this.h * 0.25 - sp.height + 1 + Math.round(Math.sin(time * 1.1) * 0.4);
    }

    ctx.save();
    ctx.globalAlpha = presence;
    if (best === 3) {
      ctx.fillStyle = 'rgb(34,76,42)';
      ctx.fillRect(Math.round(fx - 4), Math.round(fy - 4), sp.width + 8, 3);
      ctx.fillStyle = 'rgb(64,116,56)';
      ctx.fillRect(Math.round(fx - 3), Math.round(fy - 5), sp.width + 6, 2);
    }
    drawFacing(ctx, sp, fx, fy, facing);
    ctx.restore();
  }
}
