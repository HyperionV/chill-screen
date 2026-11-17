import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { NightBus } from './view';

export function createNightBus(nightSky: NightSky): JourneyView {
  return new NightBus(nightSky);
}
