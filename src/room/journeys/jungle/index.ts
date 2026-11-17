import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { Placeholder } from '../placeholder';

export function createJungle(_nightSky: NightSky): JourneyView {
  return new Placeholder('Jungle River');
}
