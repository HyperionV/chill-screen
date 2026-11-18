import { hash } from '../../journeys/noise';
import type { ViewFrame } from '../../view';
import { breeze, gust } from '../../wind';
import type { GardenInteractions } from './interactions';
import { DESIGN_HEIGHT, layout } from './scenes';
import { line, oval, sprite, type GardenSprites } from './sprites';

const KOI_COUNT = 7;
const MAPLE_LEAF_COUNT = 9;
const BREEZE_LEAF_COUNT = 5;
const FIREFLY_COUNT = 15;
const MONK_REST_SECONDS = 8;
/** Wind-blown leaf motion parameters in stage pixels per second. */
const LEAF_FALL_BASE = 2.5;
const LEAF_FALL_RANGE = 2;
const LEAF_DRIFT_CALM = 4;
const LEAF_DRIFT_GUST = 12;
const LEAF_FLUTTER = 5;
const LEAF_FALL_FLUTTER = 0.6;
// Allow the three-pixel leaf sprite to clear the image before recycling it.
const LEAF_EXIT_PAD = 6;
type MonkActivity = 'rest' | 'work' | 'look';
type CatActivity = 'sleep' | 'look' | 'stretch' | 'walk';
type HeronActivity = 'away' | 'arrive' | 'watch' | 'step' | 'leave';
interface Koi { x: number; y: number; tx: number; ty: number; wait: number; facing: number; seed: number }
interface WindLeaf { x: number; y: number; fall: number; seed: number }

export class GardenCast {
  private width = 0;
  private readonly fish: Koi[] = [];
  private readonly leaves: WindLeaf[] = [];
  private monkActivity: MonkActivity = 'rest';
  private monkAge = 0;
  private monkRound = 0;
  private catActivity: CatActivity = 'sleep';
  private catAge = 0;
  private catX = 0;
  private catFacing = -1;
  private heronActivity: HeronActivity = 'away';
  private heronAge = 15;
  private heronX = 0;
  private feedWait = 10;

  resize(width: number): void {
    this.width = width;
    this.catX = width * 0.79;
    this.heronX = width * 0.18;
    this.fish.length = 0;
    for (let i = 0; i < KOI_COUNT; i++) {
      const x = width * (0.30 + hash(i + 2) * 0.38);
      const y = 193 + hash(i + 4) * 25;
      this.fish.push({ x, y, tx: x, ty: y, wait: i, facing: 1, seed: i });
    }
    this.leaves.length = 0;
    for (let i = 0; i < MAPLE_LEAF_COUNT; i++) {
      this.leaves.push({
        x: 15 + hash(i + 16) * width * 0.24 + hash(i + 51) * width * 0.35,
        y: 28 + hash(i + 27) * 210,
        fall: LEAF_FALL_BASE + hash(i) * LEAF_FALL_RANGE,
        seed: i,
      });
    }
  }

  update(frame: ViewFrame, scene: number, effects: GardenInteractions): void {
    const dt = frame.dt;
    this.monkAge += dt;
    const p = layout(scene, this.width);
    const pointer = frame.pointer;
    const nearMonk = pointer && Math.hypot(pointer.x - p.monk.x, pointer.y - p.monk.y + 15) < 29;
    if (nearMonk && this.monkActivity !== 'look') { this.monkActivity = 'look'; this.monkAge = 0; }
    else if (this.monkActivity === 'rest' && this.monkAge > MONK_REST_SECONDS) {
      this.monkActivity = 'work'; this.monkAge = 0; this.monkRound++;
    } else if (this.monkActivity === 'work' && this.monkAge > 5) {
      this.monkActivity = 'rest'; this.monkAge = 0;
    } else if (this.monkActivity === 'look' && this.monkAge > 3 && !nearMonk) {
      this.monkActivity = 'rest'; this.monkAge = 0;
    }
    if (scene === 1 || scene === 4) {
      this.feedWait -= dt;
      if (scene === 1 && this.feedWait <= 0) {
        effects.feedAt(this.width * 0.30, 207);
        this.feedWait = 27 + hash(this.monkRound) * 13;
      }
      for (const fish of this.fish) {
        fish.wait -= dt;
        if (effects.feed > 0) {
          fish.tx = effects.food.x + Math.sin(fish.seed * 3) * 10;
          fish.ty = effects.food.y + Math.cos(fish.seed * 3) * 5;
        } else if (fish.wait <= 0) {
          fish.seed += KOI_COUNT;
          fish.tx = this.width * (0.27 + hash(fish.seed) * 0.44);
          fish.ty = 190 + hash(fish.seed + 9) * 32;
          fish.wait = 6 + hash(fish.seed + 7) * 12;
        }
        if (pointer && effects.feed <= 0 && Math.hypot(fish.x - pointer.x, fish.y - pointer.y) < 20) {
          fish.tx = Math.max(this.width * 0.26, Math.min(this.width * 0.71, fish.x + Math.sign(fish.x - pointer.x || 1) * 24));
          fish.wait = 3;
        }
        const dx = fish.tx - fish.x; const dy = fish.ty - fish.y;
        const distance = Math.hypot(dx, dy);
        const speed = effects.feed > 0 ? 12 : 4;
        if (distance > 1) {
          const step = Math.min(distance, speed * dt);
          fish.x += dx / distance * step; fish.y += dy / distance * step;
          if (Math.abs(dx) > 1) fish.facing = dx > 0 ? 1 : -1;
        }
      }
      this.heronAge += dt;
      if (this.heronActivity === 'away' && this.heronAge > 48) {
        this.heronActivity = 'arrive'; this.heronAge = 0; this.heronX = -16;
      } else if (this.heronActivity === 'arrive') {
        this.heronX += dt * 17;
        if (this.heronX >= this.width * 0.18) { this.heronActivity = 'watch'; this.heronAge = 0; }
      } else if (this.heronActivity === 'watch' && this.heronAge > 14) {
        this.heronActivity = 'step'; this.heronAge = 0;
      } else if (this.heronActivity === 'step') {
        this.heronX += dt * 1.7;
        if (this.heronAge > 5) { this.heronActivity = 'watch'; this.heronAge = 0; }
      } else if (this.heronActivity === 'leave') {
        this.heronX -= dt * 19;
        if (this.heronX < -20) { this.heronActivity = 'away'; this.heronAge = 0; }
      }
      if ((pointer && Math.hypot(pointer.x - this.heronX, pointer.y - 190) < 28) || this.heronX > this.width * 0.25) {
        if (this.heronActivity === 'watch' || this.heronActivity === 'step') { this.heronActivity = 'leave'; this.heronAge = 0; }
      }
    }
    const wind = LEAF_DRIFT_CALM + gust(frame.time) * LEAF_DRIFT_GUST;
    for (let i = 0; i < this.leaves.length; i++) {
      const leaf = this.leaves[i];
      const flutter = breeze(frame.time, leaf.x + leaf.seed * 19);
      leaf.x += (wind + flutter * LEAF_FLUTTER) * dt;
      leaf.y += (leaf.fall + Math.abs(flutter) * LEAF_FALL_FLUTTER) * dt;
      if (leaf.x > this.width + LEAF_EXIT_PAD || leaf.y > DESIGN_HEIGHT + LEAF_EXIT_PAD) {
        leaf.seed += MAPLE_LEAF_COUNT;
        if (scene === 0 || scene === 4) {
          leaf.x = 12 + hash(leaf.seed + 16) * this.width * 0.24;
          leaf.y = 22 + hash(leaf.seed + 27) * 32;
        } else {
          leaf.x = -4 - hash(leaf.seed + 16) * 24;
          leaf.y = 32 + hash(leaf.seed + 27) * 145;
        }
      }
    }
    if (scene === 3) {
      this.catAge += dt;
      if (pointer && Math.hypot(pointer.x - this.catX, pointer.y - 231) < 27 && this.catActivity === 'sleep') {
        this.catActivity = 'look'; this.catAge = 0;
      }
      if (this.catActivity === 'sleep' && this.catAge > 24) { this.catActivity = 'stretch'; this.catAge = 0; }
      else if ((this.catActivity === 'stretch' || this.catActivity === 'look') && this.catAge > 4) { this.catActivity = 'walk'; this.catAge = 0; }
      else if (this.catActivity === 'walk') {
        this.catX += dt * this.catFacing * 3;
        if (this.catX < this.width * 0.69 || this.catX > this.width * 0.94) this.catFacing *= -1;
        if (this.catAge > 8) { this.catActivity = 'sleep'; this.catAge = 0; }
      }
    }
  }

  drawFish(ctx: CanvasRenderingContext2D, sprites: GardenSprites, time: number): void {
    for (const fish of this.fish) {
      sprite(ctx, sprites.koi, fish.x, fish.y + Math.sin(time * 1.2 + fish.seed) * 0.6, fish.facing);
      if (Math.abs(fish.x - fish.tx) > 2) {
        line(ctx, fish.x - fish.facing * 10, fish.y - 4, fish.x - fish.facing * 13, fish.y - 4 + Math.sin(time * 2 + fish.seed) * 2, '#bd9a65');
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, sprites: GardenSprites, frame: ViewFrame, scene: number, effects: GardenInteractions): void {
    const p = layout(scene, this.width);
    const work = this.monkActivity === 'work';
    const bow = effects.bow > 0;
    const seated = scene === 3 || scene === 4;
    const feet = p.monk.y;
    oval(ctx, p.monk.x + 4, feet, seated ? 13 : 10, 3, '#657056');
    const monkSprite = bow ? sprites.bowed : seated ? sprites.seated : sprites.monk;
    sprite(ctx, monkSprite, p.monk.x, feet);
    if (this.monkActivity === 'look' && !bow && !seated) {
      const facing = frame.pointer && frame.pointer.x < p.monk.x ? -1 : 1;
      line(ctx, p.monk.x + facing * 3, feet - 25, p.monk.x + facing * 3, feet - 24, '#544c37');
    }
    const reach = bow ? 0 : work ? Math.sin(this.monkAge * 0.8) * 5 : 0;
    if (scene === 0 || scene === 2) {
      const x = p.monk.x + 12 + reach;
      line(ctx, p.monk.x + 4, feet - 18, x + 5, feet - 2, '#a79968');
      line(ctx, p.monk.x + 4, feet - 17, p.monk.x + 10 + reach / 2, feet - 14, '#d8b68a');
      for (let i = -3; i <= 3; i++) {
        line(ctx, x + i * 2, feet - 2, x + i * 2 + (scene === 2 ? 2 : 0), feet + 2, scene === 2 ? '#b9aa76' : '#8d805c');
      }
      line(ctx, x - 6, feet - 2, x + 6, feet - 2, '#b5a675');
      if (work) for (let i = 0; i < 3; i++) line(ctx, x - 5, feet + i * 3, x + 8, feet + i * 3, '#b4b397');
    }
    if (scene === 1) {
      oval(ctx, p.monk.x + 9, feet - 12, 5, 3, '#746547');
      line(ctx, p.monk.x + 5, feet - 16, p.monk.x + 13 + reach, feet - 15, '#dfba8a');
      if (effects.feed > 10) {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#ddc38b';
          ctx.fillRect(Math.round(p.monk.x + 16 + i * 4), Math.round(feet - 10 + i * 2), 1, 1);
        }
      }
    }
    if (scene === 3 && work && !bow) {
      line(ctx, p.monk.x + 6, feet - 12, p.monk.x + 17, feet - 10, '#d8b68a');
      oval(ctx, p.monk.x + 18, feet - 10, 4, 3, '#718469');
      line(ctx, p.monk.x + 21, feet - 9, p.monk.x + 25, feet - 6, '#c9cfaa');
    }
    if (scene === 1 && this.heronActivity !== 'away') {
      const y = this.heronActivity === 'arrive' || this.heronActivity === 'leave' ? 188 - Math.abs(Math.sin(frame.time * 0.7)) * 5 : 193;
      sprite(ctx, sprites.heron, this.heronX, y, this.heronActivity === 'leave' ? -1 : 1);
      if (this.heronActivity === 'watch' && this.heronAge > 8) line(ctx, this.heronX + 1, y - 19, this.heronX + 10, y - 15, '#c6c9ad');
    }
    if (scene === 3) {
      const sleeping = this.catActivity === 'sleep';
      const image = sprites.cat;
      const stretch = this.catActivity === 'stretch';
      ctx.save(); ctx.translate(Math.round(this.catX), 240); ctx.scale(this.catFacing, 1);
      ctx.drawImage(image, -10, sleeping ? -9 : stretch ? -12 : -14, stretch ? 24 : 20, sleeping ? 9 : stretch ? 12 : 14);
      if (sleeping) { line(ctx, -5, -6, -3, -6, '#6d583d'); line(ctx, 2, -6, 4, -6, '#6d583d'); }
      ctx.restore();
    }
  }

  drawAir(ctx: CanvasRenderingContext2D, scene: number, time: number, night: number, pointer: ViewFrame['pointer']): void {
    if (scene === 0 || scene === 4) {
      for (let i = 0; i < MAPLE_LEAF_COUNT; i++) {
        const leaf = this.leaves[i];
        const x = Math.round(leaf.x);
        const y = Math.round(leaf.y);
        ctx.fillStyle = i % 2 ? '#bd7248' : '#9d593d';
        ctx.fillRect(x, y, 3, 1);
        ctx.fillRect(x + 1, y - 1, 1, 3);
      }
    } else {
      for (let i = 0; i < BREEZE_LEAF_COUNT; i++) {
        const leaf = this.leaves[i];
        const x = Math.round(leaf.x);
        const y = Math.round(leaf.y);
        ctx.fillStyle = i % 2 ? '#718952' : '#9ca970';
        ctx.fillRect(x, y, 2, 1);
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    if (night < 0.3) return;
    for (let i = 0; i < FIREFLY_COUNT; i++) {
      const glow = Math.max(0, Math.sin(time * 0.48 + i * 2.4));
      if (glow < 0.4) continue;
      let x = hash(i + 71) * this.width + Math.sin(time * 0.12 + i) * 11;
      let y = 179 + hash(i + 18) * 63 + Math.sin(time * 0.22 + i) * 6;
      if (pointer && Math.hypot(x - pointer.x, y - pointer.y) < 25) {
        x += Math.sign(x - pointer.x || 1) * 4; y -= 3;
      }
      ctx.save(); ctx.globalAlpha = night * glow * 0.16;
      ctx.fillStyle = '#d5dc8e'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.globalAlpha = night * glow; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      ctx.restore();
    }
  }
}
