import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { SeasideView } from './seaside-view';

export function createSeaside(nightSky: NightSky): OutsideView {
  return new SeasideView(nightSky);
}
