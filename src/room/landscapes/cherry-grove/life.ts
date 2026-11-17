import { hash } from '../../journeys/noise';
import { SCENES, waterSpan, type Point, type Scene } from './scenes';
import { CREAM, INK, oval, rect, sprite, type Sprites } from './sprites';

type CatMood = 'idle' | 'look' | 'walk' | 'stretch' | 'hop' | 'sleep';
type PersonMood = 'rest' | 'sip' | 'look';
interface Fish { x: number; y: number; vx: number; vy: number; wait: number; mode: 'swim' | 'rest' | 'gather' }
interface Crane { x: number; y: number; wait: number; mode: 'flap' | 'glide' | 'away'; age: number }
interface Firefly { u: number; y: number; age: number; wait: number; mode: 'drift' | 'hover' | 'avoid' }
const FISH_COUNT = 6;
const CRANE_COUNT = 3;
const FIREFLY_COUNT = 18;
const CAT_SCALE = 1.12;
const CAT_REACT_SECONDS = 2.4;
const FEED_SECONDS = 12;

export class GroveLife {
  private catMood: CatMood = 'idle';
  private catAge = 0;
  private catWait = 5;
  private catOffset = 0;
  private catDirection = 1;
  private catChapter = -1;
  private catVisits = 0;
  private personMood: PersonMood = 'rest';
  private personWait = 6;
  private personAge = 0;
  private feedAge = 0;
  private feed: Point = { x: 0, y: 209 };
  private readonly fish: Fish[] = Array.from({ length: FISH_COUNT }, (_, i) => ({
    x: 0.26 + i * 0.09, y: 196 + hash(i) * 24, vx: i % 2 ? 4 : -4, vy: 0,
    wait: 3 + hash(i + 8) * 5, mode: 'swim',
  }));
  private readonly cranes: Crane[] = Array.from({ length: CRANE_COUNT }, (_, i) => ({
    x: -30 - i * 28, y: 40 + i * 13, wait: i * 2, mode: 'flap', age: i * 2,
  }));
  private readonly fireflies: Firefly[] = Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
    u: hash(i + 24), y: 174 + hash(i + 51) * 72, age: hash(i) * 8,
    wait: 3 + hash(i + 8) * 5, mode: 'drift',
  }));

  catX(scene: Scene, width: number): number { return scene.cat.x * width + this.catOffset }

  reactCat(): void {
    this.catVisits++;
    this.catMood = this.catVisits % 2 ? 'stretch' : 'hop';
    this.catAge = 0;
    this.catWait = CAT_REACT_SECONDS;
  }

  gather(x: number, y: number): void {
    this.feed.x = x;
    this.feed.y = y;
    this.feedAge = FEED_SECONDS;
    for (const fish of this.fish) fish.mode = 'gather';
  }

  update(dt: number, time: number, width: number, chapter: number, pointer: Point | null): void {
    const scene = SCENES[chapter];
    if (this.catChapter !== chapter) {
      this.catChapter = chapter;
      this.catMood = chapter === 4 ? 'sleep' : chapter === 1 ? 'look' : 'idle';
      this.catOffset = 0;
      this.catAge = 0;
      this.catWait = 5;
    }
    this.catAge += dt;
    this.catWait -= dt;
    const close = pointer && Math.hypot(pointer.x - this.catX(scene, width), pointer.y - scene.cat.y + 8) < 34;
    if (close && this.catMood === 'idle') {
      this.catMood = 'look';
      this.catAge = 0;
      this.catWait = 2;
    }
    if (this.catMood === 'walk') {
      this.catOffset += this.catDirection * dt * 3;
      if (Math.abs(this.catOffset) > 9) this.catDirection *= -1;
    }
    if (this.catWait <= 0) {
      const choice = hash(this.catVisits++ + chapter * 41);
      this.catMood = chapter === 4 ? 'sleep' : chapter === 3 && choice < 0.5 ? 'hop' : choice < 0.35 ? 'walk' : choice < 0.7 ? 'look' : 'idle';
      this.catAge = 0;
      this.catWait = this.catMood === 'hop' ? CAT_REACT_SECONDS : 4 + choice * 7;
    }
    this.personWait -= dt;
    this.personAge += dt;
    if (chapter === 0 && pointer && Math.hypot(pointer.x - width * 0.21, pointer.y - 208) < 35 && this.personMood === 'rest') {
      this.personMood = 'look'; this.personAge = 0; this.personWait = 3;
    }
    if (this.personWait <= 0) {
      this.personMood = this.personMood === 'rest' ? 'sip' : 'rest';
      this.personAge = 0;
      this.personWait = this.personMood === 'rest' ? 8 + hash(time) * 10 : 4;
    }
    this.feedAge = Math.max(0, this.feedAge - dt);
    for (let i = 0; i < this.fish.length; i++) {
      const fish = this.fish[i];
      fish.wait -= dt;
      if (this.feedAge > 0) {
        const targetX = this.feed.x / width + Math.cos(i * 2.4 + time * 0.3) * 0.025;
        const targetY = this.feed.y + Math.sin(i * 2.4 + time * 0.3) * 5;
        fish.vx = (targetX - fish.x) * width * 0.8;
        fish.vy = (targetY - fish.y) * 0.8;
      } else if (fish.wait <= 0 || fish.mode === 'gather') {
        fish.mode = fish.mode === 'swim' ? 'rest' : 'swim';
        fish.wait = 3 + hash(time + i) * 8;
        fish.vx = fish.mode === 'rest' ? 0 : (hash(time * 2 + i) - 0.5) * 11;
        fish.vy = fish.mode === 'rest' ? 0 : (hash(time + i + 13) - 0.5) * 3;
      }
      fish.x += fish.vx * dt / width;
      fish.y += fish.vy * dt;
      if (fish.y < 187 || fish.y > 231) { fish.y = Math.min(231, Math.max(187, fish.y)); fish.vy *= -1 }
      const span = waterSpan(SCENES[1], fish.y, width);
      if (span) {
        const left = (span[0] + 10) / width;
        const right = (span[1] - 10) / width;
        if (fish.x < left || fish.x > right) { fish.x = Math.min(right, Math.max(left, fish.x)); fish.vx *= -1 }
      }
    }
    for (const crane of this.cranes) {
      crane.age += dt;
      crane.wait -= dt;
      if (crane.mode === 'away') {
        if (crane.wait <= 0) { crane.x = -25; crane.mode = 'flap'; crane.age = 0 }
        continue;
      }
      crane.x += dt * (crane.mode === 'glide' ? 9 : 12);
      if (crane.age > (crane.mode === 'glide' ? 7 : 4)) {
        crane.mode = crane.mode === 'glide' ? 'flap' : 'glide'; crane.age = 0;
      }
      if (crane.x > width + 25) { crane.mode = 'away'; crane.wait = 18 + hash(crane.y + time) * 22 }
    }
    for (let i = 0; i < this.fireflies.length; i++) {
      const fly = this.fireflies[i];
      fly.age += dt;
      fly.wait -= dt;
      if (pointer && Math.hypot(pointer.x - fly.u * width, pointer.y - fly.y) < 25) {
        fly.mode = 'avoid'; fly.wait = 2;
        fly.u += Math.sign(fly.u * width - pointer.x || 1) * dt * 5 / width;
        fly.y = Math.max(174, Math.min(248, fly.y - dt * 4));
      } else if (fly.wait <= 0) {
        fly.mode = fly.mode === 'hover' ? 'drift' : 'hover';
        fly.wait = 3 + hash(time + i) * 5;
      }
      if (fly.mode === 'drift') fly.u += Math.sin(time * 0.2 + i) * dt * 2 / width;
      fly.u = (fly.u + 1) % 1;
    }
  }

  drawCat(ctx: CanvasRenderingContext2D, scene: Scene, width: number, assets: Sprites, time: number): void {
    const x = this.catX(scene, width);
    let y = scene.cat.y;
    const hop = this.catMood === 'hop' ? Math.max(0, Math.sin(Math.min(1, this.catAge / 1.2) * Math.PI)) : 0;
    y -= hop * 10;
    oval(ctx, '#6c7867', x, scene.cat.y, 12, 2);
    const sleeping = this.catMood === 'sleep' && scene === SCENES[4];
    const breathing = sleeping && Math.sin(time * 1.4) > 0.5 ? 1 : 0;
    if (this.catMood === 'stretch') {
      const stretch = Math.sin(Math.min(1, this.catAge / CAT_REACT_SECONDS) * Math.PI);
      ctx.drawImage(assets.cat, Math.round(x - 13), Math.round(y - 17 + stretch * 4), Math.round(25 + stretch * 7), Math.round(18 - stretch * 4));
    } else sprite(ctx, sleeping ? assets.sleepingCat : assets.cat, x + hop * 4, y - breathing, CAT_SCALE);
    if (this.catMood === 'look') {
      rect(ctx, '#f7d89e', x + 12, y - 14, 2, 2);
      rect(ctx, INK, x + 12, y - 14, 1, 1);
    }
    if (this.catMood === 'hop') rect(ctx, '#f9cfdb', x + 13 + Math.sin(time * 2) * 5, y - 17, 2, 1);
    if (!sleeping && Math.floor(time * 0.4) % 7 === 0) rect(ctx, '#f4bb70', x + 8, y - 12, 4, 1);
  }

  drawPerson(ctx: CanvasRenderingContext2D, width: number, assets: Sprites): void {
    const x = width * 0.215;
    sprite(ctx, assets.person, x, 220);
    const lift = this.personMood === 'sip' ? Math.round(Math.sin(Math.min(1, this.personAge / 4) * Math.PI) * 8) : 0;
    rect(ctx, '#eac29f', x + 5, 211 - lift, 6, 3);
    rect(ctx, CREAM, x + 9, 208 - lift, 4, 4);
    if (this.personMood === 'look') rect(ctx, INK, x + 3, 198, 1, 1);
  }

  drawFish(ctx: CanvasRenderingContext2D, width: number, time: number): void {
    for (let i = 0; i < this.fish.length; i++) {
      const fish = this.fish[i];
      const x = Math.round(fish.x * width);
      const y = Math.round(fish.y);
      const dir = fish.vx < 0 ? -1 : 1;
      const tail = Math.round(Math.sin(time * (fish.mode === 'rest' ? 1 : 3) + i));
      oval(ctx, i % 2 ? '#eccbac' : '#e7b093', x, y, 7, 3);
      rect(ctx, '#cc795f', x - 2, y - 2, 4, 3);
      rect(ctx, '#8c7970', x - dir * 8, y - 2 + tail, 3, 4);
      rect(ctx, INK, x + dir * 5, y - 1, 1, 1);
      rect(ctx, '#b7ceba', x - 2, y + 3, 5, 1);
    }
  }

  drawCranes(ctx: CanvasRenderingContext2D, time: number): void {
    for (const crane of this.cranes) {
      if (crane.mode === 'away') continue;
      const x = Math.round(crane.x);
      const y = Math.round(crane.y + Math.sin(time * 0.2 + crane.y) * 2);
      const lift = crane.mode === 'glide' ? -2 : Math.round(Math.sin(crane.age * 3) * 6);
      rect(ctx, '#f1e9dc', x - 5, y, 10, 3);
      rect(ctx, '#ebe7df', x + 4, y - 1, 6, 2);
      rect(ctx, '#c4776a', x + 8, y - 2, 2, 1);
      rect(ctx, '#6c6670', x + 10, y, 4, 1);
      rect(ctx, '#665d65', x - 12, y + 2, 8, 1);
      for (let wing = 0; wing < 9; wing++) {
        rect(ctx, wing > 6 ? '#777079' : '#eee6da', x - wing, y + Math.round(lift * wing / 9), 2, 2);
        rect(ctx, wing > 6 ? '#777079' : '#eee6da', x + wing, y - Math.round(lift * wing / 9), 2, 2);
      }
    }
  }

  drawFireflies(ctx: CanvasRenderingContext2D, time: number, night: number, chapter: number, width: number): void {
    const strength = Math.max(night, chapter === 4 ? 0.65 : 0);
    if (strength < 0.25) return;
    for (let i = 0; i < this.fireflies.length; i++) {
      const fly = this.fireflies[i];
      const glow = (0.5 + Math.sin(time * 0.65 + i * 2) * 0.5) * strength;
      const x = Math.round(fly.u * width);
      const y = Math.round(fly.y + Math.sin(fly.age + i) * 2);
      ctx.fillStyle = `rgba(230,231,160,${glow * 0.14})`;
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = `rgba(247,240,176,${glow})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
