import { buildHiddenWorld } from './ch-hidden';
import { buildLakeWorld } from './ch-lake';
import { buildShackWorld } from './ch-shack';
import { buildTownWorld } from './ch-town';
import { buildWoodsWorld } from './ch-woods';
import type { WorldBuilder } from './world';

/** The places in story order: the position here is the position in `PLACES` (shack, woods, town, lake, hidden). Add a place by adding its line. */
export const WORLDS: readonly { build: WorldBuilder }[] = [
  { build: buildShackWorld },
  { build: buildWoodsWorld },
  { build: buildTownWorld },
  { build: buildLakeWorld },
  { build: buildHiddenWorld },
];
