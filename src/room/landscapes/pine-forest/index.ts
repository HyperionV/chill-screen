import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { PineForest } from './view';

export function createPineForest(nightSky: NightSky): OutsideView {
  return new PineForest(nightSky);
}
