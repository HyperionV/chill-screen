import { hash } from '../../journeys/noise';
import { breeze } from '../../wind';
import type { ForestLights } from './lighting';
import type { CastSprites, Kind, Pose } from './sprites';
import {
  CLOCK_BOTTOM, CLOCK_TOP, HOLLOW_SCENE, HOLLOW_Y, hollowX, hutX, MEADOW_SCENE,
  MISTY_SCENE, stoneX, STREAM_SCENE, streamX, streamHalfWidth, TRAIL_SCENE,
} from './scenes';

type Mood = 'idle' | 'look' | 'move' | 'react';
interface Animal {
  kind: Kind;
  scene: number;
  home: number;
  base: number;
  size: number;
  x: number;
  y: number;
  offset: number;
  direction: number;
  mood: Mood;
  wait: number;
  age: number;
  attention: number;
  flight: number;
}

const NOTICE_RADIUS = 48;
const RETREAT_RADIUS = 25;
const LOOK_BEFORE_RETREAT = 0.3;
const WALK_SPEED = 9;
const ROAM_LIMIT = 23;
const FLIGHT_SECONDS = 12;
const BUTTERFLY_COUNT = 7;
const FIREFLY_COUNT = 32;

interface Insect { x: number; y: number; homeX: number; homeY: number; wait: number; phase: number }

export class Creatures {
  private width = 0;
  private animals: Animal[] = [];
  private butterflies: Insect[] = [];
  private fireflies: Insect[] = [];

  resize(width: number): void {
    this.width = width;
    this.animals = [];
    const add = (kind: Kind, scene: number, home: number, base: number, size = 1): void => {
      this.animals.push({ kind, scene, home, base, size, x: home, y: base, offset: 0, direction: 1,
        mood: 'idle', wait: 4 + hash(home) * 9, age: 0, attention: 0, flight: -1 });
    };
    add('deer', MISTY_SCENE, width * 0.43, 187, 1.15);
    add('deer', MISTY_SCENE, width * 0.56, 182, 0.9);
    add('fawn', MISTY_SCENE, width * 0.34, 208, 0.9);
    add('fawn', STREAM_SCENE, streamX(width, 228) + streamHalfWidth(228) + 13, 228, 0.9);
    add('frog', STREAM_SCENE, stoneX(width, 243), 242);
    add('kingfisher', STREAM_SCENE, width * 0.61, 163);
    add('fawn', MEADOW_SCENE, width * 0.32, 221, 0.9);
    add('fox', MEADOW_SCENE, width * 0.76, 232, 1.1);
    add('rabbit', MEADOW_SCENE, width * 0.18, 232, 1);
    add('rabbit', MEADOW_SCENE, width * 0.24, 241, 0.85);
    add('rabbit', MEADOW_SCENE, width * 0.29, 247, 0.75);
    add('fawn', HOLLOW_SCENE, width * 0.67, 236, 0.9);
    add('owl', HOLLOW_SCENE, hollowX(width), HOLLOW_Y + 3, 1.1);
    add('fawn', TRAIL_SCENE, width * 0.34, 219, 0.9);
    add('squirrel', TRAIL_SCENE, hutX(width) + 39, 130, 0.9);
    const insect = (i: number): Insect => ({ x: hash(i * 17 + 1) * width, y: 174 + hash(i * 29) * 77,
      homeX: hash(i * 17 + 1) * width, homeY: 174 + hash(i * 29) * 77,
      wait: 3 + hash(i * 7) * 8, phase: i * 1.73 });
    this.butterflies = Array.from({ length: BUTTERFLY_COUNT }, (_, i) => insect(i + 100));
    this.fireflies = Array.from({ length: FIREFLY_COUNT }, (_, i) => insect(i));
  }

  react(scene: number, kind: Kind): void {
    for (const a of this.animals) {
      if (a.scene !== scene || a.kind !== kind) continue;
      // Repeated clicks keep the response alive without snapping a hop back to the ground.
      if (a.mood === 'react') { a.wait = Math.max(a.wait, kind === 'owl' ? 3 : 1.1); continue; }
      a.mood = 'react'; a.age = 0; a.wait = kind === 'owl' ? 3 : 1.1;
    }
  }

  update(scene: number, dt: number, time: number, pointer: { x: number; y: number } | null, updateFireflies = true): void {
    for (const a of this.animals) {
      if (a.scene !== scene) continue;
      a.age += dt; a.wait -= dt;
      const dist = pointer ? Math.hypot(pointer.x - a.x, pointer.y - (a.y - 11)) : Infinity;
      a.attention = dist < NOTICE_RADIUS ? a.attention + dt : Math.max(0, a.attention - dt * 2);
      if (dist < NOTICE_RADIUS && a.mood !== 'react' && a.mood !== 'move') {
        a.mood = 'look';
        a.direction = pointer && pointer.x < a.x ? -1 : 1;
      }
      if (dist < RETREAT_RADIUS && a.attention > LOOK_BEFORE_RETREAT && a.mood !== 'react') {
        if (a.mood !== 'move') { a.mood = 'move'; a.age = 0; a.wait = 2.7; }
        a.direction = pointer && pointer.x < a.x ? 1 : -1;
        if ((a.kind === 'owl' || a.kind === 'kingfisher') && a.flight < 0) a.flight = 0;
      }
      if (a.wait <= 0 && a.mood !== 'react') {
        if (a.mood === 'move' || a.mood === 'look') {
          a.mood = 'idle'; a.age = 0; a.wait = 5 + hash(a.home + Math.floor(time)) * 10;
        } else {
          a.mood = (a.kind === 'fawn' && scene === HOLLOW_SCENE) || hash(a.home + Math.floor(time)) < 0.45 ? 'look' : 'move';
          a.direction = a.offset > 4 ? -1 : a.offset < -4 ? 1 : hash(time + a.home) < 0.5 ? -1 : 1;
          a.wait = 1.5 + hash(a.home + time) * 2;
          a.age = 0;
          if ((a.kind === 'owl' || a.kind === 'kingfisher') && hash(time) > 0.55) a.flight = 0;
        }
      }
      if (a.mood === 'react' && a.wait <= 0) { a.mood = 'idle'; a.wait = 5; a.age = 0; }
      const rooted = a.kind === 'owl' || a.kind === 'kingfisher' || (a.kind === 'fawn' && scene === HOLLOW_SCENE && a.mood === 'idle');
      if (a.mood === 'move' && !rooted) {
        a.offset += a.direction * WALK_SPEED * dt;
        if (Math.abs(a.offset) > ROAM_LIMIT) { a.direction *= -1; a.offset = Math.max(-ROAM_LIMIT, Math.min(ROAM_LIMIT, a.offset)); }
      }
      a.x = a.home + a.offset; a.y = a.base;
      if (a.flight >= 0) {
        a.flight += dt;
        const t = Math.min(1, a.flight / FLIGHT_SECONDS);
        a.x = a.home - Math.sin(t * Math.PI) * this.width * 0.49;
        a.y = a.base - Math.sin(t * Math.PI) * 89;
        a.direction = t < 0.5 ? -1 : 1;
        if (t === 1) { a.flight = -1; a.wait = 20; a.mood = 'idle'; }
      } else if (a.kind === 'frog' && a.mood === 'react') {
        const t = Math.min(1, a.age / 0.8);
        a.x += Math.sin(t * Math.PI) * 20;
        a.y -= Math.sin(t * Math.PI) * 22;
      } else if ((a.kind === 'rabbit' && a.mood === 'move') || (a.kind === 'fawn' && scene === MEADOW_SCENE && a.mood === 'move')) {
        a.y -= Math.abs(Math.sin(a.age * 3)) * (a.kind === 'fawn' ? 11 : 4);
      }
    }
    if (scene === MEADOW_SCENE) {
      for (const b of this.butterflies) {
        b.wait -= dt;
        if (b.wait <= 0) {
          b.homeX = Math.max(12, Math.min(this.width - 12, b.x + (hash(time + b.phase) - 0.5) * 70));
          b.homeY = 180 + hash(time * 0.3 + b.phase) * 58;
          b.wait = 5 + hash(time + b.phase * 7) * 8;
        }
        const near = pointer && Math.hypot(pointer.x - b.x, pointer.y - b.y) < 28;
        if (near && pointer) b.homeX = Math.max(9, Math.min(this.width - 9, b.x + Math.sign(b.x - pointer.x || 1) * 35));
        b.x += (b.homeX - b.x) * dt * 0.35;
        b.y += (b.homeY - b.y) * dt * 0.35;
      }
    }
    if (!updateFireflies) return;
    for (const f of this.fireflies) {
      const x = pointer ? pointer.x + Math.sin(time * 0.4 + f.phase) * 26
        : f.homeX + Math.sin(time * 0.16 + f.phase) * 18 + breeze(time, f.homeX) * 3;
      const y = pointer ? pointer.y + Math.cos(time * 0.3 + f.phase) * 19 : f.homeY + Math.sin(time * 0.27 + f.phase) * 9;
      f.x += (x - f.x) * dt * (pointer ? 1.5 : 0.3);
      f.y += (y - f.y) * dt * (pointer ? 1.5 : 0.3);
    }
  }

  draw(c: CanvasRenderingContext2D, scene: number, sprites: CastSprites, time: number): void {
    for (const a of this.animals) {
      if (a.scene !== scene || a.x < -36 || a.x > this.width + 36) continue;
      let pose: Pose = a.mood === 'look' || a.mood === 'react' ? 'alert' : a.mood === 'move' ? 'walk' : 'rest';
      if (a.kind === 'fawn' && scene === STREAM_SCENE && a.mood === 'idle') pose = 'drink';
      if (a.kind === 'fawn' && scene === HOLLOW_SCENE && a.mood === 'idle') pose = 'sleep';
      if (a.flight >= 0) pose = 'fly';
      if (a.kind === 'owl' && a.flight < 0 && a.mood !== 'react' && (time + a.home) % 7 < 0.2) pose = 'sleep';
      if (pose === 'walk' && Math.floor(a.age * 4) % 2 === 0) pose = 'alert';
      const sprite = sprites[a.kind][pose];
      const x = Math.round(a.x);
      const y = Math.round(a.y);
      const width = Math.round(sprite.width * a.size);
      const height = Math.round(sprite.height * a.size);
      c.save();
      c.translate(x, y);
      if (a.direction < 0 || pose === 'drink') c.scale(-1, 1);
      c.drawImage(sprite, -Math.floor(width / 2), -height, width, height);
      c.restore();
    }
    if (scene !== MEADOW_SCENE) return;
    for (const b of this.butterflies) {
      const x = Math.round(b.x);
      const y = Math.round(b.y + Math.sin(time * 1.6 + b.phase) * 3);
      const wing = Math.sin(time * 4 + b.phase) > 0 ? 3 : 1;
      c.fillStyle = b.phase % 3 > 1 ? '#e3b35f' : '#d1d3ae';
      c.fillRect(x - wing, y - 1, wing, 3); c.fillRect(x + 1, y - 1, wing, 3);
      c.fillStyle = '#4b4632'; c.fillRect(x, y, 1, 3);
    }
  }

  glow(c: CanvasRenderingContext2D, scene: number, time: number, night: number, lights: ForestLights): void {
    const hollow = scene === HOLLOW_SCENE;
    const strength = Math.max(hollow ? 0.22 : 0, night);
    const count = hollow ? FIREFLY_COUNT : Math.round(FIREFLY_COUNT * night * 0.6);
    for (let i = 0; i < count; i++) {
      const f = this.fireflies[i];
      const light = (0.5 + Math.sin(time * 0.8 + f.phase) * 0.5) * strength;
      const center = f.x > this.width * 0.38 && f.x < this.width * 0.63;
      const behindClock = center && f.y >= CLOCK_TOP && f.y <= CLOCK_BOTTOM;
      lights.drawFirefly(c, Math.round(f.x), Math.round(f.y), behindClock ? light * 0.36 : light);
    }
    c.globalAlpha = 1;
  }
}
