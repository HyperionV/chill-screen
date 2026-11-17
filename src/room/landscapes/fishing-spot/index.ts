import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { FishingSpotView } from './view';

export function createFishingSpot(nightSky: NightSky): OutsideView {
  return new FishingSpotView(nightSky);
}
