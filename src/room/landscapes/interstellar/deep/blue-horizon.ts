import type { DeepScene } from './deep-scene';

/** Builds the Blue Horizon chapter, where the ship dives past a blue black hole. */
export function createBlueHorizon(): DeepScene {
  return {
    resize() {},
    update() {},
    draw() {},
    press() {
      return false;
    },
  };
}
