import { approach, clamp, rand, chance } from './math';
import { algaeCellAt, ALGAE_CELLS, depthScale, floorAt, WALL_MARGIN } from './geometry';
import { SNAIL } from './species';
import type { Shrimp, Snail, Tank } from './types';

const ALGAE_WORTH_EATING = 0.12;
const SNAIL_GRAZE_RATE = 0.004;
const SHRIMP_GRAZE_RATE = 0.0025;

function eatFloorFood(tank: Tank, x: number, reach: number): boolean {
  const i = tank.food.findIndex((p) => p.onFloor && Math.abs(p.x - x) < reach);
  if (i < 0) return false;
  tank.food.splice(i, 1);
  return true;
}

function graze(tank: Tank, x: number, rate: number, dt: number): number {
  const cell = algaeCellAt(x, tank.width);
  const eaten = Math.min(tank.algae[cell], rate * dt);
  tank.algae[cell] -= eaten;
  return eaten;
}

function richestAlgaeX(tank: Tank, fromX: number): number | null {
  const cellWidth = tank.width / ALGAE_CELLS;
  let best: number | null = null;
  let bestScore = 0;
  for (let i = 0; i < ALGAE_CELLS; i++) {
    if (tank.algae[i] < ALGAE_WORTH_EATING) continue;
    const cx = (i + 0.5) * cellWidth;
    const score = tank.algae[i] / (1 + Math.abs(cx - fromX) / 300);
    if (score > bestScore) {
      bestScore = score;
      best = cx;
    }
  }
  return best;
}

export function updateSnail(s: Snail, tank: Tank, dt: number): void {
  s.age += dt;
  s.breedCooldown = Math.max(0, s.breedCooldown - dt);
  s.fade = s.leaving ? Math.max(0, s.fade - dt / 25) : Math.min(1, s.fade + dt / 3);
  s.full = Math.max(0, s.full - dt / 3000);
  if (s.hide > 0) {
    s.hide = Math.max(0, s.hide - dt);
    return;
  }
  if (eatFloorFood(tank, s.x, 14 * depthScale(s.z))) s.full = Math.min(1, s.full + 0.3);

  const speed = SNAIL.speed * depthScale(s.z) * (tank.light < 0.3 ? 0.5 : 1);
  const goal = richestAlgaeX(tank, s.x);
  if (goal !== null && Math.abs(goal - s.x) > 8) {
    s.dir = Math.sign(goal - s.x);
  } else if (goal !== null) {
    s.full = Math.min(1, s.full + graze(tank, s.x, SNAIL_GRAZE_RATE, dt));
    return;
  } else if (chance(dt / 40)) {
    s.dir = -s.dir;
  }
  s.x = clamp(s.x + s.dir * speed * dt, WALL_MARGIN, tank.width - WALL_MARGIN);
  if (s.x <= WALL_MARGIN || s.x >= tank.width - WALL_MARGIN) s.dir = -s.dir;
}

export function updateShrimp(p: Shrimp, tank: Tank, dt: number): void {
  p.age += dt;
  p.breedCooldown = Math.max(0, p.breedCooldown - dt);
  p.fade = p.leaving ? Math.max(0, p.fade - dt / 25) : Math.min(1, p.fade + dt / 3);
  p.full = Math.max(0, p.full - dt / 2500);

  const c = tank.cursor;
  const startled = c.inside && c.speed > 300 && Math.hypot(c.x - p.x, c.y - p.y) < 120;
  if (startled && !p.airborne) {
    p.dir = Math.sign(p.x - c.x) || 1;
    hop(p, 160, 150);
  }

  if (p.airborne) {
    p.vy += 70 * dt;
    p.vx = approach(p.vx, 0, 1.2, dt);
    const cur = tank.current;
    if (cur.strength > 0.01 && Math.hypot(p.x - cur.x, p.y - cur.y) < 260) {
      p.vx += cur.fx * cur.strength * dt * 2;
      p.vy += cur.fy * cur.strength * dt * 2;
    }
    p.x = clamp(p.x + p.vx * dt, WALL_MARGIN, tank.width - WALL_MARGIN);
    p.y += p.vy * dt;
    const floor = floorAt(p.x, p.z);
    if (p.y >= floor) {
      p.y = floor;
      p.airborne = false;
      p.vx = 0;
      p.vy = 0;
      p.hopTimer = rand(2, 8) * (tank.light < 0.3 ? 3 : 1);
    }
    return;
  }

  p.y = floorAt(p.x, p.z);
  p.full = Math.min(1, p.full + graze(tank, p.x, SHRIMP_GRAZE_RATE, dt));
  if (eatFloorFood(tank, p.x, 16 * depthScale(p.z))) p.full = Math.min(1, p.full + 0.3);
  p.hopTimer -= dt;
  if (p.hopTimer <= 0) {
    const goal = richestAlgaeX(tank, p.x);
    p.dir = goal !== null && Math.abs(goal - p.x) > 30 ? Math.sign(goal - p.x) : chance(0.5) ? 1 : -1;
    hop(p, rand(30, 80), rand(50, 110));
  }
}

function hop(p: Shrimp, sideways: number, up: number): void {
  p.airborne = true;
  p.vx = p.dir * sideways;
  p.vy = -up;
  p.y -= 1;
}
