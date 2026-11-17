import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { SnowyCabinView } from './view';

export function createSnowyCabin(nightSky: NightSky): OutsideView {
  return new SnowyCabinView(nightSky);
}
