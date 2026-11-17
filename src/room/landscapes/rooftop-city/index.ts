import type { NightSky } from '../../night-sky';
import type { OutsideView } from '../../view';
import { LandscapePlaceholder } from '../placeholder';

export function createRooftopCity(_nightSky: NightSky): OutsideView {
  return new LandscapePlaceholder('Rooftop City');
}
