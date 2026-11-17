import { approach, chance, pick, rand, randInt, seededRandom } from './math';
import { ALGAE_CELLS, floorAt, SURFACE_Y, TANK_HEIGHT, WALL_MARGIN } from './geometry';
import { SHRIMP, SNAIL, SPECIES, SPECIES_IDS, growthScale, randomName } from './species';
import { updateFish } from './fish';
import { updateShrimp, updateSnail } from './critters';
import { growAlgae, growPlants, hasRoomForPlant, makePlant } from './plants';
import type { Fish, PlantKind, Shrimp, Snail, SpeciesId, Tank } from './types';

const BREED_CHECK_EVERY = 10;
const FOOD_DECAY_AFTER = 240;
const MAX_FOOD = 48;
/** Waste a fish adds per second for each world unit of its body length: bigger fish dirty the water more. */
const WASTE_PER_LENGTH = 0.00000004;
/** Fraction of dissolved waste the filter clears per second, sized for the full stock of five species. */
export const FILTER_RATE = 1 / 11000;

function makeFish(tank: Tank, species: SpeciesId, x: number, y: number, z: number, age: number): Fish {
  return {
    id: tank.nextId++,
    species,
    name: randomName(),
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    face: chance(0.5) ? 1 : -1,
    age,
    hunger: rand(0.1, 0.4),
    curiosity: rand(0, 1),
    tint: rand(-1, 1),
    tailPhase: rand(0, 10),
    breedCooldown: rand(0, SPECIES[species].breedCooldown * 0.5),
    mood: 'wander',
    moodTimer: 0,
    target: null,
    targetZ: z,
    targetTimer: 0,
    fade: age === 0 ? 0 : 1,
    leaving: false,
  };
}

function makeSnail(tank: Tank, x: number, z: number, age: number): Snail {
  return {
    id: tank.nextId++, x, z, dir: chance(0.5) ? 1 : -1, age, full: 0.6,
    breedCooldown: SNAIL.breedCooldown * 0.5, hide: 0, tint: rand(0, 1), fade: age === 0 ? 0 : 1, leaving: false,
  };
}

function makeShrimp(tank: Tank, x: number, z: number, age: number): Shrimp {
  return {
    id: tank.nextId++, x, y: floorAt(x, z), z, vx: 0, vy: 0, dir: chance(0.5) ? 1 : -1, age, full: 0.6,
    breedCooldown: SHRIMP.breedCooldown * 0.5, hopTimer: rand(1, 6), airborne: false, fade: age === 0 ? 0 : 1, leaving: false,
  };
}

/** A freshly set-up tank: a planted layout, a small school, a few cleaners. */
export function createTank(width: number): Tank {
  const tank: Tank = {
    width, height: TANK_HEIGHT, time: 0, light: 1,
    fish: [], snails: [], shrimp: [], plants: [], food: [], rocks: [],
    algae: Array.from({ length: ALGAE_CELLS }, () => rand(0, 0.25)),
    nutrients: 0.2, nextId: 1, layoutSeed: Math.floor(Math.random() * 1e9), breedCheckTimer: 0,
    cursor: { x: 0, y: 0, inside: false, speed: 0, stillFor: 0 },
    current: { x: 0, y: 0, fx: 0, fy: 0, strength: 0 },
  };

  const layout = seededRandom(tank.layoutSeed);
  const rockCount = 3 + Math.floor(layout() * 3);
  for (let i = 0; i < rockCount; i++) {
    tank.rocks.push({ x: (0.1 + layout() * 0.8) * width, z: 0.25 + layout() * 0.6, w: 90 + layout() * 160, h: 50 + layout() * 90, seed: layout() * 1000 });
  }

  const groups = [0.08 + Math.random() * 0.1, 0.32 + Math.random() * 0.1, 0.58 + Math.random() * 0.1, 0.84 + Math.random() * 0.08];
  for (const g of groups) {
    const n = randInt(4, 6);
    for (let i = 0; i < n; i++) {
      const x = g * width + rand(-120, 120);
      if (!hasRoomForPlant(tank, x)) continue;
      const kind: PlantKind = pick(['ribbon', 'ribbon', 'stem', 'fern']);
      const z = kind === 'fern' ? rand(0.55, 0.95) : rand(0.05, 0.5);
      const plant = makePlant(tank.nextId++, x, z, kind, 0);
      plant.height = plant.maxHeight * rand(0.5, 0.95);
      tank.plants.push(plant);
    }
  }

  for (const species of SPECIES_IDS) {
    const spec = SPECIES[species];
    for (let i = 0; i < spec.startCount; i++) {
      const x = rand(WALL_MARGIN + 100, width - WALL_MARGIN - 100);
      const z = rand(0.2, 1);
      const y = spec.bottomDweller ? floorAt(x, z) - 10 : rand(SURFACE_Y + 120, 700);
      tank.fish.push(makeFish(tank, species, x, y, z, rand(spec.adultAge, spec.lifespan * 0.4)));
    }
  }
  for (let i = 0; i < SNAIL.startCount; i++) tank.snails.push(makeSnail(tank, rand(100, width - 100), rand(0.4, 1), 7200));
  for (let i = 0; i < SHRIMP.startCount; i++) tank.shrimp.push(makeShrimp(tank, rand(100, width - 100), rand(0.4, 1), 7200));
  return tank;
}

/** Keeps every creature in place proportionally when the window changes shape. */
export function resizeTank(tank: Tank, width: number): void {
  if (width === tank.width || !(width > 0) || !(tank.width > 0)) return;
  const k = width / tank.width;
  for (const e of [...tank.fish, ...tank.snails, ...tank.shrimp, ...tank.plants, ...tank.food, ...tank.rocks]) e.x *= k;
  for (const f of tank.fish) if (f.target) f.target = { x: f.target.x * k, y: f.target.y };
  tank.width = width;
}

function updateFood(tank: Tank, dt: number): void {
  for (let i = tank.food.length - 1; i >= 0; i--) {
    const p = tank.food[i];
    p.age += dt;
    if (!p.onFloor) {
      p.vy = approach(p.vy, 26, 0.8, dt);
      p.x += Math.sin(p.age * 2 + p.z * 10) * 6 * dt;
      p.y += p.vy * dt;
      const floor = floorAt(p.x, p.z);
      if (p.y >= floor) {
        p.y = floor;
        p.onFloor = true;
        p.age = 0;
      }
    } else if (p.age > FOOD_DECAY_AFTER) {
      tank.food.splice(i, 1);
      tank.nutrients = Math.min(1, tank.nutrients + 0.02);
    }
  }
}

type Lifeform = { age: number; fade: number; leaving: boolean };

/** Old animals swim off and fade; never below a breeding pair, so no kind dies out. */
function retire<T extends Lifeform>(list: T[], lifespan: number, hungry: (e: T) => boolean): T[] {
  const living = list.filter((e) => !e.leaving).length;
  if (living > 2) {
    const candidate = list.find((e) => !e.leaving && (e.age > lifespan || hungry(e)));
    if (candidate && chance(0.05)) candidate.leaving = true;
  }
  return list.filter((e) => !(e.leaving && e.fade <= 0));
}

function breedFish(tank: Tank): void {
  if (tank.light < 0.5) return;
  for (const species of SPECIES_IDS) {
    const spec = SPECIES[species];
    const members = tank.fish.filter((f) => f.species === species && !f.leaving);
    const ready = members.filter((f) => f.age >= spec.adultAge && f.hunger < 0.35 && f.breedCooldown <= 0 && f.fade >= 1);
    if (ready.length < 2 || members.length >= spec.capacity) continue;
    if (!chance(0.03 * (1 - members.length / spec.capacity))) continue;
    const [a, b] = ready;
    a.breedCooldown = spec.breedCooldown;
    b.breedCooldown = spec.breedCooldown;
    const brood = Math.min(randInt(spec.broodMin, spec.broodMax), spec.capacity - members.length);
    for (let i = 0; i < brood; i++) {
      tank.fish.push(makeFish(tank, species, a.x + rand(-20, 20), a.y + rand(-15, 15), a.z, 0));
    }
  }
}

function breedCleaners(tank: Tank): void {
  const snails = tank.snails.filter((s) => !s.leaving);
  const readySnail = snails.find((s) => s.full > 0.7 && s.breedCooldown <= 0);
  if (readySnail && snails.length < SNAIL.capacity && chance(0.02 * (1 - snails.length / SNAIL.capacity))) {
    readySnail.breedCooldown = SNAIL.breedCooldown;
    tank.snails.push(makeSnail(tank, readySnail.x + rand(-30, 30), readySnail.z, 0));
  }
  const shrimp = tank.shrimp.filter((s) => !s.leaving);
  const readyShrimp = shrimp.find((s) => s.full > 0.7 && s.breedCooldown <= 0);
  if (readyShrimp && shrimp.length < SHRIMP.capacity && chance(0.02 * (1 - shrimp.length / SHRIMP.capacity))) {
    readyShrimp.breedCooldown = SHRIMP.breedCooldown;
    tank.shrimp.push(makeShrimp(tank, readyShrimp.x + rand(-30, 30), readyShrimp.z, 0));
  }
}

function managePopulation(tank: Tank): void {
  breedFish(tank);
  breedCleaners(tank);
  for (const species of SPECIES_IDS) {
    const members = tank.fish.filter((f) => f.species === species);
    const kept = retire(members, SPECIES[species].lifespan, () => false);
    if (kept.length !== members.length) tank.fish = tank.fish.filter((f) => f.species !== species || kept.includes(f));
  }
  tank.snails = retire(tank.snails, SNAIL.lifespan, (s) => s.full < 0.03);
  tank.shrimp = retire(tank.shrimp, SHRIMP.lifespan, (s) => s.full < 0.03);
}

/** Advances the whole tank by dt seconds at the given light level (0 night, 1 day). */
export function stepTank(tank: Tank, dt: number, light: number): void {
  tank.time += dt;
  tank.light = light;
  updateFood(tank, dt);
  for (const f of tank.fish) updateFish(f, tank, dt);
  for (const s of tank.snails) updateSnail(s, tank, dt);
  for (const s of tank.shrimp) updateShrimp(s, tank, dt);
  growPlants(tank, dt);
  growAlgae(tank, dt);
  let bioload = 0;
  for (const f of tank.fish) {
    const spec = SPECIES[f.species];
    bioload += spec.length * growthScale(f.age, spec.adultAge);
  }
  tank.nutrients = Math.min(1, tank.nutrients + bioload * WASTE_PER_LENGTH * dt);
  tank.nutrients *= Math.exp(-FILTER_RATE * dt);
  tank.current.strength = approach(tank.current.strength, 0, 1.6, dt);

  tank.breedCheckTimer += dt;
  if (tank.breedCheckTimer >= BREED_CHECK_EVERY) {
    tank.breedCheckTimer = 0;
    managePopulation(tank);
  }
}

/** Scatters a pinch of food from the point clicked. Returns how many pellets were added. */
export function dropFood(tank: Tank, x: number, y: number): number {
  const room = MAX_FOOD - tank.food.length;
  const count = Math.min(room, randInt(4, 6));
  for (let i = 0; i < count; i++) {
    tank.food.push({ x: x + rand(-14, 14), y: Math.max(SURFACE_Y + 4, y + rand(-8, 8)), z: rand(0.65, 1), vy: rand(8, 20), onFloor: false, age: 0 });
  }
  return count;
}

/** Plants a sprout where the sand was clicked, if there is room. */
export function plantSprout(tank: Tank, x: number, z: number): boolean {
  if (!hasRoomForPlant(tank, x)) return false;
  tank.plants.push(makePlant(tank.nextId++, x, z, pick(['ribbon', 'stem', 'fern'] as const), 12));
  return true;
}

/** A snail that is tapped tucks into its shell for a few seconds. */
export function tapSnail(tank: Tank, x: number, y: number): boolean {
  const snail = tank.snails.find((s) => Math.hypot(s.x - x, floorAt(s.x, s.z) - 10 - y) < 26);
  if (!snail) return false;
  snail.hide = 6;
  return true;
}

/** Dragging through the water pushes a gentle current along the drag. */
export function stir(tank: Tank, x: number, y: number, fx: number, fy: number): void {
  tank.current = { x, y, fx: Math.max(-400, Math.min(400, fx)), fy: Math.max(-400, Math.min(400, fy)), strength: 1 };
}

export const isOnSand = (x: number, y: number): boolean => y >= floorAt(x, 0);
