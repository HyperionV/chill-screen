import { css, mix, type RGB } from '../../../render/color';
import { clamp, rand, seededRandom } from '../../../world/math';
import { hash } from '../../journeys/noise';
import type { SkyState } from '../../sky';

const SNOW_COUNT = 96;
const MAX_SMOKE = 28;
const MAX_RINGS = 6;
const MAX_SNOW_PUFFS = 36;
const MAX_FOOTPRINTS = 64;
const MAX_METEORS = 8;
const MAX_BREATHS = 10;

const POINTER_SWIRL_RADIUS = 46;
const POINTER_SWIRL_PUSH = 88;

interface Snowflake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  phase: number;
  near: boolean;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

interface SmokeRing {
  x: number;
  y: number;
  vy: number;
  age: number;
  life: number;
  rx: number;
  ry: number;
}

interface SnowPuffParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface Footprint {
  x: number;
  y: number;
  age: number;
  delay: number;
  life: number;
  paw: boolean;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

interface BreathPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

const WHITE: RGB = [242, 248, 255];
const AURORA_GREEN: RGB = [68, 224, 148];
const AURORA_TEAL: RGB = [58, 188, 206];
const AURORA_VIOLET: RGB = [174, 96, 224];

/** Manages continuous snowfall (swirling away from pointer), chimney smoke/rings, snow puffs, footprints, aurora, and shooting stars. */
export class Atmosphere {
  private w = 0;
  private h = 0;
  private unit = 1;

  private readonly flakes: Snowflake[] = [];
  private readonly smoke: SmokePuff[] = [];
  private readonly rings: SmokeRing[] = [];
  private readonly puffs: SnowPuffParticle[] = [];
  private readonly prints: Footprint[] = [];
  private readonly meteors: ShootingStar[] = [];
  private readonly breaths: BreathPuff[] = [];

  private smokeCooldown = 0;
  private nightMeteorWait = 3.5;

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
    if (this.flakes.length === 0 && w > 0 && h > 0) {
      const rnd = seededRandom(808);
      for (let i = 0; i < SNOW_COUNT; i++) {
        const near = i % 3 === 0;
        this.flakes.push({
          x: rnd() * w,
          y: rnd() * h,
          vx: 0,
          vy: 0,
          speed: (near ? 14 : 9) + rnd() * 7,
          phase: rnd() * Math.PI * 2,
          near,
        });
      }
    } else {
      for (const f of this.flakes) {
        f.x = ((f.x % Math.max(1, w)) + Math.max(1, w)) % Math.max(1, w);
        f.y = ((f.y % Math.max(1, h)) + Math.max(1, h)) % Math.max(1, h);
      }
    }
  }

  clearSceneParticles(): void {
    this.smoke.length = 0;
    this.rings.length = 0;
    this.prints.length = 0;
    this.puffs.length = 0;
    this.breaths.length = 0;
  }

  /** Spawns a big smoke ring + dense puffs from the chimney top. */
  triggerSmokeRing(x: number, y: number): void {
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({
      x,
      y: y - 2 * this.unit,
      vy: -13 * this.unit,
      age: 0,
      life: 4.8,
      rx: 3 * this.unit,
      ry: 1.5 * this.unit,
    });
    for (let i = 0; i < 4; i++) {
      this.pushSmoke(x + (i - 1.5) * 1.5 * this.unit, y - i * this.unit, rand(1.4, 2.4));
    }
  }

  /** Spawns a gentle snow puff and a short trail of footprints on the snow. */
  triggerSnowClick(x: number, y: number, horizonY: number): void {
    const clampedY = Math.max(horizonY + 2 * this.unit, Math.min(this.h - 2, y));
    this.addSnowPuff(x, clampedY, 8);

    const stepX = (x > this.w * 0.65 ? -1 : 1) * 5.2 * this.unit;
    const stepY = (clampedY > this.h * 0.85 ? -1.4 : 1.2) * this.unit;
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1.5 : 1.5;
      this.addFootprint(
        x + stepX * i,
        clamp(clampedY + stepY * i + side * this.unit, horizonY + 2, this.h - 2),
        i * 0.08,
        false,
      );
    }
  }

  /** Adds a single snow puff (e.g. when fox hops or snowman hat shakes). */
  addSnowPuff(x: number, y: number, count = 6): void {
    for (let i = 0; i < count; i++) {
      if (this.puffs.length >= MAX_SNOW_PUFFS) this.puffs.shift();
      const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
      const speed = rand(8, 22) * this.unit;
      this.puffs.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: -Math.abs(Math.sin(angle) * speed * 0.7) - rand(6, 14) * this.unit,
        age: 0,
        life: rand(0.45, 0.75),
      });
    }
  }

  /** Stamps a single fox paw print or boot print in the snow. */
  addFootprint(x: number, y: number, delay = 0, paw = true): void {
    if (this.prints.length >= MAX_FOOTPRINTS) this.prints.shift();
    this.prints.push({ x, y, age: -delay, delay, life: 16, paw });
  }

  /** Adds a tiny cold-air breath puff from a creature. */
  addBreath(x: number, y: number, dir: 1 | -1): void {
    if (this.breaths.length >= MAX_BREATHS) this.breaths.shift();
    this.breaths.push({
      x,
      y,
      vx: dir * 6 * this.unit,
      vy: -5 * this.unit,
      age: 0,
      life: 1.3,
    });
  }

  /** Launches a shooting star across the upper sky near (x, y). */
  triggerShootingStar(x: number, y: number): void {
    if (this.meteors.length >= MAX_METEORS) this.meteors.shift();
    const dir = x < this.w * 0.55 ? 1 : -1;
    const speed = this.h * rand(1.1, 1.55);
    const angle = rand(0.28, 0.48);
    this.meteors.push({
      x: clamp(x, 12, this.w - 12),
      y: clamp(y, 8, this.h * 0.42),
      vx: Math.cos(angle) * speed * dir,
      vy: Math.sin(angle) * speed,
      age: 0,
      duration: rand(0.65, 0.95),
    });
  }

  private pushSmoke(x: number, y: number, size: number): void {
    if (this.smoke.length >= MAX_SMOKE) this.smoke.shift();
    this.smoke.push({
      x,
      y,
      vx: rand(2.5, 5.5) * this.unit,
      vy: -rand(9, 13) * this.unit,
      age: 0,
      life: rand(3.4, 4.8),
      size: size * this.unit,
    });
  }

  update(
    dt: number,
    time: number,
    pointer: { x: number; y: number } | null,
    chimney: { x: number; y: number } | null,
    nightChimneyScene: boolean,
    nightFactor: number,
  ): void {
    const u = this.unit;
    const swirlR = POINTER_SWIRL_RADIUS * u;

    // 1. Snowfall + pointer swirl
    for (const f of this.flakes) {
      const sway = Math.sin(time * 1.15 + f.phase) * 5.5 * u;
      if (pointer) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.5 && dist < swirlR) {
          const push = (1 - dist / swirlR) * POINTER_SWIRL_PUSH * u;
          const nx = dx / dist;
          const ny = dy / dist;
          // Outward + gentle tangential vortex so flakes curl gracefully away
          f.vx += (nx * 0.85 - ny * 0.55) * push * dt * 4.5;
          f.vy += (ny * 0.85 + nx * 0.55) * push * dt * 4.5;
        }
      }
      f.vx *= Math.exp(-3.2 * dt);
      f.vy *= Math.exp(-3.2 * dt);
      f.x += (f.vx + sway - 3.5 * u) * dt;
      f.y += (f.vy + f.speed * u) * dt;

      if (f.y > this.h + 2) {
        f.y = -2;
        f.x = ((f.x + hash(time * 17 + f.phase) * this.w) % this.w + this.w) % this.w;
      }
      if (f.x < -3) f.x = this.w + 2;
      if (f.x > this.w + 3) f.x = -2;
    }

    // 2. Chimney smoke & rings
    if (chimney) {
      this.smokeCooldown -= dt;
      if (this.smokeCooldown <= 0) {
        this.smokeCooldown = 0.42;
        this.pushSmoke(chimney.x + rand(-1, 1) * u, chimney.y, rand(1.1, 1.7));
      }
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.age += dt;
      s.x += (s.vx + Math.sin(time * 1.4 + s.age * 2) * 3 * u) * dt;
      s.y += s.vy * dt;
      s.size += 0.55 * u * dt;
      if (s.age >= s.life) this.smoke.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      r.x += 5.5 * u * dt;
      r.y += r.vy * dt;
      r.rx += 2.2 * u * dt;
      r.ry += 0.9 * u * dt;
      if (r.age >= r.life) this.rings.splice(i, 1);
    }

    // 3. Snow puffs & footprints
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.age += dt;
      p.vy += 38 * u * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) this.puffs.splice(i, 1);
    }
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const fp = this.prints[i];
      fp.age += dt;
      if (fp.age >= fp.life) this.prints.splice(i, 1);
    }

    // 4. Night shooting stars
    if (nightChimneyScene && nightFactor > 0.35) {
      this.nightMeteorWait -= dt;
      if (this.nightMeteorWait <= 0) {
        this.nightMeteorWait = rand(3.5, 7.5);
        this.triggerShootingStar(rand(this.w * 0.14, this.w * 0.86), rand(this.h * 0.04, this.h * 0.2));
      }
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.age >= m.duration) this.meteors.splice(i, 1);
    }

    // 5. Cold breath puffs
    for (let i = this.breaths.length - 1; i >= 0; i--) {
      const b = this.breaths[i];
      b.age += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.age >= b.life) this.breaths.splice(i, 1);
    }
  }

  /** Draws pixel-dithered green and violet Aurora Borealis curtains in the upper sky. */
  drawAurora(ctx: CanvasRenderingContext2D, time: number, strength: number): void {
    if (strength < 0.04) return;
    const skyH = Math.round(this.h * 0.44);
    const stepX = Math.max(2, Math.round(2 * this.unit));

    ctx.save();
    for (let x = 0; x < this.w; x += stepX) {
      const u = x / this.w;
      const waveA = Math.sin(u * 7.5 + time * 0.18) * 0.5 + Math.sin(u * 15 - time * 0.11) * 0.3;
      const waveB = Math.cos(u * 5.2 - time * 0.14 + 1.3);
      const bandTop = Math.round(this.h * (0.05 + 0.07 * waveA));
      const curtainH = Math.round(this.h * (0.14 + 0.09 * Math.max(0, waveB)));
      const columnPower = clamp(0.4 + 0.6 * Math.sin(u * 11 + time * 0.25 + waveA), 0, 1) * strength;
      if (columnPower < 0.08) continue;

      for (let y = bandTop; y < Math.min(skyH, bandTop + curtainH); y += 2) {
        const k = (y - bandTop) / Math.max(1, curtainH);
        // Bottom edge of curtain is crispest emerald green, fading upward into violet
        const vertical = Math.sin(Math.PI * Math.pow(1 - k, 0.7));
        if (vertical < 0.12) continue;
        // Ordered pixel dither check so edges read as crisp pixel light
        const dither = ((x / stepX + y) & 1) === 0 ? 1 : 0.68;
        const col = k > 0.55
          ? mix(AURORA_GREEN, AURORA_TEAL, (k - 0.55) / 0.45)
          : mix(AURORA_VIOLET, AURORA_GREEN, k / 0.55);
        ctx.fillStyle = css(col, clamp(vertical * columnPower * 0.42 * dither, 0, 0.55));
        ctx.fillRect(x, y, stepX, 2);
      }
    }
    ctx.restore();
  }

  /** Draws active shooting stars across the sky. */
  drawShootingStars(ctx: CanvasRenderingContext2D): void {
    if (this.meteors.length === 0) return;
    const tailSec = 0.14;
    ctx.save();
    ctx.fillStyle = '#f6f9ff';
    for (const m of this.meteors) {
      const alpha = Math.sin(Math.PI * Math.min(1, m.age / m.duration));
      const steps = Math.max(4, Math.ceil(Math.hypot(m.vx, m.vy) * tailSec));
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        ctx.globalAlpha = alpha * (1 - k) * (1 - k);
        ctx.fillRect(
          Math.round(m.x - m.vx * tailSec * k),
          Math.round(m.y - m.vy * tailSec * k),
          i < 2 ? 2 : 1,
          1,
        );
      }
    }
    ctx.restore();
  }

  /** Draws stamped snow footprints and fox tracks on the snowy ground. */
  drawFootprints(ctx: CanvasRenderingContext2D, day: number): void {
    if (this.prints.length === 0) return;
    const col: RGB = mix([52, 72, 108], [134, 158, 188], day);
    const sz = Math.max(1, Math.round(this.unit));
    for (const fp of this.prints) {
      if (fp.age < 0) continue;
      const fade = clamp(1 - Math.max(0, fp.age - fp.life * 0.65) / (fp.life * 0.35), 0, 1);
      if (fade < 0.05) continue;
      ctx.fillStyle = css(col, 0.62 * fade);
      const px = Math.round(fp.x);
      const py = Math.round(fp.y);
      if (fp.paw) {
        ctx.fillRect(px, py, sz, sz);
        ctx.fillRect(px + sz, py + sz, sz, sz);
      } else {
        ctx.fillRect(px, py, sz * 2, sz);
        ctx.fillRect(px + sz, py + sz, sz * 2, sz);
      }
    }
  }

  /** Draws rising chimney smoke puffs and clickable smoke rings. */
  drawSmoke(ctx: CanvasRenderingContext2D, state: SkyState): void {
    const base = mix([148, 162, 188], [234, 240, 248], state.day);
    const warm = mix(base, state.sky.light, 0.25);

    for (const s of this.smoke) {
      const t = s.age / s.life;
      const alpha = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.48;
      if (alpha < 0.03) continue;
      const sz = Math.max(2, Math.round(s.size));
      ctx.fillStyle = css(warm, alpha);
      ctx.fillRect(Math.round(s.x - sz / 2), Math.round(s.y - sz / 2), sz, Math.max(1, sz - 1));
    }

    for (const r of this.rings) {
      const t = r.age / r.life;
      const alpha = (1 - t) * 0.68;
      if (alpha < 0.04) continue;
      ctx.fillStyle = css(WHITE, alpha);
      const dots = 12;
      const dotSz = Math.max(1, Math.round(this.unit));
      for (let i = 0; i < dots; i++) {
        const a = (i / dots) * Math.PI * 2;
        const px = Math.round(r.x + Math.cos(a) * r.rx);
        const py = Math.round(r.y + Math.sin(a) * r.ry);
        ctx.fillRect(px, py, dotSz, dotSz);
      }
    }
  }

  /** Draws snow click puffs, cold breath puffs, and continuous snowfall. */
  drawSnowAndPuffs(ctx: CanvasRenderingContext2D, state: SkyState, glowPoint: { x: number; y: number } | null): void {
    const flakeCol = mix(mix([172, 192, 224], WHITE, state.day), state.sky.light, 0.16);
    const warmGold: RGB = [255, 224, 152];
    const glowR = 54 * this.unit;

    for (const p of this.puffs) {
      const alpha = 1 - p.age / p.life;
      ctx.fillStyle = css(WHITE, alpha * 0.9);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, Math.round(this.unit)), Math.max(1, Math.round(this.unit)));
    }

    for (const b of this.breaths) {
      const t = b.age / b.life;
      const alpha = Math.sin(Math.PI * t) * 0.45;
      const sz = Math.max(1, Math.round((1 + t * 1.5) * this.unit));
      ctx.fillStyle = css(WHITE, alpha);
      ctx.fillRect(Math.round(b.x), Math.round(b.y), sz, sz);
    }

    const nearSz = Math.max(1, Math.round(this.unit));
    for (const f of this.flakes) {
      let col = flakeCol;
      if (glowPoint) {
        const d = Math.hypot(f.x - glowPoint.x, f.y - glowPoint.y);
        if (d < glowR) col = mix(flakeCol, warmGold, (1 - d / glowR) * 0.7);
      }
      ctx.fillStyle = css(col, f.near ? 0.88 : 0.56);
      const sx = Math.round(f.x);
      const sy = Math.round(f.y);
      ctx.fillRect(sx, sy, nearSz, nearSz);
    }
  }
}
