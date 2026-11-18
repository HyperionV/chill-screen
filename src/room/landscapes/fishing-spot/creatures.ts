import { clamp, rand } from '../../../world/math';
import { AmbientLakeLife } from './ambient-life';
import type { FishingSprites, SpriteBox } from './sprites';
import type { PointerDesign, SceneIndex, SceneLayout } from './types';

export interface RippleTrigger {
  x: number;
  y: number;
  maxR: number;
  bright?: boolean;
}

type BirdMood = 'perch' | 'look' | 'stalk' | 'strike' | 'spread' | 'fly' | 'returning';

interface BirdEntity {
  kind: 'heron' | 'kingfisher' | 'gull' | 'duck' | 'cormorant' | 'swallow';
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
  wakeTimer: number;
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

const BIRD_CLICK_RADIUS = 18;
const FISH_COUNT = 8;
const FISH_FLEE_SPEED_THRESHOLD = 85;
const FISH_FLEE_RADIUS = 46;
const DUCK_WAKE_INTERVAL = 0.45;
const ROWBOAT_WAKE_INTERVAL = 0.55;
// Include the horizontal camera glide when deciding whether to skip a sprite.
const SPRITE_EDGE_MARGIN = 24;

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
  const x = Math.round(dx * unit - sw / 2);
  const y = Math.round(dy * unit - sh);
  const margin = SPRITE_EDGE_MARGIN * unit;
  if (x + sw < -margin || x >= ctx.canvas.width + margin || y + sh < 0 || y >= ctx.canvas.height) return;
  ctx.drawImage(sprite.canvas, 0, 0, sprite.w, sprite.h, x, y, sw, sh);
}

/** Coordinates all birds, fish shadows, and ambient lake life across the five scenes. */
export class FishingCreatures {
  private readonly birds: BirdEntity[] = [];
  private readonly fishShadows: FishShadow[] = [];
  private readonly ambient = new AmbientLakeLife();
  private rowboatWakeTimer = 0;
  private prevRowboatX = 0;
  private seeded = false;

  /** Initializes or updates home anchors when the stage resizes. */
  syncLayout(layout: SceneLayout): void {
    const rZone = layout.rightZone;
    const jRight = layout.jettyRight;

    this.ambient.syncLayout(layout);

    if (!this.seeded) {
      this.seeded = true;
      // Scene 0: two pond ducks + cormorant on far-right snag post
      this.birds.push(
        this.makeBird('duck', 0, rZone + 56, 184, -1),
        this.makeBird('duck', 0, rZone + 84, 189, -1),
        this.makeBird('cormorant', 0, rZone + 128, 194, -1),
      );
      // Scene 1: heron stalking in shallows + kingfisher on post + swallow on far reed post
      this.birds.push(
        this.makeBird('heron', 1, rZone + 96, 214, -1),
        this.makeBird('kingfisher', 1, rZone + 34, 184, -1),
        this.makeBird('swallow', 1, rZone + 126, 192, -1),
      );
      // Scene 2: ducks trailing the morning rowboat + swallow on reed post
      this.birds.push(
        this.makeBird('duck', 2, rZone + 112, 189, -1),
        this.makeBird('swallow', 2, rZone + 18, 188, -1),
      );
      // Scene 3: a gull perched on every pier and mooring post
      const postXs = [28, Math.round(jRight * 0.56), Math.round(jRight - 8), rZone + 36, rZone + 110];
      for (let i = 0; i < postXs.length; i++) {
        this.birds.push(this.makeBird('gull', 3, postXs[i] ?? 28, i < 3 ? layout.deckY - 14 : 186, i < 2 ? 1 : -1));
      }
      // Scene 4: quiet night cormorant perched on right mooring post
      this.birds.push(this.makeBird('cormorant', 4, rZone + 22, 190, -1));

      // Underwater fish shadows in clear water
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
      return;
    }

    let duck0 = 0;
    let gullIdx = 0;
    const gullXs = [28, Math.round(jRight * 0.56), Math.round(jRight - 8), rZone + 36, rZone + 110];
    for (const b of this.birds) {
      if (b.scene === 0 && b.kind === 'duck') {
        b.homeX = rZone + (duck0 === 0 ? 56 : 84);
        duck0++;
      } else if (b.scene === 0 && b.kind === 'cormorant') b.homeX = rZone + 128;
      else if (b.scene === 1 && b.kind === 'heron') b.homeX = rZone + 96;
      else if (b.scene === 1 && b.kind === 'kingfisher') b.homeX = rZone + 34;
      else if (b.scene === 1 && b.kind === 'swallow') b.homeX = rZone + 126;
      else if (b.scene === 2 && b.kind === 'duck') b.homeX = rZone + 112;
      else if (b.scene === 2 && b.kind === 'swallow') b.homeX = rZone + 18;
      else if (b.scene === 3 && b.kind === 'gull') {
        b.homeX = gullXs[gullIdx] ?? rZone + 36;
        b.homeY = gullIdx < 3 ? layout.deckY - 14 : 186;
        gullIdx++;
      } else if (b.scene === 4 && b.kind === 'cormorant') b.homeX = rZone + 22;

      if (b.mood !== 'fly' && b.mood !== 'returning') {
        b.x = clamp(b.x, 12, layout.designW - 12);
        if (b.kind === 'gull' || b.kind === 'kingfisher' || b.kind === 'cormorant' || b.kind === 'swallow') {
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
      wakeTimer: rand(0, DUCK_WAKE_INTERVAL),
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
    day: number,
    pointer: PointerDesign | null,
    rowboatX: number,
    onRipple: (r: RippleTrigger) => void,
  ): void {
    this.stepBirds(dt, time, scene, layout, rowboatX, onRipple);
    this.stepFishShadows(dt, time, scene, layout, pointer, onRipple);
    if (scene === 2) {
      this.rowboatWakeTimer -= dt;
      if (this.rowboatWakeTimer <= 0) {
        this.rowboatWakeTimer = ROWBOAT_WAKE_INTERVAL;
        const movingDir = rowboatX >= this.prevRowboatX ? -1 : 1;
        this.ambient.emitWake(rowboatX + movingDir * 22, 189, true);
      }
      this.prevRowboatX = rowboatX;
    }
    this.ambient.update(dt, time, scene, layout, day, pointer, onRipple);
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
          const vx = Math.cos(time * 0.35 + b.phase) * 3.5;
          b.x += vx * dt;
          b.dir = vx >= 0 ? 1 : -1;
        } else {
          b.x += (b.homeX - b.x) * Math.min(1, dt * 2.5);
          b.dir = -1;
        }
        b.wakeTimer -= dt;
        if (b.wakeTimer <= 0) {
          b.wakeTimer = DUCK_WAKE_INTERVAL;
          this.ambient.emitWake(b.x - b.dir * 7, b.y, false);
        }
      } else if (b.kind === 'cormorant') {
        if (b.timer <= 0) {
          b.mood = b.mood === 'perch' ? 'spread' : 'perch';
          b.timer = rand(3.5, 7.0);
        }
      } else {
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
    if (scene === 4) return;
    const minX = layout.jettyRight - 14;
    const maxX = Math.max(minX + 40, layout.designW - 24);
    const minY = layout.waterTopY + 14;
    const maxY = 196;

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

  /** Draws underwater fish shadows before surface structures and birds. */
  drawFishShadows(ctx: CanvasRenderingContext2D, scene: SceneIndex, unit: number, day: number): void {
    if (scene === 4 || day < 0.15) return;
    const visibility = scene === 1 ? 1 : 0.48;
    const alpha = (0.18 + 0.16 * day) * visibility;
    ctx.fillStyle = `rgba(12,26,30,${alpha.toFixed(3)})`;
    const dot = Math.max(1, Math.round(unit));
    for (const f of this.fishShadows) {
      const fx = Math.round(f.x * unit);
      const fy = Math.round(f.y * unit);
      const dir = f.vx >= 0 ? 1 : -1;
      const bodyLen = Math.round(f.len * unit);
      ctx.fillRect(fx - Math.round(bodyLen * 0.4), fy, bodyLen, dot * 2);
      ctx.fillRect(fx - Math.round(bodyLen * 0.2), fy - dot, Math.round(bodyLen * 0.45), dot);
      ctx.fillRect(fx - dir * Math.round(bodyLen * 0.55), fy - dot, dot * 2, dot * 4);
    }
  }

  /** Draws wake trails, floating leaves, and jumping fish on the water surface. */
  drawSurfaceLife(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    day: number,
  ): void {
    this.ambient.drawSurfaceLife(ctx, sprites, time, layout.unit, day);
    this.ambient.drawBayDucks(ctx, sprites, scene, layout, time);
  }

  /** Draws perched, wading, swimming, and flying birds plus dragonflies for a scene. */
  drawBirdsAndInsects(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    scene: SceneIndex,
    time: number,
    unit: number,
    day: number,
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
        else if (b.kind === 'cormorant') pair = wingUp ? sprites.cormorantFlyA : sprites.cormorantFlyB;
        else if (b.kind === 'swallow') pair = wingUp ? sprites.swallowFlyA : sprites.swallowFlyB;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        drawBoxBottom(ctx, sp, b.x, b.y, unit);
        continue;
      }

      if (b.kind === 'heron') {
        const bob = b.mood === 'stalk' ? Math.sin(time * 2.2) * 0.6 : 0;
        const pair = b.mood === 'strike' ? sprites.heronStrike : sprites.heronStill;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        drawBoxBottom(ctx, sp, b.x, b.y + bob, unit);
        ctx.fillStyle = 'rgba(220,242,248,0.42)';
        ctx.fillRect(Math.round((b.x - 4) * unit), Math.round(b.y * unit), Math.round(8 * unit), dot);
      } else if (b.kind === 'kingfisher') {
        const sp = b.dir >= 0 ? sprites.kingfisher.right : sprites.kingfisher.left;
        drawBoxBottom(ctx, sp, b.x, b.y, unit);
      } else if (b.kind === 'cormorant') {
        const pair = b.mood === 'spread' ? sprites.cormorantSpread : sprites.cormorantStill;
        const sp = b.dir >= 0 ? pair.right : pair.left;
        drawBoxBottom(ctx, sp, b.x, b.y, unit);
      } else if (b.kind === 'swallow') {
        const sp = b.dir >= 0 ? sprites.swallow.right : sprites.swallow.left;
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

        if (b.scene === 2) {
          for (let d = 0; d < 3; d++) {
            const dx = b.x + 12 + d * 10;
            const dy = b.y + 1 + Math.sin(time * 2.4 + d * 1.3) * 0.5;
            drawBoxBottom(ctx, sprites.duckling.left, dx, dy, unit);
          }
        }
      }
    }

    this.ambient.drawDragonflies(ctx, sprites, time, unit, day);
  }

  /** Draws post-tint moths and layered dithered fireflies. */
  drawNightAndGlowLife(
    ctx: CanvasRenderingContext2D,
    sprites: FishingSprites,
    scene: SceneIndex,
    layout: SceneLayout,
    time: number,
    day: number,
  ): void {
    this.ambient.drawNightAndGlowLife(ctx, sprites, scene, layout, time, day);
  }
}
