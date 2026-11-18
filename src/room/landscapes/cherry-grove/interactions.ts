import { hash } from '../../journeys/noise';
import { breeze, gust } from '../../wind';
import { DESIGN_HEIGHT, SCENES, waterSpan, type Point, type Scene } from './scenes';
import { GroveLighting } from './lighting';
import { rect } from './sprites';
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
const RIPPLE_SECONDS = 3.6;
const TAU = Math.PI * 2;
const PETAL_GUST_SPEED = 7; // Extra downwind travel in stage pixels per second.
const PETAL_FLUTTER = 3; // Horizontal flutter in stage pixels.
const WATER_PETAL_SWAY = 2; // Surface petals move less than airborne ones.
const SCATTER_RADIUS = 22; // Cursor motion only stirs nearby airborne petals.
const SCATTER_GAIN = 0.12; // Fraction of cursor travel transferred to a nearby petal.
const SCATTER_STEP = 2; // Cap the push at two stage pixels per frame.
const SWIRL_DRIFT = 0.25; // Sheltered bridge swirls drift more slowly than falling petals.

export class GroveInteractions {
  readonly lighting = new GroveLighting();
  private readonly lastPointer: Point = { x: 0, y: 0 };
  private hadPointer = false;
  private burstCursor = AMBIENT_PETALS;
  private rippleCursor = 0;
  private width = 1;
  private readonly petals: Petal[] = Array.from({ length: AMBIENT_PETALS + BURST_PETALS }, (_, i) => ({
    x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, seed: i, scene: -1,
    swirl: false, centerX: 0, centerY: 0,
  }));
  private readonly ripples: Ripple[] = Array.from({ length: RIPPLE_COUNT }, () => ({ x: 0, y: 0, age: RIPPLE_SECONDS, scene: -1 }));

  resize(width: number): void {
    this.width = width;
    this.lighting.resize(width);
    this.hadPointer = false;
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
    let scatterX = 0;
    let scatterY = 0;
    if (pointer && this.hadPointer) {
      scatterX = Math.max(-SCATTER_STEP, Math.min(SCATTER_STEP, (pointer.x - this.lastPointer.x) * SCATTER_GAIN));
      scatterY = Math.max(-SCATTER_STEP, Math.min(SCATTER_STEP, (pointer.y - this.lastPointer.y) * SCATTER_GAIN));
    }
    if (pointer) {
      this.lastPointer.x = pointer.x;
      this.lastPointer.y = pointer.y;
    }
    this.hadPointer = pointer !== null;
    const drift = gust(time) * PETAL_GUST_SPEED * dt;
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      if (p.life <= p.age) continue;
      p.age += dt;
      if (p.swirl) {
        p.centerX += drift * SWIRL_DRIFT;
        const angle = p.age * 1.8 + p.seed * 0.6;
        const radius = 6 + p.age * 4 + hash(p.seed) * 9;
        p.x = p.centerX + Math.cos(angle) * radius;
        p.y = p.centerY + Math.sin(angle) * radius * 0.45 + p.age * 3;
      } else {
        p.x += p.vx * dt + drift;
        p.y += p.vy * dt;
        if (pointer && (scatterX || scatterY)) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const reach = 1 - (dx * dx + dy * dy) / (SCATTER_RADIUS * SCATTER_RADIUS);
          if (reach > 0) {
            p.x += scatterX * reach;
            p.y += scatterY * reach;
          }
        }
      }
      if (i < AMBIENT_PETALS) {
        if (p.y > 274) { p.y = -4; p.x = hash(p.seed + Math.floor(time)) * this.width }
        p.x = (p.x + this.width + 6) % (this.width + 6);
      }
    }
    for (const ripple of this.ripples) ripple.age += dt;
    this.lighting.update(dt);
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
  }

  press(x: number, y: number, chapter: number, life: GroveLife): void {
    const scene = SCENES[chapter];
    if (Math.abs(x - life.catX(scene, this.width)) < 19 && Math.abs(y - scene.cat.y + 9) < 18) {
      life.reactCat();
      return;
    }
    if (this.lighting.press(x, y, chapter)) return;
    if (scene.bridge && Math.abs(x - scene.bridge.x * this.width) < 42 && Math.abs(y - scene.bridge.y + 7) < 24) {
      this.shower(x, scene.bridge.y - 14, chapter, true);
      return;
    }
    const span = waterSpan(scene, y, this.width);
    if (span && x >= span[0] && x <= span[1]) {
      const ripple = this.ripples[this.rippleCursor];
      this.rippleCursor = (this.rippleCursor + 1) % RIPPLE_COUNT;
      ripple.x = x; ripple.y = y; ripple.age = 0; ripple.scene = chapter;
      if (scene.water === 'pond') life.gather(x, y);
      return;
    }
    for (const tree of scene.trees) {
      const treeX = tree.u * this.width;
      if (Math.abs(x - treeX) < 51 * tree.size && y > tree.y - 104 * tree.size && y < tree.y + 3) {
        this.shower(x, Math.max(tree.y - 80 * tree.size, y - 6), chapter, false);
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
      const baseX = span[0] + (0.12 + hash(i + 100) * 0.76) * (span[1] - span[0]);
      const x = baseX + breeze(time, baseX) * WATER_PETAL_SWAY;
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
    ctx.save();
    for (const p of this.petals) {
      if (p.age >= p.life || (p.scene !== -1 && p.scene !== chapter) || p.x < -3 || p.x > this.width + 3 || p.y > 274) continue;
      const x = Math.round(p.x + breeze(time, p.x) * PETAL_FLUTTER);
      const y = Math.round(p.y);
      // Petals in front of the clock stay small and muted.
      const central = y > 78 && y < 152 && x > this.width * 0.3 && x < this.width * 0.7;
      const color = central ? '#c4a7b9' : night > 0.6 ? '#c3a2bd' : p.seed % 3 ? '#f6cbd9' : '#df9fb9';
      const width = central ? 1 : 2;
      rect(ctx, color, x, y, width, 1);
      if (p.seed % 4 === 0 && !central) rect(ctx, night > 0.6 ? '#ead4dc' : '#ffe0e5', x + 1, y - 1, 1, 1);
      const glow = this.lighting.petalLight(x, y);
      if (glow > 0.02) {
        ctx.globalAlpha = glow * (central ? 0.2 : 0.96);
        rect(ctx, '#ffc09c', x, y, width, 1);
        if (!central && p.seed % 4 === 0) rect(ctx, '#ffe6bb', x + 1, y - 1, 1, 1);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }
}
