import type { DeepScene } from './deep-scene';

/** Builds the Gargantua chapter, where the ship returns to the ring station. */
export function createGargantua(): DeepScene {
  return {
    resize() {},
    update() {},
    draw() {},
    press() {
      return false;
    },
  };
}
