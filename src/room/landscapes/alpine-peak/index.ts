import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { LandscapePlaceholder } from '../placeholder';

export function createAlpinePeak(_nightSky: NightSky): OutsideView {
  return new LandscapePlaceholder('Alpine Peak');
}
