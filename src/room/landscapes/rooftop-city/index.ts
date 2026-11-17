import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { RooftopCityView } from './view';

export function createRooftopCity(nightSky: NightSky): OutsideView {
  return new RooftopCityView(nightSky);
}
