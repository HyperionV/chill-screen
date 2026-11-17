import { buildCraftSprites, type CraftSprites } from './sprites-craft';
import { buildWorldSprites, type WorldSprites } from './sprites-worlds';

export type { Sprite } from './sprites-base';

export interface InterstellarSprites {
  worlds: WorldSprites;
  craft: CraftSprites;
}

export function buildInterstellarSprites(unit: number): InterstellarSprites {
  return {
    worlds: buildWorldSprites(unit),
    craft: buildCraftSprites(unit),
  };
}
