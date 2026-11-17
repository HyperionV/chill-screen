import { rand } from '../world/math';
import { ALGAE_CELLS, floorAt, SURFACE_Y, TANK_HEIGHT } from '../world/geometry';
import type { Palette } from '../world/daylight';
import type { Tank } from '../world/types';
import { css, mix, type RGB } from './color';

/** Purely visual motion: bubbles, drifting specks, light, the surface, puffs of sand. */
interface Bubble { x: number; y: number; r: number; vy: number; wobble: number }
interface Mote { x: number; y: number; z: number; vx: number; vy: number }
interface Puff { x: number; y: number; vx: number; vy: number; life: number; color: RGB }

export interface Effects {
  bubbles: Bubble[];
  motes: Mote[];
  puffs: Puff[];
  bubbleTimer: number;
  bubblerX: number;
}

export function createEffects(tank: Tank): Effects {
  const motes: Mote[] = [];
  for (let i = 0; i < 70; i++) {
    motes.push({ x: rand(0, tank.width), y: rand(SURFACE_Y, 900), z: rand(0, 1), vx: rand(-3, 3), vy: rand(-2, 2) });
  }
  return { bubbles: [], motes, puffs: [], bubbleTimer: 0, bubblerX: 0.88 };
}

export function updateEffects(fx: Effects, tank: Tank, dt: number, time: number): void {
  const cur = tank.current;
  const push = (x: number, y: number): [number, number] => {
    if (cur.strength < 0.01) return [0, 0];
    const d = Math.hypot(x - cur.x, y - cur.y);
    if (d > 300) return [0, 0];
    const k = cur.strength * (1 - d / 300);
    return [cur.fx * k, cur.fy * k];
  };

  fx.bubbleTimer -= dt;
  if (fx.bubbleTimer <= 0) {
    fx.bubbleTimer = rand(0.05, 0.16);
    const x = fx.bubblerX * tank.width;
    fx.bubbles.push({ x: x + rand(-4, 4), y: floorAt(x, 0.5) - 8, r: rand(1.5, 5.5), vy: rand(-90, -150), wobble: rand(0, 6) });
  }
  for (let i = fx.bubbles.length - 1; i >= 0; i--) {
    const b = fx.bubbles[i];
    const [px, py] = push(b.x, b.y);
    b.x += (Math.sin(time * 3 + b.wobble) * 14 + px * 0.6) * dt;
    b.y += (b.vy * (0.7 + b.r / 10) + py * 0.3) * dt;
    if (b.y < SURFACE_Y + 3) fx.bubbles.splice(i, 1);
  }

  for (const m of fx.motes) {
    const [px, py] = push(m.x, m.y);
    m.x += (m.vx + Math.sin(time * 0.2 + m.z * 9) * 3 + px * 0.5) * dt;
    m.y += (m.vy + Math.cos(time * 0.17 + m.z * 7) * 2 + py * 0.5) * dt;
    if (m.x < 0) m.x += tank.width;
    if (m.x > tank.width) m.x -= tank.width;
    if (m.y < SURFACE_Y) m.y = 900;
    if (m.y > 900) m.y = SURFACE_Y;
  }

  for (let i = fx.puffs.length - 1; i >= 0; i--) {
    const p = fx.puffs[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
    if (p.life <= 0) fx.puffs.splice(i, 1);
  }
}

export function sandPuff(fx: Effects, x: number, y: number, sand: RGB): void {
  for (let i = 0; i < 14; i++) {
    fx.puffs.push({ x, y, vx: rand(-40, 40), vy: rand(-60, -15), life: rand(0.6, 1.3), color: sand });
  }
}

export function drawAlgae(ctx: CanvasRenderingContext2D, tank: Tank): void {
  const cell = tank.width / ALGAE_CELLS;
  let total = 0;
  for (let i = 0; i < ALGAE_CELLS; i++) {
    const a = tank.algae[i];
    total += a;
    if (a < 0.05) continue;
    const x = (i + 0.5) * cell;
    ctx.fillStyle = `rgba(74,122,44,${(a * 0.38).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, floorAt(x, 0.45), cell * 0.75, 26 + a * 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const mean = total / ALGAE_CELLS;
  if (mean > 0.2) {
    ctx.fillStyle = `rgba(70,120,40,${((mean - 0.2) * 0.12).toFixed(3)})`;
    ctx.fillRect(0, 0, tank.width, TANK_HEIGHT);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, fx: Effects, pal: Palette): void {
  ctx.fillStyle = css(mix(pal.waterTop, [255, 255, 255], 0.6), 0.22);
  for (const m of fx.motes) {
    ctx.beginPath();
    ctx.arc(m.x, m.y, 0.8 + m.z * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of fx.puffs) {
    ctx.fillStyle = css(p.color, Math.max(0, p.life) * 0.5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1;
  for (const b of fx.bubbles) {
    ctx.strokeStyle = 'rgba(230,248,255,0.55)';
    ctx.fillStyle = 'rgba(230,248,255,0.1)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}
