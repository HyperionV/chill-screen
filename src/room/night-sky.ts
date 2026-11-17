import { seededRandom } from '../world/math';
import type { Look } from '../wallpapers/look';

/** Maps a 0..1 position on the view to where it is on the stage right now. */
export type Place = (u: number, v: number) => [number, number];

interface Star {
  u: number;
  v: number;
  /** Bright stars get a small cross of light; the rest are single pixels. */
  bright: boolean;
  phase: number;
  speed: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  duration: number;
}

const MAX_STARS = 140;
const TAIL_SECONDS = 0.12;

/** Twinkling pixel stars in the dark open sky of a view, and the odd shooting star. */
export class NightSky {
  private readonly cache = new WeakMap<Look, Star[]>();
  private meteors: Meteor[] = [];
  private untilMeteor = 8;

  draw(ctx: CanvasRenderingContext2D, look: Look, place: Place, alpha: number, time: number): void {
    const visible = alpha * Math.max(0, (look.night - 0.3) / 0.7);
    if (visible < 0.02) return;
    ctx.save();
    ctx.fillStyle = '#f2f4ff';
    for (const s of this.starsOf(look)) {
      const [fx, fy] = place(s.u, s.v);
      const x = Math.round(fx);
      const y = Math.round(fy);
      const tw = 0.5 + 0.5 * Math.sin(time * s.speed + s.phase);
      ctx.globalAlpha = visible * (0.3 + 0.7 * tw * tw);
      ctx.fillRect(x, y, 1, 1);
      if (!s.bright || tw < 0.6) continue;
      ctx.globalAlpha *= 0.45;
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    }
    ctx.restore();
  }

  /** A shooting star now and then across the top of a night sky, `w` x `h` stage pixels. */
  drawMeteors(ctx: CanvasRenderingContext2D, dt: number, night: number, w: number, h: number): void {
    this.untilMeteor -= dt;
    if (night > 0.6 && this.untilMeteor <= 0) {
      this.untilMeteor = 14 + Math.random() * 30;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const speed = h * (1.6 + Math.random() * 0.8);
      const angle = 0.3 + Math.random() * 0.3;
      this.meteors.push({
        x: w * (dir > 0 ? 0.1 + Math.random() * 0.5 : 0.4 + Math.random() * 0.5), y: h * Math.random() * 0.2,
        vx: Math.cos(angle) * speed * dir, vy: Math.sin(angle) * speed, age: 0, duration: 0.6 + Math.random() * 0.4,
      });
    }
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (const m of this.meteors) {
      m.age += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const a = Math.sin(Math.PI * Math.min(1, m.age / m.duration)) * night;
      const steps = Math.ceil(Math.hypot(m.vx, m.vy) * TAIL_SECONDS);
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        ctx.globalAlpha = a * (1 - k) * (1 - k);
        ctx.fillRect(Math.round(m.x - m.vx * TAIL_SECONDS * k), Math.round(m.y - m.vy * TAIL_SECONDS * k), 1, 1);
      }
    }
    ctx.restore();
    this.meteors = this.meteors.filter((m) => m.age < m.duration);
  }

  private starsOf(look: Look): Star[] {
    const cached = this.cache.get(look);
    if (cached) return cached;
    const rnd = seededRandom(look.sky.length * 7919 + Math.round(look.mean * 1e4));
    const stars: Star[] = [];
    for (let i = 0; i < Math.min(MAX_STARS, look.sky.length); i++) {
      const cell = look.sky[Math.floor(rnd() * look.sky.length)];
      stars.push({
        u: cell.u + (rnd() - 0.5) / 64, v: cell.v + (rnd() - 0.5) / 36,
        bright: rnd() < 0.12, phase: rnd() * Math.PI * 2, speed: 0.6 + rnd() * 2.2,
      });
    }
    this.cache.set(look, stars);
    return stars;
  }
}
