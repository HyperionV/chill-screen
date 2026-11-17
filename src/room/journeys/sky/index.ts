import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { SkyVoyage } from './voyage';

export function createSkyVoyage(_nightSky: NightSky): JourneyView {
  return new SkyVoyage(_nightSky);
}
