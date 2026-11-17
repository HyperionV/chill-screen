import type { RGB } from '../../render/color';
import type { Pointer } from './wildlife';

/** Bird wing poses as pixels around the body: wings up, level, down. */
const BIRD_POSES: [number, number][][] = [
  [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]],
  [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]],
  [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]],
];
const BUTTERFLY_COLORS: RGB[] = [[250, 190, 60], [250, 250, 240], [240, 130, 170], [130, 190, 250], [250, 140, 60]];
const FIREFLY_COLOR = '230,255,130';
const BUTTERFLIES = 7;
const FIREFLIES = 34;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

interface Flock {
  x: number;
  y: number;
  vx: number;
  birds: { dx: number; dy: number; phase: number }[];
}

/** A small flock now and then crossing the daytime sky, in a loose V. */
export class Birds {
  private flock: Flock | null = null;
  private wait = 5;

  draw(ctx: CanvasRenderingContext2D, dt: number, time: number, day: number, w: number, h: number): void {
    if (day < 0.5) {
      this.flock = null;
      return;
    }
    if (!this.flock) {
      this.wait -= dt;
      if (this.wait > 0) return;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const count = 3 + Math.floor(Math.random() * 4);
      this.flock = {
        x: dir > 0 ? -12 : w + 12, y: h * rand(0.14, 0.36), vx: dir * rand(14, 22),
        birds: Array.from({ length: count }, (_, i) => {
          const rank = Math.ceil(i / 2);
          return { dx: -dir * rank * 6, dy: (i % 2 === 0 ? -1 : 1) * rank * 2.5, phase: Math.random() * 4 };
        }),
      };
      this.wait = rand(25, 70);
    }
    const f = this.flock;
    f.x += f.vx * dt;
    f.y += Math.sin(time * 0.4) * 0.04;
    ctx.fillStyle = `rgba(30,34,44,${(0.75 * day).toFixed(3)})`;
    for (const b of f.birds) {
      const beat = Math.floor(time * 5 + b.phase) % 4;
      const pose = BIRD_POSES[beat === 3 ? 1 : beat];
      const x = Math.round(f.x + b.dx);
      const y = Math.round(f.y + b.dy);
      for (const [dx, dy] of pose) ctx.fillRect(x + dx, y + dy, 1, 1);
    }
    if (f.vx > 0 ? f.x > w + 40 : f.x < -40) this.flock = null;
  }
}

interface Flutterer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  color: RGB;
}

/** Butterflies wandering over the grass by day. */
export class Butterflies {
  private readonly list: Flutterer[] = [];

  /** `presence` (0..1) is how many are about: they favour sunny meadows. `rows` is the band they fly in. */
  draw(ctx: CanvasRenderingContext2D, dt: number, time: number, presence: number, w: number, rows: [number, number], pointer: Pointer | null): void {
    if (presence < 0.05) return;
    if (!this.list.length) {
      for (let i = 0; i < BUTTERFLIES; i++) {
        this.list.push({ x: Math.random() * w, y: rand(rows[0], rows[1]), vx: 0, vy: 0, phase: Math.random() * 6, color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length] });
      }
    }
    const shown = Math.ceil(this.list.length * presence);
    for (let i = 0; i < shown; i++) {
      const b = this.list[i];
      b.vx += rand(-20, 20) * dt;
      b.vy += rand(-24, 24) * dt - Math.sin(time * 2 + b.phase) * 0.5;
      if (pointer && Math.hypot(pointer.x - b.x, pointer.y - b.y) < 26) {
        b.vx += Math.sign(b.x - pointer.x || 1) * 90 * dt;
        b.vy += Math.sign(b.y - pointer.y || 1) * 90 * dt;
      }
      b.vx = Math.max(-16, Math.min(16, b.vx));
      b.vy = Math.max(-10, Math.min(10, b.vy));
      b.x += (b.vx - 6) * dt;
      b.y += b.vy * dt;
      if (b.y < rows[0]) b.vy = Math.abs(b.vy);
      if (b.y > rows[1]) b.vy = -Math.abs(b.vy);
      if (b.x < -6) b.x = w + 6;
      if (b.x > w + 6) b.x = -6;
      const open = Math.floor(time * 7 + b.phase) % 2 === 0;
      const x = Math.round(b.x);
      const y = Math.round(b.y);
      ctx.fillStyle = `rgb(${b.color[0]},${b.color[1]},${b.color[2]})`;
      if (open) {
        ctx.fillRect(x - 1, y - 1, 1, 2);
        ctx.fillRect(x + 1, y - 1, 1, 2);
      } else {
        ctx.fillRect(x, y - 1, 1, 2);
      }
      ctx.fillStyle = 'rgb(40,30,24)';
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
}

/** Fireflies drifting low over the land at dusk and through the night, glowing in turn. */
export class Fireflies {
  private readonly list: Spark[] = [];

  /** `rows` is the band they drift in. Call after the land is tinted, so they glow rather than darken. */
  draw(ctx: CanvasRenderingContext2D, dt: number, time: number, night: number, w: number, rows: [number, number]): void {
    if (night < 0.3) return;
    if (!this.list.length) {
      for (let i = 0; i < FIREFLIES; i++) {
        this.list.push({ x: Math.random() * w, y: rand(rows[0], rows[1]), vx: 0, vy: 0, phase: Math.random() * 6.3, speed: rand(0.6, 1.6) });
      }
    }
    const strength = Math.min(1, (night - 0.3) / 0.4);
    for (const f of this.list) {
      f.vx += rand(-14, 14) * dt;
      f.vy += rand(-14, 14) * dt;
      f.vx = Math.max(-7, Math.min(7, f.vx));
      f.vy = Math.max(-5, Math.min(5, f.vy));
      f.x += (f.vx - 5) * dt;
      f.y += f.vy * dt;
      if (f.y < rows[0]) f.vy = Math.abs(f.vy);
      if (f.y > rows[1]) f.vy = -Math.abs(f.vy);
      if (f.x < -4) f.x = w + 4;
      const glow = Math.max(0, Math.sin(time * f.speed + f.phase)) ** 3 * strength;
      if (glow < 0.05) continue;
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      ctx.fillStyle = `rgba(${FIREFLY_COLOR},${(0.16 * glow).toFixed(3)})`;
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = `rgba(${FIREFLY_COLOR},${glow.toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
