import { css } from '../../../render/color';
import { clamp, seededRandom } from '../../../world/math';
import type { Pointer } from '../../journey/wildlife';
import type { ChapterMood } from './chapters';
import type { JungleSprites } from './sprites';

interface Vine {
  anchorX: number;
  len: number;
  speed: number;
  phase: number;
  angle: number;
  vel: number;
  hasLeaves: boolean;
}

interface BigLeaf {
  anchorX: number;
  yRatio: number;
  depth: 2 | 3;
  variant: number;
  topEdge: boolean;
  angle: number;
  vel: number;
  dip: number;
  dipVel: number;
}

interface Drop {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  waterY: number;
}

interface MistPuff {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface SplashRing {
  active: boolean;
  x: number;
  y: number;
  age: number;
  life: number;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

const VINE_COUNT = 18;
const LEAF_COUNT = 14;
const MAX_DROPS = 36;
const MAX_PUFFS = 20;
const MAX_RINGS = 24;
const RAIN_COUNT = 56;
const RAIN_COLOR = 'rgba(198,218,224,0.42)';

/** Manages interactive hanging vines, giant leaves, monsoon rain, distant thunder glow, and calm river mist. */
export class JungleFeatures {
  private w = 0;
  private h = 0;
  private unit = 1;
  private prevPointer: Pointer | null = null;
  private pointerVx = 0;

  private readonly vines: Vine[] = [];
  private readonly bigLeaves: BigLeaf[] = [];
  private readonly drops: Drop[] = Array.from({ length: MAX_DROPS }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, waterY: 0 }));
  private readonly puffs: MistPuff[] = Array.from({ length: MAX_PUFFS }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1 }));
  private readonly rings: SplashRing[] = Array.from({ length: MAX_RINGS }, () => ({ active: false, x: 0, y: 0, age: 0, life: 0.7 }));
  private readonly rain: RainDrop[] = [];

  private thunderWait = 10;
  private thunderAge = -1;

  constructor() {
    const rnd = seededRandom(7731);
    for (let i = 0; i < VINE_COUNT; i++) {
      this.vines.push({
        anchorX: (i + 0.15 + rnd() * 0.7) / VINE_COUNT,
        len: 0.14 + rnd() * 0.18,
        speed: i % 3 === 0 ? 1.3 : i % 2 === 0 ? 0.95 : 0.65,
        phase: rnd() * 6.28,
        angle: 0,
        vel: 0,
        hasLeaves: rnd() < 0.75,
      });
    }
    for (let i = 0; i < LEAF_COUNT; i++) {
      const topEdge = i < 6;
      const sideEdge = i < 3 || (i >= 6 && i < 10);
      this.bigLeaves.push({
        anchorX: sideEdge ? (i % 2 === 0 ? 0.03 + rnd() * 0.12 : 0.85 + rnd() * 0.12) : 0.12 + rnd() * 0.76,
        yRatio: topEdge ? 0.02 + rnd() * 0.08 : 0.72 + rnd() * 0.17,
        depth: i % 3 === 0 ? 3 : 2,
        variant: i % 3,
        topEdge,
        angle: 0,
        vel: 0,
        dip: 0,
        dipVel: 0,
      });
    }
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rain.push({ x: rnd(), y: rnd(), len: 5 + rnd() * 5, speed: 1.15 + rnd() * 0.45 });
    }
  }

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
  }

  update(dt: number, time: number, scroll: number, mood: ChapterMood, pointer: Pointer | null): void {
    if (this.w <= 0 || this.h <= 0) return;
    if (pointer && this.prevPointer && dt > 0) {
      this.pointerVx = clamp((pointer.x - this.prevPointer.x) / dt, -260, 260);
    } else {
      this.pointerVx = 0;
    }
    this.prevPointer = pointer ? { x: pointer.x, y: pointer.y } : null;

    this.updateVines(dt, time, scroll, pointer);
    this.updateBigLeaves(dt, time, scroll, mood.rainStrength, pointer);
    this.updateParticles(dt, mood.rainStrength);
    this.updateThunder(dt, mood.rainStrength);
  }

  private vineScreenX(v: Vine, scroll: number): number {
    const span = this.w + 48 * this.unit;
    const raw = (v.anchorX * span - scroll * v.speed) % span;
    return (raw < 0 ? raw + span : raw) - 24 * this.unit;
  }

  private leafScreenPos(l: BigLeaf, scroll: number): [number, number] {
    const speed = l.depth === 3 ? 1.38 : 1.02;
    const span = this.w + 70 * this.unit;
    const raw = (l.anchorX * span - scroll * speed) % span;
    const x = (raw < 0 ? raw + span : raw) - 35 * this.unit;
    return [x, l.yRatio * this.h];
  }

  private updateVines(dt: number, time: number, scroll: number, pointer: Pointer | null): void {
    const reach = 24 * this.unit;
    for (const v of this.vines) {
      const sx = this.vineScreenX(v, scroll);
      const lenPx = v.len * this.h;
      const windTarget = Math.sin(time * 0.85 + v.phase) * 0.08;
      if (pointer && pointer.y <= lenPx + 14 * this.unit) {
        const dx = sx - pointer.x;
        if (Math.abs(dx) < reach) {
          const push = (1 - Math.abs(dx) / reach) * (dx >= 0 ? 1 : -1) * 1.9 + this.pointerVx * 0.008;
          v.vel += push * dt * 8;
        }
      }
      v.vel += ((windTarget - v.angle) * 16 - v.vel * 3.6) * dt;
      v.angle = clamp(v.angle + v.vel * dt, -0.75, 0.75);
    }
  }

  private updateBigLeaves(
    dt: number,
    time: number,
    scroll: number,
    rainStrength: number,
    pointer: Pointer | null,
  ): void {
    const reach = 26 * this.unit;
    for (const l of this.bigLeaves) {
      const [sx, sy] = this.leafScreenPos(l, scroll);
      const windTarget = Math.sin(time * 0.9 + l.anchorX * 10) * 0.06 + rainStrength * 0.14;
      if (pointer) {
        const d = Math.hypot(pointer.x - sx, pointer.y - sy);
        if (d < reach) {
          const away = sx >= pointer.x ? 1 : -1;
          l.vel += ((1 - d / reach) * away * 2.2 + this.pointerVx * 0.007) * dt * 8;
          l.dipVel += (1 - d / reach) * 18 * dt;
        }
      }
      l.vel += ((windTarget - l.angle) * 18 - l.vel * 4.2) * dt;
      l.angle = clamp(l.angle + l.vel * dt, -0.65, 0.65);

      const dipTarget = rainStrength * 2.5 * this.unit;
      l.dipVel += ((dipTarget - l.dip) * 28 - l.dipVel * 5.2) * dt;
      l.dip = clamp(l.dip + l.dipVel * dt, -6 * this.unit, 12 * this.unit);

      if (rainStrength > 0.35 && Math.random() < rainStrength * dt * 0.8) {
        this.spawnDrop(sx, sy + 4 * this.unit);
      }
    }
  }

  private updateParticles(dt: number, rainStrength: number): void {
    for (const d of this.drops) {
      if (!d.active) continue;
      d.vy += 180 * this.unit * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= d.waterY) {
        d.active = false;
        this.spawnRing(d.x, d.waterY);
      }
    }
    for (const p of this.puffs) {
      if (!p.active) continue;
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) p.active = false;
    }
    for (const r of this.rings) {
      if (!r.active) continue;
      r.age += dt;
      if (r.age >= r.life) r.active = false;
    }
    if (rainStrength > 0.04) {
      for (const rd of this.rain) {
        rd.y += rd.speed * dt;
        rd.x -= 0.16 * rd.speed * dt;
        if (rd.y > 0.88) {
          if (rd.y > 0.68 && Math.random() < 0.25 * rainStrength) {
            this.spawnRing(rd.x * this.w, (0.68 + Math.random() * 0.16) * this.h);
          }
          rd.y = -0.04;
          rd.x = Math.random() * 1.15;
        }
        if (rd.x < -0.05) rd.x += 1.1;
      }
    }
  }

  private updateThunder(dt: number, rainStrength: number): void {
    if (rainStrength < 0.35) {
      this.thunderAge = -1;
      return;
    }
    if (this.thunderAge >= 0) {
      this.thunderAge += dt;
      if (this.thunderAge >= 1.6) this.thunderAge = -1;
      return;
    }
    this.thunderWait -= dt * rainStrength;
    if (this.thunderWait <= 0) {
      this.thunderAge = 0;
      this.thunderWait = 12 + Math.random() * 14;
    }
  }

  /** Attempts to click a big foreground/mid leaf to shake water drops & mist from it. */
  shakeLeafAt(x: number, y: number, scroll: number, sprites: JungleSprites): boolean {
    let hit = false;
    for (const l of this.bigLeaves) {
      const [sx, sy] = this.leafScreenPos(l, scroll);
      const list = l.depth === 3 ? sprites.leavesNear : sprites.leavesMid;
      const sp = list[l.variant % list.length];
      if (Math.abs(x - sx) <= sp.w * 0.65 && Math.abs(y - (sy + l.dip)) <= sp.h * 0.65) {
        l.dipVel += 52 * this.unit;
        l.vel += (sx >= x ? 1 : -1) * 1.4;
        for (let i = 0; i < 6; i++) {
          this.spawnDrop(sx + (Math.random() - 0.5) * sp.w * 0.7, sy + l.dip + 2 * this.unit);
        }
        for (let i = 0; i < 3; i++) {
          this.spawnPuff(sx + (Math.random() - 0.5) * sp.w * 0.6, sy + l.dip);
        }
        hit = true;
      }
    }
    return hit;
  }

  private spawnDrop(x: number, y: number): void {
    for (const d of this.drops) {
      if (d.active) continue;
      d.active = true;
      d.x = x;
      d.y = y;
      d.vx = (Math.random() - 0.5) * 18 * this.unit;
      d.vy = (10 + Math.random() * 14) * this.unit;
      d.waterY = this.h * (0.68 + Math.random() * 0.14);
      return;
    }
  }

  private spawnPuff(x: number, y: number): void {
    for (const p of this.puffs) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * 14 * this.unit;
      p.vy = -(6 + Math.random() * 8) * this.unit;
      p.age = 0;
      p.life = 0.7 + Math.random() * 0.5;
      return;
    }
  }

  private spawnRing(x: number, y: number): void {
    for (const r of this.rings) {
      if (r.active) continue;
      r.active = true;
      r.x = x;
      r.y = y;
      r.age = 0;
      r.life = 0.65;
      return;
    }
  }

  thunderAlpha(rainStrength: number): number {
    if (this.thunderAge < 0 || rainStrength < 0.35) return 0;
    return Math.sin((this.thunderAge / 1.6) * Math.PI) * 0.18 * rainStrength;
  }

  drawVines(ctx: CanvasRenderingContext2D, scroll: number, mood: ChapterMood): void {
    const dark = css(mood.foliageDark);
    const mid = css(mood.foliageMid);
    const maxShown = Math.round(this.vines.length * (0.45 + mood.canopyDensity * 0.55));
    for (let i = 0; i < maxShown; i++) {
      const v = this.vines[i];
      const sx = this.vineScreenX(v, scroll);
      const lenPx = Math.round(v.len * this.h);
      const segs = Math.max(6, Math.round(lenPx / 4));
      for (let s = 0; s < segs; s++) {
        const k = s / segs;
        const px = Math.round(sx + Math.sin(v.angle) * lenPx * k * k);
        const py = Math.round(k * lenPx);
        ctx.fillStyle = dark;
        ctx.fillRect(px, py, 1, Math.max(2, Math.ceil(lenPx / segs)));
        if (v.hasLeaves && s > 1 && s % 3 === 0) {
          ctx.fillStyle = mid;
          const side = (s + i) % 2 === 0 ? 1 : -1;
          ctx.fillRect(px + side, py, Math.max(2, Math.round(2 * this.unit)), 2);
        }
      }
    }
  }

  drawBigLeaves(ctx: CanvasRenderingContext2D, scroll: number, depth: 2 | 3, sprites: JungleSprites): void {
    const list = depth === 3 ? sprites.leavesNear : sprites.leavesMid;
    for (const l of this.bigLeaves) {
      if (l.depth !== depth) continue;
      const [sx, sy] = this.leafScreenPos(l, scroll);
      const sp = list[l.variant % list.length];
      const x = Math.round(sx - sp.w / 2 + l.angle * 10 * this.unit);
      const y = Math.round(sy - (l.topEdge ? 0 : sp.h * 0.6) + l.dip);
      ctx.drawImage(sp.canvas, x, y);
    }
  }

  drawRainAndParticles(ctx: CanvasRenderingContext2D, rainStrength: number): void {
    if (rainStrength > 0.04) {
      ctx.fillStyle = RAIN_COLOR;
      const count = Math.round(RAIN_COUNT * rainStrength);
      for (let i = 0; i < count; i++) {
        const rd = this.rain[i];
        const x = Math.round(rd.x * this.w);
        const y = Math.round(rd.y * this.h);
        const steps = Math.max(2, Math.round(rd.len * this.unit));
        for (let s = 0; s < steps; s++) {
          ctx.fillRect(x - Math.floor(s * 0.25), y + s, 1, 1);
        }
      }
    }

    ctx.fillStyle = 'rgba(204,236,244,0.82)';
    for (const d of this.drops) {
      if (!d.active) continue;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 2);
    }

    for (const p of this.puffs) {
      if (!p.active) continue;
      const a = (1 - p.age / p.life) * 0.35;
      ctx.fillStyle = `rgba(224,238,232,${a.toFixed(3)})`;
      ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 2);
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      const k = r.age / r.life;
      const span = Math.round((1 + k * 5) * this.unit);
      const a = (1 - k) * 0.55;
      ctx.fillStyle = `rgba(210,236,240,${a.toFixed(3)})`;
      ctx.fillRect(Math.round(r.x - span), Math.round(r.y), span * 2, 1);
    }
  }

  /** Draws calm layered mist across the middle clock band (0.35h..0.56h). */
  drawMist(ctx: CanvasRenderingContext2D, time: number, mood: ChapterMood): void {
    const density = mood.mistDensity;
    if (density <= 0.05) return;
    for (let b = 0; b < 5; b++) {
      const y = Math.round(this.h * (0.35 + b * 0.044));
      const bandH = Math.max(3, Math.round(7 * this.unit));
      const shift = time * (4 + b * 1.6) * this.unit;
      const alpha = density * (0.14 - b * 0.012);
      ctx.fillStyle = css(mood.mistColor, alpha);
      for (let seg = 0; seg < 4; seg++) {
        const sx = Math.round((((seg * 0.32 + b * 0.17) * this.w + shift) % (this.w + 90 * this.unit)) - 90 * this.unit);
        ctx.fillRect(sx, y, Math.round(85 * this.unit), bandH);
      }
    }
  }
}
