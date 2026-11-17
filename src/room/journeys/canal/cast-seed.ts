import { rand } from '../../../world/math';
import { CHAPTER_START } from './chapters';

export interface ShoreBird {
  wx: number;
  kind: 'heron' | 'kingfisher' | 'gull';
  state: 'still' | 'strike' | 'fly';
  timer: number;
  flyX: number;
  flyY: number;
  flyVx: number;
  flyVy: number;
  cooldown: number;
}

export interface RoamAnimal {
  wx: number;
  dy: number;
  kind: 'cow' | 'sheep' | 'cat' | 'villager';
  variant: number;
  dir: 1 | -1;
  state: 'idle' | 'walk' | 'drink' | 'wave' | 'stretch';
  timer: number;
  waveTimer: number;
  seed: number;
}

export interface FrogState {
  wx: number;
  dy: number;
  dived: boolean;
  timer: number;
}

export interface Swallow {
  x: number;
  y: number;
  phase: number;
  speed: number;
  scatterTimer: number;
}

export interface Gull {
  x: number;
  y: number;
  vx: number;
  phase: number;
  startleTimer: number;
}

export interface Dragonfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
  color: string;
}

export interface CastPopulation {
  shoreBirds: ShoreBird[];
  roamers: RoamAnimal[];
  frogs: FrogState[];
  swallows: Swallow[];
  gulls: Gull[];
  dragonflies: Dragonfly[];
}

const MAX_SWALLOWS = 5;
const MAX_GULLS = 6;
const MAX_DRAGONFLIES = 5;

/** Seeds the recurring cast of shore birds, market villagers, farm herds, quay cats, frogs, and air wildlife. */
export function createCastPopulation(): CastPopulation {
  const shoreBirds: ShoreBird[] = [];
  const roamers: RoamAnimal[] = [];
  const frogs: FrogState[] = [];
  const swallows: Swallow[] = [];
  const gulls: Gull[] = [];
  const dragonflies: Dragonfly[] = [];

  const birdSpots: { wx: number; kind: 'heron' | 'kingfisher' | 'gull' }[] = [
    { wx: CHAPTER_START[0] + 640, kind: 'heron' },
    { wx: CHAPTER_START[0] + 1020, kind: 'kingfisher' },
    { wx: CHAPTER_START[0] + 1780, kind: 'heron' },
    { wx: CHAPTER_START[0] + 2250, kind: 'kingfisher' },
    { wx: CHAPTER_START[5] + 540, kind: 'heron' },
    { wx: CHAPTER_START[5] + 1140, kind: 'kingfisher' },
    { wx: CHAPTER_START[5] + 1860, kind: 'heron' },
    { wx: CHAPTER_START[6] + 690, kind: 'gull' },
    { wx: CHAPTER_START[6] + 1040, kind: 'gull' },
    { wx: CHAPTER_START[6] + 1410, kind: 'gull' },
    { wx: CHAPTER_START[6] + 1780, kind: 'gull' },
    { wx: CHAPTER_START[6] + 2120, kind: 'gull' },
    { wx: CHAPTER_START[6] + 2480, kind: 'gull' },
  ];
  for (const b of birdSpots) {
    shoreBirds.push({
      wx: b.wx,
      kind: b.kind,
      state: 'still',
      timer: rand(3, 8),
      flyX: 0,
      flyY: 0,
      flyVx: 0,
      flyVy: 0,
      cooldown: 0,
    });
  }

  for (let i = 0; i < 11; i++) {
    roamers.push({
      wx: CHAPTER_START[2] + 380 + i * 170 + (i % 2) * 30,
      dy: -1,
      kind: 'villager',
      variant: i % 3,
      dir: i % 2 === 0 ? 1 : -1,
      state: 'idle',
      timer: rand(2, 6),
      waveTimer: 0,
      seed: i * 13.7,
    });
  }
  roamers.push({
    wx: CHAPTER_START[2] + 920,
    dy: -31,
    kind: 'cat',
    variant: 0,
    dir: 1,
    state: 'idle',
    timer: 4,
    waveTimer: 0,
    seed: 41,
  });

  for (let i = 0; i < 8; i++) {
    roamers.push({
      wx: CHAPTER_START[3] + 340 + i * 260,
      dy: -2 - (i % 3) * 2.5,
      kind: i % 2 === 0 ? 'cow' : 'sheep',
      variant: 0,
      dir: i % 3 === 0 ? -1 : 1,
      state: 'idle',
      timer: rand(2, 7),
      waveTimer: 0,
      seed: i * 7.3,
    });
  }

  const cowSpots: { offset: number; dy: number; drink: boolean; dir: 1 | -1 }[] = [
    { offset: 700, dy: 1, drink: true, dir: 1 },
    { offset: 765, dy: -4, drink: false, dir: -1 },
    { offset: 830, dy: 1, drink: true, dir: -1 },
    { offset: 1365, dy: 1, drink: true, dir: 1 },
    { offset: 1425, dy: -4, drink: false, dir: 1 },
    { offset: 1495, dy: 1, drink: true, dir: -1 },
    { offset: 1545, dy: -5, drink: false, dir: -1 },
    { offset: 2040, dy: 1, drink: true, dir: 1 },
    { offset: 2105, dy: -4, drink: false, dir: -1 },
    { offset: 2170, dy: 1, drink: true, dir: 1 },
  ];
  for (let i = 0; i < cowSpots.length; i++) {
    const c = cowSpots[i];
    roamers.push({
      wx: CHAPTER_START[5] + c.offset,
      dy: c.dy,
      kind: 'cow',
      variant: 0,
      dir: c.dir,
      state: c.drink ? 'drink' : 'idle',
      timer: rand(3, 8),
      waveTimer: 0,
      seed: 90 + i * 5.1,
    });
  }

  const harbourCats = [615, 1155, 1665, 2165];
  for (let i = 0; i < harbourCats.length; i++) {
    roamers.push({
      wx: CHAPTER_START[6] + harbourCats[i],
      dy: -1,
      kind: 'cat',
      variant: i % 2,
      dir: i % 2 === 0 ? 1 : -1,
      state: i % 2 === 0 ? 'idle' : 'stretch',
      timer: rand(3, 7),
      waveTimer: 0,
      seed: 130 + i * 4,
    });
  }

  const frogSpots = [
    CHAPTER_START[0] + 460,
    CHAPTER_START[0] + 1460,
    CHAPTER_START[0] + 2050,
    CHAPTER_START[4] + 780,
    CHAPTER_START[4] + 1580,
    CHAPTER_START[5] + 740,
    CHAPTER_START[5] + 1650,
  ];
  for (let i = 0; i < frogSpots.length; i++) {
    frogs.push({ wx: frogSpots[i], dy: 4 + (i % 3) * 3, dived: false, timer: 0 });
  }

  for (let i = 0; i < MAX_SWALLOWS; i++) {
    swallows.push({ x: 80 + i * 80, y: 70 + (i % 3) * 20, phase: i * 1.4, speed: 0.7 + (i % 2) * 0.25, scatterTimer: 0 });
  }
  for (let i = 0; i < MAX_GULLS; i++) {
    gulls.push({
      x: 50 + i * 78,
      y: 38 + (i % 3) * 16,
      vx: (i % 2 === 0 ? 1 : -1) * (15 + i * 2),
      phase: i * 1.3,
      startleTimer: 0,
    });
  }
  for (let i = 0; i < MAX_DRAGONFLIES; i++) {
    dragonflies.push({
      x: 60 + i * 80,
      y: 175 + (i % 3) * 6,
      vx: 0,
      vy: 0,
      timer: rand(0.5, 2),
      color: i % 2 === 0 ? '#5ad4d8' : '#7ae06c',
    });
  }

  return { shoreBirds, roamers, frogs, swallows, gulls, dragonflies };
}
