import type { DeepScene } from './deep-scene';

/** Builds the Golden Heart chapter, a close view of a galaxy's amber core. */
export function createGoldenHeart(): DeepScene {
  return {
    resize() {},
    update() {},
    draw() {},
    press() {
      return false;
    },
  };
}
