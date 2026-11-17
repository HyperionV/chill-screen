import { seededRandom } from '../world/math';
import { floorAt, SAND_BACK_Y, SURFACE_Y, TANK_HEIGHT } from '../world/geometry';
import type { Palette } from '../world/daylight';
import type { Tank } from '../world/types';
import { css } from './color';

/** Caustic tile size in pixels, frames in one loop, and how long a loop lasts. */
const TILE = 160;
const FRAMES = 24;
const LOOP_SECONDS = 8;
const CELLS = 9;
/** Caustics and shafts are soft, so they are drawn at a fraction of screen resolution and stretched. */
const CAUSTIC_RES = 0.5;
const RAY_RES = 0.25;
const CAUSTIC_TOP = SAND_BACK_Y - 30;
const SHAFTS = 7;
/** Sunlight slants: how far right a shaft travels from the surface to the sand. */
const SLANT = 240;

/**
 * Builds a looping animation of the rippling light net that sunlight casts through a moving surface.
 * Each frame is a seamless tile: bright lines along the borders of slowly drifting cells.
 */
function causticFrames(): HTMLCanvasElement[] {
  const rnd = seededRandom(4242);
  const cells = Array.from({ length: CELLS }, () => ({
    x: rnd() * TILE, y: rnd() * TILE, r: 7 + rnd() * 9, turns: rnd() < 0.5 ? 1 : -1, phase: rnd() * Math.PI * 2,
  }));
  const frames: HTMLCanvasElement[] = [];
  const wrap = (d: number): number => {
    const a = Math.abs(d);
    return a > TILE / 2 ? TILE - a : a;
  };
  const wave = (2 * Math.PI) / TILE;
  for (let f = 0; f < FRAMES; f++) {
    const a = (f / FRAMES) * Math.PI * 2;
    const cx = cells.map((c) => c.x + Math.cos(a * c.turns + c.phase) * c.r);
    const cy = cells.map((c) => c.y + Math.sin(a * c.turns + c.phase) * c.r);
    const img = new ImageData(TILE, TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        // A gentle wobble so the cell borders curve like real caustics; whole periods keep the tile seamless.
        const wx = x + Math.sin(y * wave * 2 + a) * 5;
        const wy = y + Math.sin(x * wave * 2 - a) * 5;
        let d1 = Infinity;
        let d2 = Infinity;
        for (let i = 0; i < CELLS; i++) {
          const dx = wrap(wx - cx[i]);
          const dy = wrap(wy - cy[i]);
          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
        const edge = Math.sqrt(d2) - Math.sqrt(d1);
        // A thin bright line with a faint glow either side, as focused light looks.
        const line = Math.max(0, 1 - edge / 3.2);
        const glow = Math.max(0, 1 - edge / 11);
        const v = Math.min(1, line * line * 0.85 + glow * glow * 0.3);
        const k = (y * TILE + x) * 4;
        img.data[k] = 255;
        img.data[k + 1] = 252;
        img.data[k + 2] = 232;
        img.data[k + 3] = Math.round(v * 255);
      }
    }
    const c = document.createElement('canvas');
    c.width = TILE;
    c.height = TILE;
    c.getContext('2d')?.putImageData(img, 0, 0);
    frames.push(c);
  }
  return frames;
}

const ctxOf = (c: HTMLCanvasElement): CanvasRenderingContext2D => {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return ctx;
};

/** Sunlight moving through the water: soft slanted shafts, and the caustic net dancing on the sand. */
export class Sunlight {
  private readonly strip = document.createElement('canvas');
  private readonly mask = document.createElement('canvas');
  private readonly rays = document.createElement('canvas');
  private readonly rayFade = document.createElement('canvas');
  private readonly stripCtx = ctxOf(this.strip);
  private readonly rayCtx = ctxOf(this.rays);
  private readonly patterns: CanvasPattern[];
  private scale = 1;

  constructor() {
    this.patterns = causticFrames().map((frame) => {
      const p = this.stripCtx.createPattern(frame, 'repeat');
      if (!p) throw new Error('canvas patterns are not available');
      return p;
    });
  }

  resize(tank: Tank, canvasWidth: number, canvasHeight: number, scale: number): void {
    this.scale = scale;
    const k = scale * CAUSTIC_RES;
    this.strip.width = this.mask.width = Math.ceil(canvasWidth * CAUSTIC_RES);
    this.strip.height = this.mask.height = Math.ceil((TANK_HEIGHT - CAUSTIC_TOP) * k);

    // Only the sand catches the light, brighter toward the glass where it is closer to the lamp's focus.
    const m = ctxOf(this.mask);
    m.setTransform(k, 0, 0, k, 0, -CAUSTIC_TOP * k);
    const g = m.createLinearGradient(0, SAND_BACK_Y - 10, 0, TANK_HEIGHT);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.45, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    m.fillStyle = g;
    m.beginPath();
    m.moveTo(0, TANK_HEIGHT);
    for (let x = 0; x <= tank.width; x += 16) m.lineTo(x, floorAt(x, 0) + 2);
    m.lineTo(tank.width, TANK_HEIGHT);
    m.closePath();
    m.fill();
    // Patches where the light is weaker, so the net is never a uniform tiling.
    const rnd = seededRandom(tank.layoutSeed + 3);
    m.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < tank.width / 120; i++) {
      const x = rnd() * tank.width;
      const y = SAND_BACK_Y + rnd() * (TANK_HEIGHT - SAND_BACK_Y);
      const r = 80 + rnd() * 160;
      const blob = m.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, `rgba(0,0,0,${(0.45 + rnd() * 0.4).toFixed(2)})`);
      blob.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = blob;
      m.fillRect(x - r, y - r, r * 2, r * 2);
    }
    m.globalCompositeOperation = 'source-over';

    this.rays.width = this.rayFade.width = Math.ceil(canvasWidth * RAY_RES);
    this.rays.height = this.rayFade.height = Math.ceil(canvasHeight * RAY_RES);
    const f = ctxOf(this.rayFade);
    const fade = f.createLinearGradient(0, 0, 0, this.rayFade.height);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(0.55, 'rgba(0,0,0,0.55)');
    fade.addColorStop(0.9, 'rgba(0,0,0,0)');
    f.fillStyle = fade;
    f.fillRect(0, 0, this.rayFade.width, this.rayFade.height);
  }

  /** Call with the world transform set; draws in screen pixels and restores it. */
  drawCaustics(ctx: CanvasRenderingContext2D, pal: Palette, time: number): void {
    if (pal.light < 0.15) return;
    const s = this.stripCtx;
    const k = this.scale * CAUSTIC_RES;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-over';
    s.globalAlpha = 1;
    s.clearRect(0, 0, this.strip.width, this.strip.height);
    const phase = ((time / LOOP_SECONDS) * FRAMES) % FRAMES;
    const i = Math.floor(phase);
    // Seen at a low angle, the net on the floor is squashed in height.
    const matrix = new DOMMatrix().scale(k * 1.7, k * 0.6).translate(time * 2.5, time * 1.5);
    const a = this.patterns[i];
    const b = this.patterns[(i + 1) % FRAMES];
    a.setTransform(matrix);
    b.setTransform(matrix);
    s.fillStyle = a;
    s.fillRect(0, 0, this.strip.width, this.strip.height);
    s.globalAlpha = phase - i;
    s.fillStyle = b;
    s.fillRect(0, 0, this.strip.width, this.strip.height);
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(this.mask, 0, 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 * pal.light;
    ctx.drawImage(this.strip, 0, CAUSTIC_TOP * this.scale, this.strip.width / CAUSTIC_RES, this.strip.height / CAUSTIC_RES);
    ctx.restore();
  }

  /** Call with the world transform set; draws in screen pixels and restores it. */
  drawShafts(ctx: CanvasRenderingContext2D, tank: Tank, pal: Palette, time: number): void {
    if (pal.light < 0.12) return;
    const r = this.rayCtx;
    const k = this.scale * RAY_RES;
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = 'source-over';
    r.clearRect(0, 0, this.rays.width, this.rays.height);
    r.setTransform(k, 0, 0, k, 0, 0);
    const bottom = SAND_BACK_Y + 40;
    for (let i = 0; i < SHAFTS; i++) {
      const x = ((i + 0.35) / SHAFTS) * tank.width - SLANT * 0.4 + Math.sin(time * 0.035 + i * 2.1) * 90;
      const w = 34 + (Math.sin(time * 0.11 + i * 1.3) + 1) * 30 + (i % 3) * 14;
      // Shafts brighten and fade as the waves above focus and scatter the light.
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.27 + i * 1.9) * Math.sin(time * 0.13 + i);
      const alpha = (0.05 + pulse * 0.13) * pal.light;
      const midX = x + SLANT / 2;
      const midW = w * 1.6;
      const g = r.createLinearGradient(midX - midW, 0, midX + midW, 0);
      g.addColorStop(0, css(pal.rays, 0));
      g.addColorStop(0.5, css(pal.rays, alpha));
      g.addColorStop(1, css(pal.rays, 0));
      r.fillStyle = g;
      r.beginPath();
      r.moveTo(x - w * 0.6, SURFACE_Y);
      r.lineTo(x + w * 0.6, SURFACE_Y);
      r.lineTo(x + SLANT + w * 1.6, bottom);
      r.lineTo(x + SLANT - w * 1.6, bottom);
      r.closePath();
      r.fill();
    }
    r.setTransform(1, 0, 0, 1, 0, 0);
    r.globalCompositeOperation = 'destination-in';
    r.drawImage(this.rayFade, 0, 0);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(this.rays, 0, 0, this.rays.width / RAY_RES, this.rays.height / RAY_RES);
    ctx.restore();
  }
}
