import { memoryCanvas } from '../../../render/pixel-stage';
import type { ViewFrame } from '../../view';
import { layout, type Spot } from './scenes';
import { line, oval } from './sprites';

const RIPPLE_LIMIT = 12;
const FEED_SECONDS = 12;
const GROOVE_FADE_STEP = 0.25;
const GROOVE_LIFETIME = 60;
const RADIUS = 22;
interface Ripple extends Spot { age: number }

export class GardenInteractions {
  private readonly sand = memoryCanvas(1, 90);
  private previous: Spot | null = null;
  private fadeAge = 0;
  private sandAge = GROOVE_LIFETIME;
  private readonly rings: Ripple[] = [];
  private ringCursor = 0;
  private width = 0;
  private currentScene = -1;
  readonly lights = [false, false, false, false, false];
  bow = 0;
  tip = 0;
  chime = 0;
  feed = 0;
  readonly food: Spot = { x: 0, y: 0 };

  resize(width: number): void {
    this.width = width;
    this.sand.canvas.width = width;
    this.sand.ctx.imageSmoothingEnabled = false;
    this.previous = null;
    this.sandAge = GROOVE_LIFETIME;
    this.rings.length = 0;
    this.ringCursor = 0;
  }

  private ripple(x: number, y: number): void {
    const existing = this.rings[this.ringCursor];
    if (existing) { existing.x = x; existing.y = y; existing.age = 0; }
    else this.rings.push({ x, y, age: 0 });
    this.ringCursor = (this.ringCursor + 1) % RIPPLE_LIMIT;
  }

  feedAt(x: number, y: number): void {
    this.food.x = x; this.food.y = y; this.feed = FEED_SECONDS;
    this.ripple(x, y);
  }

  press(scene: number, x: number, y: number): void {
    const p = layout(scene, this.width);
    if (Math.abs(x - p.monk.x) < 15 && y > p.monk.y - 32 && y < p.monk.y + 3) {
      this.bow = 2.8;
      return;
    }
    if (scene !== 3 && Math.abs(x - p.lantern.x) < RADIUS && y > p.lantern.y - 48 && y < p.lantern.y + 3) {
      this.lights[scene] = true;
      this.ripple(p.lantern.x, p.lantern.y - 26);
      return;
    }
    if (scene === 4 && Math.abs(x - this.width * 0.12) < RADIUS && y > 147 && y < 201) {
      this.lights[4] = true;
      this.ripple(this.width * 0.12, 170);
      return;
    }
    if (scene === 2 && Math.abs(x - p.feature.x) < 37 && y > p.feature.y - 40 && y < p.feature.y + 27) {
      this.tip = 2.4;
      this.ripple(p.feature.x + 14, p.feature.y + 11);
      return;
    }
    if (scene === 3 && Math.abs(x - p.chime.x) < RADIUS && Math.abs(y - p.chime.y) < 30) {
      this.chime = 7;
      return;
    }
    if ((scene === 1 || scene === 4) && ((x - p.pond.x) / p.pond.rx) ** 2 + ((y - p.pond.y) / p.pond.ry) ** 2 < 0.90) {
      const dx = x - p.pond.x;
      const dy = y - p.pond.y;
      const distance = Math.hypot(dx / p.pond.rx, dy / p.pond.ry);
      const inset = distance > 0.72 ? 0.72 / distance : 1;
      this.feedAt(p.pond.x + dx * inset, p.pond.y + dy * inset);
      this.ripple(x, y);
    }
  }

  update(frame: ViewFrame, scene: number): void {
    const dt = frame.dt;
    if (scene !== this.currentScene) {
      this.previous = null;
      this.feed = 0;
      this.currentScene = scene;
    }
    this.bow = Math.max(0, this.bow - dt);
    this.tip = Math.max(0, this.tip - dt);
    this.chime = Math.max(0, this.chime - dt);
    this.feed = Math.max(0, this.feed - dt);
    for (const ring of this.rings) ring.age += dt;
    this.fadeAge += dt;
    this.sandAge += dt;
    if (this.fadeAge >= GROOVE_FADE_STEP) {
      const ctx = this.sand.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, this.width, 90);
      ctx.restore();
      // Clear the faint remainder that an eight-bit alpha channel cannot fade away.
      if (this.sandAge >= GROOVE_LIFETIME) ctx.clearRect(0, 0, this.width, 90);
      this.fadeAge = 0;
    }
    const pointer = frame.pointer;
    if (scene !== 0 || !pointer || pointer.y < 185 || pointer.y > 263) {
      this.previous = null;
      return;
    }
    const old = this.previous;
    if (old && Math.hypot(pointer.x - old.x, pointer.y - old.y) < 60) {
      this.sandAge = 0;
      for (let groove = -1; groove <= 1; groove++) {
        line(this.sand.ctx, old.x, old.y - 181 + groove * 3, pointer.x, pointer.y - 181 + groove * 3, '#929783');
        line(this.sand.ctx, old.x, old.y - 180 + groove * 3, pointer.x, pointer.y - 180 + groove * 3, '#efe5c9');
      }
    }
    if (old) { old.x = pointer.x; old.y = pointer.y; }
    else this.previous = { x: pointer.x, y: pointer.y };
  }

  drawSand(ctx: CanvasRenderingContext2D): void { ctx.drawImage(this.sand.canvas, 0, 181); }

  drawWater(ctx: CanvasRenderingContext2D, scene: number, time: number): void {
    const p = layout(scene, this.width);
    for (let i = 0; i < 46; i++) {
      const x = p.pond.x + Math.sin(i * 7.8) * p.pond.rx * 0.86;
      const y = p.pond.y + Math.sin(i * 3.1) * p.pond.ry * 0.78;
      if (((x - p.pond.x) / p.pond.rx) ** 2 + ((y - p.pond.y) / p.pond.ry) ** 2 > 0.82) continue;
      line(ctx, x + Math.sin(time * 0.3 + i) * 2, y, x + 4 + Math.sin(time * 0.3 + i) * 2, y, i % 2 ? '#729588' : '#446e66');
    }
    if (this.feed > 0) {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = '#ddbc7c';
        ctx.fillRect(Math.round(this.food.x + Math.sin(i * 8) * 7), Math.round(this.food.y + Math.cos(i * 4) * 3), 1, 1);
      }
    }
  }

  drawProps(ctx: CanvasRenderingContext2D, scene: number, time: number): void {
    const p = layout(scene, this.width);
    if (scene === 2) {
      const cycle = time % 24;
      const tilt = this.tip > 0 ? Math.sin(Math.min(1, (2.4 - this.tip + 0.15) / 1.3) * Math.PI) : cycle > 21 ? Math.sin((cycle - 21) / 3 * Math.PI) : 0;
      const x = p.feature.x; const y = p.feature.y - 7;
      for (let thick = 0; thick < 6; thick++) {
        line(ctx, x - 20, y - 5 * tilt + thick, x + 21, y + 12 * tilt + thick, thick === 0 ? '#c3ca8a' : thick === 5 ? '#516a43' : '#95a66a');
      }
      line(ctx, x - 9, y - 27, x - 9, y - 1, '#a6c4ac');
      if (tilt > 0.2) {
        for (let i = 0; i < 6; i++) {
          const sx = x + 18 + Math.sin(i + time * 3) * 9;
          const sy = p.feature.y + 10 - Math.abs(Math.sin(i * 2 + time * 3)) * 11;
          ctx.fillStyle = '#c0d0af'; ctx.fillRect(Math.round(sx), Math.round(sy), 1, 2);
        }
        line(ctx, x + 22, y + 10, x + 26, y + 13, '#d4c28b');
      }
    }
    if (scene === 3) {
      const swing = Math.sin(time * 4) * this.chime * 0.9 + Math.sin(time * 0.6);
      const x = p.chime.x + swing;
      line(ctx, p.chime.x, 78, x, p.chime.y, '#706c51');
      oval(ctx, x, p.chime.y, 6, 4, '#5f8a7b');
      line(ctx, x - 4, p.chime.y - 2, x + 2, p.chime.y - 2, '#b2c5a2');
      line(ctx, x, p.chime.y + 3, x + swing, p.chime.y + 21, '#6a735a');
      ctx.fillStyle = '#e4d4ad'; ctx.fillRect(Math.round(x + swing - 2), p.chime.y + 14, 5, 12);
      line(ctx, x + swing, p.chime.y + 17, x + swing, p.chime.y + 22, '#ab8d64');
      const tx = this.width * 0.88;
      for (let i = 0; i < 5; i++) {
        const age = (time * 0.22 + i / 5) % 1;
        ctx.fillStyle = '#d4d6b8';
        ctx.fillRect(Math.round(tx + Math.sin(age * 8 + i) * 2), Math.round(210 - age * 14), 1, 2);
      }
    }
  }

  drawLights(ctx: CanvasRenderingContext2D, scene: number, night: number): void {
    if (scene === 3) {
      ctx.save(); ctx.globalAlpha = night * 0.42;
      ctx.fillStyle = '#f1ba65';
      ctx.fillRect(Math.round(this.width * 0.60 + 7), 89, Math.round(this.width * 0.40 - 16), 103);
      ctx.restore();
      return;
    }
    const p = layout(scene, this.width);
    const strength = this.lights[scene] ? 1 : night;
    if (strength < 0.05) return;
    this.light(ctx, p.lantern.x, p.lantern.y - 26, strength);
    if (scene === 4) this.light(ctx, this.width * 0.12, 170, strength);
  }

  private light(ctx: CanvasRenderingContext2D, x: number, y: number, strength: number): void {
    ctx.save(); ctx.globalAlpha = strength * 0.12;
    oval(ctx, x, y, 16, 13, '#edb96e');
    ctx.globalAlpha = strength * 0.18;
    oval(ctx, x, y, 9, 8, '#f1c179');
    ctx.globalAlpha = strength;
    ctx.fillStyle = '#f0c875'; ctx.fillRect(Math.round(x - 4), y - 3, 8, 6);
    ctx.fillStyle = '#ffdf9a'; ctx.fillRect(Math.round(x - 2), y - 2, 3, 4);
    ctx.restore();
  }

  drawRipples(ctx: CanvasRenderingContext2D): void {
    for (const ring of this.rings) {
      if (ring.age > 4) continue;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - ring.age / 4) * 0.7;
      const radius = 2 + ring.age * 7;
      for (let n = 0; n < 48; n++) {
        const angle = n / 48 * Math.PI * 2;
        ctx.fillStyle = '#d7d8b4';
        ctx.fillRect(Math.round(ring.x + Math.cos(angle) * radius), Math.round(ring.y + Math.sin(angle) * radius * 0.35), 1, 1);
      }
      ctx.restore();
    }
  }
}
