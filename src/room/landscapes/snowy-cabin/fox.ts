import { rand } from '../../../world/math';
import type { Atmosphere } from './atmosphere';
import type { CreatureSprites, DirSprite, SpriteBox } from './creature-sprites';
import { pointInBox, type HitBox, type SceneId } from './scenes';

export type FoxMood = 'trot' | 'sniff' | 'sit' | 'look' | 'bound' | 'react';

interface FoxAnchor {
  xFrac: number;
  yFrac: number;
  mood: FoxMood;
}

const FOX_ANCHORS: Record<SceneId, FoxAnchor> = {
  clearing: { xFrac: 0.68, yFrac: 0.77, mood: 'trot' },
  pond: { xFrac: 0.24, yFrac: 0.75, mood: 'sniff' },
  sled: { xFrac: 0.22, yFrac: 0.83, mood: 'bound' },
  chimney: { xFrac: 0.34, yFrac: 0.77, mood: 'sit' },
  aurora: { xFrac: 0.26, yFrac: 0.80, mood: 'sit' },
};

const FOX_TROT_SPEED = 20;
const FOX_BOUND_SPEED = 42;

function pickDir(ds: DirSprite, dir: 1 | -1): SpriteBox {
  return dir >= 0 ? ds.right : ds.left;
}

/**
 * The recurring red fox across all five Snowy Cabin scenes:
 * leaves tracks in the clearing, sniffs by the pond, bounds by the sled hill,
 * curls near the warm window glow at night, and gazes up at the aurora.
 */
export class FoxActor {
  x = 0;
  y = 0;
  dir: 1 | -1 = 1;
  mood: FoxMood = 'trot';
  private timer = 3;
  private reactTimer = 0;
  private clock = 0;
  private trackTimer = 0;
  private scene: SceneId = 'clearing';

  place(w: number, h: number, scene: SceneId): void {
    this.scene = scene;
    const anchor = FOX_ANCHORS[scene];
    this.x = w * anchor.xFrac;
    this.y = h * anchor.yFrac;
    this.dir = 1;
    this.mood = anchor.mood;
    this.timer = 3.5;
  }

  update(dt: number, w: number, h: number, unit: number, scene: SceneId, atmosphere: Atmosphere): void {
    if (scene !== this.scene || this.x <= 0) {
      this.place(w, h, scene);
    }
    this.clock += dt;

    if (this.reactTimer > 0) {
      this.reactTimer = Math.max(0, this.reactTimer - dt);
      if (this.reactTimer === 0) {
        this.mood = scene === 'chimney' || scene === 'aurora' ? 'sit' : 'look';
        this.timer = rand(2.5, 4.5);
      }
      return;
    }

    this.timer -= dt;
    if (scene === 'clearing') {
      if (this.mood === 'trot') {
        this.x += this.dir * FOX_TROT_SPEED * unit * dt;
        this.trackTimer -= dt;
        if (this.trackTimer <= 0) {
          this.trackTimer = 0.24;
          atmosphere.addFootprint(this.x, this.y, 0, true);
        }
        if (this.x < w * 0.58) this.dir = 1;
        if (this.x > w * 0.88) this.dir = -1;
      }
      if (this.timer <= 0) {
        const r = Math.random();
        this.mood = r < 0.5 ? 'trot' : r < 0.78 ? 'sniff' : 'sit';
        this.timer = this.mood === 'trot' ? rand(3.5, 6.5) : rand(2.0, 4.0);
      }
    } else if (scene === 'pond') {
      if (this.mood === 'trot') {
        this.x += this.dir * FOX_TROT_SPEED * 0.85 * unit * dt;
        if (this.x < w * 0.14) this.dir = 1;
        if (this.x > w * 0.34) this.dir = -1;
      }
      if (this.timer <= 0) {
        const r = Math.random();
        this.mood = r < 0.4 ? 'sniff' : r < 0.72 ? 'trot' : 'look';
        this.timer = rand(2.2, 4.8);
      }
    } else if (scene === 'sled') {
      if (this.mood === 'bound') {
        this.x += this.dir * FOX_BOUND_SPEED * unit * dt;
        if (this.x < w * 0.12) this.dir = 1;
        if (this.x > w * 0.88) this.dir = -1;
      }
      if (this.timer <= 0) {
        const nearRadio = this.x > w * 0.36 && this.x < w * 0.64;
        this.mood = nearRadio || Math.random() < 0.65 ? 'bound' : 'look';
        this.timer = this.mood === 'bound' ? rand(3.0, 5.5) : rand(1.6, 3.0);
      }
    } else {
      if (this.timer <= 0) {
        const r = Math.random();
        this.mood = r < 0.68 ? 'sit' : r < 0.86 ? 'look' : 'sniff';
        this.timer = rand(3.5, 7.0);
      }
    }
  }

  press(px: number, py: number, unit: number, atmosphere: Atmosphere): boolean {
    const foxBox: HitBox = {
      x: this.x - 10 * unit,
      y: this.y - 14 * unit,
      w: 20 * unit,
      h: 14 * unit,
    };
    if (!pointInBox(px, py, foxBox, 6 * unit)) return false;
    this.reactTimer = 1.6;
    this.mood = 'react';
    atmosphere.addSnowPuff(this.x, this.y, 6);
    return true;
  }

  /** Resolves position and sprite for `scene` (supports cross-dissolving into a preview of the next scene). */
  frameForScene(
    scene: SceneId,
    w: number,
    h: number,
    unit: number,
    sprites: CreatureSprites,
  ): { x: number; y: number; lift: number; sprite: SpriteBox } {
    if (scene !== this.scene) {
      const anchor = FOX_ANCHORS[scene];
      const sp = anchor.mood === 'sit'
        ? sprites.fox.sit.right
        : anchor.mood === 'sniff'
          ? sprites.fox.sniff.right
          : sprites.fox.stand.right;
      return { x: w * anchor.xFrac, y: h * anchor.yFrac, lift: 0, sprite: sp };
    }

    let sprite: SpriteBox;
    let lift = 0;
    if (this.reactTimer > 0) {
      const hop = Math.sin((this.reactTimer / 1.6) * Math.PI * 2);
      lift = Math.max(0, Math.round(hop * 4 * unit));
      sprite = hop > 0.35 ? pickDir(sprites.fox.leap, this.dir) : pickDir(sprites.fox.look, this.dir);
    } else if (this.mood === 'sit') {
      sprite = pickDir(sprites.fox.sit, this.dir);
    } else if (this.mood === 'sniff') {
      sprite = pickDir(sprites.fox.sniff, this.dir);
    } else if (this.mood === 'look') {
      sprite = pickDir(sprites.fox.look, this.dir);
    } else if (this.mood === 'bound') {
      const step = Math.floor(this.clock * 8) % 2;
      sprite = step === 0 ? pickDir(sprites.fox.leap, this.dir) : pickDir(sprites.fox.trotA, this.dir);
    } else {
      const step = Math.floor(this.clock * 5) % 2;
      sprite = step === 0 ? pickDir(sprites.fox.trotA, this.dir) : pickDir(sprites.fox.trotB, this.dir);
    }
    return { x: this.x, y: this.y, lift, sprite };
  }
}
