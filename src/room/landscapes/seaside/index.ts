import type { NightSky } from '../../night-sky';
import { Sea } from '../../sea';
import type { OutsideView } from '../../view';

export function createSeaside(nightSky: NightSky): OutsideView {
  return new Sea(nightSky);
}
