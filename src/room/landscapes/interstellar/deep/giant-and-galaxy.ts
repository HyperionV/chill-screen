import type { DeepScene } from './deep-scene';

/** Builds the Giant and Galaxy chapter, where the ship passes a giant planet and an old spiral. */
export function createGiantAndGalaxy(): DeepScene {
  return {
    resize() {},
    update() {},
    draw() {},
    press() {
      return false;
    },
  };
}
