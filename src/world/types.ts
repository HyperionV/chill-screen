export type SpeciesId = 'tetra' | 'rasbora' | 'angel' | 'gourami' | 'cory';
export type FishMood = 'wander' | 'food' | 'graze' | 'curious' | 'flee' | 'rest' | 'air';
export type PlantKind = 'ribbon' | 'stem' | 'fern';

export interface Point {
  x: number;
  y: number;
}

export interface Fish {
  id: number;
  species: SpeciesId;
  name: string;
  x: number;
  y: number;
  /** Depth: 0 is the back glass, 1 the front glass. */
  z: number;
  vx: number;
  vy: number;
  /** Facing, eased between -1 (left) and 1 (right) so turns animate. */
  face: number;
  /** Seconds lived while the tank was open. */
  age: number;
  /** 0 is full, 1 is starving. */
  hunger: number;
  /** 0..1, how readily this fish comes to look at the cursor. */
  curiosity: number;
  /** Small per-fish colour variation. */
  tint: number;
  tailPhase: number;
  breedCooldown: number;
  mood: FishMood;
  moodTimer: number;
  target: Point | null;
  targetZ: number;
  targetTimer: number;
  /** 0..1 visibility, used to fade fish in at birth and out at the end of life. */
  fade: number;
  leaving: boolean;
}

export interface Snail {
  id: number;
  x: number;
  z: number;
  dir: number;
  age: number;
  /** 0 is hungry, 1 is full. */
  full: number;
  breedCooldown: number;
  /** Seconds left hiding in the shell after being tapped. */
  hide: number;
  tint: number;
  fade: number;
  leaving: boolean;
}

export interface Shrimp {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  dir: number;
  age: number;
  full: number;
  breedCooldown: number;
  /** Seconds until the next hop. */
  hopTimer: number;
  airborne: boolean;
  fade: number;
  leaving: boolean;
}

export interface Plant {
  id: number;
  kind: PlantKind;
  x: number;
  z: number;
  height: number;
  maxHeight: number;
  blades: number;
  hue: number;
  seed: number;
  spreadTimer: number;
}

export interface Food {
  x: number;
  y: number;
  z: number;
  vy: number;
  onFloor: boolean;
  age: number;
}

export interface Rock {
  x: number;
  z: number;
  w: number;
  h: number;
  seed: number;
}

export interface Cursor {
  x: number;
  y: number;
  inside: boolean;
  /** Smoothed pointer speed in world units per second. */
  speed: number;
  /** Seconds the pointer has been nearly still. */
  stillFor: number;
}

export interface Current {
  x: number;
  y: number;
  fx: number;
  fy: number;
  /** Fades from 1 to 0 after a drag ends. */
  strength: number;
}

export interface Tank {
  /** World units; height is always 1000, width follows the window's shape. */
  width: number;
  height: number;
  /** Seconds the tank has been open in total. */
  time: number;
  light: number;
  fish: Fish[];
  snails: Snail[];
  shrimp: Shrimp[];
  plants: Plant[];
  food: Food[];
  rocks: Rock[];
  /** Algae cover along the floor, one cell per strip of sand, 0..1. */
  algae: number[];
  /** Dissolved waste in the water, 0..1; feeds plants and algae. */
  nutrients: number;
  nextId: number;
  layoutSeed: number;
  breedCheckTimer: number;
  cursor: Cursor;
  current: Current;
}
