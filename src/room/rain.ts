import { css, mix } from '../render/color';
import type { Look } from '../wallpapers/look';
import { memoryCanvas } from '../render/pixel-stage';

interface Streak {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

interface Drop {
  x: number;
  y: number;
  /** How much water the drop holds; it grows by swallowing others and starts sliding past SLIDE_MASS. */
  mass: number;
  sliding: boolean;
  speed: number;
  /** Seconds a sliding drop stays caught before moving on. */
  pause: number;
}

/** Drop shapes by size, top to bottom: d dark rim, o water, h glint, L the bright view bent into the drop's base. */
const DROP_SHAPES = [
  ['L'],
  ['.d.', 'dhd', '.L.'],
  ['.dd.', 'dhod', 'oooo', '.LL.'],
  ['.ddd.', 'dhood', 'dhooo', 'ooooo', 'oLLLo', '.LLL.'],
];
/** The rows of the view the design is made for; counts and speeds scale with the real size. */
const DESIGN_ROWS = 270;
const DESIGN_AREA = 480 * 270;
const STREAKS_AT_FULL = 320;
const WIND = 0.18;
const SLIDE_MASS = 3.2;
const MAX_MASS = 7;
/** The mist is kept at half the stage's resolution: it is soft anyway. */
const MIST_SCALE = 2;
const REMIST_SECONDS = 24;
const REMIST_STEP = 0.4;
const WIPE_WIDTH = 9;

const sizeOf = (mass: number): number => (mass < 0.6 ? 0 : mass < 1.6 ? 1 : mass < SLIDE_MASS ? 2 : 3);

/**
 * Rain on the window, in pixels. Outside: thin streaks falling past and a grey veil over the view. On the glass:
 * a mist that softens what is behind it, drops that catch the light, and heavy drops that slide down in fits and
 * starts, swallowing smaller ones and leaving clear trails. The pointer wipes the glass; the mist creeps back.
 * `level` 0..1 runs from no rain through a drizzle to a downpour.
 */
export class Rain {
  private w = 0;
  private h = 0;
  private unit = 1;
  private streaks: Streak[] = [];
  private drops: Drop[] = [];
  private readonly mist: HTMLCanvasElement;
  private readonly mistCtx: CanvasRenderingContext2D;
  private readonly tinted: HTMLCanvasElement;
  private readonly tintedCtx: CanvasRenderingContext2D;
  private sprites: HTMLCanvasElement[] = [];
  private spriteKey = '';
  private remistDue = 0;

  constructor() {
    const mist = memoryCanvas(1, 1);
    const tinted = memoryCanvas(1, 1);
    this.mist = mist.canvas;
    this.mistCtx = mist.ctx;
    this.tinted = tinted.canvas;
    this.tintedCtx = tinted.ctx;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.unit = h / DESIGN_ROWS;
    this.mist.width = this.tinted.width = Math.ceil(w / MIST_SCALE);
    this.mist.height = this.tinted.height = Math.ceil(h / MIST_SCALE);
    this.drops = this.drops.filter((d) => d.x < w && d.y < h);
  }

  /** Clears the glass along the pointer's path (glass positions). */
  wipe(x0: number, y0: number, x1: number, y1: number): void {
    const m = this.mistCtx;
    m.save();
    m.globalCompositeOperation = 'destination-out';
    m.lineCap = 'round';
    m.lineWidth = (WIPE_WIDTH * this.unit) / MIST_SCALE;
    m.beginPath();
    m.moveTo(x0 / MIST_SCALE, y0 / MIST_SCALE);
    m.lineTo(x1 / MIST_SCALE, y1 / MIST_SCALE);
    m.stroke();
    m.restore();
    const r = WIPE_WIDTH * this.unit * 0.6;
    this.drops = this.drops.filter((d) => distanceToSegment(d.x, d.y, x0, y0, x1, y1) > r);
  }

  /** Rain falling past outside, and the grey it puts over the view. */
  drawOutside(ctx: CanvasRenderingContext2D, dt: number, level: number, look: Look): void {
    if (level < 0.01) {
      this.streaks = [];
      return;
    }
    ctx.save();
    ctx.fillStyle = css(mix(look.tint, [118, 128, 140], 0.6), 0.3 * level);
    ctx.fillRect(0, 0, this.w, this.h);

    const target = Math.round(STREAKS_AT_FULL * (0.15 + 0.85 * level) * ((this.w * this.h) / DESIGN_AREA));
    while (this.streaks.length < target) this.streaks.push(this.newStreak(Math.random() * this.h));
    if (this.streaks.length > target) this.streaks.length = target;
    ctx.fillStyle = css(mix(look.tint, [255, 255, 255], 0.6));
    for (const s of this.streaks) {
      s.y += s.speed * dt;
      s.x += s.speed * WIND * dt;
      if (s.y > this.h) Object.assign(s, this.newStreak(-s.length));
      ctx.globalAlpha = s.alpha * (0.5 + 0.5 * level);
      for (let i = 0; i < s.length; i++) ctx.fillRect(Math.round(s.x - (s.length - i) * WIND), Math.round(s.y - s.length + i), 1, 1);
    }
    ctx.restore();
  }

  /** Mist and drops on the glass, drawn over what is behind it. The caller clips to the panes. */
  drawGlass(ctx: CanvasRenderingContext2D, dt: number, level: number, look: Look): void {
    this.step(dt, level);
    if (level < 0.01 && !this.drops.length) return;
    this.drawMist(ctx, level, look);
    const sprites = this.spritesFor(look);
    for (const d of this.drops) {
      const s = sprites[sizeOf(d.mass)];
      ctx.drawImage(s, Math.round(d.x - s.width / 2), Math.round(d.y - s.height / 2));
    }
  }

  private drawMist(ctx: CanvasRenderingContext2D, level: number, look: Look): void {
    const t = this.tintedCtx;
    t.globalCompositeOperation = 'copy';
    t.drawImage(this.mist, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = css(mix(look.tint, [232, 236, 242], 0.75));
    t.fillRect(0, 0, this.tinted.width, this.tinted.height);
    ctx.save();
    ctx.globalAlpha = (0.38 + 0.42 * level) * Math.min(1, level * 4);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.tinted, 0, 0, this.tinted.width * MIST_SCALE, this.tinted.height * MIST_SCALE);
    ctx.restore();
  }

  private step(dt: number, level: number): void {
    const m = this.mistCtx;
    this.remistDue += dt;
    if (this.remistDue >= REMIST_STEP) {
      m.fillStyle = `rgba(255,255,255,${Math.min(1, (this.remistDue / REMIST_SECONDS) * 3).toFixed(3)})`;
      m.fillRect(0, 0, this.mist.width, this.mist.height);
      this.remistDue = 0;
    }

    const area = (this.w * this.h) / DESIGN_AREA;
    const cap = (90 + 520 * level) * area;
    const landings = level > 0.01 ? (6 + 64 * level) * area * dt : 0;
    let due = Math.floor(landings) + (Math.random() < landings % 1 ? 1 : 0);
    while (due-- > 0 && this.drops.length < cap) this.land(Math.random() * this.w, Math.random() * this.h, 0.2 + Math.random() ** 3 * 2.6);

    m.save();
    m.globalCompositeOperation = 'destination-out';
    m.fillStyle = '#fff';
    const fresh: Drop[] = [];
    for (const d of this.drops) {
      if (!d.sliding) continue;
      if (d.pause > 0) {
        d.pause -= dt;
        continue;
      }
      const before = d.y;
      d.speed = Math.min(d.speed + 60 * this.unit * dt, (24 + d.mass * 6) * this.unit);
      d.y += d.speed * dt;
      d.x += (Math.random() - 0.5) * 6 * this.unit * dt;
      if (Math.random() < dt * 0.8) {
        d.pause = 0.2 + Math.random() * 0.9;
        d.speed = 0;
      }
      // The slide leaves a clear trail and the odd droplet behind.
      const width = (sizeOf(d.mass) + 1) / MIST_SCALE;
      m.fillRect(d.x / MIST_SCALE - width / 2, before / MIST_SCALE - 1, width, (d.y - before) / MIST_SCALE + 2);
      if (Math.random() < dt * 1.5 && d.mass > SLIDE_MASS) {
        d.mass -= 0.25;
        fresh.push({ x: d.x, y: before, mass: 0.3, sliding: false, speed: 0, pause: 0 });
      }
      for (const o of this.drops) {
        if (o === d || o.mass <= 0 || Math.abs(o.x - d.x) > 2.5 || o.y < before - 1 || o.y > d.y + 3) continue;
        d.mass = Math.min(MAX_MASS, d.mass + o.mass);
        o.mass = 0;
      }
    }
    m.restore();
    this.drops = this.drops.filter((d) => d.mass > 0 && d.y < this.h + 6).concat(fresh);
    if (level < 0.01) this.drops = this.drops.filter(() => Math.random() > dt * 0.3);
  }

  /** A drop lands: it joins a drop it touches, and a drop that gets heavy enough starts to slide. */
  private land(x: number, y: number, mass: number): void {
    const near = this.drops.find((d) => !d.sliding && Math.abs(d.x - x) < 2.5 && Math.abs(d.y - y) < 2.5);
    const d = near ?? { x, y, mass: 0, sliding: false, speed: 0, pause: 0 };
    d.mass = Math.min(MAX_MASS, d.mass + mass);
    if (!near) this.drops.push(d);
    if (d.mass >= SLIDE_MASS) d.sliding = true;
  }

  private newStreak(y: number): Streak {
    const near = Math.random();
    return {
      x: Math.random() * (this.w + this.h * WIND) - this.h * WIND, y,
      length: Math.round((3 + near * 6) * this.unit), speed: (260 + near * 220) * this.unit, alpha: 0.18 + near * 0.32,
    };
  }

  private spritesFor(look: Look): HTMLCanvasElement[] {
    const key = look.tint.map((v) => Math.round(v / 16)).join(',');
    if (key === this.spriteKey) return this.sprites;
    this.spriteKey = key;
    const colors: Record<string, string> = {
      d: 'rgba(0,0,0,0.3)',
      o: css(mix(look.tint, [255, 255, 255], 0.5), 0.16),
      h: 'rgba(255,255,255,0.92)',
      L: css(mix(look.tint, [255, 255, 255], 0.65), 0.7),
    };
    this.sprites = DROP_SHAPES.map((rows) => dropSprite(rows, colors));
    return this.sprites;
  }
}

function dropSprite(rows: string[], colors: Record<string, string>): HTMLCanvasElement {
  const { canvas: c, ctx } = memoryCanvas(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const color = colors[ch];
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }));
  return c;
}

function distanceToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len)) : 0;
  return Math.hypot(px - x0 - dx * t, py - y0 - dy * t);
}
