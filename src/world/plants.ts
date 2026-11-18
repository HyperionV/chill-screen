import { chance, clamp, rand, randInt } from './math';
import { ALGAE_CELLS, WALL_MARGIN } from './geometry';
import type { Plant, PlantKind, Tank } from './types';

/** Seconds of full light and good water for a plant to close most of the gap to its full height. */
const GROWTH_TIME = 1500;
/** Seconds of light a full-grown plant needs before it sends out a runner. */
const SPREAD_TIME = 1200;
const MIN_SPACING = 34;

const HEIGHT_RANGE: Record<PlantKind, [number, number]> = {
  ribbon: [380, 620],
  stem: [280, 480],
  fern: [110, 190],
};

export const plantCapacity = (width: number): number => Math.floor(width / 62);

export function makePlant(id: number, x: number, z: number, kind: PlantKind, height: number): Plant {
  const [lo, hi] = HEIGHT_RANGE[kind];
  return {
    id,
    kind,
    x,
    z,
    height,
    maxHeight: rand(lo, hi),
    blades: kind === 'ribbon' ? randInt(4, 7) : kind === 'stem' ? randInt(1, 3) : randInt(4, 6),
    hue: rand(92, 140),
    seed: Math.random() * 1000,
    spreadTimer: rand(0, SPREAD_TIME * 0.6),
  };
}

export function hasRoomForPlant(tank: Tank, x: number): boolean {
  if (x < WALL_MARGIN || x > tank.width - WALL_MARGIN) return false;
  if (tank.plants.length >= plantCapacity(tank.width)) return false;
  return tank.plants.every((p) => Math.abs(p.x - x) >= MIN_SPACING);
}

/** Plants grow with light and nutrients, draw nutrients from the water, and spread when mature. */
export function growPlants(tank: Tank, dt: number): void {
  const light = tank.light;
  const born: Plant[] = [];
  for (const p of tank.plants) {
    const rate = light * (0.35 + tank.nutrients) / GROWTH_TIME;
    const grown = (p.maxHeight - p.height) * Math.min(1, rate * dt);
    p.height += grown;
    tank.nutrients = Math.max(0, tank.nutrients - grown * 0.00004 - dt * p.height * 0.000000004);

    if (p.height < p.maxHeight * 0.8) continue;
    p.spreadTimer += dt * light;
    if (p.spreadTimer < SPREAD_TIME) continue;
    p.spreadTimer = 0;
    const x = p.x + (chance(0.5) ? -1 : 1) * rand(40, 110);
    if (hasRoomForPlant(tank, x) && born.every((b) => Math.abs(b.x - x) >= MIN_SPACING)) {
      born.push(makePlant(tank.nextId++, x, clamp(p.z + rand(-0.15, 0.15), 0.05, 0.95), p.kind, 10));
    }
  }
  tank.plants.push(...born);
}

/** Algae creeps over the sand with light, faster when the water is rich in waste. */
export function growAlgae(tank: Tank, dt: number): void {
  const rate = tank.light * (0.00002 + tank.nutrients * 0.0002);
  let total = 0;
  for (let i = 0; i < ALGAE_CELLS; i++) {
    const g = rate * dt * (1 - tank.algae[i]);
    tank.algae[i] += g;
    total += g;
  }
  tank.nutrients = Math.max(0, tank.nutrients - total * 0.01);
}
