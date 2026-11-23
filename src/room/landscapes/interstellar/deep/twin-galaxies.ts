import type { DeepScene } from './deep-scene';

/** Builds the Two Galaxies chapter, where two spirals circle as the ship turns home. */
export function createTwinGalaxies(): DeepScene {
  return {
    resize() {},
    update() {},
    draw() {},
    press() {
      return false;
    },
  };
}
