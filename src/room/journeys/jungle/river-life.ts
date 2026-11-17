import { clamp, seededRandom } from '../../../world/math';
import type { Pointer } from '../../journey/wildlife';
import { drawFacing, getCreatureSprites, type CreatureSprites } from './creature-sprites';

type EgretMood = 'stand' | 'walk' | 'strike';
type CrocMood = 'float' | 'blink' | 'sink' | 'submerged';
type FrogMood = 'sit' | 'sing' | 'hop';

interface Egret {
  wx: number;
  yRatio: number;
  facing: 1 | -1;
  mood: EgretMood;
  timer: number;
  phase: number;
}

interface Crocodile {
  wx: number;
  yRatio: number;
  mood: CrocMood;
  timer: number;
  depth: number;
  phase: number;
}

interface Frog {
  wx: number;
  yRatio: number;
  facing: 1 | -1;
  mood: FrogMood;
  timer: number;
  hopProgress: number;
  hopFromX: number;
  hopToX: number;
  phase: number;
}

interface JumpingFish {
  active: boolean;
  x: number;
  baseY: number;
  age: number;
  duration: number;
  dir: 1 | -1;
}

interface KingfisherState {
  dx: number;
  dy: number;
  facing: 1 | -1;
  mood: 'perch' | 'dive';
  diveAge: number;
  timer: number;
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Manages river and shoreline creatures: crocodiles, lily-pad frogs, jumping fish, egrets, and kingfishers. */
export class RiverLife {
  private w = 0;
  private h = 0;
  private unit = 1;
  private readonly sprites: CreatureSprites = getCreatureSprites();

  private readonly egrets: Egret[] = [];
  private readonly kingfishers: KingfisherState[] = [
    { dx: -16, dy: -6, facing: 1, mood: 'perch', diveAge: 0, timer: 5 },
    { dx: 34, dy: -2, facing: -1, mood: 'perch', diveAge: 0, timer: 8 },
  ];
  private readonly crocs: Crocodile[] = [];
  private readonly frogs: Frog[] = [];
  private fish: JumpingFish = { active: false, x: 0, baseY: 0, age: 0, duration: 0.85, dir: 1 };
  private fishWait = 6;

  constructor() {
    const rnd = seededRandom(8147);
    for (let i = 0; i < 2; i++) {
      this.egrets.push({
        wx: 120 + i * 240,
        yRatio: 0.645 + i * 0.014,
        facing: i === 0 ? 1 : -1,
        mood: 'stand',
        timer: 2 + rnd() * 4,
        phase: rnd() * 6.28,
      });
    }
    for (let i = 0; i < 2; i++) {
      this.crocs.push({
        wx: 180 + i * 260,
        yRatio: 0.72 + i * 0.04,
        mood: 'float',
        timer: 3 + rnd() * 4,
        depth: 0,
        phase: rnd() * 6.28,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.frogs.push({
        wx: 70 + i * 115,
        yRatio: 0.695 + (i % 3) * 0.035,
        facing: i % 2 === 0 ? 1 : -1,
        mood: 'sit',
        timer: 1.5 + rnd() * 3,
        hopProgress: 0,
        hopFromX: 0,
        hopToX: 0,
        phase: rnd() * 6.28,
      });
    }
  }

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
  }

  update(
    dt: number,
    scroll: number,
    day: number,
    rainStrength: number,
    fireflyBoost: number,
    ch3Weight: number,
    pointer: Pointer | null,
  ): void {
    if (this.w <= 0 || this.h <= 0) return;
    this.updateEgrets(dt, scroll);
    this.updateKingfishers(dt, ch3Weight);
    this.updateCrocs(dt, scroll, pointer);
    this.updateFrogs(dt, scroll, fireflyBoost, day, pointer);
    this.updateFish(dt, rainStrength);
  }

  private updateEgrets(dt: number, scroll: number): void {
    const span = this.w + 90 * this.unit;
    for (const e of this.egrets) {
      e.timer -= dt;
      const sx = this.wrapWorldX(e.wx, scroll, span);
      if (e.mood === 'walk') e.wx += e.facing * 5 * this.unit * dt;
      if (e.timer <= 0) {
        const r = Math.random();
        e.mood = r < 0.48 ? 'stand' : r < 0.8 ? 'walk' : 'strike';
        e.timer = e.mood === 'strike' ? 0.65 : rand(2.5, 6);
        if (sx < 0.1 * this.w) e.facing = 1;
        else if (sx > 0.9 * this.w) e.facing = -1;
      }
    }
  }

  private updateKingfishers(dt: number, ch3Weight: number): void {
    if (ch3Weight < 0.05) return;
    for (const k of this.kingfishers) {
      if (k.mood === 'dive') {
        k.diveAge += dt;
        if (k.diveAge >= 1.1) {
          k.mood = 'perch';
          k.timer = rand(5, 11);
        }
      } else {
        k.timer -= dt;
        if (k.timer <= 0) {
          k.mood = 'dive';
          k.diveAge = 0;
        }
      }
    }
  }

  private updateCrocs(dt: number, scroll: number, pointer: Pointer | null): void {
    const span = this.w + 100 * this.unit;
    const boatDangerX = this.w * 0.28;
    for (const c of this.crocs) {
      const sx = this.wrapWorldX(c.wx, scroll, span);
      const sy = c.yRatio * this.h;
      const pointerClose = pointer !== null && Math.hypot(pointer.x - sx, pointer.y - sy) < 28 * this.unit;
      const boatNear = sx > 0 && sx < boatDangerX && sy > this.h * 0.70;
      if ((pointerClose || boatNear) && c.mood !== 'sink' && c.mood !== 'submerged') {
        c.mood = 'sink';
        c.timer = 0.6;
      }
      c.timer -= dt;
      if (c.mood === 'sink') {
        c.depth = Math.min(1, c.depth + dt * 2.4);
        if (c.depth >= 1) {
          c.mood = 'submerged';
          c.timer = rand(3.5, 6.5);
        }
      } else if (c.mood === 'submerged') {
        if (c.timer <= 0 && !pointerClose && !boatNear) {
          c.mood = 'float';
          c.depth = 0.6;
          c.timer = rand(3, 6);
        }
      } else {
        c.depth = Math.max(0, c.depth - dt * 1.4);
        if (c.timer <= 0) {
          c.mood = c.mood === 'blink' ? 'float' : 'blink';
          c.timer = c.mood === 'blink' ? 0.24 : rand(2.5, 5.5);
        }
      }
    }
  }

  private updateFrogs(dt: number, scroll: number, fireflyBoost: number, day: number, pointer: Pointer | null): void {
    const span = this.w + 90 * this.unit;
    const duskActive = fireflyBoost > 0.25 || day < 0.45;
    for (const f of this.frogs) {
      const sx = this.wrapWorldX(f.wx, scroll, span);
      const sy = f.yRatio * this.h;
      if (pointer && f.mood !== 'hop' && Math.hypot(pointer.x - sx, pointer.y - sy) < 24 * this.unit) {
        f.mood = 'hop';
        f.facing = pointer.x < sx ? 1 : -1;
        f.hopProgress = 0;
        f.hopFromX = f.wx;
        f.hopToX = f.wx + f.facing * 36 * this.unit;
        continue;
      }
      if (f.mood === 'hop') {
        f.hopProgress += dt * 2.3;
        f.wx = f.hopFromX + (f.hopToX - f.hopFromX) * Math.min(1, f.hopProgress);
        if (f.hopProgress >= 1) {
          f.mood = 'sit';
          f.timer = rand(1.8, 4.5);
        }
        continue;
      }
      f.timer -= dt;
      if (f.timer <= 0) {
        f.mood = duskActive && Math.random() < 0.65 ? 'sing' : 'sit';
        f.timer = f.mood === 'sing' ? rand(1.1, 2.2) : rand(1.5, 4);
      }
    }
  }

  private updateFish(dt: number, rainStrength: number): void {
    if (this.fish.active) {
      this.fish.age += dt;
      if (this.fish.age >= this.fish.duration) this.fish.active = false;
      return;
    }
    if (rainStrength > 0.6) return;
    this.fishWait -= dt;
    if (this.fishWait <= 0) {
      this.fish = {
        active: true,
        x: rand(0.32, 0.85),
        baseY: rand(0.70, 0.81),
        age: 0,
        duration: 0.82,
        dir: Math.random() < 0.5 ? 1 : -1,
      };
      this.fishWait = rand(8, 18);
    }
  }

  private wrapWorldX(wx: number, scroll: number, span: number): number {
    const raw = (wx - scroll) % span;
    return (raw < 0 ? raw + span : raw) - 40 * this.unit;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    time: number,
    scroll: number,
    weights: Float32Array,
    lilyPads: readonly { canvas: HTMLCanvasElement; w: number; h: number }[],
    waterfallX: number,
  ): void {
    const span = this.w + 90 * this.unit;
    const crocSpan = this.w + 100 * this.unit;

    for (const c of this.crocs) {
      if (c.depth >= 0.96) continue;
      const sx = Math.round(this.wrapWorldX(c.wx, scroll, crocSpan));
      const sy = Math.round(c.yRatio * this.h + c.depth * 3 * this.unit);
      if (c.depth > 0.15) {
        ctx.fillStyle = `rgba(180,220,210,${(0.45 * (1 - c.depth)).toFixed(3)})`;
        ctx.fillRect(sx - 2, sy + 1, this.sprites.croc.open.width + 4, 1);
      }
      if (c.depth < 0.75) {
        const sp = c.mood === 'blink' ? this.sprites.croc.blink : this.sprites.croc.open;
        ctx.save();
        ctx.globalAlpha = 1 - c.depth;
        ctx.drawImage(sp, sx, sy);
        ctx.restore();
      }
    }

    for (let i = 0; i < this.frogs.length; i++) {
      const f = this.frogs[i];
      const sx = Math.round(this.wrapWorldX(f.wx, scroll, span));
      const pad = lilyPads[i % lilyPads.length];
      const py = Math.round(f.yRatio * this.h);
      ctx.drawImage(pad.canvas, Math.round(sx - pad.w / 2), Math.round(py - pad.h / 2));

      const sp = f.mood === 'hop' ? this.sprites.frog.leap : f.mood === 'sing' ? this.sprites.frog.puff : this.sprites.frog.sit;
      const arc = f.mood === 'hop' ? Math.sin(f.hopProgress * Math.PI) * 9 * this.unit : 0;
      drawFacing(ctx, sp, sx - sp.width / 2, py - sp.height + 1 - arc, f.facing);
    }

    if (this.fish.active) {
      const k = this.fish.age / this.fish.duration;
      const fx = Math.round(this.fish.x * this.w + this.fish.dir * k * 16 * this.unit);
      const fy = Math.round(this.fish.baseY * this.h - Math.sin(k * Math.PI) * 14 * this.unit);
      ctx.fillStyle = 'rgb(194,228,220)';
      ctx.fillRect(fx, fy, 3, 2);
      ctx.fillStyle = 'rgb(112,158,154)';
      ctx.fillRect(fx - this.fish.dir, fy + 1, 1, 1);
      if (k < 0.15 || k > 0.85) {
        ctx.fillStyle = 'rgba(216,244,246,0.65)';
        ctx.fillRect(fx - 3, Math.round(this.fish.baseY * this.h), 8, 1);
      }
    }

    const egretVis = clamp(weights[0] + weights[4] * 0.7 + weights[5] * 0.6, 0, 1);
    if (egretVis > 0.05) {
      ctx.save();
      ctx.globalAlpha = egretVis;
      for (const e of this.egrets) {
        const sx = Math.round(this.wrapWorldX(e.wx, scroll, span));
        const sy = Math.round(e.yRatio * this.h);
        const sp = e.mood === 'strike' ? this.sprites.egret.strike : e.mood === 'walk' && Math.floor(time * 4 + e.phase) % 2 === 0 ? this.sprites.egret.walk : this.sprites.egret.stand;
        ctx.fillStyle = 'rgba(200,232,226,0.3)';
        ctx.fillRect(sx - 3, sy, 7, 1);
        drawFacing(ctx, sp, sx - sp.width / 2, sy - sp.height, e.facing);
      }
      ctx.restore();
    }

    if (weights[2] > 0.06) {
      ctx.save();
      ctx.globalAlpha = clamp(weights[2] * 1.2, 0, 1);
      const baseX = waterfallX;
      const baseY = Math.round(this.h * 0.64);
      for (const k of this.kingfishers) {
        if (k.mood === 'dive') {
          const p = k.diveAge / 1.1;
          const kx = baseX + k.dx * this.unit + k.facing * p * 18 * this.unit;
          const ky = baseY + k.dy * this.unit + Math.sin(p * Math.PI) * 18 * this.unit;
          drawFacing(ctx, this.sprites.kingfisher.dive, kx, ky, k.facing);
        } else {
          const bob = Math.round(Math.sin(time * 3 + k.dx) * 0.7);
          drawFacing(ctx, this.sprites.kingfisher.perch, baseX + k.dx * this.unit, baseY + k.dy * this.unit - this.sprites.kingfisher.perch.height + bob, k.facing);
        }
      }
      ctx.restore();
    }
  }
}
