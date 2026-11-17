import { clamp, rand } from '../../../world/math';
import type { FishingSprites, SpriteBox } from './sprites';
import type { PointerDesign, SceneIndex, SceneLayout } from './types';

export interface RippleTrigger {
  x: number;
  y: number;
  maxR: number;
  bright?: boolean;
}

type BirdMood = 'perch' | 'look' | 'stalk' | 'strike' | 'fly' | 'returning';

interface BirdEntity {
  kind: 'heron' | 'kingfisher' | 'gull' | 'duck';
  scene: SceneIndex;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  mood: BirdMood;
  timer: number;
  phase: number;
}

interface FishShadow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSpeed: number;
  len: number;
  fleeTimer: number;
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

interface RisingFish {
  x: number;
  y: number;
  timer: number;
  flash: number;
}

const BIRD_CLICK_RADIUS = 18;
const FISH_COUNT = 7;
const FISH_FLEE_SPEED_THRESHOLD = 85;
const FISH_FLEE_RADIUS = 46;
const MOTH_COUNT = 8;
const FIREFLY_COUNT = 18;
const RISING_FISH_COUNT = 4;

/** Draws a sprite with its bottom-centre at design coordinates `(dx, dy)`, snapped to stage pixels. */
export function drawBoxBottom(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteBox,
  dx: number,
  dy: number,
  unit: number,
): void {
  const sw = Math.max(1, Math.round(sprite.w * unit));
  const sh = Math.max(1, Math.round(sprite.h * unit));
  ctx.drawImage(sprite.canvas, 0, 0, sprite.w, sprite.h, Math.round(dx * unit - sw / 2), Math.round(dy * unit - sh), sw, sh);
}

/** Coordinates all birds, fish shadows, moths, rising fish, and fireflies across the five scenes. */
export class FishingCreatures {
  private readonly birds: BirdEntity[] = [];
  private readonly fishShadows: FishShadow[] = [];
  private readonly moths: Moth[] = [];
  private readonly fireflies: Firefly[] = [];
  private readonly risingFish: RisingFish[] = [];
  private seeded = false;

  /** Initializes or updates home anchors when the stage resizes. */
  syncLayout(layout: SceneLayout): void {
    const rZone = layout.rightZone;
    const jRight = layout.jettyRight;

    if (!this.seeded) {
      this.seeded = true;
      // Scene 0: two calm pond ducks
      this.birds.push(this.makeBird('duck', 0, rZone + 48, 184, -1), this.makeBird('duck', 0, rZone + 74, 188, -1));
      // Scene 1: heron stalking in shallows + kingfisher on weathered post
      this.birds.push(this.makeBird('heron', 1, rZone + 96, 214, -1), this.makeBird('kingfisher', 1, rZone + 34, 184, -1));
      // Scene 2: ducks trailing the morning rowboat
      this.birds.push(this.makeBird('duck', 2, rZone + 112, 189, -1));
      // Scene 3: a gull perched on every pier and mooring post
      const postXs = [28, Math.round(jRight * 0.56), Math.round(jRight - 8), rZone + 36, rZone + 110];
      for (let i = 0; i < postXs.length; i++) {
        this.birds.push(this.makeBird('gull', 3, postXs[i] ?? 28, i < 3 ? layout.deckY - 14 : 186, i < 2 ? 1 : -1));
      }

      // Scene 1 fish shadows in open clear water
      for (let i = 0; i < FISH_COUNT; i++) {
        this.fishShadows.push({
          x: 135 + ((i * 37) % 210),
          y: 168 + ((i * 19) % 72),
          vx: (i % 2 === 0 ? 1 : -1) * rand(6, 11),
          vy: rand(-1.5, 1.5),
          baseSpeed: rand(6, 11),
          len: 10 + (i % 3) * 3,
          fleeTimer: 0,
          phase: rand(0, 6.28),
        });
      }

      // Scene 4 moths orbiting the jetty lantern
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

      // Night / dusk fireflies over the reed banks
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

      // Scene 4 rising fish spots near the lantern water glow
      for (let i = 0; i < RISING_FISH_COUNT; i++) {
        this.risingFish.push({
          x: i < 2 ? jRight - 4 + i * 26 : rZone + 12 + i * 18,
          y: 186 + (i % 2) * 18,
          timer: rand(1.5, 6.5),
          flash: 0,
        });
      }
      return;
    }

    // Update bird home positions cleanly if viewport width changes.
    let duck0 = 0;
    let gullIdx = 0;
    const gullXs = [28, Math.round(jRight * 0.56), Math.round(jRight - 8), rZone + 36, rZone + 110];
    for (const b of this.birds) {
      if (b.scene === 0 && b.kind === 'duck') { b.homeX = rZone + (duck0 === 0 ? 48 : 74); duck0++; }
      else if (b.scene === 1 && b.kind === 'heron') b.homeX = rZone + 96;
      else if (b.scene === 1 && b.kind === 'kingfisher') b.homeX = rZone + 34;
      else if (b.scene === 2 && b.kind === 'duck') b.homeX = rZone + 112;
      else if (b.scene === 3 && b.kind === 'gull') {
        b.homeX = gullXs[gullIdx] ?? rZone + 36;
        b.homeY = gullIdx < 3 ? layout.deckY - 14 : 186;
        gullIdx++;
      }
      if (b.mood !== 'fly' && b.mood !== 'returning') {
        b.x = clamp(b.x, 12, layout.designW - 12);
        if (b.kind === 'gull' || b.kind === 'kingfisher') {
          b.x = b.homeX;
          b.y = b.homeY;
        }
      }
    }
  }

  private makeBird(kind: BirdEntity['kind'], scene: SceneIndex, homeX: number, homeY: number, dir: 1 | -1): BirdEntity {
    return {
      kind,
      scene,
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      vx: 0,
      vy: 0,
      dir,
      mood: kind === 'heron' ? 'stalk' : 'perch',
      timer: rand(2.5, 6),
      phase: rand(0, 6.28),
    };
  }

  /** Attempts to startle a visible bird in the active scene when clicked. */
  tryStartleBird(
    dx: number,
    dy: number,
    scene: SceneIndex,
    layout: SceneLayout,
    onRipple: (r: RippleTrigger) => void,
  ): boolean {
    for (const b of this.birds) {
      if (b.scene !== scene || b.mood === 'fly' || b.mood === 'returning') continue;
      const hitY = b.y - (b.kind === 'heron' ? 11 : 6);
      if (Math.hypot(dx - b.x, dy - hitY) <= BIRD_CLICK_RADIUS) {
        b.mood = 'fly';
        b.dir = dx < b.x ? 1 : -1;
        b.vx = b.dir * rand(38, 56);
        b.vy = -rand(24, 34);
        b.timer = rand(8, 12);
        if (b.kind === 'heron' || b.kind === 'duck') {
          onRipple({ x: b.x, y: b.y, maxR: 13, bright: true });
        }
        return true;
      }
    }
    // In Scene 2, clicking the ducklings right behind the mother duck also startles the mother duck.
    if (scene === 2) {
      const mother = this.birds.find((b) => b.scene === 2 && b.kind === 'duck');
      if (mother && mother.mood !== 'fly' && mother.mood !== 'returning') {
        if (Math.hypot(dx - (mother.x + 14), dy - (mother.y - 4)) <= BIRD_CLICK_RADIUS && mother.x < layout.designW) {
          mother.mood = 'fly';
          mother.dir = 1;
          mother.vx = rand(38, 52);
          mother.vy = -rand(22, 30);
          mother.timer = rand(8, 12);
          onRipple({ x: mother.x + 10, y: mother.y, maxR: 12, bright: true });
          return true;
        }
      }
    }
    return false;
  }

  update(
    dt: number,
    time: number,
    scene: SceneIndex,
    layout: SceneLayout,
    pointer: PointerDesign | null,
    rowboatX: number,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    this.stepBirds(dt, time, scene, layout, rowboatX, onRipple);
    this.stepFishShadows(dt, time, scene, layout, pointer, onRipple);
    this.stepMoths(dt, scene, layout, pointer);
    this.stepRisingFish(dt, scene, onRipple);
    this.stepFireflies(dt, layout);
  }

  private stepBirds(
    dt: number,
    time: number,
    scene: SceneIndex,
    layout: SceneLayout,
    rowboatX: number,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    for (const b of this.birds) {
      // Keep Scene 2 trailing duck anchored near the moving rowboat when perched/swimming.
      if (b.scene === 2 && b.kind === 'duck') {
        b.homeX = rowboatX + 42;
      }

      if (b.mood === 'fly') {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.vy += 4 * dt;
        b.timer -= dt;
        if (b.timer <= 0) {
          b.mood = 'returning';
          b.x = b.homeX + (b.dir > 0 ? -160 : 160);
          b.y = Math.max(40, b.homeY - 68);
        }
        continue;
      }

      if (b.mood === 'returning') {
        const dx = b.homeX - b.x;
        const dy = b.homeY - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          b.x = b.homeX;
          b.y = b.homeY;
          b.mood = b.kind === 'heron' ? 'stalk' : 'perch';
          b.timer = rand(3, 7);
          if (b.kind === 'duck' || b.kind === 'heron') {
            onRipple({ x: b.x, y: b.y, maxR: 10 });
          }
        } else {
          const speed = 46;
          b.dir = dx >= 0 ? 1 : -1;
          b.x += (dx / dist) * speed * dt;
          b.y += (dy / dist) * speed * dt;
        }
        continue;
      }

      if (b.scene !== scene) continue;

      b.timer -= dt;
      if (b.kind === 'heron') {
        if (b.mood === 'stalk') {
          b.x += b.dir * 3.2 * dt;
          if (b.x < layout.rightZone + 65) b.dir = 1;
          if (b.x > layout.designW - 22) b.dir = -1;
        }
        if (b.timer <= 0) {
          if (b.mood === 'stalk') {
            b.mood = 'look';
            b.timer = rand(2.2, 4.5);
          } else if (b.mood === 'look') {
            b.mood = 'strike';
            b.timer = 0.55;
            onRipple({ x: b.x + b.dir * 8, y: b.y + 1, maxR: 10, bright: true });
          } else {
            b.mood = 'stalk';
            b.timer = rand(3, 6);
          }
        }
      } else if (b.kind === 'duck') {
        if (b.scene === 0) {
          b.x += Math.sin(time * 0.35 + b.phase) * 3.5 * dt;
          b.dir = Math.cos(time * 0.35 + b.phase) >= 0 ? 1 : -1;
        } else {
          b.x += (b.homeX - b.x) * Math.min(1, dt * 2.5);
          b.dir = -1;
        }
      } else {
        // Kingfisher or gull perched on a post: occasional head turn
        if (b.timer <= 0) {
          b.mood = b.mood === 'perch' ? 'look' : 'perch';
          if (b.kind === 'kingfisher' && Math.random() < 0.35) b.dir = b.dir === 1 ? -1 : 1;
          b.timer = rand(2.2, 5.5);
        }
      }
    }
  }

  private stepFishShadows(
    dt: number,
    time: number,
    scene: SceneIndex,
    layout: SceneLayout,
    pointer: PointerDesign | null,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    if (scene !== 1 && scene !== 0) return;
    const minX = layout.jettyRight - 20;
    const maxX = layout.designW - 24;
    const minY = layout.waterTopY + 14;
    const maxY = layout.designH - 22;

    for (const f of this.fishShadows) {
      if (f.fleeTimer > 0) f.fleeTimer = Math.max(0, f.fleeTimer - dt);

      if (pointer && pointer.speed > FISH_FLEE_SPEED_THRESHOLD) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < FISH_FLEE_RADIUS && dist > 0.5) {
          const fleeSpeed = 48;
          f.vx = (dx / dist) * fleeSpeed;
          f.vy = (dy / dist) * fleeSpeed * 0.55;
          if (f.fleeTimer <= 0.05) {
            onRipple({ x: f.x, y: f.y, maxR: 8 });
          }
          f.fleeTimer = 1.4;
        }
      }

      if (f.fleeTimer <= 0) {
        // Ease gently back to calm cruising
        const targetVx = Math.sign(f.vx || 1) * f.baseSpeed;
        f.vx += (targetVx - f.vx) * Math.min(1, dt * 2.2);
        f.vy += (Math.sin(time * 0.7 + f.phase) * 1.6 - f.vy) * Math.min(1, dt * 2.5);
      }

      f.x += f.vx * dt;
      f.y += f.vy * dt;

      if (f.x < minX) {
        f.x = minX;
        f.vx = Math.abs(f.vx);
      } else if (f.x > maxX) {
        f.x = maxX;
        f.vx = -Math.abs(f.vx);
      }
      if (f.y < minY) {
        f.y = minY;
        f.vy = Math.abs(f.vy);
      } else if (f.y > maxY) {
        f.y = maxY;
        f.vy = -Math.abs(f.vy);
      }
    }
  }

  private stepMoths(dt: number, scene: SceneIndex, layout: SceneLayout, pointer: PointerDesign | null): void {
    if (scene !== 4) return;
    const lx = layout.jettyRight - 18;
    const ly = layout.deckY - 12;
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

  private stepRisingFish(dt: number, scene: SceneIndex, onRipple: (r: RippleTrigger) => void): void {
    if (scene !== 4) return;
    for (const rf of this.risingFish) {
      if (rf.flash > 0) rf.flash = Math.max(0, rf.flash - dt);
      rf.timer -= dt;
      if (rf.timer <= 0) {
        rf.timer = rand(3.5, 8.0);
        rf.flash = 0.7;
        onRipple({ x: rf.x, y: rf.y, maxR: 11, bright: true });
      }
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

  /** Draws underwater fish shadows before surface structures and birds. */
  drawFishShadows(ctx: CanvasRenderingContext2D, scene: SceneIndex, unit: number, day: number): void {
    if (scene !== 1) return;
    const alpha = 0.22 + 0.16 * day;
    ctx.fillStyle = `rgba(12,26,30,${alpha.toFixed(3)})`;
    const dot = Math.max(1, Math.round(unit));
    for (const f of this.fishShadows) {
      const fx = Math.round(f.x * unit);
      const fy = Math.round(f.y * unit);
      const dir = f.vx >= 0 ? 1 : -1;
      const bodyLen = Math.round(f.len * unit);
      // Tapered fish silhouette: thicker head/body, narrow tail
      ctx.fillRect(fx - Math.round(bodyLen * 0.4), fy, bodyLen, dot * 2);
      ctx.fillRect(fx - Math.round(bodyLen * 0.2), fy - dot, Math.round(bodyLen * 0.45), dot);
      ctx.fillRect(fx - dir * Math.round(bodyLen * 0.55), fy - dot, dot * 2, dot * 4);
    }
  }

  /** Draws perched, wading, swimming, and flying birds for a scene. */
  drawBirds(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    scene: SceneIndex,
    time: number,
    unit: number,
  ): void {
    const dot = Math.max(1, Math.round(unit));
    for (const b of this.birds) {
      if (b.scene !== scene) continue;

      if (b.mood === 'fly' || b.mood === 'returning') {
        const wingUp = Math.floor(time * 6 + b.phase) % 2 === 0;
        let pair = wingUp ? sprites.gullFlyA : sprites.gullFlyB;
        if (b.kind === 'heron') pair = wingUp ? sprites.heronFlyA : sprites.heronFlyB;
        else if (b.kind === 'kingfisher') pair = wingUp ? sprites.kingfisherFlyA : sprites.kingfisherFlyB;
        else if (b.kind === 'duck') pair = wingUp ? sprites.duckFlyA : sprites.duckFlyB;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        drawBoxBottom(ctx, sp, b.x, b.y, unit);
        continue;
      }

      if (b.kind === 'heron') {
        const bob = b.mood === 'stalk' ? Math.sin(time * 2.2) * 0.6 : 0;
        const pair = b.mood === 'strike' ? sprites.heronStrike : sprites.heronStill;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        drawBoxBottom(ctx, sp, b.x, b.y + bob, unit);
        // Shallow water ring around heron legs
        ctx.fillStyle = 'rgba(220,242,248,0.42)';
        ctx.fillRect(Math.round((b.x - 4) * unit), Math.round(b.y * unit), Math.round(8 * unit), dot);
      } else if (b.kind === 'kingfisher') {
        const sp = b.dir >= 0 ? sprites.kingfisher.right : sprites.kingfisher.left;
        drawBoxBottom(ctx, sp, b.x, b.y, unit);
      } else if (b.kind === 'gull') {
        const pair = b.mood === 'look' ? sprites.gullLook : sprites.gullPerch;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        drawBoxBottom(ctx, sp, b.x, b.y, unit);
      } else {
        const paddle = Math.floor(time * 2.2 + b.phase) % 2 === 0;
        const pair = paddle ? sprites.duckMotherA : sprites.duckMotherB;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        const bob = Math.sin(time * 1.8 + b.phase) * 0.5;
        drawBoxBottom(ctx, sp, b.x, b.y + bob, unit);
        ctx.fillStyle = 'rgba(235,248,255,0.4)';
        ctx.fillRect(Math.round((b.x - 7) * unit), Math.round((b.y + bob) * unit), Math.round(14 * unit), dot);

        // Ducklings follow closely behind the mother duck in Scene 2
        if (b.scene === 2) {
          for (let d = 0; d < 3; d++) {
            const dx = b.x + 12 + d * 10;
            const dy = b.y + 1 + Math.sin(time * 2.4 + d * 1.3) * 0.5;
            const dsp = sprites.duckling.left;
            drawBoxBottom(ctx, dsp, dx, dy, unit);
          }
        }
      }
    }
  }

  /** Draws post-tint moths, rising fish glints, and fireflies so glows stay luminous. */
  drawNightAndGlowLife(
    ctx: CanvasRenderingContext2D,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    day: number,
  ): void {
    const u = layout.unit;
    const dot = Math.max(1, Math.round(u));

    if (scene === 4) {
      const lx = layout.jettyRight - 18;
      const ly = layout.deckY - 12;
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

      for (const rf of this.risingFish) {
        if (rf.flash <= 0) continue;
        const k = Math.sin((rf.flash / 0.7) * Math.PI);
        const rx = Math.round(rf.x * u);
        const ry = Math.round((rf.y - k * 4) * u);
        ctx.fillStyle = `rgba(220,236,248,${(0.85 * k).toFixed(3)})`;
        ctx.fillRect(rx - dot, ry, dot * 3, dot * 2);
        ctx.fillStyle = `rgba(255,222,148,${(0.65 * k).toFixed(3)})`;
        ctx.fillRect(rx, ry, dot, dot);
      }
    }

    const nightFactor = scene === 4 ? Math.max(0.55, 1 - day) : Math.max(0, (1 - day - 0.35) / 0.65);
    if (nightFactor > 0.05) {
      for (const f of this.fireflies) {
        const glow = Math.max(0, Math.sin(time * f.speed + f.phase)) ** 3 * nightFactor;
        if (glow < 0.08) continue;
        const fx = Math.round(f.x * u);
        const fy = Math.round(f.y * u);
        ctx.fillStyle = `rgba(230,255,140,${(0.18 * glow).toFixed(3)})`;
        ctx.fillRect(fx - dot, fy - dot, dot * 3, dot * 3);
        ctx.fillStyle = `rgba(245,255,175,${glow.toFixed(3)})`;
        ctx.fillRect(fx, fy, dot, dot);
      }
    }
  }
}
