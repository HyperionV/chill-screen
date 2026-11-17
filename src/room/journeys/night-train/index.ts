import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { NightTrain } from './view';

export function createNightTrain(nightSky: NightSky): JourneyView {
  return new NightTrain(nightSky);
}
