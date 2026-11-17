import type { NightSky } from '../../night-sky';
import type { JourneyView } from '../journey-view';
import { CanalView } from './view';

export function createCanal(nightSky: NightSky): JourneyView {
  return new CanalView(nightSky);
}
