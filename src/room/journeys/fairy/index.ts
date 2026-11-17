import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { FairyRoad } from './fairy-road';

export function createFairyRoad(nightSky: NightSky): JourneyView {
  return new FairyRoad(nightSky);
}
