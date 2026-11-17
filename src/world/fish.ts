import { approach, clamp, rand, chance } from './math';
import { floorAt, SURFACE_Y, WALL_MARGIN, depthScale } from './geometry';
import { SPECIES, growthScale } from './species';
import type { Fish, Food, Plant, Point, Tank } from './types';

/** Pointer speed (world units per second) that startles fish. */
const STARTLE_SPEED = 1400;
const STARTLE_RADIUS = 260;
const CURIOUS_RADIUS = 420;
/** Seconds the pointer must rest before fish come to look at it. */
const CURIOUS_AFTER = 0.7;
const NIGHT_LIGHT = 0.3;
const HUNGRY = 0.12;
const GRAZE_HUNGER = 0.55;
const SCHOOL_RADIUS = 120;

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function bodyLength(f: Fish): number {
  const spec = SPECIES[f.species];
  return spec.length * growthScale(f.age, spec.adultAge) * depthScale(f.z);
}

function boundsFor(f: Fish, tank: Tank): Bounds {
  const half = bodyLength(f) / 2;
  const bottomGap = SPECIES[f.species].bottomDweller ? half * 0.25 : half * 0.6 + 8;
  return {
    left: WALL_MARGIN + half,
    right: tank.width - WALL_MARGIN - half,
    top: SURFACE_Y + (f.mood === 'air' ? 4 : half * 0.5 + 18),
    bottom: floorAt(f.x, f.z) - bottomGap,
  };
}

function randomSwimPoint(f: Fish, tank: Tank): Point {
  const x = rand(WALL_MARGIN + 60, tank.width - WALL_MARGIN - 60);
  if (SPECIES[f.species].bottomDweller) return { x, y: floorAt(x, f.z) - rand(6, 40) };
  const low = f.mood === 'rest';
  return { x, y: low ? rand(520, 780) : rand(SURFACE_Y + 70, 760) };
}

function nearestFood(f: Fish, food: Food[]): number {
  const wantsFloor = SPECIES[f.species].bottomDweller;
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < food.length; i++) {
    const p = food[i];
    if (p.onFloor !== wantsFloor && !(wantsFloor && p.y > 700)) continue;
    const d = (p.x - f.x) ** 2 + (p.y - f.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function plantTip(p: Plant): Point {
  return { x: p.x, y: floorAt(p.x, p.z) - p.height * 0.85 };
}

/** The first wandering fish of a school leads; the rest share its destination so the school travels together. */
function schoolLeader(tank: Tank, species: Fish['species']): Fish | undefined {
  return tank.fish.find((o) => o.species === species && !o.leaving && (o.mood === 'wander' || o.mood === 'rest'));
}

function chooseMood(f: Fish, tank: Tank): void {
  const spec = SPECIES[f.species];
  const c = tank.cursor;
  const dCursor = c.inside ? Math.hypot(c.x - f.x, c.y - f.y) : Infinity;

  if (f.leaving) {
    f.mood = 'rest';
    f.targetZ = 0;
    return;
  }
  if (dCursor < STARTLE_RADIUS && c.speed > STARTLE_SPEED) {
    f.mood = 'flee';
    f.moodTimer = 1.6;
    return;
  }
  if (f.mood === 'flee' && f.moodTimer > 0) return;
  if (f.mood === 'air' && f.y > SURFACE_Y + 12) return;

  if (f.hunger > HUNGRY && nearestFood(f, tank.food) >= 0) {
    f.mood = 'food';
    return;
  }
  const awake = tank.light >= NIGHT_LIGHT;
  if (awake && dCursor < CURIOUS_RADIUS && c.stillFor > CURIOUS_AFTER && f.curiosity > 0.35) {
    f.mood = 'curious';
    return;
  }
  if (f.mood === 'curious' || f.mood === 'food' || (f.mood === 'air' && f.y <= SURFACE_Y + 12)) {
    f.mood = 'wander';
    f.targetTimer = 0;
  }
  if (f.mood === 'graze' && f.moodTimer > 0) return;
  if (!awake) {
    if (f.mood !== 'rest') f.targetTimer = 0;
    f.mood = 'rest';
    return;
  }
  if (f.mood === 'rest') {
    f.mood = 'wander';
    f.targetTimer = 0;
  }
  if (spec.bottomDweller && f.hunger < 0.4 && chance(1 / 2400)) {
    f.mood = 'air';
    f.target = { x: f.x + rand(-60, 60), y: SURFACE_Y };
    return;
  }
  if (f.hunger > GRAZE_HUNGER || (spec.bottomDweller && chance(1 / 900))) {
    startGrazing(f, tank);
  }
}

function startGrazing(f: Fish, tank: Tank): void {
  if (SPECIES[f.species].bottomDweller) {
    f.mood = 'graze';
    f.moodTimer = rand(8, 16);
    f.target = randomSwimPoint(f, tank);
    return;
  }
  if (tank.plants.length === 0) return;
  const plant = tank.plants[Math.floor(Math.random() * tank.plants.length)];
  if (plant.height < 40) return;
  f.mood = 'graze';
  f.moodTimer = 30;
  f.target = plantTip(plant);
  f.targetZ = plant.z;
}

/** Pulls a hovering fish toward its school mates: keep apart, line up, stay together. */
function schoolSteer(f: Fish, tank: Tank, out: Point): void {
  let n = 0;
  let ax = 0;
  let ay = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const personal = bodyLength(f) * 1.3;
  for (const o of tank.fish) {
    if (o === f || o.species !== f.species || o.leaving) continue;
    const dx = o.x - f.x;
    const dy = o.y - f.y;
    const dz = (o.z - f.z) * 200;
    const d = Math.hypot(dx, dy, dz);
    if (d > SCHOOL_RADIUS) continue;
    n++;
    ax += o.vx;
    ay += o.vy;
    cx += dx;
    cy += dy;
    if (d < personal && d > 0.01) {
      sx -= (dx / d) * (personal - d);
      sy -= (dy / d) * (personal - d);
    }
  }
  if (n === 0) return;
  out.x += (ax / n - f.vx) * 0.35 + (cx / n) * 0.25 + sx * 2.2;
  out.y += (ay / n - f.vy) * 0.35 + (cy / n) * 0.25 + sy * 2.2;
}

function seek(f: Fish, target: Point, speed: number, out: Point): number {
  const dx = target.x - f.x;
  const dy = target.y - f.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return 0;
  const arrive = Math.min(1, d / 90);
  out.x += (dx / d) * speed * arrive;
  out.y += (dy / d) * speed * arrive;
  return d;
}

function eat(f: Fish, tank: Tank, index: number): void {
  tank.food.splice(index, 1);
  f.hunger = Math.max(0, f.hunger - 0.3);
}

/** Advances one fish by dt seconds: needs, decisions, movement. */
export function updateFish(f: Fish, tank: Tank, dt: number): void {
  const spec = SPECIES[f.species];
  f.age += dt;
  f.breedCooldown = Math.max(0, f.breedCooldown - dt);
  f.hunger = Math.min(1, f.hunger + dt / spec.hungerTime);
  f.fade = f.leaving ? Math.max(0, f.fade - dt / 25) : Math.min(1, f.fade + dt / 3);
  f.moodTimer -= dt;
  f.targetTimer -= dt;

  chooseMood(f, tank);

  const desired: Point = { x: 0, y: 0 };
  let speed = spec.cruiseSpeed;
  let responsiveness = 1.4;
  let faceCursor = false;

  switch (f.mood) {
    case 'flee': {
      const c = tank.cursor;
      const dx = f.x - c.x;
      const dy = f.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      desired.x += (dx / d) * spec.maxSpeed;
      desired.y += (dy / d) * spec.maxSpeed;
      f.targetZ = clamp(f.z - 0.4, 0.05, 1);
      responsiveness = 5;
      speed = spec.maxSpeed;
      break;
    }
    case 'food': {
      const i = nearestFood(f, tank.food);
      if (i < 0) break;
      const p = tank.food[i];
      speed = spec.maxSpeed * 0.75;
      responsiveness = 3;
      f.targetZ = p.z;
      const d = seek(f, p, speed, desired);
      if (d < bodyLength(f) * 0.55 + 6 && Math.abs(f.z - p.z) < 0.25) eat(f, tank, i);
      break;
    }
    case 'curious': {
      const c = tank.cursor;
      const side = f.x < c.x ? -1 : 1;
      const hover = { x: c.x + side * (bodyLength(f) * 0.9 + 30), y: c.y + (f.id % 5) * 9 - 18 };
      seek(f, hover, spec.cruiseSpeed * 1.4, desired);
      f.targetZ = 1;
      faceCursor = true;
      break;
    }
    case 'graze': {
      const target = f.target;
      if (!target) break;
      const d = seek(f, target, spec.cruiseSpeed, desired);
      if (spec.bottomDweller) {
        if (d < 12) {
          f.hunger = Math.max(0, f.hunger - dt / 300);
          tank.nutrients = Math.max(0, tank.nutrients - dt * 0.00003);
          desired.x += Math.sin(tank.time * 9 + f.id) * 6;
        }
        if (f.moodTimer <= 0) f.mood = 'wander';
      } else if (d < 14) {
        f.hunger = Math.max(0, f.hunger - 0.25);
        const plant = tank.plants.find((p) => Math.abs(p.x - target.x) < 1);
        if (plant) plant.height = Math.max(24, plant.height - 10);
        f.mood = 'wander';
        f.targetTimer = 0;
      } else if (f.moodTimer <= 0) {
        f.mood = 'wander';
      }
      break;
    }
    case 'air': {
      if (f.target) seek(f, f.target, spec.cruiseSpeed * 2.4, desired);
      break;
    }
    case 'rest':
    case 'wander': {
      const resting = f.mood === 'rest';
      if (resting) speed *= 0.3;
      const leader = spec.schools ? schoolLeader(tank, f.species) : undefined;
      if (leader && leader !== f && leader.target) {
        f.target = leader.target;
        f.targetZ = leader.targetZ;
      } else if (!f.target || f.targetTimer <= 0 || Math.hypot(f.target.x - f.x, f.target.y - f.y) < 25) {
        f.target = randomSwimPoint(f, tank);
        f.targetZ = spec.bottomDweller ? rand(0.3, 1) : rand(0.1, 1);
        f.targetTimer = rand(6, 14) * (resting ? 2 : 1);
      }
      if (f.target) seek(f, f.target, speed, desired);
      break;
    }
    default: {
      const unreachable: never = f.mood;
      throw new Error(`Unknown fish mood ${String(unreachable)}`);
    }
  }

  if (spec.schools) schoolSteer(f, tank, desired);
  applyCurrent(f, tank, desired);
  const b = boundsFor(f, tank);
  avoidEdges(f, b, desired);

  f.vx = approach(f.vx, desired.x, responsiveness, dt);
  f.vy = approach(f.vy, desired.y, responsiveness, dt);
  const cap = f.mood === 'flee' || f.mood === 'food' ? spec.maxSpeed : speed * 1.6;
  const v = Math.hypot(f.vx, f.vy);
  if (v > cap) {
    f.vx *= cap / v;
    f.vy *= cap / v;
  }
  f.x = clamp(f.x + f.vx * dt, b.left, b.right);
  f.y = clamp(f.y + f.vy * dt, b.top, b.bottom);
  f.z = approach(f.z, f.targetZ, 0.35, dt);

  const c = tank.cursor;
  const faceTarget = faceCursor ? Math.sign(c.x - f.x) || 1 : Math.abs(f.vx) > 4 ? Math.sign(f.vx) : Math.sign(f.face) || 1;
  f.face = approach(f.face, faceTarget, 5, dt);
  f.tailPhase += dt * (4 + Math.hypot(f.vx, f.vy) / 10);
}

function applyCurrent(f: Fish, tank: Tank, out: Point): void {
  const cur = tank.current;
  if (cur.strength <= 0.01) return;
  const d = Math.hypot(f.x - cur.x, f.y - cur.y);
  if (d > 320) return;
  const k = cur.strength * (1 - d / 320);
  out.x += cur.fx * k;
  out.y += cur.fy * k;
}

function avoidEdges(f: Fish, b: Bounds, out: Point): void {
  const soft = 70;
  if (f.x < b.left + soft) out.x += (b.left + soft - f.x) * 1.5;
  if (f.x > b.right - soft) out.x -= (f.x - (b.right - soft)) * 1.5;
  if (f.mood !== 'air' && f.y < b.top + soft * 0.6) out.y += (b.top + soft * 0.6 - f.y) * 1.5;
  if (f.y > b.bottom - 10 && !SPECIES[f.species].bottomDweller) out.y -= (f.y - (b.bottom - 10)) * 1.5;
}
