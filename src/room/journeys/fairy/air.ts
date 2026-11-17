import { css, type RGB } from '../../../render/color';

const FAIRY_COLORS: readonly RGB[] = [
  [164, 244, 255], // frost-blue fairy
  [255, 224, 128], // warm-gold fairy
  [248, 174, 224], // rose-mint fairy
];

const PETAL_COLORS: readonly RGB[] = [
  [250, 212, 228],
  [255, 240, 200],
  [214, 242, 232],
];

const MAX_FAIRIES = 14;
const MAX_FIREFLIES = 24;
const MAX_BATS = 5;
const MAX_SPORES = 24;
const MAX_PETALS = 18;
const MAX_POLLEN = 24;

interface Fairy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  colorIdx: number;
}

interface Bat {
  x: number;
  y: number;
  vx: number;
  phase: number;
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Ambient air motes and dusk fliers: 3 kinds of fairies, fireflies, dusk bats, spores, petals, and dawn pollen. */
export class FairyAir {
  private readonly fairies: Fairy[] = [];
  private readonly fireflies: Mote[] = [];
  private readonly spores: Mote[] = [];
  private readonly petals: Mote[] = [];
  private readonly pollen: Mote[] = [];
  private readonly bats: Bat[] = [];

  reset(w: number, h: number): void {
    if (!this.fairies.length) {
      for (let i = 0; i < MAX_FAIRIES; i++) {
        this.fairies.push({
          x: Math.random() * w, y: h * rand(0.58, 0.8),
          vx: 0, vy: 0, kind: i % FAIRY_COLORS.length, phase: rand(0, 6.28),
        });
      }
      for (let i = 0; i < MAX_FIREFLIES; i++) {
        this.fireflies.push({
          x: Math.random() * w, y: h * rand(0.62, 0.83),
          vx: 0, vy: 0, phase: rand(0, 6.28), speed: rand(0.7, 1.7), colorIdx: 0,
        });
      }
      for (let i = 0; i < MAX_SPORES; i++) {
        this.spores.push({
          x: Math.random() * w, y: h * rand(0.56, 0.83),
          vx: rand(-4, -1), vy: rand(-4, -1.5), phase: rand(0, 6.28), speed: rand(0.8, 1.5), colorIdx: i % 2,
        });
      }
      for (let i = 0; i < MAX_PETALS; i++) {
        this.petals.push({
          x: Math.random() * w, y: h * rand(0.45, 0.84),
          vx: rand(-10, -4), vy: rand(6, 12), phase: rand(0, 6.28), speed: rand(1, 2), colorIdx: i % PETAL_COLORS.length,
        });
      }
      for (let i = 0; i < MAX_POLLEN; i++) {
        this.pollen.push({
          x: Math.random() * w, y: h * rand(0.55, 0.86),
          vx: rand(-3, 3), vy: rand(-12, -6), phase: rand(0, 6.28), speed: rand(1.1, 2.2), colorIdx: 0,
        });
      }
      for (let i = 0; i < MAX_BATS; i++) {
        this.bats.push({
          x: Math.random() * w, y: h * rand(0.10, 0.27),
          vx: (i % 2 === 0 ? 1 : -1) * rand(18, 30), phase: rand(0, 6.28),
        });
      }
      return;
    }
    for (const f of this.fairies) { f.x = Math.min(w, f.x); f.y = Math.min(h * 0.82, Math.max(h * 0.57, f.y)); }
    for (const m of this.fireflies) { m.x = Math.min(w, m.x); m.y = Math.min(h * 0.83, Math.max(h * 0.6, m.y)); }
    for (const s of this.spores) { s.x = Math.min(w, s.x); s.y = Math.min(h * 0.82, Math.max(h * 0.54, s.y)); }
    for (const p of this.petals) { p.x = Math.min(w, p.x); p.y = Math.min(h * 0.84, Math.max(h * 0.42, p.y)); }
    for (const p of this.pollen) { p.x = Math.min(w, p.x); p.y = Math.min(h * 0.84, Math.max(h * 0.16, p.y)); }
    for (const b of this.bats) { b.x = Math.min(w, b.x); b.y = Math.min(h * 0.27, Math.max(h * 0.10, b.y)); }
  }

  update(dt: number, time: number, scrollDelta: number, w: number, h: number, unit: number): void {
    for (const f of this.fairies) {
      f.vx = Math.max(-20, Math.min(20, f.vx + rand(-28, 28) * dt));
      f.vy = Math.max(-14, Math.min(14, f.vy + rand(-24, 24) * dt));
      f.x += f.vx * dt - scrollDelta * 0.4;
      f.y += f.vy * dt + Math.sin(time * 2.4 + f.phase) * 4 * dt;
      if (f.y < h * 0.57) f.vy = Math.abs(f.vy);
      if (f.y > h * 0.82) f.vy = -Math.abs(f.vy);
      if (f.x < -8) f.x = w + 8;
      if (f.x > w + 8) f.x = -8;
    }
    for (const m of this.fireflies) {
      m.vx = Math.max(-8, Math.min(8, m.vx + rand(-14, 14) * dt));
      m.vy = Math.max(-5, Math.min(5, m.vy + rand(-14, 14) * dt));
      m.x += m.vx * dt - scrollDelta * 0.5;
      m.y += m.vy * dt;
      if (m.y < h * 0.6) m.vy = Math.abs(m.vy);
      if (m.y > h * 0.83) m.vy = -Math.abs(m.vy);
      if (m.x < -4) m.x = w + 4;
      if (m.x > w + 4) m.x = -4;
    }
    for (const s of this.spores) {
      s.x += s.vx * unit * dt - scrollDelta * 0.35 + Math.sin(time + s.phase) * 3 * unit * dt;
      s.y += s.vy * unit * dt;
      if (s.y < h * 0.54) s.y = h * 0.82;
      if (s.x < -4) s.x = w + 4;
    }
    for (const p of this.petals) {
      p.x += p.vx * unit * dt - scrollDelta * 0.4 + Math.sin(time * 1.4 + p.phase) * 6 * unit * dt;
      p.y += p.vy * unit * dt;
      if (p.y > h * 0.86) { p.y = h * 0.42; p.x = Math.random() * w; }
      if (p.x < -4) p.x = w + 4;
    }
    for (const g of this.pollen) {
      g.x += g.vx * unit * dt + Math.sin(time * 1.2 + g.phase) * 4 * unit * dt - scrollDelta * 0.2;
      g.y += g.vy * unit * dt;
      if (g.y < h * 0.16) { g.y = h * 0.84; g.x = Math.random() * w; }
      if (g.x < -4) g.x = w + 4;
      if (g.x > w + 4) g.x = -4;
    }
    for (const b of this.bats) {
      b.x += b.vx * unit * dt;
      b.y += Math.sin(time * 4 + b.phase) * 10 * unit * dt;
      if (b.x < -12) b.x = w + 12;
      if (b.x > w + 12) b.x = -12;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, day: number, weights: readonly number[], unit: number, sunHeight: number): void {
    const nightBoost = 1 - day;

    const fairyPresence = Math.min(1, weights[0] * 0.6 + weights[2] * 0.5 + weights[4] + weights[5] * 0.8);
    if (fairyPresence > 0.05) {
      const count = Math.ceil(this.fairies.length * fairyPresence);
      for (let i = 0; i < count; i++) {
        const f = this.fairies[i];
        const col = FAIRY_COLORS[f.kind];
        const twinkle = 0.5 + 0.5 * Math.sin(time * 5 + f.phase);
        const x = Math.round(f.x);
        const y = Math.round(f.y);
        ctx.fillStyle = css(col, 0.22 * twinkle * fairyPresence * (0.15 + nightBoost * 0.85));
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = css(col, 0.85 * fairyPresence);
        ctx.fillRect(x, y, 1, 1);
      }
    }

    if (nightBoost > 0.25) {
      const str = Math.min(1, (nightBoost - 0.25) / 0.45);
      for (const m of this.fireflies) {
        const g = Math.max(0, Math.sin(time * m.speed + m.phase)) ** 3 * str;
        if (g < 0.05) continue;
        const x = Math.round(m.x);
        const y = Math.round(m.y);
        ctx.fillStyle = `rgba(232,255,140,${(0.18 * g).toFixed(3)})`;
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = `rgba(232,255,140,${g.toFixed(3)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const twilight = Math.max(1 - day, 1 - Math.max(0, sunHeight) / 0.45);
    if (twilight > 0.02) {
      const batAlpha = Math.min(0.75, twilight * 0.75);
      ctx.fillStyle = `rgba(24,20,36,${batAlpha.toFixed(3)})`;
      for (const b of this.bats) {
        const x = Math.round(b.x);
        const y = Math.round(b.y);
        const up = Math.floor(time * 7 + b.phase) % 2 === 0;
        const pixel = Math.max(1, Math.round(unit));
        ctx.fillRect(x, y, pixel, pixel * 2);
        ctx.fillRect(x - pixel * 3, y + (up ? -pixel : pixel), pixel * 3, pixel);
        ctx.fillRect(x + pixel, y + (up ? -pixel : pixel), pixel * 3, pixel);
      }
    }

    if (weights[0] > 0.05) {
      for (const s of this.spores) {
        const a = weights[0] * (0.35 + 0.45 * Math.sin(time * s.speed + s.phase)) * (0.5 + 0.5 * nightBoost);
        if (a < 0.05) continue;
        ctx.fillStyle = s.colorIdx === 0 ? `rgba(176,248,226,${a.toFixed(3)})` : `rgba(246,232,162,${a.toFixed(3)})`;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      }
    }

    const petalAlpha = Math.min(1, weights[4] * 0.7 + weights[5]);
    if (petalAlpha > 0.05) {
      for (const p of this.petals) {
        ctx.fillStyle = css(PETAL_COLORS[p.colorIdx], petalAlpha * 0.85);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    }

    if (weights[5] > 0.05) {
      for (const g of this.pollen) {
        const a = weights[5] * (0.4 + 0.45 * Math.sin(time * g.speed + g.phase));
        ctx.fillStyle = `rgba(255,232,148,${a.toFixed(3)})`;
        ctx.fillRect(Math.round(g.x), Math.round(g.y), 1, 1);
      }
    }
  }
}
