import type { PlaceId, Script } from './types';
import { HIDDEN_SCRIPTS } from './lines/hidden';
import { LAKE_SCRIPTS } from './lines/lake';
import { SHACK_SCRIPTS } from './lines/shack';
import { TOWN_SCRIPTS } from './lines/town';
import { WOODS_SCRIPTS } from './lines/woods';

/** Every conversation, grouped by the place where it happens. */
export const SCRIPTS: Readonly<Record<PlaceId, readonly Script[]>> = {
  shack: SHACK_SCRIPTS,
  woods: WOODS_SCRIPTS,
  town: TOWN_SCRIPTS,
  lake: LAKE_SCRIPTS,
  hidden: HIDDEN_SCRIPTS,
};
