import type { ViewFrame } from '../../view';
import type { SkyState } from '../../sky';
import { hash, lerp, ramp } from '../noise';
import { CLOUD_ROW, wrap } from './chapters';
import { glow } from './interactions';
import { picture, type Sprites } from './sprites';
import { CloudSea } from './cloud-sea';

const ISLAND_SPEEDS = [0.17, 0.43, 0.85];
const ISLAND_SCALES = [0.32, 0.6, 1];
// Village roofs and the whale sit above the radio's top edge at row 200.
const ISLAND_ROWS = [151, 162, 164];
const CLOUD_CELL = 3;
const FESTIVAL_LANTERNS = 96;
const LANTERN_RISE = 152;
const RESPONSE_SECONDS = 8;

interface IslandHit {
  id: number; x: number; y: number; width: number; height: number; surface: number;
}
interface Welcome { id: number; age: number }

export class Scenery {
  private readonly hits: IslandHit[] = [];
  private readonly welcomes: Welcome[] = [];
  private readonly sea = new CloudSea();
  private readonly stop = { x: 0, y: 0 };
  private hitCount = 0;
  private parted = new Float32Array(0);
  private width = 0;
  private festival = 0;
  private time = 0;

  resize(width: number): void {
    this.width = width;
    this.parted = new Float32Array(Math.ceil(width / CLOUD_CELL) + 1);
    this.hits.length = 0;
    this.hitCount = 0;
    // A bounded pool avoids creating island hit boxes during drawing.
    const capacity = Math.ceil(width / 300) * 3 + 12;
    for (let i = 0; i < capacity; i++) this.hits.push({ id: 0, x: 0, y: 0, width: 0, height: 0, surface: 0 });
    this.sea.prepare();
  }

  tap(x: number, y: number): IslandHit | null {
    // The nearest silhouette wins when islands overlap.
    for (let i = this.hitCount - 1; i >= 0; i--) {
      const hit = this.hits[i];
      if (x < hit.x || x > hit.x + hit.width || y < hit.y || y > hit.y + hit.height) continue;
      const previous = this.welcomes.find((welcome) => welcome.id === hit.id);
      if (previous) previous.age = 0;
      else {
        if (this.welcomes.length >= 12) this.welcomes.shift();
        this.welcomes.push({ id: hit.id, age: 0 });
      }
      return hit;
    }
    return null;
  }

  get isFestival(): boolean { return this.festival > 0.2; }

  get postalStop(): { x: number; y: number } | null {
    for (let i = this.hitCount - 1; i >= 0; i--) {
      const hit = this.hits[i];
      const x = hit.x + hit.width / 2;
      if (x > 20 && x < this.width - 20) {
        this.stop.x = x;
        this.stop.y = hit.surface - 9;
        return this.stop;
      }
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D, sprites: Sprites, frame: ViewFrame, scroll: number,
    weights: Float32Array, night: number, lift: number, storm: number, state: SkyState): void {
    this.time = frame.time;
    this.festival = weights[4];
    this.hitCount = 0;
    for (let i = this.welcomes.length - 1; i >= 0; i--) {
      this.welcomes[i].age += frame.dt;
      if (this.welcomes[i].age > RESPONSE_SECONDS) this.welcomes.splice(i, 1);
    }
    for (let i = 0; i < this.parted.length; i++) {
      this.parted[i] = Math.max(0, this.parted[i] - frame.dt * 3);
      const pointer = frame.pointer;
      if (pointer && pointer.y > CLOUD_ROW - 24 && Math.abs(pointer.x - i * CLOUD_CELL) < 23) {
        this.parted[i] = Math.max(this.parted[i], 1 - Math.abs(pointer.x - i * CLOUD_CELL) / 23);
      }
    }
    const islands = Math.min(1, weights[1] + weights[4] + weights[5] * 0.65 + weights[2] * 0.28);
    this.sea.colors(state, storm);
    this.sea.haze(ctx, this.width);
    this.sea.drawTowers(ctx, this.width, scroll, this.time, lift);
    for (let depth = 0; depth < ISLAND_SPEEDS.length; depth++) {
      this.sea.drawLayer(ctx, this.width, depth, scroll, this.time, lift, this.parted);
      if (islands > 0.01) {
        ctx.save();
        ctx.globalAlpha = islands;
        this.islands(ctx, sprites, depth, scroll, lift, night, weights[5]);
        ctx.restore();
      }
    }
    if (this.festival > 0.01) this.festivalHome(ctx, sprites, scroll, lift, night);
    if (this.festival > 0.01) this.festivalLights(ctx, sprites, scroll, night, lift);
    this.travellers(ctx, sprites, scroll, lift, Math.min(1, islands + weights[0]));
    // Close wisps slide past faster than every island and cloud bank.
    for (let i = 0; i < 3; i++) {
      const x = wrap(i * 213 - scroll * 1.8 - this.time * 0.4, this.width + 110) - 110;
      picture(ctx, sprites.wisp, x, 248 + lift + i * 3, 2);
    }
  }

  private islands(ctx: CanvasRenderingContext2D, sprites: Sprites, depth: number, scroll: number,
    lift: number, night: number, stars: number): void {
    const scale = ISLAND_SCALES[depth];
    const spacing = 310 + depth * 65;
    const drift = scroll * ISLAND_SPEEDS[depth];
    const first = Math.floor((drift - 150) / spacing);
    const last = Math.ceil((drift + this.width) / spacing);
    for (let k = first; k <= last; k++) {
      const id = k * 3 + depth;
      const seed = k * 37 + depth * 101;
      const x = Math.round(k * spacing + hash(seed) * 55 - drift);
      const y = Math.round(ISLAND_ROWS[depth] - 32 * scale + lift + Math.sin(this.time * 0.2 + seed) * 2);
      const sprite = sprites.islands[wrap(k + depth, sprites.islands.length)];
      const w = sprite.width * scale;
      if (x > this.width || x + w < 0) continue;
      picture(ctx, sprite, x, y, scale);
      const surface = y + 32 * scale;
      this.recordHit(id, x, y, w, scale, surface);
      const welcome = this.welcomeFor(id);
      const greeting = welcome ? Math.min(1, (RESPONSE_SECONDS - welcome.age) / 2) : 0;
      this.village(ctx, x, y, scale, night, greeting);
      this.waterfall(ctx, x + 103 * scale, surface, scale, seed);
      this.bridge(ctx, x + 120 * scale, surface, scale);
      this.windmill(ctx, x + 14 * scale, surface, scale, seed);
      if (stars > 0.1 && depth === 2) this.lighthouse(ctx, x + 124, surface, night, stars);
      if (this.festival > 0.05 && depth === 2) this.festivalIsland(ctx, x, surface, this.festival, night);
      if (depth > 0) this.people(ctx, x, surface, scale, greeting, seed);
    }
  }

  private recordHit(id: number, x: number, y: number, width: number, scale: number, surface: number): void {
    const hit = this.hits[this.hitCount];
    if (!hit) return;
    this.hitCount++;
    hit.id = id;
    hit.x = x + 5 * scale;
    hit.y = y + 12 * scale;
    hit.width = width - 10 * scale;
    hit.height = 78 * scale;
    hit.surface = surface;
  }

  private welcomeFor(id: number): Welcome | undefined {
    for (const welcome of this.welcomes) if (welcome.id === id) return welcome;
    return undefined;
  }

  private village(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, night: number, greeting: number): void {
    for (let i = 0; i < 4; i++) {
      const hx = x + (27 + i * 22) * scale;
      const hy = y + (25 - Math.round(hash((i + 2) * 3) * 3)) * scale;
      const light = Math.max(greeting, night);
      ctx.fillStyle = light > 0.2 ? '#ffe0a0' : '#536f77';
      ctx.fillRect(Math.round(hx), Math.round(hy), Math.max(1, Math.round(2 * scale)), Math.max(1, Math.round(2 * scale)));
      if (light > 0.01) glow(ctx, hx, hy, light, 4 * scale);
      ctx.fillStyle = '#cad0c2';
      for (let puff = 0; puff < 3; puff++) {
        const age = wrap(this.time * 1.1 + puff * 3 + i, 9);
        ctx.fillRect(Math.round(hx + 8 * scale + Math.sin(age) * scale), Math.round(y + (12 - age) * scale), Math.max(1, Math.round(scale)), 1);
      }
    }
  }

  private waterfall(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number): void {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = col % 2 ? '#d8eae4' : '#80b4c4';
      for (let row = 0; row < 64; row += 4) {
        ctx.fillRect(Math.round(x + col * scale), Math.round(y + (row + wrap(this.time * 8 + col, 4)) * scale), Math.max(1, Math.round(scale)), Math.max(1, Math.round(3 * scale)));
      }
    }
    ctx.fillStyle = '#dce5de';
    ctx.fillRect(Math.round(x - 5 * scale + Math.sin(this.time + seed) * scale), Math.round(y + 62 * scale), Math.max(1, Math.round(15 * scale)), 2);
  }

  private bridge(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    ctx.fillStyle = '#8e8067';
    for (let col = 0; col < 30; col++) {
      const sag = Math.round(Math.sin(col / 30 * Math.PI) * 5);
      const px = Math.round(x + col * scale);
      ctx.fillRect(px, Math.round(y + (sag - 4) * scale), 1, 1);
      if (col % 3 === 0) ctx.fillRect(px, Math.round(y + sag * scale), 2, 1);
    }
    ctx.fillStyle = '#78858a';
    ctx.fillRect(Math.round(x + 29 * scale), Math.round(y), Math.max(1, Math.round(9 * scale)), Math.max(1, Math.round(7 * scale)));
    ctx.fillStyle = '#9dbd77';
    ctx.fillRect(Math.round(x + 28 * scale), Math.round(y - scale), Math.max(1, Math.round(11 * scale)), 1);
  }

  private windmill(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number): void {
    const height = 20 * scale;
    ctx.fillStyle = '#d1c9ad';
    ctx.fillRect(Math.round(x - scale), Math.round(y - height), Math.max(1, Math.round(3 * scale)), Math.round(height));
    ctx.fillStyle = '#716f68';
    for (let blade = 0; blade < 4; blade++) {
      const angle = this.time * 0.45 + seed + blade * Math.PI / 2;
      for (let r = 1; r < 9 * scale; r++) {
        ctx.fillRect(Math.round(x + Math.cos(angle) * r), Math.round(y - height + Math.sin(angle) * r), Math.max(1, Math.round(2 * scale)), 1);
      }
    }
  }

  private people(ctx: CanvasRenderingContext2D, x: number, surface: number, scale: number, greeting: number, seed: number): void {
    for (let i = 0; i < 3; i++) {
      const walking = Math.sin(this.time * 0.14 + i + seed) > 0.4;
      const px = Math.round(x + (43 + i * 21 + (walking ? Math.sin(this.time * 0.5 + i) * 3 : 0)) * scale);
      const py = Math.round(surface - 4 * scale);
      ctx.fillStyle = '#e1bb92';
      ctx.fillRect(px, py - 1, 1, 1);
      ctx.fillStyle = i % 2 ? '#9f665b' : '#4b7482';
      ctx.fillRect(px, py, Math.max(1, Math.round(2 * scale)), Math.max(1, Math.round(3 * scale)));
      if (greeting > 0) ctx.fillRect(px + 2, py - (Math.floor(this.time * 3) % 2), 2, 1);
      if (i === 1 || greeting > 0) this.kite(ctx, px, py, scale, i + seed, greeting);
    }
  }

  private kite(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number, greeting: number): void {
    const height = (18 + greeting * 12) * scale;
    const dx = Math.sin(this.time * 0.5 + seed) * 5 + 10;
    ctx.fillStyle = '#aaa98f';
    for (let r = 0; r < height; r += 3) ctx.fillRect(Math.round(x + dx * r / height), Math.round(y - r), 1, 1);
    ctx.fillStyle = '#dbb778';
    const kx = Math.round(x + dx);
    const ky = Math.round(y - height);
    ctx.fillRect(kx, ky - 2, 1, 5);
    ctx.fillRect(kx - 1, ky - 1, 3, 3);
    ctx.fillStyle = '#c6816b';
    ctx.fillRect(kx, ky, 2, 2);
  }

  private lighthouse(ctx: CanvasRenderingContext2D, x: number, y: number, night: number, presence: number): void {
    ctx.save();
    ctx.globalAlpha *= presence;
    ctx.fillStyle = '#e0d8ba';
    ctx.fillRect(Math.round(x), Math.round(y - 25), 7, 25);
    ctx.fillStyle = '#9a6860';
    ctx.fillRect(Math.round(x), Math.round(y - 12), 7, 4);
    ctx.fillRect(Math.round(x - 1), Math.round(y - 27), 9, 2);
    ctx.fillStyle = '#ffe2a3';
    ctx.fillRect(Math.round(x + 2), Math.round(y - 24), 3, 3);
    glow(ctx, x + 3, y - 23, night, 10);
    ctx.fillStyle = '#f2d8a0';
    ctx.globalAlpha *= night * (0.07 + Math.max(0, Math.sin(this.time * 0.3)) * 0.07);
    for (let col = 0; col < 65; col++) ctx.fillRect(Math.round(x - col), Math.round(y - 24 - col / 15), 1, Math.max(1, Math.round(col / 8)));
    ctx.restore();
  }

  private festivalIsland(ctx: CanvasRenderingContext2D, x: number, y: number, presence: number, night: number): void {
    ctx.save();
    ctx.globalAlpha *= presence;
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 ? '#dab97e' : '#c6816b';
      ctx.fillRect(Math.round(x + 16 + i * 6), Math.round(y - 18 + Math.sin(i / 18 * Math.PI) * 4), 3, 2);
    }
    for (let i = 0; i < 2; i++) {
      const fx = x + 52 + i * 40;
      glow(ctx, fx, y - 3, 0.5 + night, 10);
      ctx.fillStyle = '#b77c56';
      ctx.fillRect(Math.round(fx - 3), Math.round(y - 2), 7, 2);
      ctx.fillStyle = '#efba6c';
      ctx.fillRect(Math.round(fx - 1), Math.round(y - 5 - Math.sin(this.time + i)), 3, 4);
    }
    ctx.restore();
  }

  private festivalLights(ctx: CanvasRenderingContext2D, sprites: Sprites, scroll: number, night: number, lift: number): void {
    ctx.save();
    ctx.globalAlpha = this.festival;
    for (let i = 0; i < FESTIVAL_LANTERNS; i++) {
      const group = Math.floor(i / 12);
      const age = wrap(this.time * (1.5 + hash(group) * 0.8) + (i % 12) * LANTERN_RISE / 12 + group * 9, LANTERN_RISE);
      const origin = this.width * 0.14 - 45 + group * 17 + Math.sin(scroll * 0.0008) * 14;
      const drift = age * (0.2 + hash(group + 11) * 0.6);
      const baseX = origin + drift + Math.sin(age * 0.02 + group) * 9 + hash(i + 9) * 12 - 6;
      const y = 164 - age + lift;
      // Smoothly bend the paths around the clock without jumps or disappearing lights.
      const avoid = ramp(64, 84, y) * (1 - ramp(146, 164, y));
      const side = origin < this.width / 2 ? Math.min(baseX, this.width * 0.2) : Math.max(baseX, this.width * 0.8);
      const x = Math.max(2, Math.min(this.width - 7, lerp(baseX, side, avoid)));
      const scale = 0.6 + (1 - age / LANTERN_RISE) * 0.6;
      const fade = this.festival * Math.min(1, age / 5, (LANTERN_RISE - age) / 8);
      ctx.globalAlpha = fade * (0.65 + night * 0.35);
      picture(ctx, sprites.lanternGlow, x + 2 - 12 * scale, y + 3 - 12 * scale, scale);
      ctx.globalAlpha = fade;
      picture(ctx, sprites.lantern, x, y, scale);
    }
    ctx.restore();
  }

  private festivalHome(ctx: CanvasRenderingContext2D, sprites: Sprites, scroll: number, lift: number, night: number): void {
    // A near island stays in view long enough to read the bunting and hearths.
    const scale = 1.2;
    const x = this.width * 0.14 - 70 + Math.sin(scroll * 0.0008) * 14;
    const y = 125 + lift;
    const surface = y + 32 * scale;
    const id = -1000000;
    const welcome = this.welcomeFor(id);
    const greeting = welcome ? Math.min(1, (RESPONSE_SECONDS - welcome.age) / 2) : 0;
    ctx.save();
    ctx.globalAlpha = this.festival;
    picture(ctx, sprites.islands[1], x, y, scale);
    this.village(ctx, x, y, scale, night, greeting);
    this.festivalIsland(ctx, x + 10, surface, 1, night);
    this.people(ctx, x, surface, scale, greeting, 41);
    ctx.restore();
    this.recordHit(id, x, y, 144 * scale, scale, surface);
  }

  private travellers(ctx: CanvasRenderingContext2D, sprites: Sprites, scroll: number, lift: number, presence: number): void {
    if (presence < 0.02) return;
    ctx.save();
    ctx.globalAlpha = presence;
    const balloonX = wrap(this.width * 0.7 - scroll * 0.035 + this.time * 0.25, this.width + 40) - 20;
    const balloonY = 43 + Math.sin(this.time * 0.12) * 3 + lift;
    picture(ctx, sprites.balloon, balloonX, balloonY, 2);
    picture(ctx, sprites.bag, balloonX + 5, balloonY + 16, 1.2);
    ctx.fillStyle = '#e2d7b9';
    const gx = wrap(this.width * 0.23 + this.time * 3 - scroll * 0.08, this.width + 50) - 25;
    const gy = Math.round(61 + Math.sin(this.time * 0.2) * 7 + lift);
    for (let i = -10; i <= 10; i++) ctx.fillRect(Math.round(gx + i), gy + Math.round(Math.abs(i) * 0.25), 1, 1);
    ctx.fillStyle = '#675f5b';
    ctx.fillRect(Math.round(gx), gy + 2, 1, 4);
    ctx.restore();
  }
}
