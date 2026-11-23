import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { GravityFallsJourney } from './view';

export function createGravityFallsJourney(nightSky: NightSky): JourneyView {
  return new GravityFallsJourney(nightSky);
}
