import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { JungleView } from './jungle-view';

export function createJungle(nightSky: NightSky): JourneyView {
  return new JungleView(nightSky);
}
