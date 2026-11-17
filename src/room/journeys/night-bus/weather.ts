import { FogLayer } from '../fog';
import { hash } from '../noise';
import type { ViewFrame } from '../../view';
import { ROAD_TOP, wrap } from './route';

const BREATH_SECONDS = 1.5;
const FOG_SECONDS = 8;
const SPLASH_SECONDS = 1.4;
const RING_COUNT = 12;
const BLOOM_SECONDS = 0.6;
const GLASS_TRAILS = 9;
const MAX_WIPE_JUMP = 56;
interface Splash { x: number; y: number; age: number }

/** Rain falls in the street and streaks down the bus window, leaving the clock band quiet. */
export class Weather {
  private readonly fog = new FogLayer();
  private readonly splashes: Splash[] = Array.from({ length: RING_COUNT }, () => ({ x: 0, y: 0, age: SPLASH_SECONDS }));
  private nextSplash = 0;
  private lastPointer: ViewFrame['pointer'] = null;
  private still = 0;
  private breathed = false;
  private bloom = 0;
  private width = 1;
  private scroll = 0;

  resize(width: number): void {
    this.width = width;
    this.fog.resize(width, 270);
    this.lastPointer = null;
    this.still = 0;
    this.breathed = false;
    this.bloom = 0;
    for (const splash of this.splashes) splash.age = SPLASH_SECONDS;
  }

  press(x: number, y: number): void {
    if (y < ROAD_TOP - 2) return;
    const splash = this.splashes[this.nextSplash];
    splash.x = x + this.scroll;
    splash.y = y;
    splash.age = 0;
    this.nextSplash = (this.nextSplash + 1) % RING_COUNT;
  }

  update(dt: number, pointer: ViewFrame['pointer']): void {
    this.fog.fade(dt / FOG_SECONDS);
    for (const splash of this.splashes) splash.age = Math.min(SPLASH_SECONDS, splash.age + dt);
    if (pointer) {
      const last = this.lastPointer;
      const distance = last ? Math.hypot(pointer.x - last.x, pointer.y - last.y) : 0;
      const moved = !last || distance > 1.5;
      if (moved) {
        if (last && distance <= MAX_WIPE_JUMP) {
          const steps = Math.min(48, Math.ceil(distance / 3));
          for (let i = 0; i <= steps; i++) {
            const t = steps === 0 ? 1 : i / steps;
            this.fog.wipe(last.x + (pointer.x - last.x) * t, last.y + (pointer.y - last.y) * t, 9);
          }
        } else {
          this.fog.wipe(pointer.x, pointer.y, 9);
        }
        this.still = 0;
        this.breathed = false;
        this.bloom = 0;
        this.lastPointer = { x: pointer.x, y: pointer.y };
      }
    }
    // The stage forgets an unmoving pointer at 1.2s; keep its last position for the 1.5s breath.
    if (this.lastPointer && !this.breathed) {
      this.still += dt;
      if (this.still >= BREATH_SECONDS) {
        this.breathed = true;
        this.bloom = BLOOM_SECONDS;
      }
    }
    if (this.lastPointer && this.bloom > 0) {
      this.fog.breathe(this.lastPointer.x, this.lastPointer.y, 44, dt * 2.2);
      this.bloom = Math.max(0, this.bloom - dt);
    }
  }

  drawStreet(ctx: CanvasRenderingContext2D, time: number, dawn: number, scroll: number): void {
    this.scroll = scroll * 1.1;
    const count = Math.round(66 - dawn * 40);
    ctx.fillStyle = 'rgba(156,175,190,0.24)';
    for (let i = 0; i < count; i++) {
      const fall = wrap(time * (38 + hash(i + 1) * 18) + hash(i) * 270, 270);
      const x = Math.round(wrap(hash(i + 17) * this.width - fall * 0.17 - time * 2, this.width));
      const y = Math.round(fall);
      ctx.fillRect(x, y, 1, 3);
      ctx.fillRect(x - 1, y + 3, 1, 2);
    }
    for (let i = 0; i < 18; i++) {
      const phase = wrap(time * 0.48 + hash(i + 45), 1);
      const x = Math.round(wrap(hash(i + 77) * this.width - this.scroll, this.width));
      const y = ROAD_TOP + 8 + Math.round(hash(i + 93) * 47);
      ctx.fillStyle = 'rgba(94,123,143,0.33)';
      ctx.fillRect(x - 7, y, 14, 1);
      if (phase < 0.6) this.ring(ctx, x, y, 2 + phase * 10, (1 - phase / 0.6) * (1 - dawn * 0.5));
    }
    for (const splash of this.splashes) {
      if (splash.age >= SPLASH_SECONDS) continue;
      const t = splash.age / SPLASH_SECONDS;
      const x = splash.x - this.scroll;
      for (let r = 0; r < 3; r++) {
        const delay = r * 0.16;
        if (t <= delay) continue;
        const rt = (t - delay) / (1 - delay);
        this.ring(ctx, x, splash.y, 2 + rt * 22, (1 - rt) * 1.45);
      }
      if (t < 0.48) {
        ctx.fillStyle = '#c8e4f4';
        for (let i = 0; i < 4; i++) {
          const direction = i % 2 === 0 ? -1 : 1;
          const dx = direction * (2 + t * (14 + i * 4));
          const dy = Math.sin((t / 0.48) * Math.PI) * (6 + i * 1.5);
          ctx.fillRect(Math.round(x + dx), Math.round(splash.y - dy), 1, 2);
        }
      }
    }
    this.drawGlass(ctx, time);
  }

  drawFog(ctx: CanvasRenderingContext2D): void {
    this.fog.draw(ctx, this.width, 270, [188, 206, 220], 0.62);
    this.drawSeal(ctx);
  }

  private drawGlass(ctx: CanvasRenderingContext2D, time: number): void {
    // Soft interior reflection of the bus ceiling light strips along the top edge.
    const leftW = Math.round(this.width * 0.24);
    const leftX = Math.round(this.width * 0.14);
    const rightX = Math.round(this.width * 0.62);
    ctx.fillStyle = 'rgba(218,232,244,0.045)';
    ctx.fillRect(leftX - 3, 7, leftW + 6, 8);
    ctx.fillRect(rightX - 3, 7, leftW + 6, 8);
    ctx.fillStyle = 'rgba(242,246,236,0.08)';
    ctx.fillRect(leftX, 9, leftW, 4);
    ctx.fillRect(rightX, 9, leftW, 4);
    ctx.fillStyle = 'rgba(182,202,218,0.04)';
    if (this.width > 20) ctx.fillRect(10, 22, this.width - 20, 1);

    // Fine vertical raindrop trails sliding slowly down the outer glass.
    for (let i = 0; i < GLASS_TRAILS; i++) {
      const band = hash(i * 31 + 5);
      // Keep the middle clock window calm by nudging trails toward the outer thirds.
      const u = band < 0.5 ? band * 0.68 : 0.66 + (band - 0.5) * 0.68;
      const baseX = Math.round(u * (this.width - 12)) + 6;
      const speed = 13 + hash(i * 19 + 3) * 13;
      const y = Math.round(wrap(time * speed + hash(i * 43) * 310, 310)) - 20;
      const wobble = Math.round(Math.sin(y * 0.14 + i * 1.7));
      const dx = baseX + wobble;
      ctx.fillStyle = 'rgba(205,228,245,0.42)';
      ctx.fillRect(dx, y, 1, 2);
      ctx.fillStyle = 'rgba(242,250,255,0.58)';
      ctx.fillRect(dx, y + 1, 1, 1);
      for (let t = 2; t < 24; t += 2) {
        const ty = y - t;
        if (ty < 3) break;
        const tx = baseX + Math.round(Math.sin(ty * 0.14 + i * 1.7));
        const alpha = 0.22 * (1 - t / 24);
        ctx.fillStyle = `rgba(195,220,240,${alpha.toFixed(2)})`;
        ctx.fillRect(tx, ty, 1, 1);
      }
    }
  }

  private drawSeal(ctx: CanvasRenderingContext2D): void {
    // Thin rubber window gasket around the glass edge without framing out the scene.
    ctx.fillStyle = '#11151e';
    ctx.fillRect(0, 0, this.width, 2);
    ctx.fillRect(0, 268, this.width, 2);
    ctx.fillRect(0, 0, 2, 270);
    ctx.fillRect(this.width - 2, 0, 2, 270);
    ctx.fillStyle = '#252d3c';
    if (this.width > 4) {
      ctx.fillRect(2, 2, this.width - 4, 1);
      ctx.fillRect(2, 267, this.width - 4, 1);
    }
    ctx.fillRect(2, 2, 1, 266);
    if (this.width >= 3) ctx.fillRect(this.width - 3, 2, 1, 266);
  }

  private ring(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, strength: number): void {
    const alpha = Math.min(0.85, strength * 0.62);
    ctx.fillStyle = `rgba(186,222,242,${alpha.toFixed(2)})`;
    for (let i = 0; i < 28; i++) {
      const angle = i / 28 * Math.PI * 2;
      ctx.fillRect(Math.round(x + Math.cos(angle) * radius), Math.round(y + Math.sin(angle) * radius * 0.3), 1, 1);
    }
  }
}
