import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { Placeholder } from '../placeholder';

export function createSkyVoyage(_nightSky: NightSky): JourneyView {
  return new Placeholder('Sky Voyage');
}
