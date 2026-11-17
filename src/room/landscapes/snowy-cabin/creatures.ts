import { rand } from '../../../world/math';
import type { Atmosphere } from './atmosphere';
import type { CreatureSprites, DirSprite, SpriteBox } from './creature-sprites';
import { FoxActor } from './fox';
import { pointInBox, type HitBox, type SceneId } from './scenes';

type SkaterMood = 'glide' | 'spin' | 'wave';
type SledPhase = 'ride' | 'cheer' | 'climb';
type MooseMood = 'stand' | 'browse' | 'alert';
type ReindeerMood = 'watch' | 'graze';

interface OwlState {
  perchX: number;
  perchY: number;
  gliding: boolean;
  glideT: number;
  x: number;
  y: number;
  dir: 1 | -1;
  blinkTimer: number;
  blinkAge: number;
}

interface SkaterState {
  phase: number;
  x: number;
  y: number;
  dir: 1 | -1;
  mood: SkaterMood;
  timer: number;
  breathTimer: number;
}

interface SleddersState {
  phase: SledPhase;
  t: number;
  timer: number;
  x: number;
  y: number;
  dogX: number;
  dogY: number;
  dogDir: 1 | -1;
  dogBounce: number;
  reactTimer: number;
  breathTimer: number;
}

interface MooseState {
  x: number;
  y: number;
  dir: 1 | -1;
  mood: MooseMood;
  timer: number;
  breathTimer: number;
}

interface ReindeerState {
  x: number;
  y: number;
  dir: 1 | -1;
  mood: ReindeerMood;
  timer: number;
  reactTimer: number;
  breathTimer: number;
}

export interface DrawItem {
  y: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const SKATER_LOOP_SPEED = 0.24;
const SLED_RIDE_SECONDS = 5.5;
const SLED_CLIMB_SECONDS = 9.0;

/** Draws a sprite with bottom-centre at (x, y), snapped to whole stage pixels. */
function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: SpriteBox,
  x: number,
  y: number,
  unit: number,
  shadow = true,
): void {
  const dw = Math.max(1, Math.round(sprite.w * unit));
  const dh = Math.max(1, Math.round(sprite.h * unit));
  const dx = Math.round(x - dw / 2);
  const dy = Math.round(y - dh);
  if (shadow) {
    ctx.fillStyle = 'rgba(24,38,66,0.22)';
    ctx.fillRect(dx + Math.round(dw * 0.15), Math.round(y) - 1, Math.round(dw * 0.7), Math.max(1, Math.round(unit)));
  }
  ctx.drawImage(sprite.canvas, dx, dy, dw, dh);
}

function pickDir(ds: DirSprite, dir: 1 | -1): SpriteBox {
  return dir >= 0 ? ds.right : ds.left;
}

/** Manages all scene wildlife and people, plus click interactions. */
export class Creatures {
  private w = 0;
  private h = 0;
  private unit = 1;
  private activeScene: SceneId = 'clearing';
  private readonly fox = new FoxActor();

  private readonly owl: OwlState = {
    perchX: 0,
    perchY: 0,
    gliding: false,
    glideT: 0,
    x: 0,
    y: 0,
    dir: -1,
    blinkTimer: 3.5,
    blinkAge: 0,
  };

  private readonly skater: SkaterState = {
    phase: 0,
    x: 0,
    y: 0,
    dir: 1,
    mood: 'glide',
    timer: 14,
    breathTimer: 3,
  };

  private readonly sledders: SleddersState = {
    phase: 'ride',
    t: 0.1,
    timer: 0,
    x: 0,
    y: 0,
    dogX: 0,
    dogY: 0,
    dogDir: 1,
    dogBounce: 0,
    reactTimer: 0,
    breathTimer: 2.5,
  };

  private readonly moose: MooseState = {
    x: 0,
    y: 0,
    dir: -1,
    mood: 'browse',
    timer: 5,
    breathTimer: 4,
  };

  private readonly reindeer: ReindeerState = {
    x: 0,
    y: 0,
    dir: -1,
    mood: 'watch',
    timer: 6,
    reactTimer: 0,
    breathTimer: 3.5,
  };

  resize(w: number, h: number, unit: number): void {
    this.w = w;
    this.h = h;
    this.unit = unit;
    if (w <= 0 || h <= 0) return;

    this.owl.perchX = w * 0.84;
    this.owl.perchY = h * 0.56;
    this.owl.gliding = false;

    this.skater.x = w * (0.5 + 0.31 * Math.sin(this.skater.phase));
    this.skater.y = h * (0.695 + 0.025 * Math.sin(this.skater.phase * 2));

    const ease = this.sledders.t * this.sledders.t * (3 - 2 * this.sledders.t);
    this.sledders.x = w * (0.12 + 0.72 * ease);
    this.sledders.y = h * (0.63 + 0.16 * ease);
    this.sledders.dogX = this.sledders.x - 18 * unit;
    this.sledders.dogY = this.sledders.y + 2 * unit;

    this.moose.x = w * 0.77;
    this.moose.y = h * 0.79;
    this.reindeer.x = w * 0.78;
    this.reindeer.y = h * 0.80;

    this.fox.place(w, h, this.activeScene);
  }

  /** Updates all cast active in `scene`. */
  update(
    dt: number,
    time: number,
    scene: SceneId,
    pointer: { x: number; y: number } | null,
    atmosphere: Atmosphere,
  ): void {
    this.activeScene = scene;
    this.fox.update(dt, this.w, this.h, this.unit, scene, atmosphere);

    if (scene === 'pond') {
      this.stepOwl(dt);
      this.stepSkater(dt, atmosphere);
    } else if (scene === 'sled') {
      this.stepSledders(dt, time, atmosphere);
    } else if (scene === 'chimney') {
      this.stepMoose(dt, pointer, atmosphere);
    } else if (scene === 'aurora') {
      this.stepReindeer(dt, atmosphere);
    }
  }

  private stepOwl(dt: number): void {
    const o = this.owl;
    o.blinkAge = Math.max(0, o.blinkAge - dt);
    o.blinkTimer -= dt;
    if (o.blinkTimer <= 0) {
      o.blinkAge = 0.2;
      o.blinkTimer = rand(3.0, 6.2);
    }
    if (!o.gliding) return;
    o.glideT += dt / 5.4;
    if (o.glideT >= 1) {
      o.gliding = false;
      o.glideT = 0;
      return;
    }
    const arc = Math.sin(o.glideT * Math.PI);
    const sweep = Math.sin(o.glideT * Math.PI * 2);
    o.x = o.perchX - arc * this.w * 0.56;
    o.y = o.perchY - arc * this.h * 0.34 + Math.sin(o.glideT * Math.PI * 3) * 4 * this.unit;
    o.dir = sweep >= 0 ? -1 : 1;
  }

  private stepSkater(dt: number, atmosphere: Atmosphere): void {
    const s = this.skater;
    s.timer -= dt;
    s.breathTimer -= dt;
    if (s.breathTimer <= 0) {
      s.breathTimer = rand(2.5, 4.5);
      atmosphere.addBreath(s.x + s.dir * 3 * this.unit, s.y - 19 * this.unit, s.dir);
    }

    if (s.mood !== 'glide') {
      if (s.timer <= 0) {
        s.mood = 'glide';
        s.timer = rand(10, 16);
      }
      return;
    }

    const prevX = s.x;
    s.phase += SKATER_LOOP_SPEED * dt;
    // Figure-8 staying above y = 0.725h across the centre so the radio never hides the skater
    s.x = this.w * (0.5 + 0.31 * Math.sin(s.phase));
    s.y = this.h * (0.695 + 0.025 * Math.sin(s.phase * 2));
    s.dir = s.x >= prevX ? 1 : -1;

    if (s.timer <= 0) {
      s.mood = Math.random() < 0.6 ? 'spin' : 'wave';
      s.timer = 2.0;
    }
  }

  private stepSledders(dt: number, time: number, atmosphere: Atmosphere): void {
    const d = this.sledders;
    if (d.reactTimer > 0) d.reactTimer = Math.max(0, d.reactTimer - dt);
    d.dogBounce = time * 8;
    d.breathTimer -= dt;
    if (d.breathTimer <= 0) {
      d.breathTimer = rand(2.2, 4.0);
      atmosphere.addBreath(d.x + 3 * this.unit, d.y - 17 * this.unit, 1);
    }

    if (d.phase === 'ride') {
      d.t += dt / SLED_RIDE_SECONDS;
      if (d.t >= 1) {
        d.t = 1;
        d.phase = 'cheer';
        d.timer = 2.2;
      }
      const ease = d.t * d.t * (3 - 2 * d.t);
      d.x = this.w * (0.12 + 0.72 * ease);
      d.y = this.h * (0.63 + 0.16 * ease);
      d.dogX = d.x - 24 * this.unit + Math.sin(time * 3) * 5 * this.unit;
      d.dogY = d.y + 3 * this.unit;
      d.dogDir = 1;
    } else if (d.phase === 'cheer') {
      d.timer -= dt;
      d.dogDir = -1;
      if (d.timer <= 0) {
        d.phase = 'climb';
        d.t = 1;
      }
    } else {
      d.t -= dt / SLED_CLIMB_SECONDS;
      if (d.t <= 0) {
        d.t = 0;
        d.phase = 'ride';
        d.timer = 0;
      }
      d.x = this.w * (0.12 + 0.72 * d.t);
      d.y = this.h * (0.63 + 0.16 * d.t);
      d.dogX = d.x - 16 * this.unit;
      d.dogY = d.y - 2 * this.unit;
      d.dogDir = -1;
    }
  }

  private stepMoose(dt: number, pointer: { x: number; y: number } | null, atmosphere: Atmosphere): void {
    const m = this.moose;
    if (pointer && Math.hypot(pointer.x - m.x, pointer.y - (m.y - 12 * this.unit)) < 38 * this.unit) {
      m.mood = 'alert';
      m.timer = 2.4;
    }
    m.timer -= dt;
    if (m.timer <= 0) {
      m.mood = m.mood === 'browse' ? 'stand' : m.mood === 'alert' ? 'stand' : 'browse';
      m.timer = rand(3.5, 7.0);
    }
    m.breathTimer -= dt;
    if (m.breathTimer <= 0) {
      m.breathTimer = rand(3.2, 5.8);
      atmosphere.addBreath(m.x + m.dir * 12 * this.unit, m.y - 17 * this.unit, m.dir);
    }
  }

  private stepReindeer(dt: number, atmosphere: Atmosphere): void {
    const r = this.reindeer;
    if (r.reactTimer > 0) r.reactTimer = Math.max(0, r.reactTimer - dt);
    r.timer -= dt;
    if (r.timer <= 0) {
      r.mood = r.mood === 'watch' ? 'graze' : 'watch';
      r.timer = r.mood === 'watch' ? rand(5.0, 9.0) : rand(3.0, 5.0);
    }
    r.breathTimer -= dt;
    if (r.breathTimer <= 0) {
      r.breathTimer = rand(3.0, 5.5);
      atmosphere.addBreath(r.x + r.dir * 9 * this.unit, r.y - 17 * this.unit, r.dir);
    }
  }

  /** Handles click reactions on creatures in the active scene. */
  press(x: number, y: number, scene: SceneId, atmosphere: Atmosphere): boolean {
    if (this.fox.press(x, y, this.unit, atmosphere)) return true;

    const pad = 6 * this.unit;
    if (scene === 'pond') {
      const owlX = this.owl.gliding ? this.owl.x : this.owl.perchX;
      const owlY = this.owl.gliding ? this.owl.y : this.owl.perchY - 14 * this.unit;
      const owlBox: HitBox = {
        x: owlX - 8 * this.unit,
        y: owlY - 14 * this.unit,
        w: 16 * this.unit,
        h: 14 * this.unit,
      };
      if (pointInBox(x, y, owlBox, pad)) {
        if (!this.owl.gliding) {
          this.owl.gliding = true;
          this.owl.glideT = 0;
          this.owl.x = this.owl.perchX;
          this.owl.y = this.owl.perchY - 14 * this.unit;
        }
        return true;
      }

      const skaterBox: HitBox = {
        x: this.skater.x - 8 * this.unit,
        y: this.skater.y - 23 * this.unit,
        w: 16 * this.unit,
        h: 23 * this.unit,
      };
      if (pointInBox(x, y, skaterBox, pad)) {
        this.skater.mood = this.skater.mood === 'spin' ? 'wave' : 'spin';
        this.skater.timer = 2.2;
        return true;
      }
    }

    if (scene === 'sled') {
      const sledBox: HitBox = {
        x: this.sledders.x - 14 * this.unit,
        y: this.sledders.y - 22 * this.unit,
        w: 28 * this.unit,
        h: 22 * this.unit,
      };
      const dogBox: HitBox = {
        x: this.sledders.dogX - 9 * this.unit,
        y: this.sledders.dogY - 12 * this.unit,
        w: 18 * this.unit,
        h: 12 * this.unit,
      };
      if (pointInBox(x, y, sledBox, pad) || pointInBox(x, y, dogBox, pad)) {
        this.sledders.reactTimer = 1.6;
        atmosphere.addSnowPuff(this.sledders.dogX, this.sledders.dogY, 5);
        return true;
      }
    }

    if (scene === 'chimney') {
      const mooseBox: HitBox = {
        x: this.moose.x - 15 * this.unit,
        y: this.moose.y - 24 * this.unit,
        w: 30 * this.unit,
        h: 24 * this.unit,
      };
      if (pointInBox(x, y, mooseBox, pad)) {
        this.moose.mood = 'alert';
        this.moose.timer = 3.2;
        atmosphere.addBreath(
          this.moose.x + this.moose.dir * 12 * this.unit,
          this.moose.y - 18 * this.unit,
          this.moose.dir,
        );
        return true;
      }
    }

    if (scene === 'aurora') {
      const deerBox: HitBox = {
        x: this.reindeer.x - 12 * this.unit,
        y: this.reindeer.y - 22 * this.unit,
        w: 24 * this.unit,
        h: 22 * this.unit,
      };
      if (pointInBox(x, y, deerBox, pad)) {
        this.reindeer.reactTimer = 1.8;
        this.reindeer.mood = 'watch';
        atmosphere.addBreath(
          this.reindeer.x + this.reindeer.dir * 9 * this.unit,
          this.reindeer.y - 18 * this.unit,
          this.reindeer.dir,
        );
        return true;
      }
    }

    return false;
  }

  /** Collects depth-sorted draw callbacks for ground-standing cast in `scene`. */
  collectStanding(
    scene: SceneId,
    sprites: CreatureSprites,
    snagSprite: SpriteBox,
    pointer: { x: number; y: number } | null,
    offsetX: number,
    out: DrawItem[],
  ): void {
    const u = this.unit;
    const foxFrame = this.fox.frameForScene(scene, this.w, this.h, u, sprites);
    out.push({
      y: foxFrame.y,
      draw: (ctx) => drawSprite(ctx, foxFrame.sprite, foxFrame.x + offsetX, foxFrame.y - foxFrame.lift, u),
    });

    if (scene === 'pond') {
      out.push({
        y: this.owl.perchY,
        draw: (ctx) => {
          const px = this.owl.perchX + offsetX;
          const py = this.owl.perchY;
          drawSprite(ctx, snagSprite, px, py, u);
          if (!this.owl.gliding) {
            let owlPic = sprites.owl.front;
            if (this.owl.blinkAge > 0) {
              owlPic = sprites.owl.blink;
            } else if (pointer) {
              const dx = pointer.x - px;
              owlPic = dx < -18 * u ? sprites.owl.left : dx > 18 * u ? sprites.owl.right : sprites.owl.front;
            }
            drawSprite(ctx, owlPic, px + 2 * u, py - 14 * u, u, false);
          }
        },
      });

      out.push({
        y: this.skater.y,
        draw: (ctx) => {
          const s = this.skater;
          let pic: SpriteBox;
          if (s.mood === 'spin') {
            pic = sprites.skater.spin;
          } else if (s.mood === 'wave') {
            pic = pickDir(sprites.skater.wave, s.dir);
          } else {
            pic = Math.floor(s.phase * 14) % 2 === 0
              ? pickDir(sprites.skater.glideA, s.dir)
              : pickDir(sprites.skater.glideB, s.dir);
          }
          drawSprite(ctx, pic, s.x + offsetX, s.y, u);
        },
      });
    }

    if (scene === 'sled') {
      out.push({
        y: this.sledders.y,
        draw: (ctx) => {
          const d = this.sledders;
          if (d.phase === 'ride') {
            drawSprite(ctx, sprites.child.sled.right, d.x + offsetX, d.y, u);
          } else if (d.phase === 'cheer') {
            drawSprite(ctx, sprites.child.walkA.left, d.x + offsetX, d.y, u);
            drawSprite(ctx, sprites.child.emptySled.right, d.x + offsetX + 16 * u, d.y + u, u);
          } else {
            const step = Math.floor(d.t * 28) % 2 === 0 ? sprites.child.walkA.left : sprites.child.walkB.left;
            drawSprite(ctx, step, d.x + offsetX, d.y, u);
            drawSprite(ctx, sprites.child.emptySled.left, d.x + offsetX + 16 * u, d.y + 2 * u, u);
          }
        },
      });

      out.push({
        y: this.sledders.dogY,
        draw: (ctx) => {
          const d = this.sledders;
          const hop = d.reactTimer > 0 ? Math.abs(Math.sin(d.reactTimer * 9)) * 4 * u : 0;
          const pic = d.phase === 'cheer' && d.reactTimer <= 0
            ? pickDir(sprites.dog.sit, d.dogDir)
            : Math.floor(d.dogBounce) % 2 === 0
              ? pickDir(sprites.dog.runA, d.dogDir)
              : pickDir(sprites.dog.runB, d.dogDir);
          drawSprite(ctx, pic, d.dogX + offsetX, d.dogY - hop, u);
        },
      });
    }

    if (scene === 'chimney') {
      out.push({
        y: this.moose.y,
        draw: (ctx) => {
          const m = this.moose;
          const ds = m.mood === 'alert'
            ? sprites.moose.alert
            : m.mood === 'browse'
              ? sprites.moose.browse
              : sprites.moose.stand;
          drawSprite(ctx, pickDir(ds, m.dir), m.x + offsetX, m.y, u);
        },
      });
    }

    if (scene === 'aurora') {
      out.push({
        y: this.reindeer.y,
        draw: (ctx) => {
          const r = this.reindeer;
          const lift = r.reactTimer > 0 ? Math.abs(Math.sin(r.reactTimer * 6)) * 2 * u : 0;
          const ds = r.mood === 'graze' && r.reactTimer <= 0 ? sprites.reindeer.graze : sprites.reindeer.watch;
          drawSprite(ctx, pickDir(ds, r.dir), r.x + offsetX, r.y - lift, u);
        },
      });
    }
  }

  /** Draws the gliding owl above the trees/horizon when flying in Frozen Pond. */
  drawSkyOwl(ctx: CanvasRenderingContext2D, scene: SceneId, sprites: CreatureSprites, offsetX: number): void {
    if (scene !== 'pond' || !this.owl.gliding) return;
    const flap = Math.floor(this.owl.glideT * 18) % 2;
    const ds = flap === 0 ? sprites.owl.glideA : sprites.owl.glideB;
    drawSprite(ctx, pickDir(ds, this.owl.dir), this.owl.x + offsetX, this.owl.y, this.unit, false);
  }
}
