import { growAlgae, growPlants } from './plants';
import { FILTER_RATE, resizeTank } from './tank';
import type { Tank } from './types';

const SAVE_KEY = 'chillscreen.tank';
const SAVE_VERSION = 2;
/** Time away beyond this is treated as this long, so a week away does not overgrow the tank. */
const MAX_CATCH_UP = 12 * 3600;
const CATCH_UP_STEP = 60;

interface SaveFile {
  version: number;
  savedAt: number;
  tank: Tank;
}

const isSaveFile = (v: unknown): v is SaveFile =>
  typeof v === 'object' && v !== null &&
  (v as { version?: unknown }).version === SAVE_VERSION &&
  typeof (v as { savedAt?: unknown }).savedAt === 'number' &&
  typeof (v as { tank?: unknown }).tank === 'object' &&
  Array.isArray((v as { tank: { fish?: unknown } }).tank.fish) &&
  Number.isFinite((v as { tank: { width?: unknown } }).tank.width);

export function saveTank(tank: Tank, storage: Storage, now: number): void {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: now, tank };
  storage.setItem(SAVE_KEY, JSON.stringify(file));
}

/** Returns the saved tank, or null when there is none or it is from an older version. */
export function loadTank(storage: Storage): { tank: Tank; savedAt: number } | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!isSaveFile(parsed)) return null;
  return { tank: parsed.tank, savedAt: parsed.savedAt };
}

/**
 * Brings a tank up to date after time away: plants and algae keep growing with the day's light,
 * leftover food breaks down, and the fish were fed by what grew. Fish only age while you watch.
 */
export function catchUp(tank: Tank, secondsAway: number, lightAt: (secondsAgo: number) => number, width: number): void {
  resizeTank(tank, width);
  tank.cursor = { x: 0, y: 0, inside: false, speed: 0, stillFor: 0 };
  tank.current = { x: 0, y: 0, fx: 0, fy: 0, strength: 0 };
  const away = Math.min(MAX_CATCH_UP, Math.max(0, secondsAway));
  if (away < CATCH_UP_STEP) return;

  tank.nutrients = Math.min(1, tank.nutrients + tank.food.length * 0.02);
  tank.food = [];
  for (let t = away; t > 0; t -= CATCH_UP_STEP) {
    tank.light = lightAt(t);
    growPlants(tank, CATCH_UP_STEP);
    growAlgae(tank, CATCH_UP_STEP);
    tank.nutrients *= Math.exp(-CATCH_UP_STEP * FILTER_RATE);
  }
  for (const f of tank.fish) {
    f.hunger = Math.min(f.hunger, 0.5);
    f.target = null;
  }
}
