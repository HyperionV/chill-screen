import { hash } from '../../journeys/noise';
import type { ViewFrame } from '../../view';
import { DESIGN_HEIGHT, SCENES } from './scenes';
import { sprite, type Sprites } from './sprites';
import type { LakeWater } from './water';

type Kind = 'swan' | 'duck' | 'cygnet' | 'frog' | 'dragonfly' | 'turtle';
type Activity = 'rest' | 'roam' | 'seek' | 'react';
interface Animal {
  kind: Kind;
  scene: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  goalX: number;
  goalY: number;
  age: number;
  wait: number;
  activity: Activity;
  size: number;
  facing: boolean;
  phase: number;
}

const HIT_RADIUS = 18;
const LEAP_SECONDS = 0.7;
const FISH_INTERVAL = 23;
const FISH_SECONDS = 1.2;
const SEEK_SPEED = 24;

export class LakeCreatures {
  private readonly animals: Animal[] = [];
  private w = 1;
  private h = 1;
  private unit = 1;
  private fishWait = 9;
  private fishAge = FISH_SECONDS;
  private fishX = 0;
  private fishY = 0;
  private fishSerial = 0;
  private fishScene = 0;
  private time = 0;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_HEIGHT;
    this.animals.length = 0;
    this.fishAge = FISH_SECONDS;
    this.fishWait = 9;
    for (let scene = 0; scene < SCENES.length; scene++) {
      const composition = SCENES[scene];
      this.add('swan', scene, composition.swanX, composition.swanY, composition.swanSize * 1.25);
    }
    this.add('duck', 0, 0.66, 0.73, 1.2);
    this.add('duck', 0, 0.74, 0.79, 1.1);
    this.add('swan', 1, 0.69, 0.74, 1.1);
    this.add('cygnet', 1, 0.86, 0.75, 1.25);
    this.add('frog', 2, 0.18, 0.83, 1.35);
    this.add('frog', 2, 0.29, 0.88, 1.25);
    this.add('turtle', 2, 0.81, 0.82, 1.4);
    for (let i = 0; i < 3; i++) this.add('dragonfly', 2, 0.14 + i * 0.34, 0.68 + i % 2 * 0.04, 1);
    this.add('dragonfly', 0, 0.26, 0.76, 1);
    this.add('dragonfly', 1, 0.19, 0.77, 1);
    this.add('dragonfly', 3, 0.16, 0.75, 1);
    this.add('dragonfly', 4, 0.28, 0.76, 1);
  }

  private add(kind: Kind, scene: number, x: number, y: number, size: number): void {
    const phase = this.animals.length * 2.3;
    this.animals.push({ kind, scene, x: x * this.w, y: y * this.h, homeX: x * this.w, homeY: y * this.h,
      goalX: x * this.w, goalY: y * this.h, age: 0, wait: 3 + hash(phase) * 9,
      activity: 'rest', size, facing: false, phase });
  }

  press(x: number, y: number, scene: number): boolean {
    for (const a of this.animals) {
      if (a.scene !== scene) continue;
      const height = a.kind === 'swan' ? 13 : 5;
      if (Math.hypot(x - a.x, y - a.y + height * this.unit) > HIT_RADIUS * this.unit * a.size) continue;
      if (a.kind === 'turtle') continue;
      a.age = 0;
      if (a.kind === 'dragonfly' || a.kind === 'frog') {
        a.activity = 'react';
        a.goalX = Math.max(this.w * 0.05, Math.min(this.w * 0.95, a.x + (x < a.x ? 1 : -1) * 27 * this.unit));
        a.goalY = a.homeY;
      } else {
        a.activity = 'seek';
        a.goalX = x;
        a.goalY = Math.max(this.h * 0.59, Math.min(this.h * 0.9, y));
      }
      return true;
    }
    return false;
  }

  update(frame: ViewFrame, scene: number, next: number, water: LakeWater): void {
    this.time = frame.time;
    const dt = frame.dt;
    for (const a of this.animals) {
      if (a.scene !== scene && a.scene !== next) continue;
      a.age += dt;
      a.wait -= dt;
      const amphibian = a.kind === 'frog' || a.kind === 'dragonfly';
      if (amphibian && frame.pointer && a.activity !== 'react' &&
        Math.hypot(frame.pointer.x - a.x, frame.pointer.y - a.y) < 20 * this.unit) {
        a.activity = 'react';
        a.age = 0;
        a.goalX = a.homeX + Math.sign(a.x - frame.pointer.x || 1) * 22 * this.unit;
        a.goalY = a.homeY;
      }
      if (a.activity === 'rest' && a.wait <= 0) {
        a.activity = 'roam';
        a.age = 0;
        a.goalX = a.homeX + Math.sin(frame.time * 0.17 + a.phase) * (a.kind === 'turtle' ? 3 : 22) * this.unit;
        a.goalY = a.homeY + (a.kind === 'frog' || a.kind === 'turtle' ? 0 : Math.cos(frame.time * 0.13 + a.phase) * 4 * this.unit);
        if (a.scene === 1) {
          const angle = frame.time * 0.035 + a.phase * 0.12;
          a.goalX = this.w * (SCENES[1].island + Math.cos(angle) * 0.12);
          a.goalY = this.h * (0.68 + Math.sin(angle) * 0.045);
        }
      }
      if (a.activity === 'rest') continue;
      if (a.scene === 4 && a.kind === 'swan' && a.activity !== 'seek') {
        a.activity = 'rest';
        a.wait = 12;
        continue;
      }
      const dx = a.goalX - a.x;
      const dy = a.goalY - a.y;
      const distance = Math.hypot(dx, dy);
      const speed = (a.activity === 'react' ? 44 : a.activity === 'seek' ? SEEK_SPEED : a.kind === 'turtle' ? 0.7 : 4) * this.unit;
      const step = Math.min(distance, speed * dt);
      if (distance > 0.1) {
        a.x += dx / distance * step;
        a.y += dy / distance * step;
        a.facing = dx < 0;
      }
      if (distance < Math.max(1, speed * dt) || (a.activity === 'react' && a.age >= LEAP_SECONDS)) {
        if (a.kind === 'frog' && a.activity === 'react') water.ripple(a.x, a.y, true);
        a.activity = 'rest';
        a.wait = 4 + hash(a.phase + frame.time) * 10;
        a.age = 0;
      }
    }
    this.fishWait -= dt;
    if (this.fishWait <= 0 && this.fishAge >= FISH_SECONDS) {
      this.fishSerial++;
      this.fishX = this.w * (this.fishSerial % 2 ? 0.31 : 0.78);
      this.fishY = this.h * 0.7;
      this.fishAge = 0;
      this.fishScene = scene;
      this.fishWait = FISH_INTERVAL + hash(this.fishSerial) * 14;
      water.ripple(this.fishX, this.fishY, true);
    }
    if (this.fishAge < FISH_SECONDS) {
      this.fishAge += dt;
      if (this.fishAge >= FISH_SECONDS) water.ripple(this.fishX + 22 * this.unit, this.fishY, true);
    }
  }

  draw(ctx: CanvasRenderingContext2D, scene: number, sprites: Sprites, day: number): void {
    const u = this.unit;
    for (const a of this.animals) {
      if (a.scene !== scene) continue;
      let y = a.y;
      let x = a.x;
      if (a.kind === 'dragonfly') {
        x += Math.sin(this.time * 1.1 + a.phase) * 3 * u;
        y += Math.cos(this.time * 1.5 + a.phase) * 2 * u;
        ctx.globalAlpha = 0.62 + day * 0.38;
        ctx.fillStyle = '#adc9be';
        const wing = Math.floor(this.time * 6 + a.phase) % 2 ? 2 : 0;
        ctx.fillRect(Math.round(x - 7 * u), Math.round(y - (2 + wing) * u), Math.round(6 * u), Math.max(1, Math.round(2 * u)));
        ctx.fillRect(Math.round(x + u), Math.round(y - (2 + wing) * u), Math.round(6 * u), Math.max(1, Math.round(2 * u)));
        ctx.fillStyle = '#467e80';
        ctx.fillRect(Math.round(x), Math.round(y - 4 * u), Math.max(1, Math.round(2 * u)), Math.round(10 * u));
        ctx.fillStyle = '#e5dcae';
        ctx.fillRect(Math.round(x), Math.round(y - 5 * u), 2, 2);
        ctx.globalAlpha = 1;
        continue;
      }
      if (a.kind === 'frog' && a.activity === 'react') y -= Math.sin(Math.PI * Math.min(1, a.age / LEAP_SECONDS)) * 20 * u;
      const sleeping = a.kind === 'swan' && a.scene === 4 && a.activity === 'rest' && day < 0.5;
      const image = sleeping ? sprites.sleeping : sprites[a.kind];
      const size = a.size * u;
      const onWater = (a.kind === 'swan' || a.kind === 'duck' || a.kind === 'cygnet') && !sleeping;
      if ((a.kind === 'swan' || a.kind === 'duck' || a.kind === 'cygnet') && !sleeping) {
        ctx.save();
        ctx.translate(0, Math.round(a.y * 2));
        ctx.scale(1, -1);
        sprite(ctx, sprites.reflections[a.kind], x + u, a.y, size, a.facing);
        ctx.restore();
        ctx.fillStyle = '#9dada5';
        const wake = a.activity === 'rest' ? 4 : 9;
        ctx.fillRect(Math.round(x - wake * u), Math.round(a.y + u), Math.round(wake * 2 * u), 1);
      }
      sprite(ctx, image, x, y, size, a.facing);
      // A small head turn distinguishes resting birds from a frozen swimming pose.
      if (onWater && !sleeping && a.activity === 'rest' && Math.sin(a.age * 0.6 + a.phase) > 0.5) {
        ctx.fillStyle = '#e8e2c8';
        ctx.fillRect(Math.round(x + (a.facing ? -1 : 1) * 6 * size), Math.round(y - image.height * size + 2 * size), 2, 1);
      }
    }
    if (this.fishScene === scene && this.fishAge < FISH_SECONDS) {
      const t = this.fishAge / FISH_SECONDS;
      const x = this.fishX + t * 22 * u;
      const y = this.fishY - Math.sin(t * Math.PI) * 19 * u;
      ctx.fillStyle = '#a1b9ab';
      ctx.fillRect(Math.round(x - 4 * u), Math.round(y - u), Math.round(8 * u), Math.round(3 * u));
      ctx.fillStyle = '#688b82';
      ctx.fillRect(Math.round(x - 6 * u), Math.round(y - 2 * u), Math.round(3 * u), Math.round(5 * u));
      ctx.fillStyle = '#294b50';
      ctx.fillRect(Math.round(x + 2 * u), Math.round(y), 1, 1);
    }
  }

  eagle(ctx: CanvasRenderingContext2D, scene: number): void {
    if (scene !== 3) return;
    const u = this.unit;
    const cycle = (this.time % 76) / 76;
    if (cycle > 0.62) return;
    const x = Math.round((-0.1 + cycle / 0.62 * 1.2) * this.w);
    const y = Math.round(this.h * 0.2 + Math.sin(this.time * 0.2) * 3 * u);
    const wings = Math.sin(this.time * 0.8) > 0.6 ? 1 : -1;
    ctx.fillStyle = '#4d6061';
    for (let i = -14; i <= 14; i++) {
      const row = Math.round(y + Math.abs(i) * 0.25 * wings * u);
      ctx.fillRect(Math.round(x + i * u), row, Math.max(1, Math.round(u)), Math.max(1, Math.round((Math.abs(i) < 4 ? 3 : 2) * u)));
    }
    ctx.fillStyle = '#d4cbb0';
    ctx.fillRect(x + Math.round(3 * u), y, Math.max(1, Math.round(3 * u)), Math.max(1, Math.round(2 * u)));
  }
}
