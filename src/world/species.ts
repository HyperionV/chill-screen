import type { SpeciesId } from './types';

const HOUR = 3600;

export interface SpeciesSpec {
  label: string;
  /** Adult body length in world units (the tank is 1000 units tall). */
  length: number;
  cruiseSpeed: number;
  maxSpeed: number;
  /** Most of this species the tank will carry; births slow as the count nears it. */
  capacity: number;
  startCount: number;
  adultAge: number;
  lifespan: number;
  broodMin: number;
  broodMax: number;
  breedCooldown: number;
  /** Seconds from full to starving with nothing to eat. */
  hungerTime: number;
  schools: boolean;
  bottomDweller: boolean;
}

export const SPECIES: Record<SpeciesId, SpeciesSpec> = {
  tetra: {
    label: 'neon tetra',
    length: 40,
    cruiseSpeed: 55,
    maxSpeed: 170,
    capacity: 16,
    startCount: 8,
    adultAge: 2 * HOUR,
    lifespan: 40 * HOUR,
    broodMin: 2,
    broodMax: 3,
    breedCooldown: 1.5 * HOUR,
    hungerTime: 1500,
    schools: true,
    bottomDweller: false,
  },
  rasbora: {
    label: 'harlequin rasbora',
    length: 42,
    cruiseSpeed: 48,
    maxSpeed: 160,
    capacity: 12,
    startCount: 6,
    adultAge: 2 * HOUR,
    lifespan: 44 * HOUR,
    broodMin: 2,
    broodMax: 3,
    breedCooldown: 1.75 * HOUR,
    hungerTime: 1600,
    schools: true,
    bottomDweller: false,
  },
  angel: {
    label: 'angelfish',
    length: 74,
    cruiseSpeed: 28,
    maxSpeed: 95,
    capacity: 4,
    startCount: 2,
    adultAge: 3 * HOUR,
    lifespan: 60 * HOUR,
    broodMin: 1,
    broodMax: 2,
    breedCooldown: 3 * HOUR,
    hungerTime: 2200,
    schools: false,
    bottomDweller: false,
  },
  gourami: {
    label: 'dwarf gourami',
    length: 58,
    cruiseSpeed: 22,
    maxSpeed: 90,
    capacity: 3,
    startCount: 2,
    adultAge: 3 * HOUR,
    lifespan: 56 * HOUR,
    broodMin: 1,
    broodMax: 1,
    breedCooldown: 3.5 * HOUR,
    hungerTime: 2100,
    schools: false,
    bottomDweller: false,
  },
  cory: {
    label: 'cory catfish',
    length: 36,
    cruiseSpeed: 34,
    maxSpeed: 120,
    capacity: 6,
    startCount: 4,
    adultAge: 2.5 * HOUR,
    lifespan: 50 * HOUR,
    broodMin: 1,
    broodMax: 2,
    breedCooldown: 2 * HOUR,
    hungerTime: 1800,
    schools: false,
    bottomDweller: true,
  },
};

export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];

export const SNAIL = { capacity: 6, startCount: 2, lifespan: 80 * HOUR, breedCooldown: 3 * HOUR, speed: 7 } as const;
export const SHRIMP = { capacity: 8, startCount: 4, lifespan: 50 * HOUR, breedCooldown: 2 * HOUR } as const;

/** Size factor for a young animal: newborns are a third of adult size. */
export const growthScale = (age: number, adultAge: number): number => 0.35 + 0.65 * Math.min(1, age / adultAge);

const NAMES = [
  'Pip', 'Miso', 'Juniper', 'Wren', 'Basil', 'Clove', 'Nori', 'Fennel', 'Pebble', 'Moss', 'Tansy', 'Kip',
  'Lumen', 'Sorrel', 'Echo', 'Fig', 'Saffron', 'Drift', 'Marlo', 'Ivy', 'Quill', 'Rue', 'Sable', 'Tamsin',
  'Opal', 'Brook', 'Cedar', 'Dune', 'Ember', 'Fable', 'Gale', 'Hazel', 'Isla', 'Jory', 'Koa', 'Lark',
  'Mira', 'Nell', 'Orla', 'Poppy', 'Reed', 'Skye', 'Thistle', 'Umber', 'Vale', 'Willow', 'Yara', 'Zephyr',
];
export const randomName = (): string => NAMES[Math.floor(Math.random() * NAMES.length)];
