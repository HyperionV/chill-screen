import { clamp, rand } from '../../../world/math';
import type { RippleTrigger } from './creatures';
import type { FishingSprites } from './sprites';
import type { PointerDesign, SceneIndex, SceneLayout } from './types';

interface Dragonfly {
  variant: 'teal' | 'amber';
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  state: 'dart' | 'hover';
  timer: number;
  phase: number;
}

interface FishJump {
  x: number;
  y: number;
  vx: number;
  age: number;
  duration: number;
  height: number;
  wait: number;
  active: boolean;
}

interface WakeChevron {
  x: number;
  y: number;
  spread: number;
  age: number;
  life: number;
  wide: boolean;
}

interface FloatingLeaf {
  x: number;
  y: number;
  speed: number;
  variant: number;
  phase: number;
}

interface Moth {
  angle: number;
  radius: number;
  speed: number;
  yOffset: number;
  phase: number;
  scatterX: number;
  scatterY: number;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
}

const DRAGONFLY_COUNT = 4;
const JUMP_SLOTS = 2;
const MAX_WAKES = 44;
const LEAF_COUNT = 12;
const MOTH_COUNT = 8;
const FIREFLY_COUNT = 20;
const LEAF_FIRST_ROW = 169;
const LEAF_ROW_RANGE = 64;
const DUCK_LANES = [0, 0.73, 0, 0.68, 0.71];
const DUCK_WATER_ROW = 180;
const DUCK_SWIM_RATE = 0.10;
const TRAIL_STEPS = 4;

/** Coordinates dragonflies, fish jumps, ambient rings, wake trails, floating leaves, moths, and fireflies. */
export class AmbientLakeLife {
  private readonly dragonflies: Dragonfly[] = [];
  private readonly jumps: FishJump[] = [];
  private readonly wakes: WakeChevron[] = [];
  private readonly leaves: FloatingLeaf[] = [];
  private readonly moths: Moth[] = [];
  private readonly fireflies: Firefly[] = [];
  private ambientRingTimer = 1.4;
  private seeded = false;

  /** Initializes or updates spatial anchors when the viewport resizes. */
  syncLayout(layout: SceneLayout): void {
    const rZone = layout.rightZone;
    const jRight = layout.jettyRight;

    if (!this.seeded) {
      this.seeded = true;

      const flyHomes = [
        { x: jRight - 14, y: 186 },
        { x: rZone + 24, y: 192 },
        { x: rZone + 64, y: 184 },
        { x: rZone + 104, y: 196 },
      ];
      for (let i = 0; i < DRAGONFLY_COUNT; i++) {
        const home = flyHomes[i] ?? { x: rZone + 30, y: 190 };
        this.dragonflies.push({
          variant: i % 2 === 0 ? 'teal' : 'amber',
          homeX: home.x,
          homeY: home.y,
          x: home.x,
          y: home.y,
          vx: 14,
          vy: 0,
          dir: i % 2 === 0 ? 1 : -1,
          state: i % 2 === 0 ? 'dart' : 'hover',
          timer: rand(1.2, 3.2),
          phase: rand(0, 6.28),
        });
      }

      for (let i = 0; i < JUMP_SLOTS; i++) {
        this.jumps.push({
          x: jRight + 40 + i * 95,
          y: 178 + i * 10,
          vx: i % 2 === 0 ? 18 : -18,
          age: 0,
          duration: 0.72,
          height: 11,
          wait: rand(2.2, 5.5) + i * 2.5,
          active: false,
        });
      }

      for (let i = 0; i < LEAF_COUNT; i++) {
        this.leaves.push({
          x: rand(16, layout.designW - 16),
          y: LEAF_FIRST_ROW + ((i * 11) % LEAF_ROW_RANGE),
          speed: rand(2.2, 4.6),
          variant: i % 4,
          phase: rand(0, 6.28),
        });
      }

      for (let i = 0; i < MOTH_COUNT; i++) {
        this.moths.push({
          angle: (i / MOTH_COUNT) * Math.PI * 2,
          radius: rand(6, 16),
          speed: (i % 2 === 0 ? 1 : -1) * rand(1.4, 2.5),
          yOffset: rand(-7, 5),
          phase: rand(0, 6.28),
          scatterX: 0,
          scatterY: 0,
        });
      }

      for (let i = 0; i < FIREFLY_COUNT; i++) {
        this.fireflies.push({
          x: rand(12, layout.designW - 12),
          y: rand(162, 232),
          vx: rand(-4, 4),
          vy: rand(-2, 2),
          phase: rand(0, 6.28),
          speed: rand(0.8, 1.8),
        });
      }
      return;
    }

    const flyHomes = [
      { x: jRight - 14, y: 186 },
      { x: rZone + 24, y: 192 },
      { x: rZone + 64, y: 184 },
      { x: rZone + 104, y: 196 },
    ];
    for (let i = 0; i < this.dragonflies.length; i++) {
      const df = this.dragonflies[i];
      const home = flyHomes[i];
      if (df && home) {
        df.homeX = home.x;
        df.homeY = home.y;
        df.x = clamp(df.x, 12, layout.designW - 12);
      }
    }
  }

  /** Appends a wake chevron behind a moving duck or boat. */
  emitWake(x: number, y: number, wide = false): void {
    if (this.wakes.length >= MAX_WAKES) this.wakes.shift();
    this.wakes.push({ x, y, spread: wide ? 4 : 2, age: 0, life: wide ? 2.1 : 1.5, wide });
  }

  update(
    dt: number,
    time: number,
    scene: SceneIndex,
    layout: SceneLayout,
    day: number,
    pointer: PointerDesign | null,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    this.stepDragonflies(dt, time, layout, day, pointer, onRipple);
    this.stepFishJumps(dt, scene, layout, onRipple);
    this.stepAmbientRings(dt, layout, onRipple);
    this.stepWakes(dt);
    this.stepLeaves(dt, layout, pointer, onRipple);
    this.stepMoths(dt, scene, layout, pointer);
    this.stepFireflies(dt, layout);
  }

  private stepDragonflies(
    dt: number,
    time: number,
    layout: SceneLayout,
    day: number,
    pointer: PointerDesign | null,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    if (day < 0.18) return;
    for (const df of this.dragonflies) {
      df.timer -= dt;
      if (df.timer <= 0) {
        df.state = df.state === 'dart' ? 'hover' : 'dart';
        df.timer = df.state === 'hover' ? rand(1.1, 2.4) : rand(1.4, 2.8);
        if (df.state === 'dart') {
          const angle = rand(0, Math.PI * 2);
          df.vx = Math.cos(angle) * rand(18, 30);
          df.vy = Math.sin(angle) * rand(6, 12);
          df.dir = df.vx >= 0 ? 1 : -1;
        }
      }

      if (pointer) {
        const dx = df.x - pointer.x;
        const dy = df.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 22 && dist > 0.5) {
          df.state = 'dart';
          df.vx = (dx / dist) * 34;
          df.vy = (dy / dist) * 18;
          df.dir = df.vx >= 0 ? 1 : -1;
          df.timer = 1.1;
        }
      }

      if (df.state === 'hover') {
        df.x += Math.sin(time * 3 + df.phase) * 2.5 * dt;
        df.y += Math.cos(time * 4.2 + df.phase) * 2.2 * dt;
      } else {
        df.x += df.vx * dt;
        df.y += df.vy * dt;
        // Gently pull back toward home reed/lily cluster.
        df.vx += (df.homeX - df.x) * 1.1 * dt;
        df.vy += (df.homeY - df.y) * 1.6 * dt;
        df.dir = df.vx >= 0 ? 1 : -1;
        if (df.y > 199 && Math.random() < dt * 1.4) {
          onRipple({ x: df.x, y: df.y + 1, maxR: 6 });
        }
      }
      df.y = clamp(df.y, 162, 206);
      df.x = clamp(df.x, 8, Math.max(8, layout.designW - 8));
    }
  }

  private stepFishJumps(
    dt: number,
    scene: SceneIndex,
    layout: SceneLayout,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    const minX = layout.jettyRight + 16;
    const maxX = Math.max(minX + 20, layout.designW - 24);
    for (let i = 0; i < this.jumps.length; i++) {
      const j = this.jumps[i];
      if (!j) continue;
      if (!j.active) {
        j.wait -= dt;
        if (j.wait <= 0) {
          j.active = true;
          j.age = 0;
          j.duration = rand(0.62, 0.82);
          j.height = rand(9, 14);
          j.x = scene === 4 && i === 0 ? layout.jettyRight + rand(6, 36) : rand(minX, maxX);
          j.y = rand(layout.waterTopY + 22, 198);
          j.vx = (Math.random() < 0.5 ? 1 : -1) * rand(14, 22);
          onRipple({ x: j.x, y: j.y, maxR: 10, bright: true });
        }
        continue;
      }

      j.age += dt;
      j.x += j.vx * dt;
      if (j.age >= j.duration) {
        j.active = false;
        j.wait = scene === 4 ? rand(3.2, 6.8) : rand(4.5, 9.5);
        onRipple({ x: j.x, y: j.y, maxR: 13, bright: true });
      }
    }
  }

  private stepAmbientRings(dt: number, layout: SceneLayout, onRipple: (r: RippleTrigger) => void): void {
    this.ambientRingTimer -= dt;
    if (this.ambientRingTimer <= 0) {
      this.ambientRingTimer = rand(1.5, 3.6);
      const rx = rand(layout.jettyRight + 12, layout.designW - 18);
      const ry = rand(layout.waterTopY + 10, 194);
      onRipple({ x: rx, y: ry, maxR: rand(7, 12), bright: false });
    }
  }

  private stepWakes(dt: number): void {
    for (let i = this.wakes.length - 1; i >= 0; i--) {
      const w = this.wakes[i];
      if (!w) continue;
      w.age += dt;
      w.spread += dt * (w.wide ? 4.2 : 2.8);
      if (w.age >= w.life) this.wakes.splice(i, 1);
    }
  }

  private stepLeaves(
    dt: number,
    layout: SceneLayout,
    pointer: PointerDesign | null,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    for (const lf of this.leaves) {
      lf.x += lf.speed * dt;
      if (pointer && pointer.speed > 75) {
        const d = Math.hypot(lf.x - pointer.x, lf.y - pointer.y);
        if (d < 16 && d > 0.5) {
          lf.x += ((lf.x - pointer.x) / d) * 18 * dt;
          if (Math.random() < dt * 2) onRipple({ x: lf.x, y: lf.y, maxR: 5 });
        }
      }
      if (lf.x > layout.designW + 8) {
        lf.x = -8;
      }
    }
  }

  private stepMoths(dt: number, scene: SceneIndex, layout: SceneLayout, pointer: PointerDesign | null): void {
    if (scene !== 4 && scene !== 3) return;
    const lx = scene === 4 ? layout.jettyRight - 18 : layout.jettyRight - 8;
    const ly = scene === 4 ? layout.deckY - 12 : layout.deckY - 11;
    for (const m of this.moths) {
      m.angle += m.speed * dt;
      const mx = lx + Math.cos(m.angle) * m.radius + m.scatterX;
      const my = ly + Math.sin(m.angle * 1.4 + m.phase) * (m.radius * 0.42) + m.yOffset + m.scatterY;
      if (pointer) {
        const dx = mx - pointer.x;
        const dy = my - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 24 && d > 0.5) {
          m.scatterX += (dx / d) * 42 * dt;
          m.scatterY += (dy / d) * 42 * dt;
        }
      }
      m.scatterX *= Math.exp(-2.4 * dt);
      m.scatterY *= Math.exp(-2.4 * dt);
    }
  }

  private stepFireflies(dt: number, layout: SceneLayout): void {
    for (const f of this.fireflies) {
      f.vx = clamp(f.vx + rand(-10, 10) * dt, -6, 6);
      f.vy = clamp(f.vy + rand(-8, 8) * dt, -4, 4);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < 8) f.x = layout.designW - 10;
      if (f.x > layout.designW - 8) f.x = 10;
      if (f.y < 156) f.vy = Math.abs(f.vy);
      if (f.y > 236) f.vy = -Math.abs(f.vy);
    }
  }

  /** Draws wake chevrons, floating leaves, and jumping fish arcs onto the land buffer. */
  drawSurfaceLife(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    time: number,
    unit: number,
    day: number,
  ): void {
    const dot = Math.max(1, Math.round(unit));

    // Wake V-trails behind ducks and rowboat.
    for (const w of this.wakes) {
      const k = w.age / w.life;
      const alpha = (1 - k) * (0.28 + 0.24 * day);
      if (alpha < 0.03) continue;
      ctx.fillStyle = `rgba(228,244,252,${alpha.toFixed(3)})`;
      const wx = Math.round(w.x * unit);
      const wy = Math.round(w.y * unit);
      const sp = Math.round(w.spread * unit);
      const len = dot * (w.wide ? 3 : 2);
      ctx.fillRect(wx, wy - sp, len, dot);
      ctx.fillRect(wx, wy + sp, len, dot);
    }

    // Floating fallen leaves gently bobbing on the lake.
    for (const lf of this.leaves) {
      const sp = sprites.leaves[lf.variant];
      if (!sp) continue;
      const bob = Math.sin(time * 1.8 + lf.phase) * 0.45;
      const sw = Math.max(1, Math.round(sp.w * unit));
      const sh = Math.max(1, Math.round(sp.h * unit));
      ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(lf.x * unit), Math.round((lf.y + bob) * unit), sw, sh);
    }

    // Jumping fish arcs with splash droplets.
    for (const j of this.jumps) {
      if (!j.active) continue;
      const p = clamp(j.age / j.duration, 0, 1);
      const arc = Math.sin(p * Math.PI);
      const fy = j.y - arc * j.height;
      const sp = j.vx >= 0 ? sprites.jumpingFish.right : sprites.jumpingFish.left;
      const sw = Math.max(1, Math.round(sp.w * unit));
      const sh = Math.max(1, Math.round(sp.h * unit));
      ctx.drawImage(
        sp.canvas,
        0,
        0,
        sp.w,
        sp.h,
        Math.round(j.x * unit - sw / 2),
        Math.round(fy * unit - sh / 2),
        sw,
        sh,
      );

      // Splash droplets at launch and reentry.
      if (p < 0.28 || p > 0.72) {
        ctx.fillStyle = `rgba(235,248,255,${(0.75 * (1 - arc * 0.5)).toFixed(3)})`;
        ctx.fillRect(Math.round((j.x - 3) * unit), Math.round((j.y - 2) * unit), dot, dot);
        ctx.fillRect(Math.round((j.x + 3) * unit), Math.round((j.y - 3) * unit), dot, dot);
      }
    }
  }

  /** Distant ducks occupy the open bay outside the interactive birds' perches. */
  drawBayDucks(ctx: CanvasRenderingContext2D, sprites: FishingSprites, scene: SceneIndex, layout: SceneLayout, time: number): void {
    const lane = DUCK_LANES[scene];
    if (lane === 0) return;
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));
    const centre = layout.designW * lane;
    const reach = Math.min(24, layout.designW * 0.06);
    for (let i = 0; i < 2; i++) {
      const phase = time * DUCK_SWIM_RATE - i * 0.56 + scene * 1.4;
      const x = centre + Math.sin(phase) * reach;
      const y = DUCK_WATER_ROW + i * 8 + Math.sin(phase * 2) * 1.5;
      const dir = Math.cos(phase) >= 0 ? 1 : -1;
      ctx.save();
      ctx.fillStyle = '#c3d7d5';
      for (let step = 1; step <= TRAIL_STEPS; step++) {
        const trailPhase = phase - step * 0.12;
        const trailX = centre + Math.sin(trailPhase) * reach - dir * 5;
        const spread = Math.round(step * u);
        const px = Math.round(trailX * u);
        const py = Math.round(y * u);
        ctx.globalAlpha = (1 - step / (TRAIL_STEPS + 1)) * 0.42;
        ctx.fillRect(px, py - spread, dot * 2, dot);
        ctx.fillRect(px - dir * dot * 2, py + spread, dot * 2, dot);
      }
      ctx.restore();
      const pair = Math.floor(time * 1.3 + i) % 2 === 0 ? sprites.duckMotherA : sprites.duckMotherB;
      const duck = dir > 0 ? pair.right : pair.left;
      const w = Math.max(1, Math.round(duck.w * u));
      const h = Math.max(1, Math.round(duck.h * u));
      ctx.drawImage(duck.canvas, Math.round(x * u - w / 2), Math.round(y * u) - h, w, h);
    }
  }

  /** Draws darting/hovering dragonflies over reeds and lily pads. */
  drawDragonflies(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    time: number,
    unit: number,
    day: number,
  ): void {
    if (day < 0.18) return;
    for (const df of this.dragonflies) {
      const wingUp = Math.floor(time * 14 + df.phase) % 2 === 0;
      const pair =
        df.variant === 'teal'
          ? wingUp
            ? sprites.dragonflyTealA
            : sprites.dragonflyTealB
          : wingUp
            ? sprites.dragonflyAmberA
            : sprites.dragonflyAmberB;
      const sp = df.dir >= 0 ? pair.right : pair.left;
      const sw = Math.max(1, Math.round(sp.w * unit));
      const sh = Math.max(1, Math.round(sp.h * unit));
      ctx.drawImage(sp.canvas, 0, 0, sp.w, sp.h, Math.round(df.x * unit - sw / 2), Math.round(df.y * unit - sh / 2), sw, sh);
    }
  }

  /** Draws post-tint lantern moths and layered dithered fireflies. */
  drawNightAndGlowLife(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    day: number,
  ): void {
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));

    if (scene === 4 || (scene === 3 && day < 0.65)) {
      const lx = scene === 4 ? layout.jettyRight - 18 : layout.jettyRight - 8;
      const ly = scene === 4 ? layout.deckY - 12 : layout.deckY - 11;
      for (const m of this.moths) {
        const mx = lx + Math.cos(m.angle) * m.radius + m.scatterX;
        const my = ly + Math.sin(m.angle * 1.4 + m.phase) * (m.radius * 0.42) + m.yOffset + m.scatterY;
        const flap = Math.floor(time * 8 + m.phase) % 2 === 0;
        const px = Math.round(mx * u);
        const py = Math.round(my * u);
        ctx.fillStyle = 'rgba(255,240,196,0.88)';
        if (flap) {
          ctx.fillRect(px - dot, py, dot, dot);
          ctx.fillRect(px + dot, py, dot, dot);
        } else {
          ctx.fillRect(px, py - dot, dot, dot * 2);
        }
      }
    }

    const nightFactor = scene === 4 ? Math.max(0.55, 1 - day) : Math.max(0, (1 - day - 0.35) / 0.65);
    if (nightFactor > 0.05) {
      const halo = sprites.haloFirefly;
      const hw = Math.max(3, Math.round(halo.w * u));
      const hh = Math.max(3, Math.round(halo.h * u));
      for (const f of this.fireflies) {
        const glow = Math.max(0, Math.sin(time * f.speed + f.phase)) ** 3 * nightFactor;
        if (glow < 0.08) continue;
        const fx = Math.round(f.x * u);
        const fy = Math.round(f.y * u);
        ctx.save();
        ctx.globalAlpha *= glow * 0.85;
        ctx.drawImage(halo.canvas, 0, 0, halo.w, halo.h, Math.round(fx - hw / 2), Math.round(fy - hh / 2), hw, hh);
        ctx.restore();
      }
    }
  }
}
