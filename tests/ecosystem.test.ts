import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTank, dropFood, stepTank } from '../src/world/tank';
import { catchUp, loadTank, saveTank } from '../src/world/save';
import { paletteAt } from '../src/world/daylight';
import { SHRIMP, SNAIL, SPECIES, SPECIES_IDS } from '../src/world/species';
import { seededRandom } from '../src/world/math';
import type { Tank } from '../src/world/types';

const STEP = 0.25;
const HOUR = 3600;
/** A simulated day takes several seconds of real time. */
const DAY_TEST_TIMEOUT_MS = 120_000;
const WIDTH = 1778;
/** Simulated clock starts at 8am so the first hours are daylight, like a work session. */
const lightAt = (t: number): number => paletteAt((8 + t / HOUR) % 24).light;

function run(tank: Tank, hours: number, everyStep?: (t: number) => void): void {
  for (let t = 0; t < hours * HOUR; t += STEP) {
    stepTank(tank, STEP, lightAt(t));
    everyStep?.(t);
  }
}

const living = <T extends { leaving: boolean }>(list: T[]): number => list.filter((e) => !e.leaving).length;
const countOf = (tank: Tank, id: string): number => tank.fish.filter((f) => f.species === id && !f.leaving).length;

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(i: number): string | null { return [...this.data.keys()][i] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('fish tank ecosystem', () => {
  const realRandom = Math.random;
  beforeEach(() => {
    Math.random = seededRandom(20261117);
  });
  afterEach(() => {
    Math.random = realRandom;
  });

  it('keeps every kind of animal alive and within bounds over a full day nobody feeds it', () => {
    const tank = createTank(WIDTH);
    const plantsAtStart = tank.plants.length;
    run(tank, 24);

    for (const id of SPECIES_IDS) {
      expect(countOf(tank, id), id).toBeGreaterThanOrEqual(2);
      expect(countOf(tank, id), id).toBeLessThanOrEqual(SPECIES[id].capacity);
    }
    expect(living(tank.snails)).toBeGreaterThanOrEqual(2);
    expect(living(tank.snails)).toBeLessThanOrEqual(SNAIL.capacity);
    expect(living(tank.shrimp)).toBeGreaterThanOrEqual(2);
    expect(living(tank.shrimp)).toBeLessThanOrEqual(SHRIMP.capacity);
    expect(tank.plants.length).toBeGreaterThanOrEqual(plantsAtStart);
    const algaeMean = tank.algae.reduce((a, b) => a + b, 0) / tank.algae.length;
    expect(algaeMean).toBeLessThan(0.8);
    for (const f of tank.fish) {
      expect(Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.z)).toBe(true);
      expect(f.x).toBeGreaterThan(0);
      expect(f.x).toBeLessThan(tank.width);
    }
  }, DAY_TEST_TIMEOUT_MS);

  it('rewards regular feeding with young fish, without overcrowding', () => {
    const tank = createTank(WIDTH);
    const tetrasAtStart = countOf(tank, 'tetra');
    let nextMeal = 0;
    run(tank, 24, (t) => {
      if (t >= nextMeal && lightAt(t) > 0.5) {
        dropFood(tank, tank.width * 0.3, 120);
        dropFood(tank, tank.width * 0.6, 120);
        nextMeal = t + 15 * 60;
      }
    });

    expect(countOf(tank, 'tetra')).toBeGreaterThan(tetrasAtStart);
    expect(tank.fish.some((f) => f.age < 24 * HOUR - 1)).toBe(true);
    for (const id of SPECIES_IDS) expect(countOf(tank, id), id).toBeLessThanOrEqual(SPECIES[id].capacity);
  }, DAY_TEST_TIMEOUT_MS);

  it('reopens the same tank after time away, with plants grown and fish not starved', () => {
    const storage = new MemoryStorage();
    const tank = createTank(WIDTH);
    run(tank, 0.5);
    for (const f of tank.fish) f.hunger = 0.95;
    const names = tank.fish.map((f) => f.name).sort();
    const plantHeight = tank.plants.reduce((a, p) => a + p.height, 0);
    saveTank(tank, storage, 0);

    const loaded = loadTank(storage);
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    catchUp(loaded.tank, 6 * HOUR, () => 1, 1200);

    expect(loaded.tank.fish.map((f) => f.name).sort()).toEqual(names);
    expect(loaded.tank.width).toBe(1200);
    expect(loaded.tank.plants.reduce((a, p) => a + p.height, 0)).toBeGreaterThan(plantHeight);
    expect(Math.max(...loaded.tank.fish.map((f) => f.hunger))).toBeLessThanOrEqual(0.5);
    for (const f of loaded.tank.fish) expect(f.x).toBeLessThanOrEqual(1200);
  });
});
