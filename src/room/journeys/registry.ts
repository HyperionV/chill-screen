import type { NightSky } from '../night-sky';
import { Journey } from '../journey/journey';
import type { JourneyView } from './journey-view';
import { createCanal } from './canal';
import { createFairyRoad } from './fairy';
import { createGravityFallsJourney } from './gravity-falls';
import { createJungle } from './jungle';
import { createNightBus } from './night-bus';
import { createNightTrain } from './night-train';
import { createSkyVoyage } from './sky';

export const JOURNEYS = ['wildwood', 'night-train', 'canal', 'night-bus', 'jungle', 'sky', 'fairy', 'gravity-falls'] as const;
export type JourneyId = (typeof JOURNEYS)[number];

interface JourneyEntry {
  label: string;
  /** True when the journey runs its own sky (a night trip from dusk to dawn) and ignores the Time control. */
  ownSky?: true;
  /** One line for the picker: where it goes and what the pointer and clicks do. */
  hint: string;
  create(nightSky: NightSky): JourneyView;
}

export const JOURNEY_ENTRIES: Record<JourneyId, JourneyEntry> = {
  wildwood: {
    label: 'Wildwood Road', create: (sky) => new Journey(sky),
    hint: 'Six countries from forest to campfire and old wood. Toss food to the fox and stoke the fire.',
  },
  'night-train': {
    label: 'Night Train', ownSky: true, create: createNightTrain,
    hint: 'A sleeper train through the snow. Pull the whistle and draw on the fogged glass.',
  },
  canal: {
    label: 'Canal Barge', create: createCanal,
    hint: 'Locks, villages and a harbour. Cast a line, feed the ducks and ring the bell.',
  },
  'night-bus': {
    label: 'Rainy Night Bus', ownSky: true, create: createNightBus,
    hint: 'A neon city in the rain. Say hello to the cat on the rooftops.',
  },
  jungle: {
    label: 'Jungle River', create: createJungle,
    hint: 'A longboat under the canopy. Call the parrots and light the carved stones.',
  },
  sky: {
    label: 'Sky Voyage', create: createSkyVoyage,
    hint: 'An airship over floating islands. Drop ballast and release lanterns.',
  },
  fairy: {
    label: 'Fairy Road', create: createFairyRoad,
    hint: 'A cart through the mushroom wood. Lead the wisps to the lantern.',
  },
  'gravity-falls': {
    label: 'Gravity Falls', create: createGravityFallsJourney,
    hint: 'A walk from the Shack to the Hidden Hollow. Click the cast for a quip and hunt the hidden symbols.',
  },
};

/** The journey to show when nothing has been chosen, or when the saved choice is no longer on offer. */
export const DEFAULT_JOURNEY: JourneyId = 'wildwood';
