import type { NightSky } from '../night-sky';
import { createSeaside } from './seaside';
import type { OutsideView } from '../view';
import { createAlpinePeak } from './alpine-peak';
import { createCherryGrove } from './cherry-grove';
import { createFishingSpot } from './fishing-spot';
import { createForestCanopy } from './forest-canopy';
import { createGravityFalls } from './gravity-falls';
import { createInterstellar } from './interstellar';
import { createMirrorLake } from './mirror-lake';
import { createPineForest } from './pine-forest';
import { createRooftopCity } from './rooftop-city';
import { createSnowyCabin } from './snowy-cabin';
import { createZenGarden } from './zen-garden';

export const LANDSCAPES = [
  'seaside', 'pine-forest', 'mirror-lake', 'cherry-grove', 'fishing-spot',
  'interstellar', 'alpine-peak', 'snowy-cabin', 'zen-garden', 'rooftop-city', 'gravity-falls', 'forest-canopy',
] as const;
export type LandscapeId = (typeof LANDSCAPES)[number];

interface LandscapeEntry {
  label: string;
  /** True when the landscape keeps its own sky (space) and ignores the Time control. */
  ownSky?: true;
  /** One line for the picker: what is there and what the pointer and clicks do. */
  hint: string;
  create(nightSky: NightSky): OutsideView;
}

export const LANDSCAPE_ENTRIES: Record<LandscapeId, LandscapeEntry> = {
  seaside: { label: 'Seaside', create: createSeaside, hint: 'Beach, harbour and lighthouse. Find the crab, the fish and a bottle note.' },
  'pine-forest': { label: 'Pine Forest', create: createPineForest, hint: 'Tall pines in the mist. Wake the deer and the owl.' },
  'mirror-lake': { label: 'Mirror Lake', create: createMirrorLake, hint: 'A still lake that mirrors the sky. Touch the water to send ripples.' },
  'cherry-grove': { label: 'Cherry Blossom Grove', create: createCherryGrove, hint: 'Petals on the wind. Shake the trees with the pointer.' },
  'fishing-spot': { label: 'Fishing Spot', create: createFishingSpot, hint: 'A jetty and a float. Cast, wait and reel in a catch.' },
  interstellar: { label: 'Interstellar', ownSky: true, create: createInterstellar, hint: 'Ten scenes of deep space, ending in the story of a ship coming home. Fire a comet with a click.' },
  'alpine-peak': { label: 'Alpine Peak', create: createAlpinePeak, hint: 'Snow ridges and an eagle. Trigger a gentle avalanche.' },
  'snowy-cabin': { label: 'Snowy Cabin', create: createSnowyCabin, hint: 'A warm cabin in falling snow. Light the lamp and the chimney.' },
  'zen-garden': { label: 'Zen Garden', create: createZenGarden, hint: 'Raked sand and a koi pond. Draw lines in the sand.' },
  'rooftop-city': { label: 'Rooftop City', create: createRooftopCity, hint: 'A skyline from above. Wave at the neighbours and the pigeons.' },
  'gravity-falls': { label: 'Gravity Falls', create: createGravityFalls, hint: 'A mystery-filled town and woods. Chat with the cast, hunt hidden symbols and decode notes.' },
  'forest-canopy': { label: 'Forest Canopy', create: createForestCanopy, hint: 'Lying on a root, looking up through tall trees and sunrays. Click to shake the leaves loose.' },
};

/** The landscape to show when nothing has been chosen, or when the saved choice is no longer on offer. */
export const DEFAULT_LANDSCAPE: LandscapeId = 'seaside';
