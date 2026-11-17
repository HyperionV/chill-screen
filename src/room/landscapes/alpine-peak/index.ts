import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { AlpinePeakView } from './alpine-view';

export function createAlpinePeak(nightSky: NightSky): OutsideView {
  return new AlpinePeakView(nightSky);
}
