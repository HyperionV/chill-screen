import { css, type RGB } from '../../../render/color';
import { disc, type SkyState } from '../../sky';
import { hash } from '../noise';
import type { DrawList } from './draw-list';
import { FLASH_HUES, type FairySprites } from './sprites';
import { MoonriseStones } from './stones';

interface MushroomState {
  cell: number; sx: number; y: number; kind: number;
  squash: number; vel: number; flash: number; flashHue: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number; age: number; life: number;
  size: number; color: RGB; smoke: boolean;
}

const MAX_PARTICLES = 96;
const MAX_MUSHROOMS = 40;
const HOUSE_WIDTH = 130;
const HOUSE_HEIGHT = 80;
const WITCH_HEIGHT = 35;
const CAT_HEIGHT = 20;
const MUSHROOM_SCALE = 1.12;
const GOLD: RGB = [255, 226, 120];
const SMOKE: RGB = [204, 206, 224];
const STEAM: RGB = [144, 232, 134];
const ICE: RGB = [180, 244, 255];

export class Landmarks {
  private readonly mushrooms: MushroomState[] = Array.from({ length: MAX_MUSHROOMS }, () => ({
    cell: Infinity, sx: 0, y: 0, kind: 0, squash: 0, vel: 0, flash: 0, flashHue: 0,
  }));
  private readonly particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, age: 1, life: 1, size: 1, color: GOLD, smoke: false,
  }));
  private particleCursor = 0;
  private readonly stones = new MoonriseStones();
  private readonly lanternPos = { x: 0, y: 0 };
  private readonly witchPos = { x: 0, y: 0 };
  private readonly windowPos = { x: 0, y: 0 };
  private cottageVisible = false;
  private cottageWeight = 0;
  private lanternFlare = 0;
  private witchWave = 0;
  private sparkleTimer = 0;
  private smokeTimer = 0;
  private catTimer = 4;
  private catState: 'sit' | 'blink' | 'yawn' = 'sit';
  private unit = 1;
  private readonly stoneSpark = (x: number, y: number, count: number): void => {
    this.spawnSparkles(x, y, this.unit, count, ICE);
  };
  private readonly stoneSpirit = (x: number, y: number): void => {
    this.particle(x, y, 0, -28 * this.unit, 2.2, 2 * this.unit, ICE, false);
  };

  reset(): void {
    this.stones.invalidate();
    for (const m of this.mushrooms) m.cell = Infinity;
    for (const p of this.particles) p.age = p.life;
    this.cottageVisible = false;
    this.lanternFlare = 0;
    this.witchWave = 0;
  }

  get lantern(): { x: number; y: number } | null { return this.cottageVisible ? this.lanternPos : null; }
  get witch(): { x: number; y: number } | null { return this.cottageVisible ? this.witchPos : null; }
  flareLantern(): void { this.lanternFlare = 4.5; }

  waveAtWitch(unit: number): void {
    if (this.witchWave < 0.1 && this.cottageVisible) {
      this.spawnSparkles(this.witchPos.x + 8 * unit, this.witchPos.y - 20 * unit, unit, 10);
    }
    this.witchWave = 2.6;
  }

  press(px: number, py: number, unit: number, chapterIndex: number): boolean {
    this.unit = unit;
    for (const m of this.mushrooms) {
      if (!Number.isFinite(m.cell)) continue;
      if (Math.abs(px - m.sx) <= 16 * unit && py >= m.y - 42 * unit && py <= m.y + 4 * unit) {
        // Restart from a bounded squash, even after repeated clicks.
        m.squash = 0.32;
        m.vel = 0;
        if (m.flash <= 0) {
          m.flash = 1;
          m.flashHue = (m.flashHue + 1) % FLASH_HUES.length;
        }
        this.spawnSparkles(m.sx, m.y - 26 * unit, unit, 12, FLASH_HUES[m.flashHue]);
        return true;
      }
    }
    return this.stones.press(px, py, unit, chapterIndex, this.stoneSpark);
  }

  private particle(x: number, y: number, vx: number, vy: number, life: number, size: number, color: RGB, smoke: boolean): void {
    const p = this.particles[this.particleCursor];
    this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.age = 0; p.life = life; p.size = size; p.color = color; p.smoke = smoke;
  }

  private spawnSparkles(x: number, y: number, unit: number, count: number, color: RGB = GOLD): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (12 + Math.random() * 18) * unit;
      this.particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 14 * unit,
        1 + Math.random() * 0.5, 2 * unit, color, false);
    }
  }

  update(dt: number, unit: number, chapterIndex: number): void {
    this.unit = unit;
    this.stones.update(dt, chapterIndex, this.stoneSpirit);
    this.lanternFlare = Math.max(0, this.lanternFlare - dt);
    this.witchWave = Math.max(0, this.witchWave - dt);
    if (this.witchWave > 0 && this.cottageVisible) {
      this.sparkleTimer -= dt;
      if (this.sparkleTimer <= 0) {
        this.sparkleTimer = 0.22;
        this.spawnSparkles(this.witchPos.x + 8 * unit, this.witchPos.y - 20 * unit, unit, 3);
      }
    }
    this.catTimer -= dt;
    if (this.catTimer <= 0) {
      if (this.catState === 'sit') {
        this.catState = Math.random() < 0.45 ? 'yawn' : 'blink';
        this.catTimer = this.catState === 'yawn' ? 1.2 : 0.25;
      } else { this.catState = 'sit'; this.catTimer = 4; }
    }
    for (const m of this.mushrooms) {
      // Small substeps keep the spring stable at the maximum frame interval.
      for (let step = 0; step < 3; step++) {
        m.vel += (-80 * m.squash - 8 * m.vel) * dt / 3;
        m.squash += m.vel * dt / 3;
      }
      m.flash = Math.max(0, m.flash - dt * 0.7);
    }
    for (const p of this.particles) {
      if (p.age >= p.life) continue;
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.smoke) { p.vx *= Math.exp(-1.5 * dt); p.vy += 4 * unit * dt; }
    }
  }

  collectMushrooms(sprites: FairySprites, scroll: number, w: number, h: number, unit: number,
    density: number, nightBoost: number, out: DrawList, glows: DrawList): void {
    const cellW = 48 * unit;
    const first = Math.floor((scroll - 50 * unit) / cellW);
    const last = Math.ceil((scroll + w + 50 * unit) / cellW);
    for (const m of this.mushrooms) {
      if (m.cell < first || m.cell > last) m.cell = Infinity;
    }
    for (let k = first; k <= last; k++) {
      const seed = k * 5471 + 19;
      if (hash(seed) > density * 0.55) continue;
      let mushroom: MushroomState | undefined;
      let vacant: MushroomState | undefined;
      for (const entry of this.mushrooms) {
        if (entry.cell === k) mushroom = entry;
        else if (!Number.isFinite(entry.cell)) vacant = entry;
      }
      if (!mushroom) {
        if (!vacant) continue;
        mushroom = vacant;
        mushroom.cell = k; mushroom.squash = 0; mushroom.vel = 0; mushroom.flash = 0;
        mushroom.kind = Math.floor(hash(seed + 3) * sprites.mushrooms.length);
        mushroom.flashHue = Math.floor(hash(seed + 4) * FLASH_HUES.length);
      }
      const m = mushroom;
      m.sx = (k + 0.2 + hash(seed + 1) * 0.6) * cellW - scroll;
      m.y = Math.round(h * (0.745 + hash(seed + 2) * 0.068));
      const mk = sprites.mushrooms[m.kind];
      const scale = MUSHROOM_SCALE * unit;
      const width = Math.round(mk.cap.w * scale * (1 + m.squash * 0.5));
      const height = Math.round(mk.cap.h * scale * (1 - m.squash));
      const x = m.sx - width / 2;
      const y = m.y - height;
      out.add(mk.stem, x, y, width, height, m.y);
      out.add(mk.cap, x, y, width, height, m.y);
      glows.add(mk.glow, x, y, width, height, m.y, 0.08 + 0.69 * nightBoost);
      glows.add(mk.flashCaps[m.flashHue], x, y, width, height, m.y, m.flash * 0.45);
    }
  }

  collectCottage(sprites: FairySprites, cx: number, h: number, unit: number, time: number,
    dt: number, w: number, weight: number, out: DrawList): void {
    this.cottageWeight = weight;
    this.cottageVisible = weight > 0.02;
    if (!this.cottageVisible) return;
    const ground = Math.round(h * 0.78);
    const hw = Math.round(HOUSE_WIDTH * unit);
    const hh = Math.round(HOUSE_HEIGHT * unit);
    const hx = Math.round(cx - hw / 2);
    const hy = ground - hh;
    this.windowPos.x = hx + hw * 0.16;
    this.windowPos.y = hy + hh * 0.69;
    out.add(sprites.cottage.house, hx, hy, hw, hh, ground, weight);
    out.add(sprites.cottage.herbRack, hx - 24 * unit, ground - 14 * unit, 24 * unit, 14 * unit, ground, weight);

    // Companions stay in the right third while the house passes to the left.
    const witchX = w * 0.76 + (cx - w * 0.30) * 0.25;
    const witchY = h * 0.81;
    const witch = this.witchWave > 0 ? sprites.witch.wave[Math.floor(time * 3) % 2]
      : this.lanternFlare > 0 ? sprites.witch.pleased : sprites.witch.stir[Math.floor(time * 2.2) % 2];
    const wh = WITCH_HEIGHT * unit;
    const ww = wh * witch.w / witch.h;
    out.add(witch, witchX - ww / 2, witchY - wh, ww, wh, witchY, weight);
    this.witchPos.x = witchX; this.witchPos.y = witchY;
    const cauldronX = witchX + 18 * unit;
    out.add(sprites.cottage.cauldron, cauldronX, witchY - 19 * unit, 28 * unit, 21 * unit, witchY + 2, weight);
    const cat = this.catState === 'yawn' ? sprites.cat.yawn : this.catState === 'blink' ? sprites.cat.blink : sprites.cat.sit;
    const catX = w * 0.89;
    out.add(sprites.cottage.fence, catX - 8 * unit, ground - 5 * unit, 34 * unit, 12 * unit, ground + 7, weight);
    out.add(cat, catX, ground - 24 * unit, CAT_HEIGHT * unit, CAT_HEIGHT * unit, ground + 8, weight);
    const postX = hx + hw - 18 * unit;
    out.add(sprites.cottage.lanternPost, postX, ground - 38 * unit, 24 * unit, 39 * unit, ground + 9, weight);
    this.lanternPos.x = postX + 18 * unit;
    this.lanternPos.y = ground - 27 * unit;

    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.35;
      this.particle(hx + hw * 0.39, hy, -3 * unit, -11 * unit, 3, 4 * unit, SMOKE, true);
      this.particle(cauldronX + 14 * unit, witchY - 20 * unit, -2 * unit, -12 * unit, 1.5, 3 * unit, STEAM, true);
    }
  }

  drawCottageGlow(ctx: CanvasRenderingContext2D, unit: number, night: number): void {
    if (!this.cottageVisible) return;
    const flare = Math.min(1, this.lanternFlare / 1.5);
    const lp = this.lanternPos;
    const win = this.windowPos;
    ctx.fillStyle = css(GOLD, this.cottageWeight * (0.12 + 0.68 * night));
    ctx.fillRect(Math.round(win.x - 5 * unit), Math.round(win.y - 2 * unit), Math.round(12 * unit), Math.round(6 * unit));
    ctx.fillRect(Math.round(win.x + 89 * unit), Math.round(win.y - 2 * unit), Math.round(10 * unit), Math.round(6 * unit));
    ctx.fillStyle = css(GOLD, this.cottageWeight * (0.04 + 0.25 * night + 0.3 * flare));
    disc(ctx, Math.round(lp.x), Math.round(lp.y), Math.round((8 + flare * 10) * unit));
    ctx.fillStyle = css(GOLD, this.cottageWeight * (0.25 + 0.35 * night + 0.35 * flare));
    disc(ctx, Math.round(lp.x), Math.round(lp.y), Math.max(1, Math.round((2 + flare * 3) * unit)));
  }

  drawMoonriseDisc(ctx: CanvasRenderingContext2D, state: SkyState, cx: number, h: number, unit: number, weight: number): void {
    this.stones.drawDisc(ctx, state, cx, h, unit, weight);
  }

  paintStandingStones(L: CanvasRenderingContext2D, sprites: FairySprites, cx: number, h: number,
    w: number, unit: number, hillColor: RGB, weight: number): void {
    this.stones.paint(L, sprites, cx, h, w, unit, hillColor, weight);
  }

  drawStoneGlows(ctx: CanvasRenderingContext2D, sprites: FairySprites, cx: number, h: number,
    w: number, unit: number, weight: number, night: number): void {
    this.stones.drawGlows(ctx, sprites, cx, h, w, unit, weight, night);
  }

  drawPuffs(ctx: CanvasRenderingContext2D, unit: number): void {
    for (const p of this.particles) {
      if (p.age >= p.life) continue;
      const alpha = (1 - p.age / p.life) * (p.smoke ? 0.35 * this.cottageWeight : 0.9);
      const size = Math.max(1, Math.round(p.size));
      ctx.fillStyle = css(p.color, alpha);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
      if (!p.smoke) {
        ctx.fillStyle = css(p.color, alpha * 0.2);
        ctx.fillRect(Math.round(p.x - unit), Math.round(p.y - unit), size + 2, size + 2);
      }
    }
  }
}
