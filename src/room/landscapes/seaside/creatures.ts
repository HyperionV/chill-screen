import { css } from '../../../render/color';
import { clamp, rand, seededRandom } from '../../../world/math';
import type { SeasideSprites } from './sprites';
import {
  SCENE_BEACH,
  SCENE_COVE,
  SCENE_HARBOUR,
  SCENE_LIGHTHOUSE,
  SCENE_TIDE_POOLS,
  STARTLE_RADIUS,
  avoidRadio,
  drawSprite,
  type CrabState,
  type Dolphin,
  type HarbourCat,
  type HeronState,
  type Point,
  type ShoreCrab,
  type ShoreGull,
  type SkyGull,
  type TideFish,
} from './types';

/** Classic three-pixel-row gull silhouettes for high distant sky gulls (from Sea). */
const SKY_GULL_POSES: [number, number][][] = [
  [[-3, -2], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -2]],
  [[-3, 0], [-2, -1], [-1, -1], [0, 0], [1, -1], [2, -1], [3, 0]],
  [[-3, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 1]],
];

const SKY_GULL_COUNT = 3;

export class SeasideCreatures {
  private readonly skyGulls: SkyGull[] = [];
  private readonly shoreGulls = new Map<number, ShoreGull[]>();
  private readonly crabs = new Map<number, CrabState>();
  private readonly cat: HarbourCat = { mood: 'sit', timer: 3, clock: 0, lookDir: 0 };
  private readonly heron: HeronState = { mood: 'poised', timer: 4, clock: 0, lookDir: 0 };
  private readonly tideFish: TideFish[] = [];
  private readonly shoreCrabs: ShoreCrab[] = [];
  private readonly dolphins: Dolphin[] = [];
  private dolphinWait = 4;

  constructor() {
    const rnd = seededRandom(7);
    for (let i = 0; i < SKY_GULL_COUNT; i++) {
      this.skyGulls.push({ x: -1, y: 0, vx: 0, flap: rnd() * 6, wait: 3 + rnd() * 15, hop: 0 });
    }

    this.shoreGulls.set(SCENE_BEACH, [
      this.makeGull(0.14, 0.73, 1),
      this.makeGull(0.89, 0.72, -1),
    ]);
    this.shoreGulls.set(SCENE_HARBOUR, [
      this.makeGull(0.34, 0.655, 1),
      this.makeGull(0.50, 0.565, -1),
      this.makeGull(0.66, 0.66, -1),
    ]);
    this.shoreGulls.set(SCENE_LIGHTHOUSE, [
      this.makeGull(0.76, 0.64, -1),
      this.makeGull(0.86, 0.66, -1),
    ]);
    this.shoreGulls.set(SCENE_COVE, [
      this.makeGull(0.79, 0.435, -1),
      this.makeGull(0.87, 0.445, -1),
    ]);

    this.crabs.set(SCENE_BEACH, this.makeCrab(0.74, 0.85, -1, 'idle'));
    this.crabs.set(SCENE_HARBOUR, this.makeCrab(0.82, 0.675, -1, 'idle'));
    this.crabs.set(SCENE_TIDE_POOLS, this.makeCrab(0.74, 0.71, -1, 'wave'));
    this.crabs.set(SCENE_COVE, this.makeCrab(0.76, 0.81, -1, 'idle'));

    for (let i = 0; i < 8; i++) {
      const pool: 0 | 1 = i < 4 ? 0 : 1;
      const baseU = pool === 0 ? 0.21 : 0.79;
      this.tideFish.push({
        pool,
        u: baseU + (rnd() - 0.5) * 0.16,
        v: 0.76 + rnd() * 0.10,
        vx: (rnd() < 0.5 ? 1 : -1) * (0.015 + rnd() * 0.02),
        vy: (rnd() - 0.5) * 0.008,
        colorIndex: i % 2 === 0 ? 0 : 1,
        timer: 1 + rnd() * 3,
      });
    }

    this.shoreCrabs.push(
      { u: 0.14, v: 0.68, homeU: 0.14, homeV: 0.68, dir: 1, mood: 'idle', timer: 2.2, clock: 0 },
      { u: 0.85, v: 0.86, homeU: 0.85, homeV: 0.86, dir: -1, mood: 'scuttle', timer: 1.8, clock: 1.2 },
    );

    for (let i = 0; i < 3; i++) {
      this.dolphins.push({
        u: 0.44 + i * 0.05,
        phase: i * 0.42,
        active: false,
        progress: 0,
        duration: 1.8,
        startU: 0.43 + i * 0.04,
        spanU: 0.09,
        peakV: 0.585 + (i % 2) * 0.015,
        wait: i * 0.38,
      });
    }
  }

  private makeGull(u: number, v: number, dir: 1 | -1): ShoreGull {
    return { u, v, homeU: u, homeV: v, dir, state: 'idle', timer: rand(1.5, 4.5), clock: rand(0, 5), flyY: v, flyVx: 0, flyVy: 0 };
  }

  private makeCrab(u: number, v: number, dir: 1 | -1, mood: CrabState['mood']): CrabState {
    return { u, v, dir, mood, timer: rand(1.5, 3.5), clock: rand(0, 4), targetU: null, targetV: null, hopOffset: 0 };
  }

  /** Directs the scene's red crab to scuttle toward a clicked sand footprint. */
  attractCrab(sceneIndex: number, targetU: number, targetV: number): void {
    const crab = this.crabs.get(sceneIndex);
    if (!crab) return;
    if (sceneIndex !== SCENE_BEACH && sceneIndex !== SCENE_COVE) return;
    const safe = avoidRadio(targetU, clamp(targetV, 0.72, 0.93));
    crab.targetU = safe.u;
    crab.targetV = safe.v;
    crab.mood = 'seek';
    crab.timer = 6;
  }

  /** Startles gulls in the current scene into taking off (called when a boat is clicked). */
  takeOffGulls(sceneIndex: number): void {
    const gulls = this.shoreGulls.get(sceneIndex);
    if (!gulls) return;
    for (const g of gulls) {
      if (g.state === 'fly') continue;
      g.state = 'fly';
      g.timer = rand(3.5, 5.5);
      g.flyY = g.v;
      g.flyVx = (Math.random() < 0.5 ? -1 : 1) * rand(0.05, 0.09);
      g.flyVy = -rand(0.05, 0.08);
      g.dir = g.flyVx >= 0 ? 1 : -1;
    }
  }

  /** Triggers an extra dolphin pod arc if idle (called when clicking Sunset Cove water). */
  triggerDolphinPod(): void {
    if (this.dolphins.some((d) => d.active)) return;
    this.dolphinWait = 0.05;
  }

  /** Advances all creatures for the active scene (and sky gulls). */
  update(sceneIndex: number, dt: number, time: number, w: number, h: number, unit: number, pointer: Point | null): void {
    this.updateSkyGulls(dt, time, w, h, unit, pointer);

    const gulls = this.shoreGulls.get(sceneIndex);
    if (gulls) {
      for (const g of gulls) this.stepShoreGull(g, dt, w, h, unit, pointer);
    }

    const crab = this.crabs.get(sceneIndex);
    if (crab) this.stepCrab(sceneIndex, crab, dt, w, h, unit, pointer);

    if (sceneIndex === SCENE_HARBOUR) this.stepCat(dt, w, unit, pointer);
    if (sceneIndex === SCENE_TIDE_POOLS) {
      this.stepHeron(dt, w, h, unit, pointer);
      this.stepTideFish(dt, w, h, unit, pointer);
      for (const sc of this.shoreCrabs) this.stepShoreCrab(sc, dt, w, h, unit, pointer);
    }
    if (sceneIndex === SCENE_COVE) this.stepDolphins(dt);
  }

  private updateSkyGulls(dt: number, time: number, w: number, h: number, unit: number, pointer: Point | null): void {
    for (const g of this.skyGulls) {
      g.hop = Math.max(0, g.hop - dt * 2.5);
      if (g.x < -0.1 || g.x > 1.1) {
        g.wait -= dt;
        if (g.wait > 0) continue;
        const dir = Math.random() < 0.5 ? 1 : -1;
        g.x = dir > 0 ? -0.05 : 1.05;
        g.y = 0.16 + Math.random() * 0.22;
        g.vx = dir * (0.014 + Math.random() * 0.012);
        g.wait = 12 + Math.random() * 35;
      }
      g.x += g.vx * dt;
      g.y += Math.sin(time * 0.4 + g.flap) * 0.0005;
      if (pointer && Math.hypot(pointer.x - g.x * w, pointer.y - g.y * h) < STARTLE_RADIUS * unit) {
        g.hop = 1;
        g.y = Math.max(0.08, g.y - 0.025);
        g.vx = Math.sign(g.x * w - pointer.x || g.vx) * Math.max(Math.abs(g.vx), 0.032);
      }
    }
  }

  private stepShoreGull(g: ShoreGull, dt: number, w: number, h: number, unit: number, pointer: Point | null): void {
    g.clock += dt;
    g.timer -= dt;

    if (g.state === 'fly') {
      g.u += g.flyVx * dt;
      g.flyY += g.flyVy * dt;
      g.flyVy += 0.015 * dt;
      if (g.timer < 1.5) {
        // Glide back gently toward perch
        const du = g.homeU - g.u;
        const dv = g.homeV - g.flyY;
        g.u += du * Math.min(1, dt * 2.2);
        g.flyY += dv * Math.min(1, dt * 2.2);
        g.dir = du >= 0 ? 1 : -1;
      }
      if (g.timer <= 0) {
        g.state = 'idle';
        g.u = g.homeU;
        g.v = g.homeV;
        g.flyY = g.homeV;
        g.timer = rand(2, 5);
      }
      return;
    }

    if (pointer && Math.hypot(pointer.x - g.u * w, pointer.y - g.v * h) < STARTLE_RADIUS * unit) {
      g.state = 'hop';
      g.dir = pointer.x < g.u * w ? 1 : -1;
      g.timer = 0.55;
      g.clock = 0;
    }

    if (g.state === 'hop') {
      g.u = clamp(g.u + g.dir * 0.065 * dt, g.homeU - 0.08, g.homeU + 0.08);
      if (g.timer <= 0) {
        g.state = 'idle';
        g.timer = rand(1.5, 4);
      }
      return;
    }

    if (g.state === 'walk') {
      g.u = clamp(g.u + g.dir * 0.014 * dt, g.homeU - 0.05, g.homeU + 0.05);
      const safe = avoidRadio(g.u, g.v);
      g.u = safe.u;
    }

    if (g.timer <= 0) {
      const r = Math.random();
      g.state = r < 0.45 ? 'idle' : r < 0.78 ? 'peck' : 'walk';
      if (g.state === 'walk') g.dir = g.u > g.homeU ? -1 : 1;
      g.timer = g.state === 'peck' ? rand(0.9, 1.8) : rand(1.8, 4.2);
    }
  }

  private stepCrab(sceneIndex: number, c: CrabState, dt: number, w: number, h: number, unit: number, pointer: Point | null): void {
    c.clock += dt;
    c.timer -= dt;
    c.hopOffset = 0;

    if (pointer && Math.hypot(pointer.x - c.u * w, pointer.y - c.v * h) < STARTLE_RADIUS * unit) {
      c.mood = 'flee';
      c.dir = pointer.x < c.u * w ? 1 : -1;
      c.targetU = null;
      c.targetV = null;
      c.timer = 0.85;
      c.clock = 0;
    }

    const bounds = this.crabBounds(sceneIndex);
    if (c.mood === 'flee') {
      c.hopOffset = Math.abs(Math.sin(c.clock * 14)) * 5 * unit;
      c.u = clamp(c.u + c.dir * 0.08 * dt, bounds.minU, bounds.maxU);
      const safe = avoidRadio(c.u, c.v);
      c.u = safe.u;
      if (c.timer <= 0) {
        c.mood = sceneIndex === SCENE_TIDE_POOLS ? 'wave' : 'idle';
        c.timer = rand(1.5, 3.2);
      }
      return;
    }

    if (c.mood === 'seek' && c.targetU !== null && c.targetV !== null) {
      const du = c.targetU - c.u;
      const dv = c.targetV - c.v;
      const d = Math.hypot(du, dv);
      if (d < 0.015 || c.timer <= 0) {
        c.targetU = null;
        c.targetV = null;
        c.mood = 'wave';
        c.timer = 2.0;
        return;
      }
      c.dir = du >= 0 ? 1 : -1;
      const speed = 0.055;
      c.u = clamp(c.u + (du / d) * speed * dt, bounds.minU, bounds.maxU);
      c.v = clamp(c.v + (dv / d) * speed * 0.65 * dt, bounds.minV, bounds.maxV);
      const safe = avoidRadio(c.u, c.v);
      c.u = safe.u;
      return;
    }

    if (c.mood === 'walk') {
      c.u = clamp(c.u + c.dir * 0.02 * dt, bounds.minU, bounds.maxU);
      const safe = avoidRadio(c.u, c.v);
      c.u = safe.u;
      if (c.u <= bounds.minU + 0.002) c.dir = 1;
      if (c.u >= bounds.maxU - 0.002) c.dir = -1;
    }

    if (c.timer <= 0) {
      const r = Math.random();
      if (sceneIndex === SCENE_TIDE_POOLS) {
        c.mood = r < 0.52 ? 'wave' : r < 0.8 ? 'idle' : 'walk';
      } else {
        c.mood = r < 0.42 ? 'idle' : r < 0.76 ? 'walk' : 'wave';
      }
      if (c.mood === 'walk') c.dir = Math.random() < 0.5 ? 1 : -1;
      c.timer = c.mood === 'wave' ? rand(1.5, 2.8) : rand(1.8, 4.2);
    }
  }

  private crabBounds(sceneIndex: number): { minU: number; maxU: number; minV: number; maxV: number } {
    if (sceneIndex === SCENE_HARBOUR) return { minU: 0.79, maxU: 0.85, minV: 0.675, maxV: 0.675 };
    if (sceneIndex === SCENE_TIDE_POOLS) return { minU: 0.70, maxU: 0.79, minV: 0.70, maxV: 0.72 };
    if (sceneIndex === SCENE_COVE) return { minU: 0.66, maxU: 0.88, minV: 0.76, maxV: 0.90 };
    return { minU: 0.09, maxU: 0.90, minV: 0.73, maxV: 0.91 };
  }

  private stepCat(dt: number, w: number, unit: number, pointer: Point | null): void {
    this.cat.clock += dt;
    this.cat.timer -= dt;
    if (pointer && Math.abs(pointer.x - 0.185 * w) < 60 * unit) {
      this.cat.mood = 'watch';
      this.cat.lookDir = pointer.x < 0.185 * w ? -1 : 1;
      return;
    }
    if (this.cat.timer <= 0) {
      const r = Math.random();
      this.cat.mood = r < 0.5 ? 'sit' : r < 0.75 ? 'blink' : 'lick';
      this.cat.timer = this.cat.mood === 'blink' ? 0.22 : rand(2.2, 5.2);
    }
  }

  private stepHeron(dt: number, w: number, h: number, unit: number, pointer: Point | null): void {
    this.heron.clock += dt;
    this.heron.timer -= dt;
    if (pointer && Math.hypot(pointer.x - 0.27 * w, pointer.y - 0.78 * h) < 42 * unit) {
      this.heron.lookDir = pointer.x < 0.27 * w ? -1 : 1;
    } else {
      this.heron.lookDir = 1;
    }
    if (this.heron.timer <= 0) {
      if (this.heron.mood === 'poised') {
        this.heron.mood = 'peer';
        this.heron.timer = rand(1.6, 3.0);
      } else if (this.heron.mood === 'peer') {
        this.heron.mood = Math.random() < 0.45 ? 'strike' : 'poised';
        this.heron.timer = this.heron.mood === 'strike' ? 0.42 : rand(3.0, 5.5);
      } else {
        this.heron.mood = 'poised';
        this.heron.timer = rand(3.0, 6.0);
      }
    }
  }

  private stepTideFish(dt: number, w: number, h: number, unit: number, pointer: Point | null): void {
    for (const f of this.tideFish) {
      f.timer -= dt;
      const minU = f.pool === 0 ? 0.11 : 0.69;
      const maxU = f.pool === 0 ? 0.31 : 0.89;
      if (pointer && Math.hypot(pointer.x - f.u * w, pointer.y - f.v * h) < 26 * unit) {
        f.vx = Math.sign(f.u * w - pointer.x || 1) * 0.065;
        f.timer = 0.8;
      } else if (f.timer <= 0) {
        f.vx = (Math.random() < 0.5 ? -1 : 1) * rand(0.012, 0.028);
        f.vy = rand(-0.008, 0.008);
        f.timer = rand(1.5, 3.8);
      }
      f.u += f.vx * dt;
      f.v += f.vy * dt;
      if (f.u < minU) {
        f.u = minU;
        f.vx = Math.abs(f.vx);
      }
      if (f.u > maxU) {
        f.u = maxU;
        f.vx = -Math.abs(f.vx);
      }
      if (f.v < 0.74) {
        f.v = 0.74;
        f.vy = Math.abs(f.vy);
      }
      if (f.v > 0.87) {
        f.v = 0.87;
        f.vy = -Math.abs(f.vy);
      }
    }
  }

  private stepShoreCrab(sc: ShoreCrab, dt: number, w: number, h: number, unit: number, pointer: Point | null): void {
    sc.clock += dt;
    sc.timer -= dt;
    if (pointer && Math.hypot(pointer.x - sc.u * w, pointer.y - sc.v * h) < STARTLE_RADIUS * unit) {
      sc.mood = 'flee';
      sc.dir = pointer.x < sc.u * w ? 1 : -1;
      sc.timer = 0.7;
    }
    if (sc.mood === 'flee') {
      sc.u = clamp(sc.u + sc.dir * 0.06 * dt, sc.homeU - 0.06, sc.homeU + 0.06);
      if (sc.timer <= 0) {
        sc.mood = 'idle';
        sc.timer = rand(1.5, 3.5);
      }
      return;
    }
    if (sc.mood === 'scuttle') {
      sc.u = clamp(sc.u + sc.dir * 0.018 * dt, sc.homeU - 0.04, sc.homeU + 0.04);
    }
    if (sc.timer <= 0) {
      sc.mood = Math.random() < 0.55 ? 'idle' : 'scuttle';
      if (sc.mood === 'scuttle') sc.dir = sc.u > sc.homeU ? -1 : 1;
      sc.timer = rand(1.5, 3.8);
    }
  }

  private stepDolphins(dt: number): void {
    const anyActive = this.dolphins.some((d) => d.active);
    if (!anyActive) {
      this.dolphinWait -= dt;
      if (this.dolphinWait <= 0) {
        this.dolphinWait = rand(14, 24);
        this.dolphins.forEach((d, idx) => {
          d.active = true;
          d.wait = idx * 0.42;
          d.progress = 0;
          d.startU = 0.42 + idx * 0.045;
        });
      }
      return;
    }
    for (const d of this.dolphins) {
      if (!d.active) continue;
      if (d.wait > 0) {
        d.wait -= dt;
        continue;
      }
      d.progress += dt / d.duration;
      if (d.progress >= 1) {
        d.active = false;
        d.progress = 0;
      }
    }
  }

  /** Draws the classic high-sky pixel gulls (daytime). */
  drawSkyGulls(ctx: CanvasRenderingContext2D, day: number, time: number, w: number, h: number, panX: number): void {
    if (day < 0.5) return;
    ctx.fillStyle = `rgba(36,40,50,${(0.8 * day).toFixed(3)})`;
    for (const g of this.skyGulls) {
      if (g.x < -0.1 || g.x > 1.1) continue;
      const gliding = Math.sin(time * 0.3 + g.flap) > 0.3 && g.hop <= 0;
      const beat = Math.floor((((time * 4 + g.flap) % 4) + 4) % 4);
      const pose = gliding || beat === 3 ? 1 : beat;
      const x = Math.round(g.x * w + panX * 0.25);
      const y = Math.round(g.y * h - g.hop * 3);
      for (const [dx, dy] of SKY_GULL_POSES[pose]) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }

  /** Draws tide-pool tiny fish directly onto water before rocks/land tinting. */
  drawTidePoolFish(ctx: CanvasRenderingContext2D, w: number, h: number, unit: number, sprites: SeasideSprites, panX: number): void {
    for (const f of this.tideFish) {
      const sprite = f.colorIndex === 0 ? sprites.tinyFishA : sprites.tinyFishB;
      drawSprite(
        ctx,
        sprite,
        f.u * w - (sprite.width * unit) / 2 + panX * 0.65,
        f.v * h - (sprite.height * unit) / 2,
        unit,
        f.vx < 0,
      );
    }
  }

  /** Draws surfacing dolphins and splash pixels on water in Sunset Cove. */
  drawDolphins(ctx: CanvasRenderingContext2D, w: number, h: number, unit: number, sprites: SeasideSprites, day: number, panX: number): void {
    for (const d of this.dolphins) {
      if (!d.active || d.wait > 0) continue;
      const t = d.progress;
      const arc = Math.sin(Math.PI * t);
      if (arc < 0.08) continue;
      const sprite = t < 0.5 ? sprites.dolphinUp : sprites.dolphinDive;
      const x = (d.startU + d.spanU * t) * w + panX * 0.45;
      const baseY = 0.625 * h;
      const y = baseY - arc * (baseY - d.peakV * h);
      drawSprite(ctx, sprite, x - (sprite.width * unit) / 2, y - sprite.height * unit, unit, false);
      if (t < 0.2 || t > 0.8) {
        ctx.fillStyle = css([240, 248, 255], 0.4 + 0.5 * day);
        const sx = Math.round(x);
        const sy = Math.round(baseY);
        ctx.fillRect(sx - 3, sy - 1, 2, 1);
        ctx.fillRect(sx + 2, sy - 2, 2, 1);
      }
    }
  }

  /** Draws shore gulls, red crab, cat, heron, and shore crabs onto the offscreen land layer. */
  drawLandCast(
    L: CanvasRenderingContext2D,
    sceneIndex: number,
    w: number,
    h: number,
    unit: number,
    sprites: SeasideSprites,
    panX: number,
    panY: number,
  ): void {
    // Harbour Cat
    if (sceneIndex === SCENE_HARBOUR) {
      const sp =
        this.cat.mood === 'blink'
          ? sprites.catBlink
          : this.cat.mood === 'lick'
            ? sprites.catLick
            : Math.floor(this.cat.clock * 1.6) % 2 === 0
              ? sprites.catSit
              : sprites.catTailWave;
      const cx = 0.185 * w + panX * 0.72;
      const cy = 0.70 * h + panY * 0.5;
      drawSprite(L, sp, cx - (sp.width * unit) / 2, cy - sp.height * unit, unit, this.cat.lookDir < 0);
    }

    // Heron in Tide Pools
    if (sceneIndex === SCENE_TIDE_POOLS) {
      const sp =
        this.heron.mood === 'strike'
          ? sprites.heronStrike
          : this.heron.mood === 'peer'
            ? sprites.heronPeer
            : sprites.heronStand;
      const hx = 0.27 * w + panX * 0.72;
      const hy = 0.785 * h + panY * 0.5;
      L.fillStyle = 'rgba(200,225,240,0.35)';
      L.fillRect(Math.round(hx - 4 * unit), Math.round(hy - 1), Math.round(8 * unit), 1);
      drawSprite(L, sp, hx - (sp.width * unit) / 2, hy - sp.height * unit, unit, this.heron.lookDir < 0);

      for (const sc of this.shoreCrabs) {
        const csp = sc.mood === 'idle' || Math.floor(sc.clock * 6) % 2 === 0 ? sprites.shoreCrabA : sprites.shoreCrabB;
        drawSprite(L, csp, sc.u * w - (csp.width * unit) / 2 + panX * 0.72, sc.v * h - csp.height * unit + panY * 0.5, unit, false);
      }
    }

    // Recurring Red Crab
    const crab = this.crabs.get(sceneIndex);
    if (crab) {
      const sp =
        crab.mood === 'wave'
          ? Math.floor(crab.clock * 3) % 2 === 0
            ? sprites.crabWave
            : sprites.crabIdle
          : crab.mood === 'walk' || crab.mood === 'seek' || crab.mood === 'flee'
            ? Math.floor(crab.clock * (crab.mood === 'flee' ? 12 : 7)) % 2 === 0
              ? sprites.crabWalkA
              : sprites.crabWalkB
            : sprites.crabIdle;
      const x = crab.u * w + panX * 0.72;
      const y = crab.v * h + panY * 0.5 - crab.hopOffset;
      L.fillStyle = 'rgba(0,0,0,0.22)';
      L.fillRect(Math.round(x - 5 * unit), Math.round(crab.v * h + panY * 0.5 - 1), Math.round(10 * unit), 1);
      drawSprite(L, sp, x - (sp.width * unit) / 2, y - sp.height * unit, unit, crab.dir < 0);
    }

    // Shore / Perched Gulls
    const gulls = this.shoreGulls.get(sceneIndex);
    if (gulls) {
      for (const g of gulls) {
        if (g.state === 'fly') {
          const sp = Math.floor(g.clock * 8) % 2 === 0 ? sprites.gullFlyA : sprites.gullFlyB;
          drawSprite(L, sp, g.u * w - (sp.width * unit) / 2 + panX * 0.72, g.flyY * h - sp.height * unit, unit, g.dir < 0);
          continue;
        }
        const hopLift = g.state === 'hop' ? Math.sin((g.clock / 0.55) * Math.PI) * 7 * unit : 0;
        const sp = g.state === 'hop' ? sprites.gullHop : g.state === 'peck' && Math.floor(g.clock * 4) % 2 === 0 ? sprites.gullPeck : sprites.gullStand;
        const gx = g.u * w + panX * 0.72;
        const gy = g.v * h + panY * 0.5 - hopLift;
        drawSprite(L, sp, gx - (sp.width * unit) / 2, gy - sp.height * unit, unit, g.dir < 0);
      }
    }
  }
}
