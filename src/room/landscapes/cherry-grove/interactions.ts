import { hash } from '../../journeys/noise';
import { DESIGN_HEIGHT, SCENES, waterSpan, type Point, type Scene } from './scenes';
import { oval, rect, sprite, type Sprites } from './sprites';
import type { GroveLife } from './life';

interface Petal {
  x: number; y: number; vx: number; vy: number; age: number; life: number; seed: number; scene: number;
  swirl: boolean; centerX: number; centerY: number;
}
interface Ripple { x: number; y: number; age: number; scene: number }
const AMBIENT_PETALS = 82;
const BURST_PETALS = 96;
const SHOWER_COUNT = 32;
const RIPPLE_COUNT = 8;
const LANTERN_SECONDS = 35;
const RIPPLE_SECONDS = 3.6;
const TAU = Math.PI * 2;
const MAX_GUST = 11;
const POINTER_SPEED = 120;
const GUST_EASING = 8;

export class GroveInteractions {
  gust = 0;
  gustY = 0;
  private previous: Point | null = null;
  private burstCursor = AMBIENT_PETALS;
  private rippleCursor = 0;
  private width = 1;
  private readonly petals: Petal[] = Array.from({ length: AMBIENT_PETALS + BURST_PETALS }, (_, i) => ({
    x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, seed: i, scene: -1,
    swirl: false, centerX: 0, centerY: 0,
  }));
  private readonly ripples: Ripple[] = Array.from({ length: RIPPLE_COUNT }, () => ({ x: 0, y: 0, age: RIPPLE_SECONDS, scene: -1 }));
  private readonly lamps = SCENES.map((scene) => new Float32Array(scene.lanterns.length));

  resize(width: number): void {
    this.width = width;
    this.previous = null;
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.x = hash(i + 13) * width;
      p.y = hash(i + 29) * DESIGN_HEIGHT;
      p.age = 0;
      p.life = i < AMBIENT_PETALS ? Infinity : 0;
      p.vx = 1 + hash(i + 7) * 4;
      p.vy = 4 + hash(i + 61) * 7;
      p.scene = -1;
      p.swirl = false;
    }
    for (const ripple of this.ripples) ripple.age = RIPPLE_SECONDS;
  }

  update(dt: number, time: number, pointer: Point | null): void {
    let movement = 0;
    let vertical = 0;
    if (pointer && this.previous) {
      const travel = Math.max(1, dt * POINTER_SPEED);
      movement = Math.max(-1, Math.min(1, (pointer.x - this.previous.x) / travel));
      vertical = Math.max(-1, Math.min(1, (pointer.y - this.previous.y) / travel));
    }
    this.gust += (movement * MAX_GUST - this.gust) * Math.min(1, dt * GUST_EASING);
    this.gustY += (vertical * MAX_GUST - this.gustY) * Math.min(1, dt * GUST_EASING);
    if (pointer) {
      if (!this.previous) this.previous = { x: pointer.x, y: pointer.y };
      else { this.previous.x = pointer.x; this.previous.y = pointer.y }
    } else this.previous = null;
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      if (p.life <= p.age) continue;
      p.age += dt;
      if (p.swirl) {
        const angle = p.age * 1.8 + p.seed * 0.6;
        const radius = 6 + p.age * 4 + hash(p.seed) * 9;
        p.x = p.centerX + Math.cos(angle) * radius + this.gust * 0.2;
        p.y = p.centerY + Math.sin(angle) * radius * 0.45 + p.age * 3;
      } else {
        p.x += (p.vx + this.gust * (0.7 + hash(i) * 0.5) + Math.sin(time * 0.6 + p.seed) * 2) * dt;
        p.y += (p.vy + this.gustY * 0.6) * dt;
      }
      if (i < AMBIENT_PETALS) {
        if (p.y > 274) { p.y = -4; p.x = hash(p.seed + Math.floor(time)) * this.width }
        p.x = (p.x + this.width + 6) % (this.width + 6);
      }
    }
    for (const ripple of this.ripples) ripple.age += dt;
    for (const lamps of this.lamps) for (let i = 0; i < lamps.length; i++) lamps[i] = Math.max(0, lamps[i] - dt);
  }

  private shower(x: number, y: number, scene: number, swirl: boolean): void {
    for (let i = 0; i < SHOWER_COUNT; i++) {
      const p = this.petals[this.burstCursor];
      this.burstCursor = AMBIENT_PETALS + (this.burstCursor - AMBIENT_PETALS + 1) % BURST_PETALS;
      const angle = i / SHOWER_COUNT * TAU;
      p.x = x + (hash(i + p.seed) - 0.5) * (swirl ? 25 : 60);
      p.y = y + (hash(i + 31) - 0.5) * 14;
      p.vx = swirl ? Math.cos(angle) * 17 : (hash(i + 71) - 0.5) * 13;
      p.vy = swirl ? Math.sin(angle) * 10 + 4 : 9 + hash(i) * 11;
      p.life = 7;
      p.age = 0;
      p.scene = scene;
      p.swirl = swirl;
      p.centerX = x;
      p.centerY = y;
    }
    this.gust = Math.min(MAX_GUST, this.gust + 1.5);
  }

  press(x: number, y: number, chapter: number, parallaxX: number, parallaxY: number, life: GroveLife): void {
    const scene = SCENES[chapter];
    const groundX = x - Math.round(parallaxX * 0.75);
    const groundY = y - Math.round(parallaxY * 0.75);
    if (Math.abs(groundX - life.catX(scene, this.width)) < 19 && Math.abs(groundY - scene.cat.y + 9) < 18) {
      life.reactCat();
      return;
    }
    for (let i = 0; i < scene.lanterns.length; i++) {
      const lamp = scene.lanterns[i];
      if (Math.abs(groundX - lamp.u * this.width) < 12 && Math.abs(groundY - lamp.y + 7) < 12) {
        this.lamps[chapter][i] = LANTERN_SECONDS;
        return;
      }
    }
    // The stone lantern is a light too; its timer follows the first hanging lamp.
    const stoneX = this.width * (chapter === 1 ? 0.16 : 0.86);
    const stoneY = chapter === 1 ? 243 : 252;
    if (Math.abs(groundX - stoneX) < 14 && groundY > stoneY - 52 && groundY < stoneY + 3) {
      this.lamps[chapter][0] = LANTERN_SECONDS;
      return;
    }
    if (scene.bridge && Math.abs(groundX - scene.bridge.x * this.width) < 42 && Math.abs(groundY - scene.bridge.y + 7) < 24) {
      this.shower(groundX, scene.bridge.y - 14, chapter, true);
      return;
    }
    const span = waterSpan(scene, groundY, this.width);
    if (span && groundX >= span[0] && groundX <= span[1]) {
      const ripple = this.ripples[this.rippleCursor];
      this.rippleCursor = (this.rippleCursor + 1) % RIPPLE_COUNT;
      ripple.x = groundX; ripple.y = groundY; ripple.age = 0; ripple.scene = chapter;
      if (scene.water === 'pond') life.gather(groundX, groundY);
      return;
    }
    for (const tree of scene.trees) {
      const treeX = tree.u * this.width + Math.round(parallaxX);
      const treeY = tree.y + Math.round(parallaxY);
      if (Math.abs(x - treeX) < 51 * tree.size && y > treeY - 104 * tree.size && y < treeY + 3) {
        this.shower(x - parallaxX, Math.max(treeY - 80 * tree.size, y - 6), chapter, false);
        return;
      }
    }
  }

  drawWater(ctx: CanvasRenderingContext2D, scene: Scene, chapter: number, time: number): void {
    if (!scene.water) return;
    for (let i = 0; i < 48; i++) {
      const y = 181 + hash(i + 9) * (scene.water === 'pond' ? 53 : 83);
      const span = waterSpan(scene, y, this.width);
      if (!span) continue;
      const t = (hash(i + 43) + time * 0.006) % 1;
      const x = span[0] + t * (span[1] - span[0]);
      rect(ctx, i % 3 === 0 ? '#c3c8b7' : '#96b2a6', x, y, 3 + hash(i) * 8, 1);
    }
    for (let i = 0; i < 35; i++) {
      const y = scene.water === 'stream' ? 178 + (hash(i) * 89 + time * 2) % 89 : 185 + hash(i) * 48;
      const span = waterSpan(scene, y, this.width);
      if (!span) continue;
      const x = span[0] + (0.12 + hash(i + 100) * 0.76) * (span[1] - span[0]) + Math.sin(time * 0.2 + i) * 2;
      rect(ctx, '#edc1ce', x, y, 3, 1);
      if (i % 5 === 0) rect(ctx, '#f9dce1', x + 1, y - 1, 1, 1);
    }
    for (const ripple of this.ripples) {
      if (ripple.scene !== chapter || ripple.age >= RIPPLE_SECONDS) continue;
      for (let ring = 0; ring < 3; ring++) {
        const age = ripple.age - ring * 0.4;
        if (age < 0) continue;
        const radius = 2 + age * 10;
        ctx.fillStyle = `rgba(244,220,207,${Math.max(0, 0.8 - age / RIPPLE_SECONDS)})`;
        for (let step = 0; step < 64; step++) {
          const angle = step / 64 * TAU;
          const x = Math.round(ripple.x + Math.cos(angle) * radius);
          const y = Math.round(ripple.y + Math.sin(angle) * radius * 0.35);
          const span = waterSpan(scene, y, this.width);
          if (span && x >= span[0] && x <= span[1]) ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  drawPetals(ctx: CanvasRenderingContext2D, chapter: number, time: number, night: number): void {
    for (const p of this.petals) {
      if (p.age >= p.life || (p.scene !== -1 && p.scene !== chapter) || p.x < -3 || p.x > this.width + 3 || p.y > 274) continue;
      const x = Math.round(p.x + Math.sin(time + p.seed) * 3);
      const y = Math.round(p.y);
      // Petals in front of the clock stay small and muted.
      const central = y > 78 && y < 152 && x > this.width * 0.3 && x < this.width * 0.7;
      const color = central ? '#c4a7b9' : night > 0.6 ? '#c3a2bd' : p.seed % 3 ? '#f6cbd9' : '#df9fb9';
      if (chapter === 4 && night > 0.6 && !central && p.seed % 6 === 0) {
        rect(ctx, 'rgba(248,195,214,0.1)', x - 1, y - 1, 4, 3);
      }
      rect(ctx, color, x, y, central ? 1 : 2, 1);
      if (p.seed % 4 === 0 && !central) rect(ctx, night > 0.6 ? '#ead4dc' : '#ffe0e5', x + 1, y - 1, 1, 1);
    }
  }

  drawLanterns(ctx: CanvasRenderingContext2D, scene: Scene, chapter: number, time: number, night: number, assets: Sprites): void {
    const lamps = this.lamps[chapter];
    for (let i = 0; i < scene.lanterns.length; i++) {
      const lamp = scene.lanterns[i];
      const x = Math.round(lamp.u * this.width + Math.sin(time * 0.5 + i) + this.gust * 0.15);
      const y = lamp.y;
      const lit = Math.max(night, chapter === 4 ? 0.85 : 0, Math.min(1, lamps[i] / 3));
      const warmth = Math.max(0, (lamps[i] - (LANTERN_SECONDS - 3)) / 3);
      rect(ctx, '#725761', x, y - 29, 1, 17);
      sprite(ctx, assets.lantern, x, y);
      if (lit <= 0.02) continue;
      ctx.fillStyle = `rgba(250,190,117,${lit * 0.08 + warmth * 0.12})`;
      oval(ctx, ctx.fillStyle, x, y - 7, 17 + Math.round(warmth * 5), 21);
      rect(ctx, '#edbe87', x - 3, y - 10, 6, 6);
      rect(ctx, '#ffe7b5', x - 1, y - 9, 2, 4);
      ctx.fillStyle = `rgba(247,197,130,${lit * 0.1})`;
      oval(ctx, ctx.fillStyle, x, y + 22, 19, 4);
    }
    const stoneX = this.width * (chapter === 1 ? 0.16 : 0.86);
    const stoneY = (chapter === 1 ? 243 : 252) - 32;
    const lit = Math.max(night, Math.min(1, lamps[0] / 3));
    const warmth = Math.max(0, (lamps[0] - (LANTERN_SECONDS - 3)) / 3);
    if (lit > 0.02) {
      ctx.fillStyle = `rgba(248,195,126,${lit * 0.12 + warmth * 0.14})`;
      oval(ctx, ctx.fillStyle, stoneX, stoneY, 17, 14);
      rect(ctx, '#e5b883', stoneX - 4, stoneY - 2, 8, 5);
      rect(ctx, '#ffdf9d', stoneX - 2, stoneY - 1, 4, 3);
    }
  }
}
